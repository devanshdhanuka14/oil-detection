/**
 * End-to-end check of the demo as a presenter meets it.
 *
 * Builds, serves the production build, then drives the real app with the real
 * presenter keys and asserts what has to be on screen. This is the check that
 * catches what the unit-level tests cannot: that a card opens when you click
 * it, that the counters and the badge are actually rendered, that the stop rule
 * reads correctly at each threshold.
 *
 *   npm run verify:demo
 *
 * Exits non-zero and names every failure.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4178;
const BASE = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1440, height: 800 };

/* ── browser ─────────────────────────────────────────────────────────── */

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  try {
    const p = chromium.executablePath();
    if (p && existsSync(p)) return p;
  } catch {
    /* playwright browsers not installed */
  }
  return null;
}

/* ── assertions ──────────────────────────────────────────────────────── */

const failures = [];
let checks = 0;

function check(ok, label, detail = '') {
  checks++;
  if (ok) console.log(`  PASS  ${label}${detail ? `  — ${detail}` : ''}`);
  else {
    console.log(`  FAIL  ${label}${detail ? `  — ${detail}` : ''}`);
    failures.push(`${label}${detail ? ` (${detail})` : ''}`);
  }
}

const has = (haystack, needle) => (haystack ?? '').toLowerCase().includes(needle.toLowerCase());

/* ── server ──────────────────────────────────────────────────────────── */

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

