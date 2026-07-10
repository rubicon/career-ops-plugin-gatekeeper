// Zero-network smoke test. Verifies the manifest/index hook contract. Grown in
// later tasks to also exercise the engine and the skill guardrail invariants.
// Uses only allowlisted node: builtins. Run by CI and by `plugins.mjs add`.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const KINDS = ['provider', 'ingest', 'search', 'notify', 'export'];

// --- Manifest <-> index hook contract ---------------------------------------
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const mod = await import(path.join(root, manifest.entry || 'index.mjs'));
const hooks = mod.default;

assert(hooks && typeof hooks === 'object', 'default export must be an object of hooks');
const keys = Object.keys(hooks);
assert(keys.length > 0, 'declare at least one hook');
for (const k of keys) assert(KINDS.includes(k), `unknown hook "${k}"`);
for (const h of manifest.hooks)
  assert(keys.includes(h), `manifest declares hook "${h}" but index.mjs does not export it`);
assert(typeof hooks.export === 'function', 'export hook must be a function');
assert(manifest.humanInTheLoop === true, 'humanInTheLoop must be true');
assert.equal(manifest.id, 'gatekeeper', 'manifest id must be "gatekeeper"');
assert.deepEqual(manifest.requiredEnv, [], 'requiredEnv must be empty (no keys)');
assert.deepEqual(manifest.allowedHosts, [], 'allowedHosts must be empty (no network)');

import { mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import os from 'node:os';

// --- Hook behavior against throwaway fixtures --------------------------------
const tmp = mkdtempSync(path.join(os.tmpdir(), 'gk-'));
writeFileSync(
  path.join(tmp, 'jd.md'),
  '# QA Lead\n\n**Company:** Acme\n\n## Requirements\n\n- 3+ years of Playwright.\n',
);
writeFileSync(
  path.join(tmp, 'cv.md'),
  '# Sam Rivera\n\n## Experience\n\n- Built Playwright suites for 4 years.\n',
);

const cwd = process.cwd();
process.chdir(tmp);
try {
  // Missing jd_path -> pushed 0, no throw.
  const noJd = await hooks.export(null, { settings: {}, log: () => {} });
  assert.equal(noJd.pushed, 0, 'no jd_path setting -> pushed 0');

  // Dry run -> pushed 0, nothing written.
  const dry = await hooks.export(null, {
    settings: { jd_path: 'jd.md', cv_path: 'cv.md' },
    log: () => {},
    dryRun: true,
  });
  assert.equal(dry.pushed, 0, 'dry-run -> pushed 0');

  // Real run -> pushed 1 and a dated scaffold exists in output/.
  const real = await hooks.export(null, {
    settings: { jd_path: 'jd.md', cv_path: 'cv.md' },
    log: () => {},
  });
  assert.equal(real.pushed, 1, 'real run -> pushed 1');
  assert(existsSync(path.join(tmp, 'output')), 'output/ directory created');
  assert(
    readdirSync(path.join(tmp, 'output')).some((f) =>
      /^gatekeeper-acme-\d{4}-\d{2}-\d{2}\.md$/.test(f),
    ),
    'a dated gatekeeper scaffold was written',
  );

  // Path traversal is refused.
  let threw = false;
  try {
    await hooks.export(null, {
      settings: { jd_path: '../escape.md', cv_path: 'cv.md' },
      log: () => {},
    });
  } catch {
    threw = true;
  }
  assert(threw, 'a jd_path escaping the project root is refused');
} finally {
  process.chdir(cwd);
  rmSync(tmp, { recursive: true, force: true });
}

console.log('✓ smoke ok:', keys.join(', '));
