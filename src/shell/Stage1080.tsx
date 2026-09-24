/**
 * Fixed 1920x1080 stage, scaled to fit the window and letterboxed (CLAUDE.md §3).
 * The layout inside never reflows, so a recording is frame-stable at any window size.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE } from '../theme/tokens';

export function Stage1080({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = () => {
      const el = holder.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(width / STAGE.w, height / STAGE.h));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div ref={holder} className="stage-holder">
      <div
        className="stage"
        style={{ width: STAGE.w, height: STAGE.h, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
