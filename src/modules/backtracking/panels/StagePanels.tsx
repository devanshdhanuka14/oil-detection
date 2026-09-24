/**
 * Spec 2 §5.1–5.3: the three running stages.
 *
 * The wind drift factor line (1.6%, not the usual 3%) and the FSS pair
 * (0.14 against a 0.058 baseline) are the two lines the spec says earn the most
 * credibility, so both are read straight from scenario.json.
 */
import { backtracking, detection } from '../../../data/scenario';
import { fmtUtc } from '../../../lib/time';
import { TickLine } from '../../../ui/primitives';

export function Stage1Panel({ upTo = 99 }: { upTo?: number }) {
  const b = backtracking;
  const w = b.weights as Record<string, number>;
  return (
    <>
      <TickLine shown={upTo >= 0}>Slick area received: {detection.S01.area_km2} km²</TickLine>
      <TickLine shown={upTo >= 1}>
        Oil type: HFO (reported: {detection.S01.oil_type_reported}) → spreading constant C = {b.spreading_C}
      </TickLine>
      <TickLine shown={upTo >= 2}>
        Fay inversion: spill is {b.fay_h[0]}–{b.fay_h[1]} h old{' '}
        <span className="muted">(volume {detection.S01.volume_m3[0]}–{detection.S01.volume_m3[1]} m³ assumed)</span>
      </TickLine>
      <TickLine shown={upTo >= 3}>SAR shape: elongated, not yet fragmented → confirms {b.morphology}</TickLine>
      <TickLine shown={upTo >= 4}>Age window finalised: {b.hypotheses_h.join(' h · ')} h</TickLine>
      <TickLine shown={upTo >= 5}>
        Weights: 24 h most likely ({w['24'].toFixed(2)}), 36 h next ({w['36'].toFixed(2)})
      </TickLine>
    </>
  );
}

export function Stage2Panel({ upTo = 99 }: { upTo?: number }) {
  const f = backtracking.forcing;
  return (
    <>
      <TickLine shown={upTo >= 0}>HYCOM ocean currents → {f.current} at source region</TickLine>
      <TickLine shown={upTo >= 1}>ERA5 wind → {f.wind} at source region</TickLine>
      <TickLine shown={upTo >= 2}>CMEMS Stokes drift → {f.stokes} (wave-driven)</TickLine>
      <TickLine shown={upTo >= 3}>
        Wind drift factor → {f.wind_drift_factor_pct}% <span className="muted">(HFO: thick slick, low wind coupling)</span>
      </TickLine>
      <TickLine shown={upTo >= 4}>Ekman deflection → {f.ekman_deg}° to right of wind</TickLine>
      <TickLine shown={upTo >= 5}>
        Forcing window → {fmtUtc(f.window_utc[0])} → {fmtUtc(f.window_utc[1])}
      </TickLine>
    </>
  );
}

export function Stage3Panel({ refined, shown = true }: { refined: boolean; shown?: boolean }) {
  const b = backtracking;
  const c = b.centroids as Record<string, number[]>;
  const w = b.weights as Record<string, number>;
  // Which hypothesis is "best weighted" follows from the weights, not a literal.
  const best = b.hypotheses_h.reduce((a, h) => (w[String(h)] > w[String(a)] ? h : a), b.hypotheses_h[0]);
  if (!shown) return null;

  return (
    <>

      <div className="stage3__run">
        <div>{b.particles.total} particles run backward <span className="muted">({b.particles.per_hypothesis} per age hypothesis)</span></div>
        <div className="muted">each particle carries its own current, wind, diffusion</div>
        <div className="muted">
          integration step: {b.particles.step_min} min · output saved every {b.particles.output_min} min
        </div>
      </div>

      <table className="mini-table">
        <tbody>
          {b.hypotheses_h.map((h) => (
            <tr key={h} className={h === best ? 'is-best' : undefined}>
              <td>Age {h} h</td>
              <td>→ source cloud centroid</td>
              <td className="mono">{c[String(h)][0].toFixed(2)}° N, {c[String(h)][1].toFixed(2)}° E</td>
              <td className="muted">{h === best ? '← best weighted' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="stage3__cloud">
        Combined cloud: <strong>{b.cloud_km2.before} km²</strong> <span className="muted">(before refinement)</span>
      </div>

      <div className="block__head" style={{ marginTop: 14 }}>FORWARD MATCH</div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
        checking if the source reproduces the observed slick
      </div>
      <TickLine kind="arrow">running {b.forward_sims} forward simulations from the candidate source region</TickLine>
      <TickLine kind="arrow">
        best match at {b.source.lat.toFixed(2)}° N, {b.source.lon.toFixed(2)}° E, T = {b.source.age_h} h
      </TickLine>
      {/* Wording rule: FSS never appears without its baseline. */}
      <TickLine kind="arrow">
        match quality: FSS = {b.fss} <span className="muted">(baseline is {b.fss_baseline})</span>
      </TickLine>

      {refined && (
        <div className="stage3__refined">
          Source cloud refined: {b.cloud_km2.before} km² → <strong>{b.cloud_km2.after} km²</strong>
        </div>
      )}
    </>
  );
}
