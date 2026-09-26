/**
 * Presenter magnifier (Z).
 *
 * At 1280x720 the stage scales to two thirds, so 13 px panel type renders at
 * about 8.7 px. This gives the presenter a 1.5x view of the right panel as an
 * overlay anchored to the stage's right edge, covering part of the map while it
 * is open. The panel stays where it is underneath, so the stage layout never
 * changes and a recording is unaffected.
 *
 * Explore only: it must never appear while a timeline is playing.
 */
import type { ReactNode } from 'react';
import { useApp } from './store';

export const MAGNIFIER_SCALE = 1.5;

export function Magnifier({ children }: { children: ReactNode }) {
  const setMagnified = useApp((s) => s.setMagnified);

  return (
    <div className="magnifier">
      {/* Clicking the exposed map dismisses, like any overlay. */}
      <div className="magnifier__scrim" onClick={() => setMagnified(false)} />
      <div
        className="magnifier__panel"
        style={{
          transform: `scale(${MAGNIFIER_SCALE})`,
          // Scaling from the top right grows the panel leftward over the map;
          // the box is pre-divided so the scaled result fills the body height.
          height: `calc(100% / ${MAGNIFIER_SCALE})`,
        }}
      >
        {children}
      </div>
      <div className="magnifier__hint">1.5× · Z or Esc to close</div>
    </div>
  );
}
