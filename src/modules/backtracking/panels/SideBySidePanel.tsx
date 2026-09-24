/** Spec 2 §7. */
import { backtracking } from '../../../data/scenario';
import { SideBySide } from '../../../ui/SideBySide';

export function BacktrackSideBySide() {
  const b = backtracking;
  return (
    <SideBySide
      seconds={30}
      typical={<>reverse the current direction · draw one line upwind · call it the source</>}
      ours={
        <>
          {b.particles.total} particles · {b.hypotheses_h.length} age hypotheses ·
          uncertainty-weighted · forward-validated · {b.cloud_km2.before} → {b.cloud_km2.after} km² ·
          source time included · uncertainty carried into the hand-off file
        </>
      }
    />
  );
}
