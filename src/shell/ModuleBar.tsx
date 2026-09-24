/**
 * The module bar (CLAUDE.md §2): ~44 px, above each spec's own header.
 * Each button carries its module's headline counter, which stays visible at all
 * times - acceptance checklist item 2.
 */
import { counters } from '../data/scenario';
import { MODULE_ORDER, useApp, type ModuleId } from './store';
import { SyntheticBadge } from './SyntheticBadge';

const LABEL: Record<ModuleId, string> = {
  detection: 'DETECT',
  backtracking: 'BACKTRACK',
  attribution: 'ATTRIBUTE',
};

export function ModuleBar() {
  const { module, mode, setModule, setMode } = useApp();

  return (
    <div className="module-bar">
      <div className="module-bar__modules">
        {MODULE_ORDER.map((id, i) => (
          <span key={id} className="module-bar__item">
            {i > 0 && <span className="module-bar__arrow" aria-hidden>─▶</span>}
            <button
              className={`module-btn${module === id ? ' is-active' : ''}`}
              onClick={() => setModule(id)}
            >
              <span className="module-btn__index">{i + 1}</span>
              <span className="module-btn__label">{LABEL[id]}</span>
              <span className="module-btn__counter">{counters[id]}</span>
            </button>
          </span>
        ))}
      </div>

      <div className="module-bar__controls">
        <button
          className={`shell-btn${mode === 'fullcase' ? ' is-active' : ''}`}
          onClick={() => setMode('fullcase')}
        >
          ▶ Play full case
        </button>
        <button
          className={`shell-btn${mode === 'explore' ? ' is-active' : ''}`}
          onClick={() => setMode('explore')}
        >
          ◻ Explore
        </button>
        <SyntheticBadge />
      </div>
    </div>
  );
}
