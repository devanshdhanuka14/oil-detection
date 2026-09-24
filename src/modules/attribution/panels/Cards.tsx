/**
 * Vessel cards (spec 3 §5.5–5.8).
 *
 * Wording rules (CLAUDE.md §7): never "polluter identified", "responsible" or
 * "guilty" - always "leading candidate · X% · not a determination". A bright
 * target is never a "vessel identified"; it is "possible vessel, radar only,
 * not AIS". MMSIs always carry "(synthetic)".
 */
import { attribution, backtracking, detection, sar } from '../../../data/scenario';
import { fmtDuration, fmtHm, fmtUtc, hoursBetween } from '../../../lib/time';
import type { AisTrack } from '../../../lib/generators/aisTracks';
import { EstimatedBlock, Field, NotResolvableBlock, RuleHead, TickLine } from '../../../ui/primitives';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function LeaderCard() {
  const v = attribution.vessels['V-A'];
  const p = attribution.ranking.find((r) => r.id === 'V-A')!.p;
  const [from, to] = v.match_window_utc;

  return (
    <div className="detail">
      <RuleHead
        left={v.name.toUpperCase()}
        right={<span className="verdict verdict--leader">LEADING CANDIDATE · {pct(p)} · NOT A DETERMINATION</span>}
      />

      <div className="detail__group">
        <div className="detail__head">WHY</div>
        <TickLine>
          inside the rewound oil for {fmtDuration(from, to)}{' '}
          <span className="muted">({fmtUtc(from)} – {fmtHm(to)})</span>
        </TickLine>
        <TickLine>explains {pct(v.coverage)} of the slick's particles</TickLine>
        <TickLine>
          heading {v.cog}° vs slick axis {(detection.S01.orientation_deg + 180) % 360}° —{' '}
          {v.parity_off_deg}° off parallel
        </TickLine>
        <TickLine>{v.min_distance_nm} nm from the backtracked point at the matching time</TickLine>
        <TickLine>slowed from {v.speed_change}</TickLine>
      </div>

      <div className="detail__group">
        <div className="detail__head">MEASURED (AIS)</div>
        <Field label="MMSI" value={v.mmsi} />
        <Field label="Type" value={v.type} />
        <Field label="Length" value={`${v.length_m} m`} />
        <Field label="Draught" value={`${v.draught_m} m of ${v.max_draught_m} m max`} />
        <Field label="Course" value={`${v.cog}°`} />
        <Field label="Destination" value={v.destination} />
        <Field label="AIS gaps" value={v.ais_gaps.length === 0 ? 'none in the window' : `${v.ais_gaps.length}`} />
      </div>

      <EstimatedBlock title="ESTIMATED — NOT MEASURED">
        <Field label="Loaded state" value={<><i>likely</i> <span className="muted">from self-reported draught</span></>} />
        <Field label="Vessel type" value={<><i>{v.type.toLowerCase()}</i> <span className="muted">self-reported in AIS</span></>} />
        <Field label="Release window" value={<><i>{fmtHm(from)} – {fmtHm(to)}</i> <span className="muted">inferred from overlap, not observed</span></>} />
      </EstimatedBlock>

      <NotResolvableBlock title="NOT RESOLVABLE FROM THIS DATA">
        whether oil was actually discharged, or the ship only passed through<br />
        accidental vs deliberate · what was discharged
      </NotResolvableBlock>

      <TickLine kind="arrow">
        Recommend: port-state inspection at JNPT and review of the oil record book
      </TickLine>
    </div>
  );
}

/** Spec 3 §5.6. "This panel is the demo. Make sure the script clicks it." */
export function TrapCard() {
  const v = attribution.vessels['V-TESSERA'];
  return (
    <div className="detail">
      <RuleHead
        left={v.name.toUpperCase()}
        right={<span className="verdict verdict--not">{(v.p * 100).toFixed(1)}% · NOT A LIKELY SOURCE</span>}
      />
      <div className="detail__group">
        <div className="detail__head">WHY NOT</div>
        <TickLine kind="no">
          came within 2 nm of the slick only at {fmtHm(v.first_within_2nm_of_slick_utc)} UTC,{' '}
          {fmtDuration(v.first_within_2nm_of_slick_utc, sar.time_utc)} before the image
        </TickLine>
        <TickLine kind="no">
          the oil had already been on the water for about{' '}
          {hoursBetween(backtracking.source.time_utc, v.first_within_2nm_of_slick_utc)} h
        </TickLine>
        <TickLine kind="no">never inside the rewound oil at any matching time</TickLine>
        <TickLine kind="arrow">
          nearest ship ≠ source. This is the most common false attribution.
        </TickLine>
      </div>
      <div className="detail__group">
        <div className="detail__head">MEASURED (AIS)</div>
        <Field label="MMSI" value={v.mmsi} />
        <Field label="Type" value={v.type} />
        <Field label="Course · Speed" value={`${v.cog}° · ${v.sog} kn`} />
      </div>
    </div>
  );
}

