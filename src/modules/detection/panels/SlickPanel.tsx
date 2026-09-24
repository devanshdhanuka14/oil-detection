/**
 * The S01 panel (spec 1 §5.3) and the rejected-patch panel (§5.4).
 *
 * Wording rules (CLAUDE.md §7) are load-bearing here:
 *   - a rejected patch is never "oil spill detected"; it reads "dark patch,
 *     judged not oil"
 *   - volume, oil type and density never appear without "estimated",
 *     "reported" or "assigned", which is what the EstimatedBlock guarantees
 */
import { detection } from '../../../data/scenario';
import type { Patch } from '../../../lib/generators/patches';
import { EstimatedBlock, Field, NotResolvableBlock, RuleHead, TickLine } from '../../../ui/primitives';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const coord = (lat: number, lon: number) => `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;

export function SlickPanelS01({ areaKm2, level }: { areaKm2: number; level: string }) {
  const s = detection.S01;
  return (
    <div className="detail">
      <RuleHead
        left="SLICK S01"
        right={<span className="verdict verdict--oil">OIL · {pct(s.oil_prob)} · {s.confidence}</span>}
      />

      <div className="detail__group">
        <div className="detail__head">WHY</div>
        <TickLine>edge sharpness {s.edge_sharpness_db_per_m} dB/m — {s.edge_ratio}× sharper than typical sea</TickLine>
        <TickLine>elongation {s.elongation} — long and thin, consistent with a moving discharge</TickLine>
        <TickLine>{Math.abs(s.contrast_db)} dB darker than the surrounding sea</TickLine>
        <TickLine>{s.above_noise_db} dB above the sensor noise floor — a real signal</TickLine>
      </div>

      <div className="detail__group">
        <div className="detail__head">MEASURED</div>
        <Field label="Centre" value={coord(s.centre[0], s.centre[1])} />
        <Field label="Area" value={<>{areaKm2.toFixed(1)} km² <span className="muted">({level})</span></>} />
        <Field label="Length · Width" value={`${s.length_km.toFixed(1)} km · ${s.width_m} m`} />
        <Field label="Orientation" value={<>{s.orientation_deg}° (NW–SE)<span className="sep" /> Fragments {s.fragments}</>} />
        <Field label="Fresh end (head)" value={<>{coord(s.fresh_end[0], s.fresh_end[1])} <span className="muted">(confidence {s.fresh_end_conf.toFixed(2)})</span></>} />
        <Field label="Old end (tail)" value={coord(s.tail[0], s.tail[1])} />
        <Field label="Darkness" value={`${s.vv_db} dB VV · ${s.vh_db} dB VH`} />
        <Field label="vs expected" value={<>{s.expected_db} dB <span className="muted">[CMOD model + ERA5 wind]</span></>} />
        <Field label="Damping class" value={<>{s.damping}<span className="sep" /> Observable share {s.observable_share_pct}%</>} />
      </div>

      <EstimatedBlock title="ESTIMATED — NOT MEASURED">
        <Field label="Freshness" value={<><i>{s.freshness}</i> <span className="muted">from shape</span></>} />
        <Field label="Volume" value={<><i>{s.volume_m3[0]} – {s.volume_m3[1]} m³</i> <span className="muted">area × {s.thickness_um_assumed[0]}–{s.thickness_um_assumed[1]} µm assumed</span></>} />
        <Field label="Oil type" value={<><i>{s.oil_type_reported}</i> <span className="muted">REPORTED by authorities</span></>} />
        <Field label="Density" value={<><i>from reported type</i> <span className="muted">ASSIGNED, NOT MEASURED</span></>} />
      </EstimatedBlock>

      <NotResolvableBlock title="NOT MEASURABLE FROM RADAR">
        density · viscosity · sulphur · flash point · oil below the surface
      </NotResolvableBlock>
    </div>
  );
}

/**
 * A rejected patch. S14's values come from scenario.detection.S14_rejected_example;
 * any other look-alike shows its own generated measurements and its group reason.
 */
export function RejectedPanel({ patch }: { patch: Patch }) {
  // Every value is carried on the patch itself, derived by the seeded generator
  // from the same shape the radar image was drawn from. S14 carries the values
  // scenario.detection.S14_rejected_example states.
  const isS14 = patch.id === 'S14';

  return (
    <div className="detail">
      <RuleHead
        left={`PATCH ${patch.id}`}
        right={<span className="verdict verdict--not">NOT OIL · {pct(patch.oilProb)}</span>}
      />
      <div className="detail__note">dark patch, judged not oil</div>

      <div className="detail__group">
        <div className="detail__head">WHY NOT</div>
        {patch.group === 'fuzzy' && (
          <TickLine kind="no">edges fade gradually — {patch.edgeRatio}× typical sharpness</TickLine>
        )}
        {patch.group === 'blobby' && (
          <TickLine kind="no">blobby shape, elongation {patch.elongation.toFixed(1)}</TickLine>
        )}
        {patch.group === 'noise' && (
          <TickLine kind="no">signal at the sensor noise floor</TickLine>
        )}
        {isS14 && <TickLine kind="no">blobby shape, elongation {patch.elongation}</TickLine>}
        <TickLine kind="no">only {Math.abs(patch.depthDb).toFixed(1)} dB darker than the surrounding sea</TickLine>
        <TickLine kind="arrow">{patch.verdict}</TickLine>
      </div>
    </div>
  );
}
