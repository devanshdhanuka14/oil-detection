/**
 * Fixed 1920x1080 stage, scaled to fit the window and letterboxed (CLAUDE.md §3).
 * The layout inside never reflows, so a recording is frame-stable at any window
 * size, and the whole stage — footer included — is always visible.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE } from '../theme/tokens';

export function Stage1080({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(() =>
    Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h),
  );
  const holder = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const el = holder.current;
      // The holder fills the viewport; fall back to the window if it is not
      // measurable yet (first paint, or while entering fullscreen).
      const w = el?.clientWidth || window.innerWidth;
      const h = el?.clientHeight || window.innerHeight;
      setScale(Math.min(w / STAGE.w, h / STAGE.h));
    };
    fit();

    // ResizeObserver catches fullscreen and any container change that a window
    // resize event does not fire for; the rest are belt and braces.
    const ro = new ResizeObserver(fit);
    if (holder.current) ro.observe(holder.current);
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    document.addEventListener('fullscreenchange', fit);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      document.removeEventListener('fullscreenchange', fit);
    };
  }, []);

  return (
    <div ref={holder} className="stage-holder">
      <div
        className="stage"
        style={{
          width: STAGE.w,
          height: STAGE.h,
          // Centred by translate rather than by layout alignment: a grid or
          // flex item larger than its container start-aligns instead of
          // centring (safe alignment), which pushed the footer off-screen on
          // any window shorter than 1080.
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
