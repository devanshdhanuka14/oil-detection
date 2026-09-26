/**
 * Screen 1, exactly as spec 1 §2 lays it out: image left, panel right,
 * legend and the outline-confidence slider in the footer.
 *
 * This step builds the static end state (spec 1 §10 item 1). The elimination
 * animation is driven by the same `stage` props in the next step.
 */
import { useMemo } from 'react';
import { bbox, detection, sar } from '../../data/scenario';
import { buildBlindZone, buildPatches, type PatchGroup } from '../../lib/generators/patches';
import { makeProjection } from '../../map/projection';
import { fmtUtc } from '../../lib/time';
import { useApp } from '../../shell/store';
import { Magnifier } from '../../shell/Magnifier';
import { color } from '../../theme/tokens';
import { LayerChips, StepSlider, ToggleBar } from '../../ui/controls';
import { PanelScroll } from '../../ui/PanelScroll';
import { StageSection } from '../../ui/StageSection';
import { useTimeline } from '../../shell/timeline';
import { lerpView, vb, viewOn, fullView } from '../../map/Camera';
import { detectionTimeline } from './timeline';
import { OUTLINE_BEATS } from './timelineBeats';
import { RadarCanvas } from './RadarCanvas';
import { BoxVsOutline } from './BoxVsOutline';
import { BlindLayer, BrightTargetLayer, PatchLayer } from './PatchLayer';
import { EliminationPanel, ProcessPanel, PROCESSING_LINES } from './panels/ProcessPanel';
import { BlindPanel, HandoffPanel } from './panels/HandoffPanel';
import { DetectionSideBySide } from './panels/SideBySidePanel';
import { RejectedPanel, SlickPanelS01 } from './panels/SlickPanel';

const MAP_W = 1300;
const MAP_H = 918;

export const DETECTION_TOGGLES = ['blind', 'handoff', 'sbs'];