async function waitFor(url, ms = 30000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/* ── the drive ───────────────────────────────────────────────────────── */

async function main() {
  const exe = findBrowser();
  if (!exe) {
    console.error(
      '\nverify:demo needs a Chrome or Chromium binary.\n' +
        'Set CHROME_PATH=/path/to/chrome, or run: npx playwright install chromium\n',
    );
    process.exit(2);
  }

  console.log('Building…');
  await run('npm', ['run', 'build']);

  console.log(`\nServing the production build on ${BASE} …`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: false,
  });
  const cleanup = () => { try { server.kill(); } catch { /* already gone */ } };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  if (!(await waitFor(BASE))) {
    cleanup();
    console.error(`\nFAIL  preview server never came up on ${BASE}\n`);
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: VIEWPORT });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));
  page.on('console', (m) => {
    // The browser probes /favicon.ico on its own; that is not the app.
    if (m.type() === 'explicit-error-unused') pageErrors.push(m.text());
  });

  // The starting module is read from the hash once, at mount, so changing the
  // hash on a live page would not switch screens. Load fresh, then move with
  // the presenter keys - which is the real path and exercises them too.
  const loadFresh = async (settleMs = 900) => {
    await page.goto(BASE, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(settleMs);
  };
  const toModule = async (key, settleMs) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(settleMs);
  };

  const read = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText ?? null, sel);

  try {
    /* ── screen 1 ───────────────────────────────────────────────────── */
    console.log('\nScreen 1 — detection');
    await loadFresh(1200);
    await page.keyboard.press('e');
    await page.waitForTimeout(2600);
    check(!!(await page.$('.synthetic-badge')), 'synthetic badge present');
    check(
      (await read('.screen__counter'))?.replace(/\s+/g, ' ').trim() === '47 → 2',
      'counter reads 47 → 2',
      (await read('.screen__counter'))?.replace(/\s+/g, ' ').trim(),
    );
    check(has(await read('[data-payoff]'), 'SLICK S01'), 'S01 payoff card is shown');
    check(
      (await page.$$('.patch')).length === 47,
      'all 47 patch outlines rendered',
      `${(await page.$$('.patch')).length} found`,
    );

    // Click through the outlines until S14 — the spec's worked rejection example.
    let s14 = null;
    for (const g of await page.$$('.patch')) {
      const box = await g.boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(60);
      if (has(await read('.rule-head__left'), 'PATCH S14')) {
        s14 = await read('.detail');
        break;
      }
    }
    check(!!s14, 'S14 is clickable and opens its card');
    if (s14) {
      check(has(s14, 'NOT OIL'), 'S14 card says NOT OIL');
      check(has(s14, 'dark patch, judged not oil'), 'S14 uses the required wording');
      check(has(s14, 'elongation 1.6'), 'S14 shows its measured elongation 1.6');
      check(has(s14, '0.4×'), 'S14 shows the 0.4x edge sharpness');
      check(has(s14, 'low-wind patch'), 'S14 gives its verdict');
    }

    /* ── screen 2 ───────────────────────────────────────────────────── */
    console.log('\nScreen 2 — backtracking');
    await toModule('2', 2800);
    check(!!(await page.$('.synthetic-badge')), 'synthetic badge present');
    check(
      (await read('.screen__counter'))?.replace(/\s+/g, ' ').trim() === '340 → 18 km²',
      'counter reads 340 → 18 km²',
      (await read('.screen__counter'))?.replace(/\s+/g, ' ').trim(),
    );
    const src = await read('[data-payoff]');
    check(has(src, 'SOURCE ESTIMATE'), 'source estimate payoff is shown');
    check(has(src, '0.14') && has(src, '0.058'), 'FSS is shown with its baseline');
    check(has(src, '12 – 36 h') || has(src, '12–36'), 'source time carries its range');

    /* ── screen 3 ───────────────────────────────────────────────────── */
    console.log('\nScreen 3 — attribution');
    await toModule('3', 3200);
    check(!!(await page.$('.synthetic-badge')), 'synthetic badge present');
    check(
      (await read('.screen__counter'))?.replace(/\s+/g, ' ').trim() === '612 → 38 → 3',
      'counter reads 612 → 38 → 3',
      (await read('.screen__counter'))?.replace(/\s+/g, ' ').trim(),
    );

    const sum = await page.evaluate(() =>
      [...document.querySelectorAll('.rank-row:not(.rank-row--out) .rank-row__pct')]
        .map((e) => parseFloat(e.textContent))
        .reduce((a, c) => a + c, 0),
    );
    check(sum === 100, 'ranking sums to exactly 100%', `${sum}%`);
    check(
      has(await read('.ranking'), 'no visible ship'),
      'the no-visible-ship row is present',
    );

    // Tessera Bay — the trap card, the one the script must click.
    await page.evaluate(() =>
      [...document.querySelectorAll('.rank-row')]
        .find((e) => e.textContent.includes('Tessera'))
        ?.click(),
    );
    await page.waitForTimeout(400);
    const trap = await read('.detail');
    check(has(trap, 'TESSERA BAY'), 'Tessera Bay is clickable and opens its card');
    check(has(trap, 'NOT A LIKELY SOURCE'), 'trap card says NOT A LIKELY SOURCE');
    check(has(trap, 'came within 2 nm'), 'trap card uses the corrected arrival wording');
    check(has(trap, 'never inside the rewound oil'), 'trap card states it was never inside');
    check(has(trap, 'nearest ship ≠ source'), 'trap card makes the point');

    // Stop rule at each threshold, read off the stage summary.
    const stage3 = async () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('.stage-sum')]
            .map((e) => e.innerText.replace(/\s+/g, ' '))
            .find((t) => t.includes('REWIND LOOP')) ?? '',
      );
    const setThreshold = async (label) => {
      await page.evaluate(
        (l) => [...document.querySelectorAll('.stepslider__stop')].find((e) => e.textContent.trim() === l)?.click(),
        label,
      );
      await page.waitForTimeout(650);
    };

    for (const [label, want] of [
      ['50%', 'T−18 h'],
      ['65%', 'T−18 h'],
      ['80%', 'not conclusive'],
    ]) {
      await setThreshold(label);
      const s = await stage3();
      check(has(s, want), `threshold ${label} → ${want}`, s.replace('✓ STAGE 3 · REWIND LOOP · ', ''));
    }
    await setThreshold('65%');

    // Presenter magnifier.
    await page.keyboard.press('z');
    await page.waitForTimeout(600);
    const mag = await page.evaluate(() => {
      const m = document.querySelector('.magnifier__panel');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      const st = document.querySelector('.stage').getBoundingClientRect();
      return { rightAligned: Math.abs(r.right - st.right) < 2 };
    });
    check(!!mag, 'Z opens the magnifier in Explore');
    check(!!mag?.rightAligned, 'magnifier is anchored to the right edge');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check(!(await page.$('.magnifier')), 'Esc closes the magnifier');

    // It must never open while a timeline is playing.
    await loadFresh(1200);
    await page.keyboard.press('z');
    await page.waitForTimeout(400);
    check(!(await page.$('.magnifier')), 'Z does nothing in Play mode');

    check(pageErrors.length === 0, 'no uncaught page errors', pageErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
    cleanup();
  }

  console.log('');
  if (failures.length) {
    console.error(`verify:demo FAILED — ${failures.length} of ${checks} checks did not pass:\n`);
    for (const f of failures) console.error(`  · ${f}`);
    console.error('');
    process.exit(1);
  }
  console.log(`verify:demo passed — ${checks}/${checks} checks.\n`);
}

main().catch((e) => {
  console.error(`\nverify:demo errored: ${e.message}\n`);
  process.exit(1);
});
