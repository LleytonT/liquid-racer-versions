import type { View } from "../kernel/api";
import type { State } from "./index";
import { headingAt } from "./track";
import { PALETTE, TUNING } from "./tuning";

/** World units visible across the canvas width. */
const VIEW_WIDTH = 1100;

export function render(ctx: CanvasRenderingContext2D, s: State, view: View): void {
  const { width, height } = view;
  const focus = s.cars[view.focus] ?? s.cars[0];
  const scale = width / VIEW_WIDTH;
  const { points, halfWidth } = s.track;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.felt;
  ctx.fillRect(0, 0, width, height);

  ctx.setTransform(scale, 0, 0, scale, width / 2 - focus.x * scale, height / 2 - focus.y * scale);

  // Felt weave: a fixed dot grid so motion reads even on a straight.
  const left = focus.x - VIEW_WIDTH / 2;
  const top = focus.y - height / scale / 2;
  ctx.fillStyle = PALETTE.feltDark;
  const gap = 80;
  for (let gx = Math.floor(left / gap) * gap; gx < left + VIEW_WIDTH + gap; gx += gap) {
    for (let gy = Math.floor(top / gap) * gap; gy < top + height / scale + gap; gy += gap) {
      ctx.fillRect(gx - 3, gy - 3, 6, 6);
    }
  }

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  };
  ctx.lineJoin = "round";

  // Chalk edge, then tarmac on top, leaves a chalk outline.
  trace();
  ctx.strokeStyle = PALETTE.chalk;
  ctx.lineWidth = halfWidth * 2 + 10;
  ctx.stroke();
  trace();
  ctx.strokeStyle = PALETTE.tarmac;
  ctx.lineWidth = halfWidth * 2;
  ctx.stroke();

  // Dashed centre line.
  trace();
  ctx.setLineDash([28, 44]);
  ctx.strokeStyle = "rgba(242,234,211,0.28)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish: a chalk checker strip across the track at index 0.
  const p0 = points[0];
  const h0 = headingAt(s.track, 0);
  ctx.save();
  ctx.translate(p0.x, p0.y);
  ctx.rotate(h0);
  const cell = 15;
  const rows = Math.floor((halfWidth * 2) / cell);
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < rows; row++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.chalk : PALETTE.ink;
      ctx.fillRect(col * cell - cell, -halfWidth + row * cell, cell, cell);
    }
  }
  ctx.restore();

  s.cars.forEach((c, i) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.heading);
    const len = TUNING.carRadius * 2.5;
    const wid = TUNING.carRadius * 1.35;

    if (c.drafting) {
      ctx.strokeStyle = "rgba(242,234,211,0.5)";
      ctx.lineWidth = 2;
      for (const off of [-wid * 0.5, 0, wid * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(-len * 0.7, off);
        ctx.lineTo(-len * 1.5, off);
        ctx.stroke();
      }
    }

    if (c.onGrass && c.speed > TUNING.tuftMinSpeed) {
      // Chalk tufts kicked up from the felt: small Vs pointing at the car, streaming back.
      const gap = TUNING.tuftGap;
      const span = gap * 3;
      const size = TUNING.tuftSize;
      ctx.lineWidth = 2;
      for (const lane of [-wid * 0.45, wid * 0.45]) {
        for (let k = 0; k < 3; k++) {
          const along = (((k * gap + c.grassPhase) % span) + span) % span;
          const d = len * 0.6 + along;
          const a = TUNING.tuftAlpha * (1 - along / span);
          ctx.strokeStyle = `rgba(242,234,211,${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(-d - size, lane - size * 0.6);
          ctx.lineTo(-d, lane);
          ctx.lineTo(-d - size, lane + size * 0.6);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-len * 0.34, -wid * 0.62, len * 0.2, wid * 1.24);
    ctx.fillRect(len * 0.16, -wid * 0.62, len * 0.2, wid * 1.24);

    ctx.fillStyle = PALETTE.cars[i % PALETTE.cars.length];
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 6);
    ctx.fill();

    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.roundRect(-len * 0.08, -wid * 0.32, len * 0.26, wid * 0.64, 3);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = c.human ? PALETTE.chalk : "rgba(242,234,211,0.6)";
    ctx.font = `${c.human ? "700" : "500"} 13px ui-monospace, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.fillText(c.name, c.x, c.y - TUNING.carRadius - 12);
  });
}
