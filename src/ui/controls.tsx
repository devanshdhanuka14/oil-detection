/** Toggles, sliders and layer chips. The specs' only interaction surface. */
import type { ReactNode } from 'react';

export function ToggleBar({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="togglebar">
      {options.map((o) => (
        <button
          key={o.id}
          className={`togglebar__btn${value === o.id ? ' is-active' : ''}`}
          onClick={() => onChange(value === o.id ? null : o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A discrete slider: the specs only ever use fixed stops, never a free range. */
export function StepSlider<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  caption,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  caption?: ReactNode;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="stepslider">
      <div className="stepslider__row">
        <span className="stepslider__label">{label}</span>
        <div className="stepslider__stops">
          {options.map((o, k) => (
            <button
              key={String(o.value)}
              className={`stepslider__stop${k === i ? ' is-active' : ''}`}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {caption && <div className="stepslider__caption">{caption}</div>}
    </div>
  );
}

export function LayerChips({
  chips,
  hidden,
  onToggle,
}: {
  chips: { id: string; label: string; swatch?: string; dashed?: boolean; hatch?: boolean }[];
  hidden: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="chips">
      {chips.map((c) => (
        <button
          key={c.id}
          className={`chip${hidden[c.id] ? ' is-off' : ''}`}
          onClick={() => onToggle(c.id)}
        >
          <span
            className={`chip__swatch${c.dashed ? ' is-dashed' : ''}${c.hatch ? ' is-hatch' : ''}`}
            style={c.swatch ? { borderColor: c.swatch, background: c.hatch ? undefined : `${c.swatch}33` } : undefined}
          />
          {c.label}
        </button>
      ))}
    </div>
  );
}

/** The "Open in next module →" link every hand-off panel carries (CLAUDE.md §2). */
export function OpenInNext({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="open-next" onClick={onClick}>
      Open in {label} →
    </button>
  );
}
