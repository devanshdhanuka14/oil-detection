/**
 * The 47 outlines, drawn over the radar image from the same geometry the image
 * was rendered from.
 *
 * Colours are the merged table (CLAUDE.md §5): confirmed oil solid red with a
 * 20% fill, look-alikes yellow dashed, dimming to 15% once eliminated.
 */
import type { Patch, PatchGroup } from '../../lib/generators/patches';
import type { Projection } from '../../map/projection';
import { alpha, color } from '../../theme/tokens';

/** See the SPEC-CONFLICT note in PatchLayer below. */
const DIMMED_STROKE_OPACITY = 0.6;

export function ringPath(ring: [number, number][], p: Projection): string {
  return (
    ring
      .map(([lat, lon], i) => {
        const q = p.project(lat, lon);
        return `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join('') + 'Z'
  );
}

export function PatchLayer({
  patches,
  p,
  /** Groups whose outlines have been eliminated (dimmed) so far. */
  eliminated,
  /** Set once the ✓ 2 CONFIRMED OIL line lands: oil turns solid red. */
  confirmed,
  selectedId,
  onSelect,
  interactive,
}: {
  patches: Patch[];
  p: Projection;
  eliminated: Set<PatchGroup>;
  confirmed: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  interactive: boolean;
}) {
  return (
    <g className="patch-layer">
      {patches.map((patch) => {
        const isOil = patch.group === 'oil';
        const dim = eliminated.has(patch.group);
        const selected = selectedId === patch.id;

        // Before confirmation every outline is neutral grey: the system has not
        // judged yet. That is what makes the elimination legible.
        const stroke = isOil ? (confirmed ? color.oil : '#B9C6DA') : dim ? color.lookAlike : '#B9C6DA';
        const rings = patch.fragments ?? [patch.ring];

        // SPEC-CONFLICT: CLAUDE.md §5 dims a rejected look-alike to 15%. Applied
        // to the whole outline over speckle that renders it invisible, which
        // contradicts spec 1 §11 ("Hide the look-alikes. They are the whole
        // point.") and spec 1 §8, which requires every outline to stay
        // clickable. The 15% is therefore applied to the patch's *fill and
        // prominence*, while the stroke keeps a readable floor over a dark
        // casing. The dashed pattern and the yellow still carry "rejected".
        const fillOpacity = dim ? alpha.lookAlikeDimmed : 0;
        const strokeOpacity = dim ? DIMMED_STROKE_OPACITY : 1;

        return (
          <g
            key={patch.id}
            className={`patch${selected ? ' is-selected' : ''}`}
            onClick={interactive && onSelect ? () => onSelect(patch.id) : undefined}
            style={interactive ? { cursor: 'pointer' } : undefined}
          >
            {/*
              A dark casing under every outline. The spec dims a rejected
              outline to 15%, and 15% yellow over bright speckle is invisible -
              which would hide the look-alikes, the one thing spec 1 §11 says
              never to do. The casing keeps the stated opacity honest and the
              line readable.
            */}
            {rings.map((ring, i) => (
              <path key={`case${i}`} d={ringPath(ring, p)} fill="none" stroke="#070C16" strokeWidth={selected ? 5.5 : 3.6} strokeOpacity={dim ? 0.8 : 0.7} />
            ))}
            {rings.map((ring, i) => (
              <path
                key={i}
                d={ringPath(ring, p)}
                fill={isOil && confirmed ? color.oil : dim ? color.lookAlike : 'none'}
                fillOpacity={isOil && confirmed ? alpha.oilFill : fillOpacity}
                stroke={stroke}
                strokeOpacity={strokeOpacity}
                strokeWidth={selected ? 3 : isOil && confirmed ? 2.2 : 1.5}
                strokeDasharray={!isOil && dim ? '5 4' : undefined}
              />
            ))}
            {/* A generous invisible hit area, so a 1 km patch is still clickable. */}
            {interactive &&
              rings.map((ring, i) => (
                <path key={`hit${i}`} d={ringPath(ring, p)} fill="transparent" stroke="transparent" strokeWidth={14} />
              ))}
          </g>
        );
      })}
    </g>
  );
}

/** The low-wind zone, drawn as grey hatching (CLAUDE.md §5). */
export function BlindLayer({ ring, p }: { ring: [number, number][]; p: Projection }) {
  return (
    <g className="blind-layer">
      <defs>
        <pattern id="hatch-blind" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke={color.blind} strokeWidth={1.4} opacity={0.55} />
        </pattern>
      </defs>
      <path d={ringPath(ring, p)} fill="url(#hatch-blind)" stroke={color.blind} strokeOpacity={0.5} strokeWidth={1.2} />
    </g>
  );
}

/** Radar bright targets: small blue triangles (never called "vessel"). */
export function BrightTargetLayer({
  targets,
  p,
}: {
  targets: { id: string; lat: number; lon: number }[];
  p: Projection;
}) {
  return (
    <g className="bt-layer">
      {targets.map((t) => {
        const q = p.project(t.lat, t.lon);
        return (
          <g key={t.id} transform={`translate(${q.x.toFixed(1)},${q.y.toFixed(1)})`}>
            <path d="M0,-7 L6,5 L-6,5 Z" fill={color.brightTarget} fillOpacity={0.85} stroke={color.brightTarget} strokeWidth={1} />
            <text x={9} y={5} fontSize={11} fill={color.brightTarget} fontFamily="JetBrains Mono, monospace">
              {t.id}
            </text>
          </g>
        );
      })}
    </g>
  );
}
