import {
  DT,
  TICK_RATE,
  angleDiff,
  clamp,
  type Game,
  type Input,
  type Observation,
  type RaceStatus,
  type RacerSetup,
  type Vec,
} from "../kernel/api";
import { render } from "./render";
import { buildTrack, headingAt, nearestIndex, pointAt, wrap, type Track } from "./track";
import { TUNING } from "./tuning";

export interface Car {
  name: string;
  human: boolean;
  x: number;
  y: number;
  heading: number;
  speed: number;
  /** nearest centre-line index */
  idx: number;
  /** completed laps; starts at -1 because the grid sits behind the line */
  lap: number;
  finishTick: number | null;
  onGrass: boolean;
  drafting: boolean;
  /** ticks left stalled by the dinosaur */
  stall: number;
  /** ticks left before the dinosaur can stall this car again */
  immune: number;
}

export interface Dino {
  /** fractional centre-line index */
  s: number;
  /** sideways offset from the centre line */
  lat: number;
  /** world units per second */
  speed: number;
  /** car being chased, or -1 */
  target: number;
}

export interface State {
  tick: number;
  track: Track;
  cars: Car[];
  /** pairs of cars in contact last tick, as i * 8 + j */
  touching: number[];
  dino: Dino;
}

function progressOf(s: State, c: Car): number {
  return c.lap + c.idx / s.track.points.length;
}

function init(_seed: number, racers: RacerSetup[]): State {
  const track = buildTrack();
  const n = track.points.length;
  const cars: Car[] = racers.map((r, i) => {
    // Two-wide staggered grid behind the start line.
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const idx = wrap(-3 - row * TUNING.gridRowGap - (i % 2), n);
    const p = track.points[idx];
    const h = headingAt(track, idx);
    const off = side * track.halfWidth * 0.4;
    return {
      name: r.name,
      human: r.human,
      x: p.x - Math.sin(h) * off,
      y: p.y + Math.cos(h) * off,
      heading: h,
      speed: 0,
      idx,
      lap: -1,
      finishTick: null,
      onGrass: false,
      drafting: false,
      stall: 0,
      immune: 0,
    };
  });
  const dino: Dino = { s: wrap(TUNING.dino.startBehind, n), lat: 0, speed: 0, target: -1 };
  return { tick: 0, track, cars, touching: [], dino };
}

function isDrafting(s: State, c: Car): boolean {
  for (const o of s.cars) {
    if (o === c) continue;
    const dx = o.x - c.x;
    const dy = o.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < TUNING.draftMin || d > TUNING.draftMax) continue;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), c.heading)) > TUNING.draftCone) continue;
    if (Math.abs(angleDiff(o.heading, c.heading)) > 0.5) continue;
    return true;
  }
  return false;
}

function step(s: State, inputs: Input[]): void {
  s.tick++;
  const { track } = s;
  const n = track.points.length;

  for (let i = 0; i < s.cars.length; i++) {
    const c = s.cars[i];
    const raw = inputs[i];
    const done = c.finishTick != null;
    const steer = done ? 0 : clamp(raw?.steer ?? 0, -1, 1);
    const throttle = done ? 0 : clamp(raw?.throttle ?? 0, 0, 1);
    const brake = done ? 0.4 : clamp(raw?.brake ?? 0, 0, 1);

    const centre = track.points[c.idx];
    c.onGrass = Math.hypot(c.x - centre.x, c.y - centre.y) > track.halfWidth;
    c.drafting = !c.onGrass && isDrafting(s, c);

    let top = TUNING.topSpeed;
    if (c.onGrass) top *= TUNING.grassTop;
    if (c.drafting) top *= 1 + TUNING.draftBonus;
    if (c.stall > 0) top *= TUNING.dino.stallTop;
    const decay = c.stall > 0 ? TUNING.dino.stallDecay : 3;

    c.speed += throttle * TUNING.accel * Math.max(0, 1 - c.speed / top) * DT;
    if (c.speed > top) c.speed -= (c.speed - top) * decay * DT;
    if (throttle === 0) c.speed -= c.speed * TUNING.coastDrag * DT;
    c.speed -= brake * TUNING.brake * DT;

    // Tyres only have so much grip: asking for more turn scrubs speed instead.
    const wanted = steer * TUNING.maxYaw;
    const limit = TUNING.grip / Math.max(c.speed, 60);
    const yaw = clamp(wanted, -limit, limit);
    if (Math.abs(wanted) > limit + 0.05) c.speed -= TUNING.scrub * DT;
    c.speed = Math.max(0, c.speed);

    c.heading += yaw * DT;
    c.x += Math.cos(c.heading) * c.speed * DT;
    c.y += Math.sin(c.heading) * c.speed * DT;
  }

  // Cars are circles that push each other apart.
  const r2 = TUNING.carRadius * 2;
  const touchingNow: number[] = [];
  for (let i = 0; i < s.cars.length; i++) {
    for (let j = i + 1; j < s.cars.length; j++) {
      const a = s.cars[i];
      const b = s.cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= r2 || d === 0) continue;
      const push = (r2 - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      // Only the first tick of a contact costs speed, so rubbing is not a brake.
      const key = i * 8 + j;
      if (!s.touching.includes(key)) {
        a.speed *= TUNING.bumpKeep;
        b.speed *= TUNING.bumpKeep;
      }
      touchingNow.push(key);
    }
  }

  s.touching = touchingNow;

  for (const c of s.cars) {
    const before = c.idx;
    c.idx = nearestIndex(track, c.x, c.y, before);
    if (c.idx < before - n / 2) c.lap++;
    else if (c.idx > before + n / 2) c.lap--;
    if (c.finishTick == null && c.lap >= TUNING.laps) c.finishTick = s.tick;
  }

  stepDino(s);
}

