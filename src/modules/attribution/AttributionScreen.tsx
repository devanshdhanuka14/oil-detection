/**
 * Screen 3, per spec 3 §2: map left, stages and ranking right, the rewind
 * scrubber and threshold slider in the footer.
 *
 * This step is the static end state (spec 3 §10 item 1).
 */
import { useMemo, useRef } from 'react';
import { attribution, backtrackAt, backtrackPoints, bbox, sar } from '../../data/scenario';
import { buildAisTracks } from '../../lib/generators/aisTracks';
import { buildPatches } from '../../lib/generators/patches';
import { distanceNm, makeProjection } from '../../map/projection';
import { fmtStep, fmtUtc } from '../../lib/time';
import { useApp } from '../../shell/store';
import { color } from '../../theme/tokens';
import { LayerChips, StepSlider, ToggleBar } from '../../ui/controls';
import { PanelScroll } from '../../ui/PanelScroll';
import { Basemap } from '../../map/Basemap';
import { ringPath } from '../detection/PatchLayer';
import { SourceLayer } from '../backtracking/CloudLayer';
import { AisCanvas, pickTrack } from './AisCanvas';
import { BacktrackDots, BrightTargets, FixedSource, SearchCircle } from './LoopLayer';
import { useTimeline } from '../../shell/timeline';
import { lerpView, vb, viewOn, fullView } from '../../map/Camera';
import { attributionTimeline, EVIDENCE_BEATS } from './timeline';
import { runLoop } from './stopRule';
import { FilterPanel, InputsPanel, LoopPanel } from './panels/StagePanels';
import { Ranking } from './panels/Ranking';
import { CandidateCard, DarkCard, EliminatedCard, FixedCard, LeaderCard, NoneCard, TrapCard } from './panels/Cards';
import { AisCoveragePanel, CaseFilePanel, DarkFixedPanel } from './panels/TogglePanels';
import { AttributionSideBySide } from './panels/SideBySidePanel';
import { AisBlindZone, ReachabilityEllipse } from './CoverageLayer';

const MAP_W = 1300;
const MAP_H = 918;

export const ATTRIBUTION_TOGGLES = ['coverage', 'dark', 'casefile', 'sbs'];