export function DetectionScreen() {
  const { mode, outlineLevel, setOutlineLevel, toggle, setToggle, selection, select, hiddenLayers, toggleLayer , magnified} = useApp();

  const p = useMemo(() => makeProjection(bbox.detection, MAP_W, MAP_H), []);
  // The outline-confidence slider changes our *outline*, not the scene. The
  // radar image is therefore built once from the expected outline and never
  // re-rendered - which also keeps the slider instant for the presenter.
  const imagePatches = useMemo(() => buildPatches('expected'), []);
  const patches = useMemo(() => buildPatches(outlineLevel), [outlineLevel]);
  const blind = useMemo(() => buildBlindZone(), []);

  const tl = useTimeline(detectionTimeline);
  const st = tl.state;

  // The ✗ lines and the dimmed outlines are driven by the same counter, so the
  // picture always dims exactly the groups the log has announced.
  const rejectedGroups = detection.groups.filter((g) => g.id !== 'oil');
  const eliminated = new Set<PatchGroup>(
    rejectedGroups.slice(0, st.groupsShown).map((g) => g.id as PatchGroup),
  );

  // Scripted camera: wide, then in on S01 for the outline beats, then out.
  const wide = useMemo(() => fullView(p), [p]);
  const onS01 = useMemo(() => viewOn(p, detection.S01.centre[0], detection.S01.centre[1], 11), [p]);
  const view = lerpView(wide, onS01, st.zoom);
  const zoomBeat = Math.min(OUTLINE_BEATS.length - 1, Math.floor(st.zoomBeat));

  const areaKm2 =
    outlineLevel === 'tight'
      ? detection.S01.outline_levels.tight_km2
      : outlineLevel === 'generous'
        ? detection.S01.outline_levels.generous_km2
        : detection.S01.outline_levels.expected_km2;

  const selected = selection?.kind === 'patch' ? patches.byId.get(selection.id) : undefined;

  // Rendered twice: in place, and inside the magnifier when it is open.
  // Both read the same store, so they stay in step and the stage layout
  // is identical whether the magnifier is showing or not.
  const panelContent = (
    <>
          <ToggleBar
            options={[
              { id: 'blind', label: 'Blind areas' },
              { id: 'handoff', label: 'Hand-off' },
              { id: 'sbs', label: 'Typical vs ours' },
            ]}
            value={toggle}
            onChange={setToggle}
          />

          <PanelScroll follow={`${Math.floor(st.processingLines)}-${st.groupsShown}-${st.showPanel}-${toggle}`}>
            {toggle === 'blind' ? (
              <BlindPanel />
            ) : toggle === 'handoff' ? (
              <HandoffPanel />
            ) : toggle === 'sbs' ? (
              <DetectionSideBySide />
            ) : (
              <>
                <StageSection
                  id="processing"
                  title="PROCESSING"
                  done={st.processingLines >= PROCESSING_LINES}
                  summary={`wind ${sar.wind_ms} m/s from ${sar.wind_from_deg}° · ${sar.observable_pct}% observable`}
                >
                  <ProcessPanel upTo={st.processingLines - 1} />
                </StageSection>

                <StageSection
                  id="elimination"
                  title="ELIMINATION"
                  done={st.confirmed}
                  summary={`${detection.counter.from} → ${detection.counter.to} · ${detection.counter.from - detection.counter.to} rejected`}
                >
                  <EliminationPanel
                    groupsShown={st.groupsShown}
                    showFound={st.showFound}
                    showMeasuring={st.showMeasuring}
                    animate={mode !== 'explore'}
                  />
                </StageSection>
                {selected && selected.group !== 'oil' ? (
                  <RejectedPanel patch={selected} />
                ) : st.showPanel ? (
                  <div data-payoff>
                    <SlickPanelS01
                      areaKm2={areaKm2}
                      level={outlineLevel}
                      elongation={patches.byId.get('S01')!.elongation}
                    />
                  </div>
                ) : null}
              </>
            )}
          </PanelScroll>
    </>
  );

  return (
    <div className="screen">
      <header className="screen__header">
        <div className="screen__title">
          <strong>{sar.sensor}</strong> · {fmtUtc(sar.time_utc)} · {sar.region}
        </div>
        <div className="screen__counter">
          {detection.counter.from} → {detection.counter.to}
        </div>
      </header>

      <div className="screen__body">
        <div className="screen__map">
          <div className="radar-wrap" style={{ opacity: hiddenLayers.radar ? 0 : st.radar }}>
            <RadarCanvas patches={imagePatches.all} blindRing={blind} p={p} width={MAP_W} height={MAP_H} />
          </div>
          <svg className="map-svg" viewBox={vb(view)} width={MAP_W} height={MAP_H}>
            {!hiddenLayers.blind && toggle === 'blind' && <BlindLayer ring={blind} p={p} />}
            {!hiddenLayers.outlines && (
              <PatchLayer
                patches={patches.all
                  .filter((x) => (x.group === 'oil' ? !hiddenLayers.oil : !hiddenLayers.lookalike))
                  .slice(0, Math.ceil(patches.all.length * st.outlines))}
                p={p}
                eliminated={eliminated}
                confirmed={st.confirmed}
                selectedId={selected?.id ?? null}
                onSelect={(id) => select({ kind: 'patch', id })}
                interactive
              />
            )}
            {!hiddenLayers.bt && <BrightTargetLayer targets={detection.bright_targets} p={p} />}
          </svg>

          {/* The four outline-building beats, and the box-vs-outline inset. */}
          {st.zoom > 0.5 && (
            <div className="beat-caption">
              <span className="beat-caption__n">{zoomBeat + 1}/{OUTLINE_BEATS.length}</span>
              <span className="beat-caption__title">{OUTLINE_BEATS[zoomBeat].title}</span>
              <span className="beat-caption__text">{OUTLINE_BEATS[zoomBeat].caption}</span>
            </div>
          )}
          {st.zoom > 0.5 && zoomBeat === OUTLINE_BEATS.length - 1 && <BoxVsOutline />}
        </div>

        <aside className="screen__panel">{panelContent}</aside>
        {magnified && <Magnifier>{panelContent}</Magnifier>}
      </div>

      <footer className="screen__footer">
        <LayerChips
          chips={[
            { id: 'radar', label: 'radar', swatch: '#8FA2BD' },
            { id: 'oil', label: 'oil', swatch: color.oil },
            { id: 'lookalike', label: 'look-alike', swatch: color.lookAlike, dashed: true },
            { id: 'blind', label: 'blind', swatch: color.blind, hatch: true },
            { id: 'bt', label: 'bright targets', swatch: color.brightTarget },
          ]}
          hidden={hiddenLayers}
          onToggle={toggleLayer}
        />
        <div className="footer__spacer" />
        <StepSlider
          label="outline confidence"
          options={[
            { value: 'tight' as const, label: 'tight' },
            { value: 'expected' as const, label: 'expected' },
            { value: 'generous' as const, label: 'generous' },
          ]}
          value={outlineLevel}
          onChange={setOutlineLevel}
        />
      </footer>
    </div>
  );
}
