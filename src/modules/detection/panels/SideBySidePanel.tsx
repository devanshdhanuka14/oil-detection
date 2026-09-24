/** Spec 1 §7. */
import { detection } from '../../../data/scenario';
import { SideBySide } from '../../../ui/SideBySide';

export function DetectionSideBySide() {
  const s = detection.S14_rejected_example;
  return (
    <SideBySide
      seconds={20}
      typical={<>dark patch → <strong>"OIL DETECTED"</strong></>}
      ours={
        <>
          dark patch → <strong>not oil, {Math.round(s.oil_prob * 100)}%</strong> — fuzzy edges
          ({s.edge_ratio}× typical), blobby shape (elongation {s.elongation}), damping only{' '}
          {s.contrast_db} dB, {s.verdict}
        </>
      }
    />
  );
}