/** The dinosaur runs the centre line after the leader and stalls any car it touches. */
function stepDino(s: State): void {
  const { track, dino } = s;
  const D = TUNING.dino;
  const n = track.points.length;
  const unit = track.length / n;

  for (const c of s.cars) {
    if (c.stall > 0) c.stall--;
    if (c.immune > 0) c.immune--;
  }

  dino.target = -1;
  for (const i of standings(s)) {
    const c = s.cars[i];
    if (c.finishTick == null && c.immune === 0) {
      dino.target = i;
      break;
    }
  }

  let desired = D.cruise;
  if (dino.target >= 0) {
    const c = s.cars[dino.target];
    let gap = wrap(c.idx - dino.s, n);
    if (gap > n / 2) gap -= n;
    desired = clamp(D.cruise + D.chaseGain * gap * unit, D.lurk, D.cap);
    const p = track.points[c.idx];
    const h = headingAt(track, c.idx);
    const off = clamp((c.x - p.x) * -Math.sin(h) + (c.y - p.y) * Math.cos(h), -D.lateralMax * track.halfWidth, D.lateralMax * track.halfWidth);
    const maxStep = D.lateralRate * DT;
    dino.lat += clamp(off - dino.lat, -maxStep, maxStep);
  }
  const maxDv = D.accel * DT;
  dino.speed += clamp(desired - dino.speed, -maxDv, maxDv);
  dino.s = wrap(dino.s + (dino.speed * DT) / unit, n);

  const at = pointAt(track, dino.s, dino.lat);
  const reach = D.radius + TUNING.carRadius;
  for (const c of s.cars) {
    if (c.finishTick != null || c.immune > 0) continue;
    if (Math.hypot(c.x - at.x, c.y - at.y) >= reach) continue;
    c.stall = Math.round(D.stallTime * TICK_RATE);
    c.immune = Math.round(D.immuneTime * TICK_RATE);
  }
}

export function dinoPos(s: State): { x: number; y: number; heading: number } {
  return pointAt(s.track, s.dino.s, s.dino.lat);
}

function standings(s: State): number[] {
  return s.cars
    .map((_, i) => i)
    .sort((a, b) => {
      const ca = s.cars[a];
      const cb = s.cars[b];
      if (ca.finishTick != null && cb.finishTick != null) return ca.finishTick - cb.finishTick || a - b;
      if (ca.finishTick != null) return -1;
      if (cb.finishTick != null) return 1;
      return progressOf(s, cb) - progressOf(s, ca) || a - b;
    });
}

function observe(s: State, racer: number): Observation {
  const c = s.cars[racer];
  const n = s.track.points.length;
  const ahead: Vec[] = [];
  for (let k = 0; k < 10; k++) ahead.push(s.track.points[wrap(c.idx + 3 + k * 2, n)]);
  return {
    x: c.x,
    y: c.y,
    heading: c.heading,
    speed: c.speed,
    topSpeed: TUNING.topSpeed,
    ahead,
    rivals: s.cars
      .filter((o) => o !== c)
      .map((o) => ({ x: o.x, y: o.y }))
      .concat([dinoPos(s)].map((d) => ({ x: d.x, y: d.y }))),
    halfWidth: s.track.halfWidth,
    progress: clamp(progressOf(s, c), 0, TUNING.laps),
    laps: TUNING.laps,
    finished: c.finishTick != null,
    place: standings(s).indexOf(racer) + 1,
    actionReady: false,
  };
}

function status(s: State): RaceStatus {
  return {
    tick: s.tick,
    finished: s.cars.every((c) => c.finishTick != null),
    order: standings(s),
    finishTicks: s.cars.map((c) => c.finishTick),
  };
}

const game: Game<State> = {
  name: "Oval",
  racers: TUNING.racers,
  init,
  step,
  observe,
  status,
  render,
};

export default game;
