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
  /** boost pad: ticks a burst lasts after leaving a pad */
  boostTicks: 50,
  /** top-speed bonus while boosted; does not stack with the slipstream */
  boostTop: 0.1,
  /** acceleration multiplier while boosted */
  boostAccel: 2.5,
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
  /** boost pad size along and across the straight */
  padLength: 100,
  padWidth: 150,
  /** pad centre offset from the middle of the straight, in the driving direction */
  padOffset: 375,
  /** back-straight chicane: centre x, span along the straight, sideways amplitude */
  chicaneCentre: 0,
  /** padOffset + padLength/2 must stay below chicaneLength/2 so no pad sits inside the chicane */
  chicaneLength: 600,
  chicaneAmp: 35,
  /** dashed chalk braking marks upstream of the chicane */
  brakeMarks: 3,
  brakeMarkStart: 60,
  brakeMarkGap: 50,
  /** chalk chevrons warning of the chicane's first bend; decoration only, never read by step */
  arrowCount: 3,
  /** distance upstream of the chicane entry to the nearest chevron centre */
  arrowStart: 200,
  arrowGap: 70,
  /** chevron half-length along travel and half-width across it */
  arrowSize: 24,
  arrowSpread: 26,
  /** radians the chevron is turned toward the first bend */
  arrowTilt: 0.35,
  arrowLine: 6,
};

/** The style bible's palette. Do not introduce colours outside it. */
export const PALETTE = {
  felt: "#1f3d2f",
  feltDark: "#19332a",
  tarmac: "#30343b",
  chalk: "#f2ead3",
  ink: "#17201b",
  amber: "#ffc233",
  cars: ["#ff5a3c", "#ffc233", "#3fb8ff", "#b59cff", "#7be0a4", "#ff8fc7", "#f2ead3", "#9aa3ad"],
};
