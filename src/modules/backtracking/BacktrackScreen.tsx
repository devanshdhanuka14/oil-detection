/**
 * Screen 2, per spec 2 §2: map left, stages right, age and uncertainty sliders
 * in the footer. This step is the static end state (spec 2 §10 item 1).
 */
import { useMemo, useRef, useState } from 'react';
import { backtracking, backtrackPoints, bbox, sar } from '../../data/scenario';
import { buildParticles, cloudEllipse } from '../../lib/generators/particles';
import { buildPatches } from '../../lib/generators/patches';
import { makeProjection } from '../../map/projection';
import { fmtUtc } from '../../lib/time';
import { useApp } from '../../shell/store';
import { color } from '../../theme/tokens';
import { LayerChips, StepSlider, ToggleBar } from '../../ui/controls';
import { Basemap } from '../../map/Basemap';
import { ringPath } from '../detection/PatchLayer';
import { ParticleCanvas } from './ParticleCanvas';
import { BacktrackPath, CloudLayer, SourceLayer } from './CloudLayer';
import { useTimeline } from '../../shell/timeline';
import { backtrackTimeline } from './timeline';
import { Stage1Panel, Stage2Panel, Stage3Panel } from './panels/StagePanels';
import { SourcePanel, UncertaintyPanel } from './panels/SourcePanel';
import { BacktrackHandoffPanel, DataLimitsPanel, ForecastPanel } from './panels/TogglePanels';
import { BacktrackSideBySide } from './panels/SideBySidePanel';
import { DataLimitOverlay, ForecastLayer, SingleArrow } from './ForecastLayer';

const MAP_W = 1300;
const MAP_H = 918;

export const BACKTRACK_TOGGLES = ['forecast', 'limits', 'handoff', 'sbs'];

