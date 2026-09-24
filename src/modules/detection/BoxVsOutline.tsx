/**
 * The one-second box-vs-outline moment (spec 1 §4).
 *
 * SPEC-CONFLICT: scenario.detection.box_vs_outline says 400 km² box against a
 * 4 km² slick, but S01's own bounding box is ~162 km² and its area is 12.4 km²,
 * both printed on this same screen. Drawn to scale over S01 the label would
 * contradict the readout beside it, so this is a schematic inset, visibly
 * separate from the real geometry, carrying the JSON's numbers exactly.
 */
import { detection } from '../../data/scenario';
import { color } from '../../theme/tokens';

export function BoxVsOutline() {
  const b = detection.box_vs_outline;
  return (
    <div className="boxvs">
      <div className="boxvs__title">why an outline, not a box</div>
      <svg width={200} height={92} viewBox="0 0 200 92">
        <rect x={6} y={6} width={188} height={80} fill={color.oil} fillOpacity={0.09} stroke={color.oil} strokeOpacity={0.55} strokeDasharray="5 4" strokeWidth={1.4} />
        <path
          d="M18 70 C60 60, 92 44, 130 28 C150 20, 170 16, 184 14 C170 20, 150 26, 130 36 C92 52, 60 66, 22 76 Z"
          fill={color.oil}
          fillOpacity={0.22}
          stroke={color.oil}
          strokeWidth={1.8}
        />
      </svg>
      <div className="boxvs__rows">
        <div><span className="boxvs__k">box</span><span className="boxvs__v">{b.box_km2} km²</span></div>
        <div><span className="boxvs__k">actual slick</span><span className="boxvs__v">{b.slick_km2} km²</span></div>
      </div>
      <div className="boxvs__note">schematic · every competing demo uses a box</div>
    </div>
  );
}
