/**
 * Shared panel primitives. The ESTIMATED and NOT RESOLVABLE blocks look
 * identical on all three screens (CLAUDE.md §5) - that consistency is the point,
 * so they live here rather than in any one module.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from '../theme/tokens';

/* ── Panel ─────────────────────────────────────────────────────────────── */

export function Panel({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      {title && (
        <header className="panel__head">
          <span className="panel__title">{title}</span>
          {right && <span className="panel__right">{right}</span>}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}

/** A rule with a label, as the specs draw it: `── SLICK S01 ──── OIL 91% ──`. */
export function RuleHead({ left, right }: { left: string; right?: ReactNode }) {
  return (
    <div className="rule-head">
      <span className="rule-head__left">{left}</span>
      <span className="rule-head__fill" aria-hidden />
      {right && <span className="rule-head__right">{right}</span>}
    </div>
  );
}

/* ── Tick lines ────────────────────────────────────────────────────────── */

export type TickKind = 'yes' | 'no' | 'none' | 'arrow';

/**
 * One reasoning line. The icon ticks in first, then the text fades and slides
 * (CLAUDE.md §5). `shown` drives it so a GSAP timeline can stay the only clock.
 */
export function TickLine({
  kind = 'yes',
  children,
  shown = true,
  dim = false,
}: {
  kind?: TickKind;
  children: ReactNode;
  shown?: boolean;
  dim?: boolean;
}) {
  const icon = kind === 'yes' ? '✓' : kind === 'no' ? '✗' : kind === 'arrow' ? '→' : '';
  return (
    <div
      className={`tick tick--${kind}${shown ? ' is-shown' : ''}${dim ? ' is-dim' : ''}`}
      style={{ transitionDuration: `${motion.panelLineFadeMs}ms` }}
    >
      <span className="tick__icon" aria-hidden>{icon}</span>
      <span className="tick__text">{children}</span>
    </div>
  );
}

/** A label/value row, values in mono so columns line up. */
export function Field({ label, value, mono = true }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <span className={`field__value${mono ? ' is-mono' : ''}`}>{value}</span>
    </div>
  );
}

/* ── ESTIMATED / NOT RESOLVABLE blocks ─────────────────────────────────── */

/**
 * CLAUDE.md §5: background #1A2438, 3 px amber left bar, italic values, own
 * header. Identical on all three screens. Wording rule §7: no volume, density
 * or oil type appears without "estimated", "reported" or "assigned" beside it -
 * this block is how that promise is kept visible.
 */
export function EstimatedBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="estimated">
      <div className="estimated__head">{title}</div>
      <div className="estimated__body">{children}</div>
    </div>
  );
}

/** "NOT RESOLVABLE / NOT MEASURABLE": muted text, no icons (CLAUDE.md §5). */
export function NotResolvableBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="notres">
      <div className="notres__head">{title}</div>
      <div className="notres__body">{children}</div>
    </div>
  );
}

/* ── Numbers ───────────────────────────────────────────────────────────── */

/** Counts up over 400 ms (CLAUDE.md §5). The final value is always exact. */
export function CountUp({ to, decimals = 0, suffix = '', run = true }: { to: number; decimals?: number; suffix?: string; run?: boolean }) {
  const [v, setV] = useState(run ? 0 : to);
  const raf = useRef(0);

  useEffect(() => {
    if (!run) { setV(to); return; }
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / motion.countUpMs);
      // ease-out so the last digits settle rather than snap
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else setV(to);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, run]);

  return <span className="num">{v.toFixed(decimals)}{suffix}</span>;
}

/* ── Meters and bars ───────────────────────────────────────────────────── */

/** A bar with an optional threshold tick, used by both rewind-loop meters. */
export function Meter({
  label,
  value,
  tick,
  tickLabel,
  format,
  tone = 'default',
}: {
  label: string;
  value: number;
  tick?: number;
  tickLabel?: string;
  format?: (v: number) => string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`meter meter--${tone}`}>
      <div className="meter__top">
        <span className="meter__label">{label}</span>
        <span className="meter__value">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${pct}%` }} />
        {tick !== undefined && (
          <div className="meter__tick" style={{ left: `${tick * 100}%` }} title={tickLabel} />
        )}
      </div>
    </div>
  );
}

/** A ranking row's probability bar, drawn in blocks as the spec sketches it. */
export function ProbBar({ p, tone = 'default', blocks = 8 }: { p: number; tone?: 'leader' | 'candidate' | 'default'; blocks?: number }) {
  const filled = Math.round(p * blocks);
  return (
    <span className={`probbar probbar--${tone}`} aria-hidden>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className={`probbar__cell${i < filled ? ' is-on' : ''}`} />
      ))}
    </span>
  );
}
