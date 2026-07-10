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

import { salientTerms, matchRequirement } from '../lib/gatekeeper.mjs';

// salientTerms drops filler, keeps distinctive terms.
const terms = salientTerms('8+ years of experience with Salesforce and SQL');
assert(terms.includes('salesforce'), 'keeps salesforce');
assert(terms.includes('sql'), 'keeps sql');
assert(!terms.includes('years'), 'drops the filler word "years"');
assert(!terms.includes('experience'), 'drops the filler word "experience"');
assert(!terms.includes('with'), 'drops the stopword "with"');

const CV = [
  'Director of Revenue Operations at Brightpath Software',
  'Built Salesforce reporting and ran quarterly planning and OKRs.',
  'Managed a 12 year career across operations roles.',
];
const cvText = CV.join('\n');
const corpus = cvText.toLowerCase();

// met: every keyword present.
const met = matchRequirement('Proven track record with Salesforce reporting.', corpus, CV);
assert.equal(met.status, 'met', 'all keywords present -> met');
assert(met.evidence && /Salesforce/.test(met.evidence), 'evidence snippet cites the resume line');

// absent: no keyword present.
const absent = matchRequirement('Strong SQL and data-warehouse skills.', corpus, CV);
assert.equal(absent.status, 'absent', 'no keyword present -> absent');
assert.equal(absent.evidence, null, 'no evidence when absent');
assert(absent.missing.includes('sql'), 'sql reported missing');

// thin: some keywords present.
const thin = matchRequirement('Salesforce administration and Marketo automation.', corpus, CV);
assert.equal(thin.status, 'thin', 'partial coverage -> thin');

// years signal: requirement asks 8+, resume shows only 12 (>=8) -> true.
const years = matchRequirement('8+ years of experience in revenue operations.', corpus, CV);
assert.equal(years.yearsMin, 8, 'parses the minimum years');
assert.equal(years.yearsSignal, true, 'resume mentions >= 8 years somewhere');

// years signal false when resume shows a smaller number only.
const noYears = matchRequirement('15+ years required.', '5 years of experience', []);
assert.equal(noYears.yearsSignal, false, 'resume max years below the minimum -> false');

console.log('✓ parseJd ok');
