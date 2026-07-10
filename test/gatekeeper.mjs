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

import { buildGatekeeperScaffold } from '../lib/gatekeeper.mjs';

const CV_FULL = `# Jordan Vale

## Experience

### Brightpath Software

**Director of Revenue Operations**

- Built Salesforce reporting and ran quarterly planning and OKRs across four teams.
- 12 year career in revenue operations.
`;

const scaffold = buildGatekeeperScaffold(JD, CV_FULL);

assert(/^# Gatekeeper coverage scaffold/m.test(scaffold), 'has the title heading');
assert(/Northwind Software/.test(scaffold), 'names the company');
assert(/## Requirement coverage/.test(scaffold), 'has the coverage table section');
assert(/## Keyword gaps/.test(scaffold), 'has the keyword-gaps section');
assert(/\| Status \|/.test(scaffold), 'coverage table has a Status column');
assert(/absent/.test(scaffold), 'the SQL/data-warehouse requirement lands as absent');
assert(/deterministic first-pass/i.test(scaffold), 'carries the honesty disclaimer');

// digest widens the evidence corpus and is named in Sources read.
const withDigest = buildGatekeeperScaffold(JD, CV_FULL, 'Deep experience with SQL and Snowflake.');
assert(/article-digest\.md/.test(withDigest), 'names the digest when supplied');

// Deterministic: identical input -> identical output.
assert.equal(
  buildGatekeeperScaffold(JD, CV_FULL),
  buildGatekeeperScaffold(JD, CV_FULL),
  'output is deterministic for identical input',
);

const proseJd = parseJd('# Data Engineer\n\n## Must haves\n\nYou must know Kubernetes and Docker.');
assert(
  proseJd.requirements.every((r) => !/^#/.test(r)),
  'heading lines are not captured as requirements',
);
assert(
  proseJd.requirements.some((r) => /Kubernetes/.test(r)),
  'the prose signal line is still captured',
);

const blockCv = [
  '#### NorthStar Analytics -- Interim VP Operations',
  '- Owned quarterly planning and OKRs.',
];
const blockMatch = matchRequirement(
  'Quarterly planning and OKRs.',
  blockCv.join('\n').toLowerCase(),
  blockCv,
);
assert(
  blockMatch.evidence && !/^[-*#]/.test(blockMatch.evidence),
  'evidence snippet strips leading block markers',
);

const pipeScaffold = buildGatekeeperScaffold(
  '## Requirements\n\n- Build A | B | C pipelines in Salesforce.',
  CV_FULL,
);
assert(
  pipeScaffold.includes('A \\| B \\| C'),
  'pipes in a requirement are escaped in the table cell',
);

const gapsNoDigest = buildGatekeeperScaffold(JD, CV_FULL).split('## Keyword gaps')[1];
assert(/\bsql\b/i.test(gapsNoDigest), 'sql is a keyword gap without a digest');
const gapsWithDigest = buildGatekeeperScaffold(
  JD,
  CV_FULL,
  'Built SQL pipelines on a Snowflake data-warehouse.',
).split('## Keyword gaps')[1];
assert(!/\bsql\b/i.test(gapsWithDigest), 'a digest supplying SQL removes it from the keyword gaps');

console.log('✓ parseJd ok');
