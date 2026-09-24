/**
 * App state. Presentation modes come from CLAUDE.md §2:
 *   play     - run the active module's scripted timeline, then hold on the end state
 *   explore  - jump to the end state with everything clickable (what the presenter uses)
 *   fullcase - module 1 -> hand-off -> transition -> 2 -> hand-off -> transition -> 3
 */
import { create } from 'zustand';

export type ModuleId = 'detection' | 'backtracking' | 'attribution';
export const MODULE_ORDER: ModuleId[] = ['detection', 'backtracking', 'attribution'];

export type Mode = 'play' | 'explore' | 'fullcase';

/** Which alternate panel is showing. Each module owns its own toggle names. */
export type ToggleId = string | null;

export type Selection = { kind: string; id: string } | null;

type State = {
  module: ModuleId;
  mode: Mode;
  paused: boolean;
  /** Labelled beat the active timeline is on, for the arrow keys and the scrubber. */
  beat: number;
  toggle: ToggleId;
  selection: Selection;
  /** Set by the attribution scrubber / rewind loop: hours before the SAR image. */
  loopHours: number;
  /** Stop-rule threshold the slider is on (0.50 | 0.65 | 0.80). */
  threshold: number;
  /** Detection outline confidence: tight | expected | generous. */
  outlineLevel: 'tight' | 'expected' | 'generous';
  /** Backtracking age hypothesis filter: null = all three. */
  ageHypothesis: 12 | 24 | 36 | null;
  /** Backtracking uncertainty slider. */
  sigma: 1 | 2 | 3;
  /** Layer chips that are switched off, per module. */
  hiddenLayers: Record<string, boolean>;
  /** Which completed stage the presenter has reopened; one at a time. */
  expandedStage: string | null;

  setModule: (m: ModuleId) => void;
  setMode: (m: Mode) => void;
  togglePause: () => void;
  restart: () => void;
  setBeat: (b: number) => void;
  stepBeat: (d: 1 | -1) => void;
  setToggle: (t: ToggleId) => void;
  cycleToggle: (available: string[]) => void;
  select: (s: Selection) => void;
  setLoopHours: (h: number) => void;
  setThreshold: (t: number) => void;
  setOutlineLevel: (l: 'tight' | 'expected' | 'generous') => void;
  setAgeHypothesis: (a: 12 | 24 | 36 | null) => void;
  setSigma: (s: 1 | 2 | 3) => void;
  toggleLayer: (id: string) => void;
  setExpandedStage: (id: string | null) => void;
  nextModule: () => void;
};

export const useApp = create<State>((set, get) => ({
  module: 'detection',
  mode: 'play',
  paused: false,
  beat: 0,
  toggle: null,
  selection: null,
  loopHours: 0,
  threshold: 0.65,
  outlineLevel: 'expected',
  ageHypothesis: null,
  sigma: 2,
  hiddenLayers: {},
  expandedStage: null,

  setModule: (module) => set({ module, beat: 0, toggle: null, selection: null, expandedStage: null }),
  setMode: (mode) => set({ mode, paused: false, toggle: null, selection: null, expandedStage: null }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  restart: () => set({ beat: 0, paused: false, toggle: null, selection: null, expandedStage: null }),
  setBeat: (beat) => set({ beat }),
  stepBeat: (d) => set((s) => ({ beat: Math.max(0, s.beat + d), paused: true })),
  setToggle: (toggle) => set({ toggle }),
  cycleToggle: (available) => {
    const cur = get().toggle;
    const i = cur === null ? -1 : available.indexOf(cur);
    const nextI = i + 1;
    set({ toggle: nextI >= available.length ? null : available[nextI] });
  },
  select: (selection) => set({ selection }),
  setLoopHours: (loopHours) => set({ loopHours }),
  setThreshold: (threshold) => set({ threshold }),
  setOutlineLevel: (outlineLevel) => set({ outlineLevel }),
  setAgeHypothesis: (ageHypothesis) => set({ ageHypothesis }),
  setSigma: (sigma) => set({ sigma }),
  toggleLayer: (id) => set((s) => ({ hiddenLayers: { ...s.hiddenLayers, [id]: !s.hiddenLayers[id] } })),
  setExpandedStage: (expandedStage) => set({ expandedStage }),
  nextModule: () => {
    const i = MODULE_ORDER.indexOf(get().module);
    if (i < MODULE_ORDER.length - 1) get().setModule(MODULE_ORDER[i + 1]);
  },
}));
