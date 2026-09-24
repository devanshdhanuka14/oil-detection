/** Spec 3 §7. */
import { attribution, backtracking } from '../../../data/scenario';
import { hoursBetween } from '../../../lib/time';
import { SideBySide } from '../../../ui/SideBySide';

export function AttributionSideBySide() {
  const a = attribution;
  const lead = a.ranking[0];
  const t = a.vessels['V-TESSERA'];
  return (
    <SideBySide
      seconds={20}
      typical={<>nearest ship at image time → <strong>"{t.name} responsible"</strong></>}
      ours={
        <>
          rewind the oil {a.loop_rows.find((r) => r.stop_at_default)?.h} h →{' '}
          <strong>{a.vessels['V-A'].name} {Math.round(lead.p * 100)}%</strong>,{' '}
          {t.name} {(t.p * 100).toFixed(1)}% (arrived ~
          {hoursBetween(backtracking.source.time_utc, t.first_within_2nm_of_slick_utc)} h after the oil
          was released) · dark{' '}
          {Math.round(a.ranking.find((r) => r.id === 'DARK-BT3')!.p * 100)}% · fixed{' '}
          {Math.round(a.ranking.find((r) => r.id === 'FIXED')!.p * 100)}% · none{' '}
          {Math.round(a.ranking.find((r) => r.id === 'NONE')!.p * 100)}%
        </>
      }
    />
  );
}
