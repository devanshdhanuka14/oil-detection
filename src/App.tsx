import { Stage1080 } from './shell/Stage1080';
import { ModuleBar } from './shell/ModuleBar';
import { useKeyboard } from './shell/keyboard';
import { useApp } from './shell/store';

const NO_TOGGLES: string[] = [];

export function App() {
  const module = useApp((s) => s.module);
  useKeyboard(NO_TOGGLES);

  return (
    <Stage1080>
      <ModuleBar />
      <div className="screen">
        <div className="placeholder">{module} screen — next step</div>
      </div>
    </Stage1080>
  );
}
