/**
 * Mechanical check of CLAUDE.md non-negotiable #2:
 * "No number is hardcoded in a component. Everything comes from scenario.json."
 *
 * Scans src/modules and src/ui for numeric literals and fails on any that is
 * not plainly a layout or styling constant. Run: npm run audit:numbers
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/modules', 'src/ui'];

/** Every number that appears anywhere in scenario.json, at any depth. */
function scenarioNumbers(): Set<number> {
  const out = new Set<number>();
  const walk = (v: unknown) => {
    if (typeof v === 'number') out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    else if (typeof v === 'string') {
      // Numbers embedded in strings, e.g. "0.40 m/s toward 055°".
      for (const m of v.matchAll(/-?\d+(?:\.\d+)?/g)) out.add(Number(m[0]));
    }
  };
  walk(JSON.parse(readFileSync('src/data/scenario.json', 'utf8')));
  return out;
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') || p.endsWith('.ts') ? [p] : [];
  });
}

/**
 * Figures that are real-world constants, not scenario data. They may appear
 * literally; each needs a reason.
 */
const REAL_WORLD: Record<number, string> = {
  300: 'SOLAS AIS carriage threshold (300 GT) — regulation, not scenario data',
};

const scenario = scenarioNumbers();
type Finding = { file: string; line: number; value: number; text: string };
const findings: Finding[] = [];

for (const root of ROOTS) {
  for (const file of files(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    let inBlockComment = false;

    lines.forEach((raw, i) => {
      let line = raw;

      // Strip comments: a number in a comment is documentation, not data.
      if (inBlockComment) {
        const end = line.indexOf('*/');
        if (end === -1) return;
        line = line.slice(end + 2);
        inBlockComment = false;
      }
      // A whole block comment on one line, e.g. a JSDoc summary.
      line = line.replace(/\/\*.*?\*\//g, '');

      const openBlock = line.indexOf('/*');
      if (openBlock !== -1 && !line.slice(openBlock).includes('*/')) {
        line = line.slice(0, openBlock);
        inBlockComment = true;
      }
      const lineComment = line.indexOf('//');
      if (lineComment !== -1) line = line.slice(0, lineComment);

      // Strip string literals, which are labels rather than values.
      line = line.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""').replace(/`[^`]*`/g, '``');

      for (const m of line.matchAll(/(?<![\w.$])-?\d+(?:\.\d+)?/g)) {
        const value = Number(m[0]);
        const before = line.slice(Math.max(0, m.index! - 40), m.index!);
        const after = line.slice(m.index! + m[0].length, m.index! + m[0].length + 20);

        // Only *distinctive* values are worth flagging. A static scan cannot
        // tell 18 in "18 km2" from 18 in "padding: 18px", and flagging both
        // buries the real findings. Coordinates, areas, counts and measured
        // quantities are distinctive; styling constants are not.
        if (!isDistinctive(value)) continue;
        if (isLayoutContext(before, after, value)) continue;
        if (value in REAL_WORLD) continue;
        if (!scenario.has(value)) continue;

        findings.push({ file, line: i + 1, value, text: raw.trim().slice(0, 110) });
      }
    });
  }
}

/**
 * A value specific enough that seeing it in a component means a scenario number
 * was copied: two or more decimal places (coordinates, dB, probabilities), or
 * three digits and up (counts, areas, bearings).
 */
function isDistinctive(v: number): boolean {
  const a = Math.abs(v);
  const decimals = (String(v).split('.')[1] ?? '').length;
  if (decimals >= 2) return true;
  if (a >= 100 && Number.isInteger(v)) return true;
  return false;
}

/** Numbers that are obviously about pixels, opacity, indices or timing. */
function isLayoutContext(before: string, after: string, value: number): boolean {
  // 0 and 1 are indices, flags and full opacity everywhere.
  if (value === 0 || value === 1 || value === -1) return true;

  const ctx = before.toLowerCase();
  const LAYOUT = [
    'width', 'height', 'size', 'radius', 'r=', 'rx', 'ry', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2',
    'x=', 'y=', 'stroke', 'opacity', 'fontsize', 'font-size', 'padding', 'margin', 'gap',
    'duration', 'delay', 'ease', 'blocks', 'slice', 'round', 'tofixed', 'padstart', 'max',
    'min', 'length -', 'index', 'step', 'zindex', 'translate', 'rotate', 'scale', 'px',
    'marker', 'offset', 'dasharray', 'top', 'left', 'bottom', 'right', 'settimeout', 'ms',
  ];
  if (LAYOUT.some((k) => ctx.includes(k))) return true;
  // `* 100` / `/ 100` are percentage formatting.
  if (value === 100 && (/[*/]\s*$/.test(before) || /^\s*[)%]/.test(after))) return true;
  // 60 / 1000 / 3600 are time conversions.
  if ([60, 1000, 3600, 60000, 3600000].includes(value)) return true;
  return false;
}

if (findings.length === 0) {
  console.log('audit-numbers: no scenario values are hardcoded in components.');
  process.exit(0);
}

console.error(`audit-numbers: ${findings.length} literal(s) match a value in scenario.json:\n`);
for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.value}\n      ${f.text}`);
console.error('\nRead these from src/data/scenario.ts instead, or make the intent explicit.');
process.exit(1);