export function BacktrackScreen() {
  const { toggle, setToggle, selection, select, hiddenLayers, toggleLayer, ageHypothesis, setAgeHypothesis, sigma, setSigma } = useApp();

  const p = useMemo(() => makeProjection(bbox.backtracking, MAP_W, MAP_H), []);
  const particles = useMemo(() => buildParticles(), []);
  const hull = useMemo(
    () => cloudEllipse(particles, backtracking.cloud_km2.before, backtracking.source.ellipse_axis_deg),
    [particles],
  );
  const s01 = useMemo(() => buildPatches('expected').byId.get('S01')!, []);

  const tl = useTimeline(backtrackTimeline);
  const st = tl.state;

  // The refined ellipse's area, tweened from 340 to 18 km2. `cloud` goes 1 -> 0
  // at the same instant the "refined by forward match" line appears, so the
  // compression and the line are one moment.
  const cloudScale = Math.sqrt(
    ((backtracking.cloud_km2.after +
      (backtracking.cloud_km2.before - backtracking.cloud_km2.after) * st.cloud) /
      backtracking.cloud_km2.before),
  );

  const showUncertainty = selection?.kind === 'ellipse';

  // Spec 2 §8: clicking a particle trail shows that particle's state at that
  // point. Every particle's full history is stored, not just its endpoint.
  const mapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  const onMapClick = (e: React.MouseEvent) => {
    const el = mapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * MAP_W;
    const y = ((e.clientY - r.top) / r.height) * MAP_H;

    let bestD = Infinity;
    let bestI = -1;
    let bestK = -1;
    particles.all.forEach((q, i) => {
      q.path.forEach((pt, k) => {
        const s = p.project(pt[0], pt[1]);
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < bestD) {
          bestD = d;
          bestI = i;
          bestK = k;
        }
      });
    });
    if (bestI < 0 || bestD > 10) {
      setTip(null);
      return;
    }

    const q = particles.all[bestI];
    const pt = q.path[bestK];
    const hours = (bestK / (q.path.length - 1)) * q.age;
    const f = backtracking.forcing;
    setTip({
      x,
      y,
      lines: [
        `particle #${String(bestI + 1).padStart(3, '0')} · ${q.age} h hypothesis`,
        `${pt[0].toFixed(4)}° N, ${pt[1].toFixed(4)}° E`,
        `t = \u2212${hours.toFixed(1)} h from the SAR image`,
        `current ${f.current} · wind ${f.wind}`,
      ],
    });
  };

  return (
    <div className="screen">
      <header className="screen__header">
        <div className="screen__title">
          <strong>Backtracking</strong> · Slick S01 · {fmtUtc(sar.time_utc)} · {sar.region}
          <div className="screen__sub">
            Age window: {backtracking.age_window_h[0]} – {backtracking.age_window_h[1]} h
          </div>
        </div>
        <div className="screen__counter">
          {backtracking.cloud_km2.before} → {backtracking.cloud_km2.after} km²
        </div>
      </header>

      <div className="screen__body">
        <div className="screen__map" ref={mapRef} onClick={onMapClick}>
          <svg className="map-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H}>
            <Basemap p={p} />
            {/*
              The amber cloud is the state *before* refinement. It sits under
              the particles and the refined ellipse so one frame carries the
              whole 340 -> 18 km2 story, which is what the counter promises.
            */}
            {!hiddenLayers.cloud && st.cloudShown > 0 && (
              <CloudLayer hull={hull} p={p} opacity={0.4 * st.cloudShown} scale={cloudScale} />
            )}
          </svg>
          {!hiddenLayers.particles && st.trails > 0 && (
            <div className="layer-wrap" style={{ opacity: st.trails }}>
              <ParticleCanvas
                set={particles}
                p={p}
                width={MAP_W}
                height={MAP_H}
                progress={st.rewind}
                ageFilter={ageHypothesis}
              />
            </div>
          )}
          <svg className="map-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H}>
            {!hiddenLayers.path && <BacktrackPath p={p} points={backtrackPoints} />}
            {toggle === 'forecast' && !hiddenLayers.forecast && <ForecastLayer p={p} />}
            {toggle === 'limits' && !hiddenLayers.limits && <DataLimitOverlay p={p} />}
            {/* The one arrow every competing demo draws, then replaced. */}
            {st.singleArrow > 0 && <SingleArrow p={p} opacity={st.singleArrow} />}

            {/* The observed slick, handed over by the detection team. */}
            {(s01.fragments ?? [s01.ring]).map((ring, i) => (
              <path key={i} d={ringPath(ring, p)} fill={color.oil} fillOpacity={0.2} stroke={color.oil} strokeWidth={1.8} />
            ))}

            {/* Spec 2 §11: the pin is never drawn without the 1σ ellipse. */}
            {!hiddenLayers.source && st.ellipse > 0 && (
              <g
                onClick={() => select({ kind: 'ellipse', id: 'source' })}
                style={{ cursor: 'pointer', opacity: st.ellipse }}
              >
                <SourceLayer p={p} sigma={sigma} showPin={st.pin > 0} />
              </g>
            )}
          </svg>

          {tip && (
            <div
              className="particle-tip"
              style={{ left: `${(tip.x / MAP_W) * 100}%`, top: `${(tip.y / MAP_H) * 100}%` }}
            >
              {tip.lines.map((l, i) => (
                <div key={i} className={i === 0 ? 'particle-tip__head' : undefined}>{l}</div>
              ))}
              <div className="particle-tip__note">every particle's full history is stored</div>
            </div>
          )}
        </div>

        <aside className="screen__panel">
          <ToggleBar
            options={[
              { id: 'forecast', label: 'Forecast 72 h' },
              { id: 'limits', label: 'Data limits' },
              { id: 'handoff', label: 'Hand-off' },
              { id: 'sbs', label: 'Typical vs ours' },
            ]}
            value={toggle}
            onChange={setToggle}
          />

          <div className="panel-scroll">
            {toggle === 'forecast' ? (
              <ForecastPanel />
            ) : toggle === 'limits' ? (
              <DataLimitsPanel />
            ) : toggle === 'handoff' ? (
              <BacktrackHandoffPanel />
            ) : toggle === 'sbs' ? (
              <BacktrackSideBySide />
            ) : showUncertainty ? (
              <>
                <UncertaintyPanel />
                <button className="shell-btn" onClick={() => select(null)}>← back to source estimate</button>
              </>
            ) : (
              <>
                <Stage1Panel upTo={st.stage1 - 1} />
                <Stage2Panel upTo={st.stage2 - 1} />
                <Stage3Panel refined={st.refinedShown} shown={st.stage2 >= 6} />
                {st.showPanel && <SourcePanel />}
              </>
            )}
          </div>
        </aside>
      </div>

      <footer className="screen__footer">
        <LayerChips
          chips={[
            { id: 'particles', label: 'particles', swatch: color.particle24h },
            { id: 'cloud', label: 'ensemble cloud', swatch: color.sourceCloud },
            { id: 'source', label: 'source pin', swatch: color.oil },
            { id: 'path', label: 'backtrack path', swatch: color.oil, dashed: true },
            { id: 'forecast', label: 'forecast', swatch: color.sourceCloud, dashed: true },
            { id: 'limits', label: 'data limits', swatch: color.blind, hatch: true },
          ]}
          hidden={hiddenLayers}
          onToggle={toggleLayer}
        />
        <div className="footer__spacer" />
        <StepSlider
          label="age window"
          options={[
            { value: null as 12 | 24 | 36 | null, label: 'all' },
            ...backtracking.hypotheses_h.map((h) => ({ value: h as 12 | 24 | 36, label: `${h} h` })),
          ]}
          value={ageHypothesis}
          onChange={setAgeHypothesis}
        />
        <StepSlider
          label="uncertainty"
          options={[
            { value: 1 as const, label: 'tight 1σ' },
            { value: 2 as const, label: 'standard 2σ' },
            { value: 3 as const, label: 'conservative 3σ' },
          ]}
          value={sigma}
          onChange={setSigma}
        />
      </footer>
    </div>
  );
}
