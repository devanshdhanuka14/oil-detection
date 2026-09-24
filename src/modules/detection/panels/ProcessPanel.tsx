/**
 * Processing (spec 1 §5.1) and the elimination log (§5.2).
 *
 * Group counts come from scenario.detection.groups, and the same array drives
 * which outlines dim on the image - so the log and the picture cannot disagree
 * (acceptance item 3: exactly 29, 11 and 5).
 */
import { detection, sar } from '../../../data/scenario';
import { fmtUtc } from '../../../lib/time';
import { CountUp, TickLine } from '../../../ui/primitives';

/** Spec 1 §5.1, in order. Hoisted so the stage knows when it has completed. */
export const PROCESSING_STEPS = (): string[] => [
    'Orbit and geometry corrected',
    'Sensor noise removed, calibrated to decibels',
    'Pixels made square in metres (latitude-corrected)',
    'Speckle filtered',
    `Wind fetched for ${fmtUtc(sar.time_utc)} → ${sar.wind_ms} m/s from ${sar.wind_from_deg}°`,
    `Detectability computed → ${sar.observable_pct}% of area observable`,
];

export const PROCESSING_LINES = PROCESSING_STEPS().length;

export function ProcessPanel({ upTo = 99 }: { upTo?: number }) {
  const lines = PROCESSING_STEPS();
  return (
    <>
      {lines.map((l, i) => (
        <TickLine key={i} shown={i <= upTo}>{l}</TickLine>
      ))}
    </>
  );
}

export function EliminationPanel({
  /** How many ✗/✓ group lines have landed so far. */
  groupsShown,
  showFound,
  showMeasuring,
  animate,
}: {
  groupsShown: number;
  showFound: boolean;
  showMeasuring: boolean;
  animate: boolean;
}) {
  const rejected = detection.groups.filter((g) => g.id !== 'oil');
  const oil = detection.groups.find((g) => g.id === 'oil')!;

  return (
    <>
      <div className={`block__found${showFound ? ' is-shown' : ''}`}>
        FOUND <CountUp to={detection.counter.from} run={animate} /> dark patches
      </div>
      {showMeasuring && <div className="block__sub">measuring 40 properties each…</div>}

      {rejected.map((g, i) => (
        <TickLine key={g.id} kind="no" shown={i < groupsShown}>
          <span className="count">{g.count}</span> rejected · {g.label}
        </TickLine>
      ))}
      <TickLine kind="yes" shown={groupsShown > rejected.length}>
        <span className="count">{oil.count}</span> <strong>CONFIRMED OIL</strong>
      </TickLine>
    </>
  );
}
