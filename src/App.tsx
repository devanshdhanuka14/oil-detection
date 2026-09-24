import { Stage1080 } from './shell/Stage1080';
import { ModuleBar } from './shell/ModuleBar';
import { useKeyboard } from './shell/keyboard';
import { useApp } from './shell/store';
import { DetectionScreen, DETECTION_TOGGLES } from './modules/detection/DetectionScreen';

export function App() {
  const module = useApp((s) => s.module);
  useKeyboard(DETECTION_TOGGLES);

  return (
    <Stage1080>
      <ModuleBar />
      {module === 'detection' ? (
        <DetectionScreen />
      ) : (
        <div className="screen">
          <div className="placeholder">{module} screen — next step</div>
        </div>
      )}
    </Stage1080>
  );
}
