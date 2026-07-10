#!/usr/bin/env node
// @ts-check
/**
 * generate-gatekeeper.mjs: standalone CLI for the JD-vs-resume coverage engine.
 *
 * Usage:
 *   node bin/generate-gatekeeper.mjs <jd.md> <cv.md> <output.md> [--digest=<path>]
 *
 * Reads a job description and a Markdown CV and writes the deterministic
 * coverage scaffold. The plugin's export hook (index.mjs) shares the same engine
 * (lib/gatekeeper.mjs); this CLI exists so the scaffold is usable directly,
 * outside the plugin host, with an explicit (undated) output name.
 */

import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildGatekeeperScaffold } from '../lib/gatekeeper.mjs';

async function main() {
  const args = process.argv.slice(2);
  let jdPath;
  let cvPath;
  let outputPath;
  let digestPath = null;

  for (const arg of args) {
    if (arg.startsWith('--digest=')) digestPath = arg.split('=')[1];
    else if (!jdPath) jdPath = arg;
    else if (!cvPath) cvPath = arg;
    else if (!outputPath) outputPath = arg;
  }

  if (!jdPath || !cvPath || !outputPath) {
    console.error(
      'Usage: node bin/generate-gatekeeper.mjs <jd.md> <cv.md> <output.md> [--digest=<path>]',
    );
    process.exit(1);
  }

  const outAbs = resolve(outputPath);
  const relOut = relative(process.cwd(), outAbs);
  if (relOut === '' || relOut.startsWith('..') || isAbsolute(relOut)) {
    console.error(`Refusing to write outside the working directory: ${outAbs}`);
    process.exit(1);
  }

  const jdText = readFileSync(resolve(jdPath), 'utf8');
  const cvText = readFileSync(resolve(cvPath), 'utf8');
  const digestText = digestPath ? readFileSync(resolve(digestPath), 'utf8') : '';

  const scaffold = buildGatekeeperScaffold(jdText, cvText, digestText);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, scaffold);

  console.log(`Scaffold generated: ${outAbs} (${(scaffold.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('Scaffold generation failed:', err.message);
  process.exit(1);
});
