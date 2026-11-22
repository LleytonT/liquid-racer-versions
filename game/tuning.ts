/** Every number that shapes how the race feels. Change values here first. */
export const TUNING = {
  racers: 4,
  laps: 3,
  /** world units per second on a clear straight */
  topSpeed: 320,
  /** throttle acceleration at standstill, units/s^2 */
  accel: 210,
  brake: 420,
  /** speed lost per second when coasting, as a fraction of speed */
  coastDrag: 0.18,
  /** steering rate at low speed, rad/s */
  maxYaw: 2.6,
  /** sideways grip, units/s^2. Corner speed limit is sqrt(grip * radius). */
  grip: 200,
  /** speed lost per second while asking for more turn than the tyres have */
  scrub: 90,
  /** top-speed multiplier on grass */
  grassTop: 0.4,
  carRadius: 15,
  /** slipstream: top-speed bonus when tucked in behind another car */
  draftBonus: 0.1,
  draftMin: 30,
  draftMax: 260,
  draftCone: 0.35,
  /** speed kept by each car after a bump */
  bumpKeep: 0.94,
};

export const TRACK = {
  /** length of each straight */
  straight: 1400,
  /** radius of each turn */
  radius: 380,
  /** half the width of the tarmac */
  halfWidth: 92,
  /** distance between centre-line samples */
  spacing: 20,
};

/** Chalk starting grid: where cars line up and how their boxes are drawn. */
export const GRID = {
  /** centre-line steps behind the line for row 0 */
  firstBack: 3,
  /** steps between rows */
  rowGap: 3,
  /** extra steps for the right-hand slot */
  stagger: 1,
  /** lateral offset as a fraction of halfWidth */
  sideFrac: 0.4,
  /** box size along the track, world units */
  boxLength: 50,
  /** box size across the track, world units */
  boxWidth: 38,
  /** chalk line, slightly thicker than the centre line */
  lineWidth: 4,
};

/** The style bible's palette. Do not introduce colours outside it. */
export const PALETTE = {
  felt: "#1f3d2f",
  feltDark: "#19332a",
  tarmac: "#30343b",
  chalk: "#f2ead3",
  ink: "#17201b",
  cars: ["#ff5a3c", "#ffc233", "#3fb8ff", "#b59cff", "#7be0a4", "#ff8fc7", "#f2ead3", "#9aa3ad"],
};
