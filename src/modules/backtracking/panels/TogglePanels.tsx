/**
 * Spec 2 §6: the three toggles.
 *
 * Wording rule (CLAUDE.md §7): never "oil will reach the coast" - coast impact
 * is always a probability with a time. Data limits are framed as transparency.
 */
import { backtracking } from '../../../data/scenario';
import { fmtUtc } from '../../../lib/time';
import { Field, TickLine } from '../../../ui/primitives';
import { OpenInNext } from '../../../ui/controls';
import { useApp } from '../../../shell/store';

export function ForecastPanel() {
  const b = backtracking;
  const risk = b.coast_risk_72h as Record<string, number>;
  const w = b.weathering_72h;
  return (
    <div className="block">
      <div className="block__head">WHERE THE OIL IS GOING</div>
      <div className="prose">72-hour forecast from the estimated source.</div>

      {b.forecast_from_source.map((f) =>
        'lat' in f ? (
          <Field
            key={f.h}
            label={`${f.h} h`}
            value={
              <>
                {f.lat!.toFixed(2)}° N, {f.lon!.toFixed(2)}° E
                {f.h === b.source.age_h + 6 && <span className="muted"> (passes the observed slick at {b.source.age_h} h)</span>}
              </>
            }
          />
        ) : (
          <Field key={f.h} label={`${f.h} h`} value={<span className="muted">{f.note}</span>} />
        ),
      )}

      <div className="detail__head" style={{ marginTop: 12 }}>COASTLINE RISK</div>
      {Object.entries(risk).map(([place, pr]) => (
        // Never "oil will reach the coast": always a probability by a time.
        <Field key={place} label={place} value={`coast impact probability: ${Math.round(pr * 100)}% by 72 h`} />
      ))}

      <div className="detail__head" style={{ marginTop: 12 }}>OIL REMAINING ON SURFACE (HFO)</div>
      <Field label="evaporated" value={<>{Math.round(w.evaporated * 100)}% <span className="muted">(HFO barely evaporates)</span></>} />
      <Field label="dispersed" value={`${Math.round(w.dispersed * 100)}%`} />
      <Field label="surface" value={<>{Math.round(w.surface * 100)}% <span className="muted">→ still largely detectable</span></>} />

      <TickLine kind="arrow">Recommend aerial survey at {b.survey}</TickLine>
    </div>
  );
}

export function DataLimitsPanel() {
  const d = backtracking.data_limits;
  return (
    <div className="block">
      <div className="block__head">WHERE THE PHYSICS COULD NOT SEE</div>

      <div className="limit">
        <div className="limit__head">HYCOM current resolution — 1/12° (~8 km)</div>
        <div className="limit__body">
          Sub-mesoscale eddies below 8 km are not captured. If a small eddy existed here, the source
          could shift ±{d.eddy_shift_nm} nm.
        </div>
      </div>
      <div className="limit">
        <div className="limit__head">ERA5 wind resolution — 0.25° (~25 km)</div>
        <div className="limit__body">
          Local wind variations below 25 km are smoothed. Typical error contribution:
          ±{d.wind_res_nm_18h} nm over {backtracking.source.age_h} h.
        </div>
      </div>
      <div className="limit">
        <div className="limit__head">Stokes drift — surface layer only</div>
        <div className="limit__body">
          Sub-surface transport is not modelled. Relevant only for dispersed oil — HFO stays at the surface.
        </div>
      </div>
      <div className="limit">
        <div className="limit__head">Backtracking limit — {d.limit_h} h</div>
        <div className="limit__body">
          Beyond {d.limit_h} h, HFO tarballs scatter randomly. We stop at {d.limit_h} h and say so.
        </div>
      </div>

      <TickLine kind="arrow">These limits are built into the 1σ ellipse — not hidden from it.</TickLine>
    </div>
  );
}

export function BacktrackHandoffPanel() {
  const b = backtracking;
  const s = b.source;
  const nextModule = useApp((st) => st.nextModule);
  const sigma = useApp((st) => st.sigma);
  const radius = b.handoff.search_radius_nm[`${sigma}sig` as '1sig' | '2sig' | '3sig'];

  return (
    <div className="block">
      <div className="block__head">SENT TO THE OTHER MODULES</div>
      <TickLine kind="arrow">
        <strong>Detection team:</strong> received slick polygon, centroid, area, oil type, SAR time
      </TickLine>
      <TickLine kind="arrow">
        <strong>Vessel team:</strong> source window {s.lat.toFixed(2)}° N, {s.lon.toFixed(2)}° E ± {s.sigma_2sig_nm} nm (2σ) · {fmtUtc(s.time_utc)} (−{s.age_h} h / +6 h)
        <br />
        <span className="muted">search radius ({sigma}σ): {radius} nm</span>
        <br />
        <span className="muted">
          AIS query window: {fmtUtc(b.handoff.ais_window_utc[0])} – {fmtUtc(b.handoff.ais_window_utc[1])}
        </span>
        <br />
        <span className="muted">backtrack points every {b.particles.output_min} min, each with a point confidence</span>
      </TickLine>

      <pre className="json-preview">{`source_lat:         ${s.lat}
source_lon:        ${s.lon}
source_time_utc:   "${s.time_utc}"
age_hours_mode:    ${s.age_h}
age_hours_min:     ${b.age_window_h[0]}
age_hours_max:     ${b.age_window_h[1]}
sigma_1sig_nm:     ${s.sigma_1sig_nm}
sigma_2sig_nm:     ${s.sigma_2sig_nm}
fss_achieved:      ${b.fss}
oil_type:          "${b.oil_model}"
cloud_area_km2:    ${b.cloud_km2.after.toFixed(1)}
backtrack_points:  [${b.backtrack_points.length} points, T0 → T−${b.backtrack_points[b.backtrack_points.length - 1].hours_before_image} h]
forecast_72h_geojson: [inline preview]`}</pre>

      <div className="block__actions">
        <button className="shell-btn">Download GeoJSON</button>
        <OpenInNext label="attribution" onClick={nextModule} />
      </div>
    </div>
  );
}
