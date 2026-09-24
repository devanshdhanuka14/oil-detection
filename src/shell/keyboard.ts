/**
 * Presenter keys (CLAUDE.md §2). Deliberately the only global input:
 * there is no pan, zoom or page navigation anywhere in the app.
 */
import { useEffect } from 'react';
import { MODULE_ORDER, useApp } from './store';

export function useKeyboard(availableToggles: string[]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let a focused control keep its own keys.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      const s = useApp.getState();
      switch (e.key) {
        case '1':
        case '2':
        case '3':
          s.setModule(MODULE_ORDER[Number(e.key) - 1]);
          break;
        case ' ':
          e.preventDefault();
          s.togglePause();
          break;
        case 'r':
        case 'R':
          s.restart();
          break;
        case 'f':
        case 'F':
          s.setMode('fullcase');
          break;
        case 'e':
        case 'E':
          s.setMode('explore');
          break;
        case 't':
        case 'T':
          s.cycleToggle(availableToggles);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.stepBeat(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.stepBeat(1);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [availableToggles]);
}
