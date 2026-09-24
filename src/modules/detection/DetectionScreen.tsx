/**
 * Screen 1, exactly as spec 1 §2 lays it out: image left, panel right,
 * legend and the outline-confidence slider in the footer.
 *
 * This step builds the static end state (spec 1 §10 item 1). The elimination
 * animation is driven by the same `stage` props in the next step.
 */
import { useMemo, useState } from 'react';
import { bbox, detection, sar } from '../../data/scenario';
import { buildBlindZone, buildPatches, type PatchGroup } from '../../lib/generators/patches';
import { makeProjection } from '../../map/projection';
import { fmtUtc } from '../../lib/time';
import { useApp } from '../../shell/store';
import { color } from '../../theme/tokens';
import { LayerChips, StepSlider, ToggleBar } from '../../ui/controls';
import { RadarCanvas } from './RadarCanvas';
import { BlindLayer, BrightTargetLayer, PatchLayer } from './PatchLayer';
import { EliminationPanel, ProcessPanel } from './panels/ProcessPanel';
import { BlindPanel, HandoffPanel } from './panels/HandoffPanel';
import { RejectedPanel, SlickPanelS01 } from './panels/SlickPanel';

const MAP_W = 1300;
const MAP_H = 918;

export const DETECTION_TOGGLES = ['blind', 'handoff'];

export function DetectionScreen() {
  const { outlineLevel, setOutlineLevel, toggle, setToggle, selection, select, hiddenLayers, toggleLayer } = useApp();
  const [animate] = useState(false);

  const p = useMemo(() => makeProjection(bbox.detection, MAP_W, MAP_H), []);
  // The outline-confidence slider changes our *outline*, not the scene. The
  // radar image is therefore built once from the expected outline and never
  // re-rendered - which also keeps the slider instant for the presenter.
  const imagePatches = useMemo(() => buildPatches('expected'), []);
  const patches = useMemo(() => buildPatches(outlineLevel), [outlineLevel]);
  const blind = useMemo(() => buildBlindZone(), []);

  // Static end state: every group eliminated, the 2 confirmed.
  const eliminated = new Set<PatchGroup>(['fuzzy', 'blobby', 'noise']);
  const areaKm2 =
    outlineLevel === 'tight'
      ? detection.S01.outline_levels.tight_km2
      : outlineLevel === 'generous'
        ? detection.S01.outline_levels.generous_km2
        : detection.S01.outline_levels.expected_km2;

  const selected = selection?.kind === 'patch' ? patches.byId.get(selection.id) : undefined;

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
          <RadarCanvas patches={imagePatches.all} blindRing={blind} p={p} width={MAP_W} height={MAP_H} />
          <svg className="map-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H}>
            {!hiddenLayers.blind && toggle === 'blind' && <BlindLayer ring={blind} p={p} />}
            {!hiddenLayers.outlines && (
              <PatchLayer
                patches={patches.all.filter((x) => (x.group === 'oil' ? !hiddenLayers.oil : !hiddenLayers.lookalike))}
                p={p}
                eliminated={eliminated}
                confirmed
                selectedId={selected?.id ?? null}
                onSelect={(id) => select({ kind: 'patch', id })}
                interactive
              />
            )}
            {!hiddenLayers.bt && <BrightTargetLayer targets={detection.bright_targets} p={p} />}
          </svg>
        </div>

        <aside className="screen__panel">
          <ToggleBar
            options={[
              { id: 'blind', label: 'Blind areas' },
              { id: 'handoff', label: 'Hand-off' },
            ]}
            value={toggle}
            onChange={setToggle}
          />

          <div className="panel-scroll">
            {toggle === 'blind' ? (
              <BlindPanel />
            ) : toggle === 'handoff' ? (
              <HandoffPanel />
            ) : (
              <>
                <ProcessPanel />
                <EliminationPanel groupsShown={4} showFound showMeasuring={false} animate={animate} />
                {selected && selected.group !== 'oil' ? (
                  <RejectedPanel patch={selected} />
                ) : (
                  <SlickPanelS01 areaKm2={areaKm2} level={outlineLevel} />
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      <footer className="screen__footer">
        <LayerChips
          chips={[
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
