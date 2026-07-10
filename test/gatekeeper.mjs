// Deterministic, zero-network unit tests for the gatekeeper coverage engine.
// Uses only node:assert. Fixtures are inline and non-personal.
import assert from 'node:assert';
import { parseJd } from '../lib/gatekeeper.mjs';

const JD = `# Director of Revenue Operations

**Company:** Northwind Software

We are hiring a RevOps leader to own our go-to-market systems.

## Responsibilities

- Own the CRM and reporting stack.
- Partner with sales and marketing leadership.

## Requirements

- 8+ years of experience in revenue operations or sales operations.
- Proven track record building reporting in Salesforce.
- Demonstrated ownership of quarterly planning and OKRs.
- Strong SQL and data-warehouse skills.
`;

const jd = parseJd(JD);

assert.equal(jd.company, 'Northwind Software', 'company from **Company:** line');
assert.equal(jd.title, 'Director of Revenue Operations', 'title from H1');
assert.equal(jd.requirements.length, 4, 'four requirement bullets under ## Requirements');
assert(jd.requirements[0].startsWith('8+ years'), 'first requirement preserved in order');
assert(
  jd.requirements.every((r) => !/^Own the CRM/.test(r)),
  'responsibilities bullets are not requirements',
);

// Fallbacks when the JD has no explicit company/title/requirements section.
const bare = parseJd('Looking for someone with 5+ years of Python experience. Must know AWS.');
assert.equal(bare.company, 'the company', 'company falls back');
assert.equal(bare.title, 'the role', 'title falls back');
assert(bare.requirements.length >= 1, 'requirement-signal lines are captured without a heading');

console.log('✓ parseJd ok');
