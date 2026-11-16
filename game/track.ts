import type { Vec } from "../kernel/api";
import { TRACK } from "./tuning";

export interface Track {
  /** closed centre line, evenly spaced, clockwise on screen */
  points: Vec[];
  halfWidth: number;
  length: number;
}

/** A stadium oval: two straights joined by two half-circles. */
export function buildTrack(): Track {
  const { straight: L, radius: R, spacing } = TRACK;
  const pts: Vec[] = [];
  const straightSteps = Math.round(L / spacing);
  const arcSteps = Math.round((Math.PI * R) / spacing);

  for (let i = 0; i < straightSteps; i++) pts.push({ x: -L / 2 + (L * i) / straightSteps, y: -R });
  for (let i = 0; i < arcSteps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / arcSteps;
    pts.push({ x: L / 2 + R * Math.cos(a), y: R * Math.sin(a) });
  }
  for (let i = 0; i < straightSteps; i++) pts.push({ x: L / 2 - (L * i) / straightSteps, y: R });
  for (let i = 0; i < arcSteps; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / arcSteps;
    pts.push({ x: -L / 2 + R * Math.cos(a), y: R * Math.sin(a) });
  }

  // Start the lap a little way down the top straight.
  const shift = Math.round(straightSteps * 0.35);
  const points = pts.slice(shift).concat(pts.slice(0, shift));
  return { points, halfWidth: TRACK.halfWidth, length: 2 * L + 2 * Math.PI * R };
}

export function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/** Nearest centre-line index to (x, y), searching only near the last known index. */
export function nearestIndex(track: Track, x: number, y: number, last: number): number {
  const n = track.points.length;
  let best = last;
  let bestD = Infinity;
  for (let o = -4; o <= 10; o++) {
    const i = wrap(last + o, n);
    const p = track.points[i];
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Direction of travel at a centre-line index, in radians. */
export function headingAt(track: Track, i: number): number {
  const n = track.points.length;
  const a = track.points[wrap(i, n)];
  const b = track.points[wrap(i + 1, n)];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Point at a fractional centre-line index `s`, offset `lat` along the normal (-sin h, cos h). */
export function pointAt(track: Track, s: number, lat: number): { x: number; y: number; heading: number } {
  const n = track.points.length;
  const i = Math.floor(s);
  const f = s - i;
  const a = track.points[wrap(i, n)];
  const b = track.points[wrap(i + 1, n)];
  const heading = Math.atan2(b.y - a.y, b.x - a.x);
  return {
    x: a.x + (b.x - a.x) * f - Math.sin(heading) * lat,
    y: a.y + (b.y - a.y) * f + Math.cos(heading) * lat,
    heading,
  };
}
