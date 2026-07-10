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

console.log('✓ smoke ok:', keys.join(', '));
