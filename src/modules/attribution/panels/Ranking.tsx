/**
 * The ranking (spec 3 §5.4).
 *
 * Two rules govern this component:
 *   - the ranking sums to exactly 100% (spec 3 §11)
 *   - the "no visible ship" row is always shown, and never at 0%
 *
 * MV Tessera Bay was eliminated at stage 2, so its 0.2% cannot join the 100%.
 * It sits below the total as an annotated eliminated row, which keeps both the
 * sum rule and the demo's closing beat.
 */
import { attribution, backtracking, displayName } from '../../../data/scenario';
import { hoursBetween } from '../../../lib/time';
import { ProbBar } from '../../../ui/primitives';

const ICON: Record<string, string> = {
  'DARK-BT3': '▲',
  FIXED: '■',
  NONE: '○',
  OTHERS_35: '…',
};

export function Ranking({
  onSelect,
  selectedId,
}: {
  onSelect: (id: string) => void;
  selectedId?: string | null;
}) {
  const rows = attribution.ranking;
  const total = rows.reduce((s, r) => s + r.p, 0);
  const tessera = attribution.vessels['V-TESSERA'];

  return (
    <div className="ranking">
      <div className="block__head">RANKING</div>

      {rows.map((r, i) => {
        const isLeader = i === 0;
        const icon = ICON[r.id] ?? String(i + 1);
        return (
          <button
            key={r.id}
            className={`rank-row${isLeader ? ' is-leader' : ''}${selectedId === r.id ? ' is-selected' : ''}`}
            onClick={() => onSelect(r.id)}
          >
            <span className="rank-row__icon">{icon}</span>
            <span className="rank-row__name">{displayName(r.id)}</span>
            <ProbBar p={r.p} tone={isLeader ? 'leader' : r.id.startsWith('V-') ? 'candidate' : 'default'} />
            <span className="rank-row__pct">{Math.round(r.p * 100)}%</span>
          </button>
        );
      })}

      <div className="rank-total">
        <span>total</span>
        <span className="mono">{Math.round(total * 100)}%</span>
      </div>

      {/* Eliminated at stage 2, so outside the 100%. This row is the demo. */}
      <button
        className={`rank-row rank-row--out${selectedId === 'V-TESSERA' ? ' is-selected' : ''}`}
        onClick={() => onSelect('V-TESSERA')}
      >
        <span className="rank-row__icon">✗</span>
        <span className="rank-row__name">{tessera.name}</span>
        <span className="rank-row__note">
          arrived ~{hoursBetween(backtracking.source.time_utc, tessera.first_within_2nm_of_slick_utc)} h
          after the oil was released
        </span>
        <span className="rank-row__pct">{(tessera.p * 100).toFixed(1)}%</span>
      </button>

      <div className="rank-disclaimer">ranking of candidates, not a determination of responsibility</div>
    </div>
  );
}
