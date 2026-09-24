/**
 * The merged visual system: CLAUDE.md §5, which reconciles the colour tables in
 * all three specs. Anything drawn on any screen takes its colour from here, so
 * a shared meaning cannot drift between modules.
 */

export const color = {
  // Dark operations console
  bg: '#0B1220',
  panel: '#111A2B',
  panelBorder: '#1E2A40',
  text: '#E6EDF7',
  muted: '#8A9BB3',

  // Verdict lines
  tickYes: '#3DDC97',
  tickNo: '#E0605A',

  // ESTIMATED / NOT COMPUTED blocks
  estimatedBg: '#1A2438',
  estimatedBar: '#F2A541',

  // Shared map meanings (CLAUDE.md §5 merged table)
  oil: '#FF4D4D',
  lookAlike: '#F2C94C',
  brightTarget: '#4DA3FF',
  sourceCloud: '#F2A541',
  particle12h: '#F2A541',
  particle24h: '#FFFFFF',
  particle36h: '#4DA3FF',
  aisTrack: '#8A9BB3',
  candidate: '#2EC4B6',
  leader: '#FF4FD8',
  searchCircle: '#5CE1E6',
  fixedSource: '#A77BFF',
  blind: '#8A9BB3',
} as const;

/** Fill/stroke opacities the specs state explicitly. */
export const alpha = {
  oilFill: 0.2,
  lookAlikeDimmed: 0.15,
  sourceEllipseFill: 0.15,
  sourceCloudFill: 0.4,
  aisTrack: 0.35,
  aisTrackEliminated: 0.1,
  searchCircleFill: 0.1,
  reachabilityFill: 0.1,
} as const;

/** Animation timings from CLAUDE.md §5. */
export const motion = {
  panelLineFadeMs: 150,
  countUpMs: 400,
} as const;

export const font = {
  ui: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

/** The stage is a fixed 1920x1080 so the layout never reflows while recording. */
export const STAGE = { w: 1920, h: 1080, moduleBarH: 44 } as const;
