import { useEffect } from 'react';
import { Stage1080 } from './shell/Stage1080';
import { ModuleBar } from './shell/ModuleBar';
import { useKeyboard } from './shell/keyboard';
import { MODULE_ORDER, useApp, type ModuleId } from './shell/store';
import { DetectionScreen, DETECTION_TOGGLES } from './modules/detection/DetectionScreen';
import { BacktrackScreen, BACKTRACK_TOGGLES } from './modules/backtracking/BacktrackScreen';
import { AttributionScreen, ATTRIBUTION_TOGGLES } from './modules/attribution/AttributionScreen';
import { useFullCase } from './shell/PlayController';
import { Transition } from './shell/Transition';

export function App() {
  const module = useApp((s) => s.module);

  // Read the starting module from the URL hash once, at mount. This is for
  // setting up a recording (and for screenshots), not navigation: nothing in
  // the app ever writes the hash, and the keys stay the only way to switch.
  useEffect(() => {
    const want = location.hash.replace('#', '') as ModuleId;
    if (MODULE_ORDER.includes(want)) useApp.getState().setModule(want);
  }, []);
  const { phase, progress } = useFullCase();
  const toggles = module === 'detection' ? DETECTION_TOGGLES : module === 'backtracking' ? BACKTRACK_TOGGLES : ATTRIBUTION_TOGGLES;
  useKeyboard(toggles);

  return (
    <Stage1080>
      <ModuleBar />
      {module === 'detection' ? (
        <DetectionScreen />
      ) : module === 'backtracking' ? (
        <BacktrackScreen />
      ) : (
        <AttributionScreen />
      )}
      {phase?.kind === 'transition' && <Transition from={phase.from} to={phase.to} k={progress} />}
    </Stage1080>
  );
}
