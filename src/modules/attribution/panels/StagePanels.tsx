/**
 * Spec 3 §5.1–5.3: inputs received, the AIS filter, and the rewind loop.
 *
 * The stage 1 lines echo the other two teams' hand-off panels word for word.
 * That echo is the integration proof, so every value is read from the same
 * scenario fields those panels read.
 */
import { attribution, backtracking, detection, displayName, sar } from '../../../data/scenario';
import { fmtStep, fmtUtc } from '../../../lib/time';
import { Meter, TickLine } from '../../../ui/primitives';
import type { Outcome, Step } from '../stopRule';

export function InputsPanel({ upTo = 99 }: { upTo?: number }) {
  const s = backtracking.source;
  const w = backtracking.handoff.ais_window_utc;
  const nearest = detection.bright_targets.find((t) => t.note)!;
  return (
    <>
      <TickLine shown={upTo >= 0}>From detection: slick S01 outline · SAR time {fmtUtc(sar.time_utc)}</TickLine>
      <TickLine shown={upTo >= 1}>
        From detection: {detection.bright_targets.length} radar bright targets ({nearest.note})
      </TickLine>
      <TickLine shown={upTo >= 2}>From drift: backtrack points every {backtracking.particles.output_min} min, each with a confidence</TickLine>
      <TickLine shown={upTo >= 3}>
        From drift: source {s.lat.toFixed(2)}° N, {s.lon.toFixed(2)}° E ± {s.sigma_2sig_nm} nm (2σ) · {fmtUtc(s.time_utc)}
      </TickLine>
      <TickLine shown={upTo >= 4}>
        AIS window: {fmtUtc(w[0])} → {fmtUtc(w[1])} · radius {backtracking.handoff.search_radius_nm['3sig']} nm
      </TickLine>
    </>
  );
}

export function FilterPanel({ groupsShown }: { groupsShown: number }) {
  const rejected = attribution.filter_groups.filter((g) => g.id !== 'cand');
  const cand = attribution.filter_groups.find((g) => g.id === 'cand')!;
  return (
    <>
      <div className="block__found is-shown">FOUND {attribution.counter.in_window} vessels in the window</div>
      {rejected.map((g, i) => (
        <TickLine key={g.id} kind="no" shown={i < groupsShown}>
          <span className="count">{g.count}</span> {g.label}
        </TickLine>
      ))}
      <TickLine kind="yes" shown={groupsShown > rejected.length}>
        <span className="count">{cand.count}</span> <strong>CANDIDATES</strong> enter the rewind loop
      </TickLine>
    </>
  );
}

/**
 * The rewind loop table and the two meters.
 *
 * The falling bar is the drift team's point confidence; the rising bar is our
 * leader probability. The stop is the moment the rising bar crosses its tick
 * while the falling bar is still above its own - both teams' outputs meeting in
 * one rule.
 */
export function LoopPanel({
  outcome,
  threshold,
  currentH,
}: {
  outcome: Outcome;
  threshold: number;
  currentH: number;
}) {
  const rule = attribution.stop_rule;
  const shown = outcome.shown.filter((s) => s.h <= currentH);
  const now = shown[shown.length - 1] ?? outcome.shown[0];
  const stopped = currentH >= outcome.stop.h;

  return (
    <>
      <div className="loop__rule">
        stop when all three hold: leader ≥ {Math.round(threshold * 100)}% · margin ≥{' '}
        {Math.round(rule.min_margin * 100)} pts · point confidence ≥ {rule.point_conf_floor.toFixed(2)}
      </div>

      <div className="loop__meters">
        <Meter
          label="backtrack point confidence (drift team)"
          value={now.pointConfidence}
          tick={rule.point_conf_floor}
          tickLabel={`floor ${rule.point_conf_floor}`}
          tone={now.pointConfidence < rule.point_conf_floor ? 'warn' : 'default'}
          format={(v) => v.toFixed(2)}
        />
        <Meter
          label="leader probability (ours)"
          value={now.p ?? 0}
          tick={threshold}
          tickLabel={`threshold ${threshold}`}
          tone={(now.p ?? 0) >= threshold ? 'good' : 'default'}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <table className="loop-table">
        <thead>
          <tr>
            <th>step</th>
            <th>point conf</th>
            <th>radius</th>
            <th>in circle</th>
            <th>leader</th>
            <th>p</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((s) => (
            <tr key={s.h} className={s.h === outcome.stop.h && stopped ? 'is-stop' : undefined}>
              <td>{fmtStep(s.h)}</td>
              <td>{s.pointConfidence.toFixed(2)}</td>
              <td>{s.radiusNm.toFixed(1)} nm</td>
              <td>{s.in_circle}</td>
              <td>{s.leader ? displayName(s.leader) : '—'}</td>
              <td>{s.p == null ? '—' : `${Math.round(s.p * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {shown.map((s) =>
        outcome.blockedBy.has(s.h) ? (
          <div key={`b${s.h}`} className="loop__blocked">{outcome.blockedBy.get(s.h)}</div>
        ) : null,
      )}

      {stopped && <StopLine outcome={outcome} threshold={threshold} />}
    </>
  );
}

function StopLine({ outcome, threshold }: { outcome: Outcome; threshold: number }) {
  const rule = attribution.stop_rule;
  const s: Step = outcome.stop;

  // "not conclusive" is a valid result and is styled as one, not as an error.
  if (!outcome.conclusive) {
    return (
      <div className="loop__stop loop__stop--inconclusive">
        <strong>■ STOP · {fmtStep(s.h)}</strong>
        <div>
          point confidence reached the floor {rule.point_conf_floor.toFixed(2)} before any candidate
          reached {Math.round(threshold * 100)}%.
        </div>
        <div className="loop__verdict">
          {displayName(s.leader!)} leads at {Math.round((s.p ?? 0) * 100)}% → <strong>leading candidate, not conclusive</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="loop__stop">
      <strong>■ STOP</strong> · leader {Math.round((s.p ?? 0) * 100)}% ≥ {Math.round(threshold * 100)}% · margin{' '}
      {Math.round((s.margin ?? 0) * 100)} pts ≥ {Math.round(rule.min_margin * 100)} · point confidence{' '}
      {s.pointConfidence.toFixed(2)} ≥ {rule.point_conf_floor.toFixed(2)}
    </div>
  );
}
