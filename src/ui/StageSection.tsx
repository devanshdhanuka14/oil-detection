/**
 * A stage in the right-hand panel.
 *
 * While a stage is running it stays open, so the synchronised left/right
 * moments are seen as they happen — a stage never collapses before its lines
 * have been read. Once it completes it folds to a one-line summary carrying its
 * key result, which is what makes room for the payoff block below.
 *
 * Clicking a summary reopens it. Only one completed stage is open at a time;
 * the payoff block is always open.
 */
import type { ReactNode } from 'react';
import { useApp } from '../shell/store';

export function StageSection({
  id,
  title,
  summary,
  done,
  children,
}: {
  id: string;
  title: string;
  /** The stage's key result, shown on the collapsed row. */
  summary: ReactNode;
  done: boolean;
  children: ReactNode;
}) {
  const expandedStage = useApp((s) => s.expandedStage);
  const setExpandedStage = useApp((s) => s.setExpandedStage);

  // A running stage is always open. A finished one is open only if chosen.
  const open = !done || expandedStage === id;

  if (!open) {
    return (
      <button className="stage-sum" onClick={() => setExpandedStage(id)} title="Expand">
        <span className="stage-sum__tick">✓</span>
        <span className="stage-sum__title">{title}</span>
        <span className="stage-sum__dot">·</span>
        <span className="stage-sum__result">{summary}</span>
        <span className="stage-sum__chev">▾</span>
      </button>
    );
  }

  return (
    <section className="block stage-open">
      <button
        className={`block__head stage-open__head${done ? ' is-clickable' : ''}`}
        onClick={done ? () => setExpandedStage(null) : undefined}
        disabled={!done}
      >
        {title}
        {done && <span className="stage-open__chev">▴</span>}
      </button>
      {children}
    </section>
  );
}