export function CandidateCard({ id }: { id: 'V-B' | 'V-C' }) {
  const v = attribution.vessels[id] as Record<string, unknown>;
  const p = attribution.ranking.find((r) => r.id === id)!.p;
  const gap = (v.ais_gaps as { minutes: number; offshore_nm: number; verdict: string }[] | undefined)?.[0];

  return (
    <div className="detail">
      <RuleHead
        left={String(v.name).toUpperCase()}
        right={<span className="verdict verdict--cand">CANDIDATE · {pct(p)} · NOT A DETERMINATION</span>}
      />
      <div className="detail__group">
        <div className="detail__head">WHY</div>
        {id === 'V-B' ? (
          <>
            <TickLine>
              inside the rewound oil for{' '}
              {fmtDuration((v.match_window_utc as string[])[0], (v.match_window_utc as string[])[1])} around{' '}
              {fmtHm((v.match_window_utc as string[])[0])} UTC
            </TickLine>
            <TickLine kind="no">heading {String(v.cog)}°, {String(v.parity_off_deg)}° off parallel</TickLine>
            <TickLine kind="no">no slowdown — {String(v.speed_change)}</TickLine>
            <TickLine>explains {pct(v.coverage as number)} of the slick's particles</TickLine>
            {gap && (
              <TickLine kind="none">
                AIS gap of {gap.minutes} min at {gap.offshore_nm} nm offshore —{' '}
                <i className="muted">{gap.verdict}</i>
              </TickLine>
            )}
          </>
        ) : (
          <>
            <TickLine>
              loitering in a fishing pattern near the source,{' '}
              {fmtHm((v.loiter_utc as string[])[0])}–{fmtHm((v.loiter_utc as string[])[1])} UTC
            </TickLine>
            <TickLine kind="no">small craft, so a low type prior</TickLine>
            <TickLine kind="no">no consistent heading</TickLine>
            <TickLine>explains {pct(v.coverage as number)} of the slick's particles</TickLine>
          </>
        )}
      </div>
      <div className="detail__group">
        <div className="detail__head">MEASURED (AIS)</div>
        <Field label="MMSI" value={String(v.mmsi)} />
        <Field label="Type" value={String(v.type)} />
        {'length_m' in v && <Field label="Length" value={`${v.length_m} m`} />}
      </div>
    </div>
  );
}

/** The dark target: radar only. Never called a vessel. */
export function DarkCard() {
  const d = attribution.dark;
  return (
    <div className="detail">
      <RuleHead left={`DARK TARGET ${d.bright_target}`} right={<span className="verdict verdict--cand">{pct(d.p)}</span>} />
      <div className="detail__note">possible vessel, radar only, not AIS</div>
      <div className="detail__group">
        <TickLine>about {d.est_length_m} m long, {d.distance_from_fresh_end_km} km NW of the fresh end at image time</TickLine>
        <TickLine>within {d.alignment_off_deg}° of the slick axis</TickLine>
        <TickLine kind="none">
          <span className="muted">vessels under 300 GT need not carry AIS</span>
        </TickLine>
      </div>
    </div>
  );
}

export function FixedCard() {
  const f = attribution.fixed;
  return (
    <div className="detail">
      <RuleHead left="FIXED SOURCE" right={<span className="verdict verdict--cand">{pct(f.p)}</span>} />
      <div className="detail__group">
        <TickLine kind="none">{f.note}</TickLine>
      </div>
    </div>
  );
}

/** "no visible ship" is always in the ranking and never zero. */
export function NoneCard() {
  const p = attribution.ranking.find((r) => r.id === 'NONE')!.p;
  return (
    <div className="detail">
      <RuleHead left="NO VISIBLE SHIP" right={<span className="verdict verdict--cand">{pct(p)}</span>} />
      <div className="detail__group">
        <TickLine kind="none">
          The release may have come from a vessel that was never visible to AIS or radar in this
          window. This option is always ranked, and it is never zero.
        </TickLine>
      </div>
    </div>
  );
}

/** Spec 3 §5.7: any dimmed track shows its group's reason. */
export function EliminatedCard({ track }: { track: AisTrack }) {
  const group = attribution.filter_groups.find((g) => g.id === track.group);
  // The bar a candidate had to clear: the search radius at the stop step, not
  // any one vessel's closest approach.
  const stopH = attribution.loop_rows.find((r) => r.stop_at_default)!.h;
  const stageRadius = backtracking.backtrack_points.find((b) => b.hours_before_image === stopH)!.radius_2sig_nm;
  return (
    <div className="detail">
      <RuleHead left={track.name.toUpperCase()} right={<span className="verdict verdict--not">ELIMINATED · STAGE 2</span>} />
      <div className="detail__group">
        <div className="detail__head">WHY NOT</div>
        {track.group === 'reach' && (
          <TickLine kind="no">
            closest approach {track.minDistanceNm.toFixed(1)} nm from the rewound oil
          </TickLine>
        )}
        {track.group === 'time' && (
          <TickLine kind="no">
            crossed the oil's path {track.timeOffsetH.toFixed(1)} h from the time the oil was there
          </TickLine>
        )}
        {track.group === 'port' && (
          <TickLine kind="no">stayed inside Kochi port limits for the whole window</TickLine>
        )}
        <TickLine kind="none"><span className="muted">{group?.label}</span></TickLine>
      </div>
      <div className="detail__group">
        <div className="detail__head">MEASURED (AIS)</div>
        <Field label="MMSI" value={track.mmsi} />
        <Field label="Type" value={track.typeLabel} />
      </div>
      <div className="muted" style={{ fontSize: 11.5 }}>
        needed ≤ the search radius at a matching time ({stageRadius} nm at the stop step)
      </div>
    </div>
  );
}
