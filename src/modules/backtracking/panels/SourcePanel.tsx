/**
 * Spec 2 §5.4 and §5.5.
 *
 * Wording rules (CLAUDE.md §7) enforced here:
 *   - the source time always carries "±" and the range
 *   - "source located at" never appears without the ellipse on screen (the map
 *     always draws SourceLayer, and the pin and 1σ ellipse are one component)
 *   - FSS never appears without its 0.058 baseline
 */
import { backtracking, detection } from '../../../data/scenario';
import { fmtUtcLong } from '../../../lib/time';
import { EstimatedBlock, Field, NotResolvableBlock, RuleHead, TickLine } from '../../../ui/primitives';

export function SourcePanel() {
  const b = backtracking;
  const s = b.source;
  return (
    <div className="detail">
      <RuleHead left="SOURCE ESTIMATE" right={<span className="verdict verdict--oil">CONFIDENCE · HIGH</span>} />

      <div className="detail__group">
        <div className="detail__head">WHY THIS LOCATION</div>
        <TickLine>
          the three age hypotheses lie on one drift axis ({s.ellipse_axis_deg}°); the forward match selects {s.age_h} h on it
        </TickLine>
        <TickLine>forward simulation from here reproduces the observed slick (FSS {b.fss}, baseline {b.fss_baseline})</TickLine>
        <TickLine>
          slick elongation axis ({detection.S01.orientation_deg}°) is consistent with vessel heading from source
        </TickLine>
        <TickLine>
          1σ ellipse ({s.area_1sig_km2} km²) contains only {s.ais_tracks_in_1sig.length} AIS vessel tracks
        </TickLine>
      </div>

      <div className="detail__group">
        <div className="detail__head">COMPUTED</div>
        <Field label="Source location" value={`${s.lat.toFixed(4)}° N,  ${s.lon.toFixed(4)}° E`} />
        {/* Never a source time without ± and the range. */}
        <Field
          label="Source time"
          value={
            <>
              {fmtUtcLong(s.time_utc)}
              <br />
              <span className="muted">
                {s.age_h} h before the SAR image · range {b.age_window_h[0]}–{b.age_window_h[1]} h
              </span>
            </>
          }
        />
        <Field label="Age estimate" value={`${s.age_h} h  (range: ${b.age_window_h[0]} – ${b.age_window_h[1]} h)`} />
        <Field
          label="1σ uncertainty"
          value={`ellipse ${s.ellipse_1sig_nm[0]} × ${s.ellipse_1sig_nm[1]} nm semi-axes (≈${s.sigma_1sig_nm} nm equivalent radius)`}
        />
        <Field
          label="2σ uncertainty"
          value={`ellipse ${s.ellipse_2sig_nm[0]} × ${s.ellipse_2sig_nm[1]} nm semi-axes (≈${s.sigma_2sig_nm} nm equivalent radius)`}
        />
        <Field label="Cloud before refine" value={<>{b.cloud_km2.before} km² <span className="muted">(ensemble only)</span></>} />
        <Field label="Cloud after refine" value={<>{b.cloud_km2.after} km² <span className="muted">(Bayesian-optimised forward match)</span></>} />
        <Field label="Forward FSS" value={<>{b.fss} <span className="muted">(baseline: {b.fss_baseline})</span></>} />
        <Field label="Oil type (input)" value={<>{b.oil_model} <span className="muted">(reported: {detection.S01.oil_type_reported})</span></>} />
      </div>

      <EstimatedBlock title="ESTIMATED — NOT COMPUTED FROM PHYSICS">
        <Field label="Spill volume" value={<><i>{detection.S01.volume_m3[0]} – {detection.S01.volume_m3[1]} m³</i> <span className="muted">area × {detection.S01.thickness_um_assumed[0]}–{detection.S01.thickness_um_assumed[1]} µm assumed</span></>} />
        <Field label="Discharge rate" value={<><i>unknown</i> <span className="muted">single release assumed</span></>} />
        <Field label="Source depth" value={<><i>surface only</i> <span className="muted">sub-surface not modelled</span></>} />
      </EstimatedBlock>

      <NotResolvableBlock title="NOT RESOLVABLE FROM THIS DATA">
        whether the discharge was accidental or deliberate<br />
        exact vessel speed during discharge<br />
        oil fate below the surface — Stokes drift is surface only
      </NotResolvableBlock>
    </div>
  );
}

/** Spec 2 §5.5: what drives the uncertainty, and what would tighten it. */
export function UncertaintyPanel() {
  const u = backtracking.uncertainty_nm;
  const s = backtracking.source;
  const rows: [string, number, string][] = [
    ['Age unknown', u.age, 'biggest contributor'],
    ['Wind drift factor', u.wind_drift, 'HFO is 1–3%, not a fixed number'],
    ['Ocean current error', u.current, 'HYCOM accuracy in this region'],
    ['Stokes drift', u.stokes, 'wave model error'],
  ];
  return (
    <div className="detail">
      <RuleHead left="UNCERTAINTY BREAKDOWN" right={<span className="mono">1σ ≈ {s.sigma_1sig_nm} nm</span>} />

      <div className="detail__group">
        <div className="detail__head">WHAT DRIVES THE UNCERTAINTY</div>
        {rows.map(([label, nm, note]) => (
          <Field key={label} label={label} value={<>±{nm.toFixed(1)} nm <span className="muted">{note}</span></>} />
        ))}
      </div>

      <div className="detail__group">
        <div className="detail__head">HOW TO READ THE ELLIPSE</div>
        <TickLine kind="arrow">1σ ring (solid) → 68% probability the source is inside</TickLine>
        <TickLine kind="arrow">2σ ring (dashed) → 95% probability the source is inside</TickLine>
        <div className="prose muted" style={{ fontSize: 12.5 }}>
          The ellipse is elongated along the wind direction — that is physics, not a guess.
        </div>
      </div>

      <div className="detail__group">
        <div className="detail__head">WHAT WOULD TIGHTEN IT</div>
        <TickLine kind="arrow">a second SAR image 6 h earlier or later</TickLine>
        <TickLine kind="arrow">a confirmed oil type from samples (not just reported)</TickLine>
        <TickLine kind="arrow">drifter buoy data in this region during the window</TickLine>
      </div>
    </div>
  );
}
