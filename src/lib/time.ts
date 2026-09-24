/** Time helpers. Every instant in the demo is UTC and comes from scenario.json. */

export const parse = (iso: string): number => Date.parse(iso);

/** "28 May 00:41 UTC" */
export function fmtUtc(iso: string | number, opts: { seconds?: boolean } = {}): string {
  const d = new Date(typeof iso === 'string' ? Date.parse(iso) : iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  const t = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}${opts.seconds ? `:${p(d.getUTCSeconds())}` : ''}`;
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${t} UTC`;
}

/** "27 May 2025 · 06:41 UTC" */
export function fmtUtcLong(iso: string): string {
  const d = new Date(Date.parse(iso));
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/** "05:46" */
export function fmtHm(iso: string | number): string {
  const d = new Date(typeof iso === 'string' ? Date.parse(iso) : iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Hours before the SAR image -> absolute epoch ms. */
export const hoursBefore = (imageIso: string, h: number): number => Date.parse(imageIso) - h * 3600_000;

/** "T−18 h", "T−16.5 h", "T0" */
export function fmtStep(h: number): string {
  if (h === 0) return 'T0';
  const s = Number.isInteger(h) ? String(h) : h.toFixed(1);
  return `T−${s} h`;
}

/** "1 h 50 min" / "25 min" — derived from two instants, never written down. */
export function fmtDuration(fromIso: string, toIso: string): string {
  const mins = Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Whole hours between two instants, rounded — e.g. Tessera Bay's "~18 h". */
export function hoursBetween(fromIso: string, toIso: string): number {
  return Math.round(Math.abs(Date.parse(toIso) - Date.parse(fromIso)) / 3600_000);
}
