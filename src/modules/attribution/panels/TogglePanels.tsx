/**
 * Spec 3 §6: the three toggles.
 *
 * Wording rule (CLAUDE.md §7): an AIS gap is never called suspicious unless it
 * is at least 12 h long and more than 50 nm offshore. The one gap in this case
 * fails both tests, and the panel says so.
 */
import { attribution, backtracking, detection, meta } from '../../../data/scenario';
import { Field, TickLine } from '../../../ui/primitives';

export function AisCoveragePanel() {
  const c = attribution.ais_coverage;
  return (
    <div className="block">
      <div className="block__head">WHERE AIS COULD NOT SEE</div>
      <p className="prose">
        Terrestrial AIS reaches about {c.terrestrial_reach_nm} nm offshore here. The backtracked
        source is {c.source_offshore_nm} nm offshore, inside coverage.
        <br />
        {c.search_area_beyond_reach_pct}% of the {backtracking.handoff.search_radius_nm['3sig']} nm
        search area lies beyond reach (hatched): a ship there could pass unseen.
      </p>

      <div className="detail__head">AIS GAPS IN THIS CASE: {c.gaps_in_case}</div>
      <TickLine kind="none"><span className="muted">all under 12 h and within 50 nm of shore</span></TickLine>
      <TickLine kind="arrow">treated as reception gaps, not as intent</TickLine>
      <TickLine kind="none">
        <span className="muted">
          vessels under 300 GT (most fishing boats) need not carry AIS → covered only by radar bright targets
        </span>
      </TickLine>

      <TickLine kind="arrow">Recommend a satellite-AIS pull for the hatched zone, 26–27 May.</TickLine>
    </div>
  );
}

export function DarkFixedPanel() {
  const targets = detection.bright_targets;
  const vessels = attribution.vessels as Record<string, { name?: string }>;
  return (
    <div className="block">
      <div className="block__head">RADAR BRIGHT TARGETS vs AIS</div>
      {targets.map((t) => (
        <Field
          key={t.id}
          label={t.id}
          value={
            t.ais_match ? (
              <>→ {vessels[t.ais_match]?.name} <span className="tick--yes">matched</span></>
            ) : (
              <>
                → no AIS within 2 km →{' '}
                <span className="muted">dark target, {Math.round(attribution.dark.p * 100)}%</span>
              </>
            )
          }
        />
      ))}
      <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
        possible vessel, radar only, not AIS
      </div>

      <div className="block__head" style={{ marginTop: 16 }}>FIXED SOURCES CHECKED</div>
      <TickLine kind="none">{attribution.fixed.note}</TickLine>
      <Field label="assigned probability" value={`${Math.round(attribution.fixed.p * 100)}%`} />
    </div>
  );
}

export function CaseFilePanel({ stoppedAt, threshold }: { stoppedAt: string; threshold: number }) {
  const a = attribution;
  const lead = a.ranking[0];
  const v = a.vessels['V-A'];
  const alt = {
    dark: a.ranking.find((r) => r.id === 'DARK-BT3')!.p,
    fixed: a.ranking.find((r) => r.id === 'FIXED')!.p,
    none: a.ranking.find((r) => r.id === 'NONE')!.p,
  };

  const json = {
    case_id: meta.id,
    stop_rule: { threshold, min_margin: a.stop_rule.min_margin, point_conf_floor: a.stop_rule.point_conf_floor },
    stopped_at: stoppedAt,
    'ranking[0]': { name: v.name, p: lead.p, match: '05:46–07:36Z', coverage: v.coverage },
    alternatives: alt,
    provenance: { ais: 'synthetic', backtrack_run: 'S01-bt', detection: 'S01-v1' },
    disclaimer: 'ranking of candidates, not a determination of responsibility',
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `${json.case_id}.json`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="block">
      <div className="block__head">CASE FILE · {json.case_id}</div>
      <TickLine kind="arrow">Received from detection: slick S01, SAR time, {detection.bright_targets.length} bright targets</TickLine>
      <TickLine kind="arrow">
        Received from drift: {backtracking.backtrack_points.length} backtrack points, source ellipse, AIS window
      </TickLine>
      <TickLine kind="arrow">Output: ranked candidates + alternatives + stop rule</TickLine>

      <pre className="json-preview">{JSON.stringify(json, null, 2)}</pre>

      <div className="block__actions">
        <button className="shell-btn" onClick={download}>Download case JSON</button>
      </div>
    </div>
  );
}
