/**
 * The optional §7 side-by-side, present in all three specs: the same problem
 * done the typical way and done ours.
 *
 * Identical treatment on every screen, so the comparison reads as one argument
 * across the whole demo rather than three separate asides.
 */
import type { ReactNode } from 'react';

export function SideBySide({
  typical,
  ours,
  seconds,
}: {
  typical: ReactNode;
  ours: ReactNode;
  seconds?: number;
}) {
  return (
    <div className="block">
      <div className="block__head">TYPICAL APPROACH vs OURS</div>
      <div className="sbs">
        <div className="sbs__col sbs__col--typical">
          <div className="sbs__head">Typical approach</div>
          <div className="sbs__body">{typical}</div>
        </div>
        <div className="sbs__col sbs__col--ours">
          <div className="sbs__head">Ours</div>
          <div className="sbs__body">{ours}</div>
        </div>
      </div>
      {seconds != null && <div className="sbs__note">about {seconds} seconds on camera</div>}
    </div>
  );
}
