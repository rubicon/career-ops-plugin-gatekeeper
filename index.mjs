// @ts-check
// career-ops-plugin-gatekeeper: run a one-shot adversarial resume screen for a
// specific job.
//
// Local, no-network, no-key plugin. Uses the `export` hook (the consumer hook
// that produces an artifact). It ignores the tracker snapshot on purpose: a
// screen is about the JD and cv.md, not the pipeline. All work is local: read
// the JD + cv.md (+ optional article-digest.md), write the coverage scaffold to
// output/gatekeeper-<company>-<date>.md.
//
// The scaffold is the deterministic, factual half. The adversarial screen and
// the truthful fixes are produced by the host agent following skill.md.
//
// Registry rules honored: no bare (npm) imports, no network, no child_process.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildGatekeeperScaffold, parseJd } from './lib/gatekeeper.mjs';

/**
 * Kebab-case a value for the output filename; falls back to "company".
 * @param {string} name
 * @returns {string}
 */
function slug(name) {
  const s = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'company';
}

/**
 * Resolve a user-supplied relative path and refuse anything that escapes the
 * project root (a crafted jd_path/cv_path/output_dir must not read or write
 * outside it).
 * @param {string} root
 * @param {string} rel
 * @returns {string} Absolute path inside root.
 */
function containedPath(root, rel) {
  const abs = path.resolve(root, rel);
  const within = abs === root || abs.startsWith(root + path.sep);
  if (!within) throw new Error(`path "${rel}" escapes the project directory`);
  return abs;
}

/**
 * Today's calendar date as YYYY-MM-DD for the output filename. A screen is a
 * real-world event, so the filename carries the user's local calendar date, not
 * a UTC instant (a UTC date would roll a day early for an evening run west of
 * Greenwich). The zone is the optional IANA `time_zone` setting, else the host
 * local zone; an invalid zone falls back to local. Formatted with Intl (which
 * handles the zone and DST) rather than hand-rolled offset math. Impure and
 * filename-only; the engine (lib/gatekeeper.mjs) stays date-free.
 *
 * @param {string} [timeZone] - IANA zone id, e.g. "America/Chicago".
 * @param {Date} [now] - the instant to format; defaults to the current time.
 * @returns {string}
 */
export function today(timeZone, now = new Date()) {
  const base = { year: 'numeric', month: '2-digit', day: '2-digit' };
  // en-CA renders as YYYY-MM-DD. An invalid IANA zone throws, so fall back local.
  try {
    return new Intl.DateTimeFormat('en-CA', timeZone ? { ...base, timeZone } : base).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', base).format(now);
  }
}

export default {
  /**
   * Write a JD-vs-resume coverage scaffold for the host agent to screen against.
   *
   * @param {Readonly<object>} _snapshot - Tracker snapshot (unused: a screen reads the JD + cv.md, not the pipeline).
   * @param {{settings?: Record<string, unknown>, log?: (...a: unknown[]) => void, dryRun?: boolean}} ctx
   * @returns {Promise<{pushed: number}>}
   */
  async export(_snapshot, ctx) {
    const settings = (ctx && ctx.settings) || {};
    const log = (ctx && ctx.log) || console.log;
    const root = process.cwd();

    if (typeof settings.jd_path !== 'string' || !settings.jd_path) {
      log('gatekeeper: no jd_path set. Point plugins.gatekeeper.jd_path at your JD file.');
      return { pushed: 0 };
    }

    const jdPath = containedPath(root, settings.jd_path);
    const cvPath = containedPath(
      root,
      typeof settings.cv_path === 'string' ? settings.cv_path : 'cv.md',
    );
    const digestPath = containedPath(
      root,
      typeof settings.digest_path === 'string' ? settings.digest_path : 'article-digest.md',
    );
    const outDir = containedPath(
      root,
      typeof settings.output_dir === 'string' ? settings.output_dir : 'output',
    );

    let jdText;
    try {
      jdText = readFileSync(jdPath, 'utf8');
    } catch {
      log(`gatekeeper: no JD found at ${path.relative(root, jdPath)}, nothing to screen.`);
      return { pushed: 0 };
    }

    let cvText;
    try {
      cvText = readFileSync(cvPath, 'utf8');
    } catch {
      log(
        `gatekeeper: no CV found at ${path.relative(root, cvPath) || 'cv.md'}, nothing to screen.`,
      );
      return { pushed: 0 };
    }

    let digestText = '';
    try {
      digestText = readFileSync(digestPath, 'utf8');
    } catch {
      // article-digest.md is optional; absence is normal.
    }

    const company = parseJd(jdText).company;
    const timeZone =
      typeof settings.time_zone === 'string' && settings.time_zone ? settings.time_zone : undefined;
    const outPath = path.join(outDir, `gatekeeper-${slug(company)}-${today(timeZone)}.md`);
    const relOut = path.relative(root, outPath);

    if (ctx && ctx.dryRun) {
      log(
        `gatekeeper: would write ${relOut} from ${path.relative(root, jdPath)} (--dry-run: not written).`,
      );
      return { pushed: 0 };
    }

    const scaffold = buildGatekeeperScaffold(jdText, cvText, digestText);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, scaffold);
    log(
      `gatekeeper: wrote ${relOut} (${(scaffold.length / 1024).toFixed(1)} KB). Now run the gatekeeper skill to screen against it.`,
    );
    return { pushed: 1 };
  },
};
