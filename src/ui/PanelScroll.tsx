/**
 * The right-hand panel's scroll container.
 *
 * Screens 2 and 3 have more panel content than 1080 px holds, and the payoff —
 * the source estimate, the ranking — is at the bottom. While a timeline is
 * running the panel follows the newest content, the way a console does, so the
 * beat that just fired is always on screen. In Explore the presenter drives,
 * and the payoff block is brought into view once.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useApp } from '../shell/store';

export function PanelScroll({ follow, children }: { follow?: unknown; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useApp((s) => s.mode);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (mode === 'explore') {
      const payoff = el.querySelector('[data-payoff]');
      if (payoff) payoff.scrollIntoView({ block: 'start', behavior: 'auto' });
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [follow, mode]);

  return (
    <div className="panel-scroll" ref={ref}>
      {children}
    </div>
  );
}
