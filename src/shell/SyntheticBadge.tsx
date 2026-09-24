/**
 * CLAUDE.md §1.3: visible in the shell at all times, including in recordings.
 * Text comes from scenario.meta.label.
 */
import { meta } from '../data/scenario';

export function SyntheticBadge() {
  return (
    <div className="synthetic-badge" title={meta.label}>
      <span className="synthetic-badge__dot" aria-hidden />
      Prototype · synthetic scenario · fictional vessels · not a reconstruction of the MSC Elsa 3 incident
    </div>
  );
}
