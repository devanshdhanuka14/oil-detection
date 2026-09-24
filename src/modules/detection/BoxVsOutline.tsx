/**
 * The one-second box-vs-outline moment (spec 1 §4).
 *
 * Drawn to scale from the real S01 geometry: the outline is the same polygon
 * the map and the radar image use, and the box is its axis-aligned bounding
 * box. The numbers in scenario.detection.box_vs_outline are that same box's
 * area and the slick's stated area, so the picture and the labels agree.
 */
import { useMemo } from 'react';
import { detection } from '../../data/scenario';
import { buildPatches } from '../../lib/generators/patches';
import { KX } from '../../map/projection';
import { color } from '../../theme/tokens';

const W = 208;
const H = 132;
const PAD = 12;

export function BoxVsOutline() {
  const b = detection.box_vs_outline;

  const shape = useMemo(() => {
    const s01 = buildPatches('expected').byId.get('S01')!;
    const rings = s01.fragments ?? [s01.ring];
    const pts = rings.flat();
    const latMin = Math.min(...pts.map((q) => q[0]));
    const latMax = Math.max(...pts.map((q) => q[0]));
    const lonMin = Math.min(...pts.map((q) => q[1]));
    const lonMax = Math.max(...pts.map((q) => q[1]));

    // Fit the bounding box into the inset, preserving shape.
    const wDeg = (lonMax - lonMin) * KX;
    const hDeg = latMax - latMin;
    const scale = Math.min((W - PAD * 2) / wDeg, (H - PAD * 2) / hDeg);
    const ox = (W - wDeg * scale) / 2;
    const oy = (H - hDeg * scale) / 2;
    const project = (lat: number, lon: number) => ({
      x: ox + (lon - lonMin) * KX * scale,
      y: oy + (latMax - lat) * scale,
    });

    return {
      box: { x: ox, y: oy, w: wDeg * scale, h: hDeg * scale },
      paths: rings.map(
        (ring) =>
          ring
            .map(([lat, lon], i) => {
              const q = project(lat, lon);
              return `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
            })
            .join('') + 'Z',
      ),
    };
  }, []);

  return (
    <div className="boxvs">
      <div className="boxvs__title">why an outline, not a box</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* The empty water a box would sweep in. */}
        <rect
          x={shape.box.x}
          y={shape.box.y}
          width={shape.box.w}
          height={shape.box.h}
          fill={color.oil}
          fillOpacity={0.09}
          stroke={color.oil}
          strokeOpacity={0.55}
          strokeDasharray="5 4"
          strokeWidth={1.4}
        />
        {shape.paths.map((d, i) => (
          <path key={i} d={d} fill={color.oil} fillOpacity={0.24} stroke={color.oil} strokeWidth={1.6} />
        ))}
      </svg>
      <div className="boxvs__rows">
        <div><span className="boxvs__k">box</span><span className="boxvs__v">{b.box_km2} km²</span></div>
        <div><span className="boxvs__k">actual slick</span><span className="boxvs__v">{b.slick_km2} km²</span></div>
      </div>
      <div className="boxvs__note">
        to scale · {Math.round(b.box_km2 / b.slick_km2)}× the water a box would search
      </div>
    </div>
  );
}