export function AttributionScreen() {
  const { toggle, setToggle, selection, select, hiddenLayers, toggleLayer, threshold, setThreshold, loopHours, setLoopHours } = useApp();
  const svgRef = useRef<SVGSVGElement>(null);

  const p = useMemo(() => makeProjection(bbox.attributionOverview, MAP_W, MAP_H), []);
  const ais = useMemo(() => buildAisTracks(), []);
  const s01 = useMemo(() => buildPatches('expected').byId.get('S01')!, []);
  const outcome = useMemo(() => runLoop(threshold), [threshold]);

  const tlSpec = useMemo(() => attributionTimeline(outcome.stop.h), [outcome.stop.h]);
  const tl = useTimeline(tlSpec, [outcome.stop.h]);
  const st = tl.state;

  // One clock: the timeline's playhead, or the scrubber once the presenter
  // drags it. The circle, the table, the meters and the ranking all read this.
  const h = loopHours || st.playhead;

  // The ✗ lines and the dimmed tracks share one counter, so the map can never
  // dim a different number of tracks than the log claims.
  const rejectedGroups = attribution.filter_groups.filter((g) => g.id !== 'cand');
  const eliminated = new Set(
    rejectedGroups.slice(0, st.groupsShown).map((g) => g.id as 'reach' | 'time' | 'port'),
  );

  const wide = useMemo(() => fullView(p), [p]);
  const onLoop = useMemo(
    () => viewOn(p, backtrackAt(outcome.stop.h).lat, backtrackAt(outcome.stop.h).lon, 46),
    [p, outcome.stop.h],
  );
  const view = lerpView(wide, onLoop, st.camera);
  const evidenceBeat = Math.min(EVIDENCE_BEATS.length - 1, Math.floor(st.evidence));
  const leaderTrack = ais.all.find((t) => t.vesselKey === outcome.stop.leader) ?? null;
  const trapTrack = ais.all.find((t) => t.vesselKey === 'V-TESSERA') ?? null;

  // Which candidates are inside the search circle right now.
  const q = backtrackAt(h);
  const inCircle = useMemo(() => {
    const set = new Set<string>();
    const ms = Date.parse(sar.time_utc) - h * 3600_000;
    for (const t of ais.byGroup.cand) {
      const near = t.samples.reduce(
        (best, s) => (Math.abs(s[0] - ms) < Math.abs(best[0] - ms) ? s : best),
        t.samples[0],
      );
      if (Math.abs(near[0] - ms) < 30 * 60_000 && distanceNm([near[1], near[2]], [q.lat, q.lon]) <= q.radius_2sig_nm) {
        set.add(t.id);
      }
    }
    return set;
  }, [ais, h, q.lat, q.lon, q.radius_2sig_nm]);

  const onMapClick = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * MAP_W;
    const y = ((e.clientY - r.top) / r.height) * MAP_H;
    const id = pickTrack(ais, p, x, y);
    if (id) {
      const t = ais.byId.get(id)!;
      select({ kind: 'track', id: t.vesselKey ?? id });
    }
  };

  return (
    <div className="screen">
      <header className="screen__header">
        <div className="screen__title">
          <strong>Vessel attribution</strong> · Slick S01 · {fmtUtc(sar.time_utc)}
          <div className="screen__sub">AIS vessels in window</div>
        </div>
        <div className="screen__counter">
          {attribution.counter.in_window} → {attribution.counter.candidates} → {attribution.counter.suspects}
        </div>
      </header>

      <div className="screen__body">
        <div className="screen__map">
          <svg className="map-svg" viewBox={vb(view)} width={MAP_W} height={MAP_H}>
            <Basemap p={p} />
          </svg>

          {!hiddenLayers.ais && (
            <AisCanvas
              set={ais}
              p={p}
              width={MAP_W}
              height={MAP_H}
              eliminated={eliminated}
              inCircle={inCircle}
              leaderId={st.leader ? (leaderTrack?.id ?? null) : null}
              highlightId={st.trap > 0.5 ? (trapTrack?.id ?? null) : null}
              showCandidates={!hiddenLayers.candidates}
              reveal={st.tracks}
            />
          )}

          <svg
            ref={svgRef}
            className="map-svg"
            viewBox={vb(view)}
            width={MAP_W}
            height={MAP_H}
            onClick={onMapClick}
            style={{ cursor: 'pointer' }}
          >
            {!hiddenLayers.path && <BacktrackDots p={p} upToH={h} />}
            {!hiddenLayers.circle && <SearchCircle p={p} h={h} flash={st.flash} />}

            {(s01.fragments ?? [s01.ring]).map((ring, i) => (
              <path key={i} d={ringPath(ring, p)} fill={color.oil} fillOpacity={0.2} stroke={color.oil} strokeWidth={1.6} />
            ))}

            <SourceLayer p={p} sigma={2} showPin={false} />
            {!hiddenLayers.dark && <BrightTargets p={p} dark />}
            {!hiddenLayers.fixed && <FixedSource p={p} />}
            {toggle === 'coverage' && <AisBlindZone p={p} />}
            {toggle === 'coverage' && <ReachabilityEllipse p={p} />}
          </svg>

          {/* The trap label: what the typical approach would answer. */}
          {st.trap > 0.5 && (
            <div className="trap-label">typical approach: nearest ship = polluter</div>
          )}

          {/* The four evidence beats on the leader. */}
          {st.evidence > 0 && st.evidence < 4 && (
            <div className="beat-caption">
              <span className="beat-caption__n">{evidenceBeat + 1}/{EVIDENCE_BEATS.length}</span>
              <span className="beat-caption__title">{EVIDENCE_BEATS[evidenceBeat].title}</span>
              <span className="beat-caption__text">{EVIDENCE_BEATS[evidenceBeat].caption}</span>
            </div>
          )}
          {st.evidence >= 4 && (
            <div className="beat-caption">
              <span className="beat-caption__title">coverage</span>
              <span className="beat-caption__text">
                explains {Math.round(attribution.vessels['V-A'].coverage * 100)}% of the slick's
                particles — most of the slick, not one corner
              </span>
            </div>
          )}
        </div>

        <aside className="screen__panel">
          <ToggleBar
            options={[
              { id: 'coverage', label: "Where AIS couldn't see" },
              { id: 'dark', label: 'Dark & fixed' },
              { id: 'casefile', label: 'Case file' },
              { id: 'sbs', label: 'Typical vs ours' },
            ]}
            value={toggle}
            onChange={setToggle}
          />

          <PanelScroll follow={`${Math.floor(st.stage1)}-${st.groupsShown}-${Math.floor(h)}-${st.showRanking}-${toggle}`}>
            {toggle === 'coverage' ? (
              <AisCoveragePanel />
            ) : toggle === 'dark' ? (
              <DarkFixedPanel />
            ) : toggle === 'casefile' ? (
              <CaseFilePanel stoppedAt={fmtStep(outcome.stop.h)} threshold={threshold} />
            ) : toggle === 'sbs' ? (
              <AttributionSideBySide />
            ) : (
              <>
                <InputsPanel upTo={st.stage1 - 1} />
                <FilterPanel groupsShown={st.groupsShown} />
                {st.playhead > 0 && <LoopPanel outcome={outcome} threshold={threshold} currentH={h} />}
                {st.showRanking && (
                  <div data-payoff>
                    <Ranking onSelect={(id) => select({ kind: 'track', id })} selectedId={selection?.id ?? null} />
                    <SelectedCard ais={ais} />
                  </div>
                )}
              </>
            )}
          </PanelScroll>
        </aside>
      </div>

      <footer className="screen__footer">
        <LayerChips
          chips={[
            { id: 'ais', label: 'AIS tracks', swatch: color.aisTrack },
            { id: 'candidates', label: 'candidates', swatch: color.candidate },
            { id: 'circle', label: 'search circle', swatch: color.searchCircle, dashed: true },
            { id: 'path', label: 'backtrack path', swatch: color.oil, dashed: true },
            { id: 'dark', label: 'dark targets', swatch: color.brightTarget },
            { id: 'fixed', label: 'fixed sources', swatch: color.fixedSource },
          ]}
          hidden={hiddenLayers}
          onToggle={toggleLayer}
        />
        <div className="footer__spacer" />
        <div className="scrubber">
          <span className="scrubber__label">rewind</span>
          <input
            type="range"
            min={0}
            max={backtrackPoints[backtrackPoints.length - 1].hours_before_image}
            step={0.5}
            value={h}
            onChange={(e) => setLoopHours(Number(e.target.value))}
          />
          <span className="scrubber__value">{fmtStep(h)}</span>
        </div>
        <StepSlider
          label="threshold"
          options={attribution.stop_rule.threshold_options.map((t) => ({ value: t, label: `${Math.round(t * 100)}%` }))}
          value={threshold}
          onChange={setThreshold}
        />
      </footer>
    </div>
  );
}

function SelectedCard({ ais }: { ais: ReturnType<typeof buildAisTracks> }) {
  const selection = useApp((s) => s.selection);
  const id = selection?.id;

  if (!id || id === 'V-A') return <LeaderCard />;
  if (id === 'V-TESSERA') return <TrapCard />;
  if (id === 'V-B' || id === 'V-C') return <CandidateCard id={id} />;
  if (id === 'DARK-BT3') return <DarkCard />;
  if (id === 'FIXED') return <FixedCard />;
  if (id === 'NONE') return <NoneCard />;
  if (id === 'OTHERS_35') return <LeaderCard />;

  const track = ais.byId.get(id);
  if (track) return track.group === 'cand' ? <LeaderCard /> : <EliminatedCard track={track} />;
  return <LeaderCard />;
}
