/**
 * Spec 1 §6: the two toggles. Blind areas is framed as a tasking
 * recommendation, not an apology; the hand-off shows real field names because
 * judges score integration.
 */
import { detection, sar } from '../../../data/scenario';
import { fmtUtc } from '../../../lib/time';
import { TickLine } from '../../../ui/primitives';
import { OpenInNext } from '../../../ui/controls';
import { useApp } from '../../../shell/store';

export function BlindPanel() {
  return (
    <div className="block">
      <div className="block__head">WHERE WE COULD NOT SEE</div>
      <p className="prose">
        {100 - sar.observable_pct}% of this area was not observable.
        <br />
        Wind there was {sar.blind_area_wind_ms} m/s. Below ~3 m/s the whole sea is dark, so no
        satellite could have seen oil — ours included.
      </p>
      <TickLine kind="arrow">Recommend re-imaging on the next pass, {fmtUtc(sar.next_pass_utc)}.</TickLine>
    </div>
  );
}

export function HandoffPanel() {
  const nextModule = useApp((s) => s.nextModule);
  const nearest = detection.bright_targets.find((t) => t.note)!;

  return (
    <div className="block">
      <div className="block__head">SENT TO THE OTHER MODULES</div>
      <TickLine kind="arrow">
        <strong>Drift team:</strong> outline (3 confidence levels), head/tail, area, time, wind
      </TickLine>
      <TickLine kind="arrow">
        <strong>Vessel team:</strong> slick outline, SAR time + {detection.bright_targets.length} radar bright targets
        <br />
        <span className="muted">nearest is {nearest.note}</span>
      </TickLine>

      <pre className="json-preview">{`slick_id:        "S01"
sar_time_utc:    "${sar.time_utc}"
outline_km2:     { tight: ${detection.S01.outline_levels.tight_km2}, expected: ${detection.S01.outline_levels.expected_km2}, generous: ${detection.S01.outline_levels.generous_km2} }
fresh_end:       [${detection.S01.fresh_end[0]}, ${detection.S01.fresh_end[1]}]
tail:            [${detection.S01.tail[0]}, ${detection.S01.tail[1]}]
wind:            { ms: ${sar.wind_ms}, from_deg: ${sar.wind_from_deg} }
bright_targets:  ${detection.bright_targets.length}`}</pre>

      <div className="block__actions">
        <button className="shell-btn">Download GeoJSON</button>
        <OpenInNext label="backtracking" onClick={nextModule} />
      </div>
    </div>
  );
}
