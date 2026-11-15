import {
  DT,
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
import { buildTrack, headingAt, nearestIndex, wrap, type Track } from "./track";
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
}

export interface State {
  tick: number;
  track: Track;
  cars: Car[];
  /** pairs of cars in contact last tick, as i * 8 + j */
  touching: number[];
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
    const idx = wrap(-3 - row * 3 - (i % 2), n);
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
    };
  });
  return { tick: 0, track, cars, touching: [] };
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

    c.speed += throttle * TUNING.accel * Math.max(0, 1 - c.speed / top) * DT;
    if (c.speed > top) c.speed -= (c.speed - top) * 3 * DT;
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
    rivals: s.cars.filter((o) => o !== c).map((o) => ({ x: o.x, y: o.y })),
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
