// @ts-check
/**
 * gatekeeper.mjs: the deterministic JD-vs-resume coverage engine for
 * career-ops-plugin-gatekeeper.
 *
 * Pure and dependency-free: no npm imports, no network, no filesystem, no
 * personal data, only string work. It takes the JD text, the resume (cv.md)
 * text, and optional supplementary evidence (article-digest.md) and returns a
 * Markdown *coverage scaffold*: a factual, first-pass requirement -> evidence
 * map. It deliberately does NOT perform the adversarial screen or write prose
 * judgment; that is the skill's job (the host agent). The engine only surfaces
 * what is literally present or absent so the agent can layer judgment on top
 * without inventing coverage.
 *
 * Deterministic: identical input yields identical output. There is no Date and
 * no randomness inside the engine; the dated output filename is chosen by the
 * hook (index.mjs), not here.
 */

const BULLET_RE = /^[-*]\s+(.*)$/;
const HEADING_RE = /^#{1,6}\s+(.*)$/;
const BOLD_HEADING_RE = /^\*\*(.+?):?\*\*$/;
const YEARS_RE = /(\d+)\+?\s*years?/i;
const REQ_SECTION_RE =
  /(requirement|qualif|must[ -]?have|what you.?ll (need|bring)|who you are|you have|about you)/i;
const REQ_SIGNAL_RE =
  /\b(must|required|minimum|proven|demonstrated|expert|experience (with|in|of)|\d+\+?\s*years?)\b/i;

/**
 * Reduce inline Markdown to plain text and collapse whitespace.
 * @param {string} text
 * @returns {string}
 */
function stripInline(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pull a labelled field like "Company: X" (bold or plain) from the JD lines.
 * @param {string[]} lines
 * @param {RegExp} labelRe - matches the label, capturing the value in group 1.
 * @returns {string|null}
 */
function labelledField(lines, labelRe) {
  for (const raw of lines) {
    const line = raw.replace(/^\*\*/, '').replace(/\*\*/g, '').trim();
    const m = line.match(labelRe);
    if (m && m[1] && m[1].trim()) return stripInline(m[1].trim());
  }
  return null;
}

/**
 * Parse a Markdown/plain-text JD into company, role title, and the list of hard
 * requirement lines. Requirement lines come from a requirements-like section's
 * bullets; if no such section exists, from all bullets plus any standalone line
 * carrying a requirement signal. Order-preserving and de-duplicated.
 * @param {string} jdText
 * @returns {{company: string, title: string, requirements: string[]}}
 */
export function parseJd(jdText) {
  const lines = jdText.split(/\r?\n/);

  const h1 = lines.map((l) => l.match(/^#\s+(.*)$/)).find(Boolean);
  const title =
    labelledField(lines, /^(?:title|role|position)\s*:\s*(.+)$/i) ||
    (h1 ? stripInline(h1[1]) : null) ||
    'the role';
  const company =
    labelledField(lines, /^(?:company|organi[sz]ation|employer)\s*:\s*(.+)$/i) || 'the company';

  // Collect bullets that sit inside a requirements-like section.
  const sectionReqs = [];
  let inReqSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(HEADING_RE) || line.match(BOLD_HEADING_RE);
    if (heading) {
      inReqSection = REQ_SECTION_RE.test(heading[1]);
      continue;
    }
    const bullet = line.match(BULLET_RE);
    if (bullet && inReqSection) sectionReqs.push(stripInline(bullet[1]));
  }

  let requirements = sectionReqs;
  if (requirements.length === 0) {
    // No requirements section: fall back to all bullets, then to signal lines.
    for (const raw of lines) {
      const line = raw.trim();
      const bullet = line.match(BULLET_RE);
      if (bullet) requirements.push(stripInline(bullet[1]));
    }
    if (requirements.length === 0) {
      for (const raw of lines) {
        const line = stripInline(raw.trim());
        if (line && REQ_SIGNAL_RE.test(line)) requirements.push(line);
      }
    }
  }

  // De-duplicate, preserve order, drop empties.
  const seen = new Set();
  requirements = requirements.filter((r) => {
    if (!r || seen.has(r)) return false;
    seen.add(r);
    return true;
  });

  return { company, title, requirements };
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'your',
  'our',
  'are',
  'will',
  'have',
  'has',
  'this',
  'that',
  'from',
  'into',
  'across',
  'their',
  'them',
  'they',
  'who',
  'via',
  'years',
  'year',
  'experience',
  'experienced',
  'strong',
  'proven',
  'demonstrated',
  'ability',
  'able',
  'working',
  'work',
  'knowledge',
  'skills',
  'skill',
  'including',
  'etc',
  'using',
  'use',
  'used',
  'team',
  'teams',
  'role',
  'roles',
  'must',
  'required',
  'minimum',
  'plus',
  'preferred',
  'nice',
  'track',
  'record',
  'expert',
  'expertise',
]);

/**
 * Escape a string for safe use inside a RegExp.
 * @param {string} s
 * @returns {string}
 */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract distinctive, lowercased terms from a requirement line: word-ish
 * tokens (keeping tech punctuation like c++, .net, ci/cd) that are at least
 * three characters or a short acronym, minus stopwords and JD filler. Trailing
 * sentence punctuation is stripped so a keyword ending a sentence ("Salesforce.")
 * matches the same keyword in the resume; internal/leading tech punctuation is
 * preserved. Order-preserving and de-duplicated.
 * @param {string} text
 * @returns {string[]}
 */
export function salientTerms(text) {
  const tokens = text.match(/[A-Za-z0-9][A-Za-z0-9+.#/-]*/g) || [];
  const out = [];
  const seen = new Set();
  for (const raw of tokens) {
    const tok = raw.replace(/[.,;:!?]+$/, '');
    if (!tok) continue;
    const isAcronym = tok.length >= 2 && tok === tok.toUpperCase() && /[A-Z]/.test(tok);
    if (tok.length < 3 && !isAcronym) continue;
    const key = tok.toLowerCase();
    if (STOPWORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Whole-word (or substring for punctuated tech terms) presence check.
 * @param {string} corpusLower - the resume+digest corpus, already lowercased.
 * @param {string} term - a lowercased salient term.
 * @returns {boolean}
 */
function wordPresent(corpusLower, term) {
  if (/^[a-z0-9 ]+$/.test(term)) {
    return new RegExp(`\\b${escapeRe(term)}\\b`).test(corpusLower);
  }
  return corpusLower.includes(term);
}

/**
 * The largest years-of-experience figure mentioned in the corpus, or 0.
 * @param {string} corpusLower
 * @returns {number}
 */
function maxYears(corpusLower) {
  let max = 0;
  const re = /(\d+)\+?\s*years?/gi;
  let m;
  while ((m = re.exec(corpusLower))) max = Math.max(max, Number(m[1]));
  return max;
}

/**
 * Match one requirement against the corpus: classify coverage, find an evidence
 * snippet, and compute a weak years signal.
 * @param {string} reqText
 * @param {string} corpusLower - resume+digest corpus, lowercased.
 * @param {string[]} cvLines - original-case resume lines, for the evidence snippet.
 * @returns {{text: string, keywords: string[], present: string[], missing: string[], status: 'met'|'thin'|'absent', evidence: string|null, yearsMin: number|null, yearsSignal: boolean|null}}
 */
export function matchRequirement(reqText, corpusLower, cvLines) {
  const keywords = salientTerms(reqText);
  const present = keywords.filter((k) => wordPresent(corpusLower, k));
  const missing = keywords.filter((k) => !present.includes(k));

  let status;
  if (keywords.length === 0) status = 'thin';
  else if (present.length === 0) status = 'absent';
  else if (present.length === keywords.length) status = 'met';
  else status = 'thin';

  let evidence = null;
  if (present.length) {
    const hit = cvLines.find((line) => {
      const low = line.toLowerCase();
      return present.some((k) => wordPresent(low, k));
    });
    if (hit) {
      const clean = stripInline(hit);
      evidence = clean.length > 160 ? clean.slice(0, 157) + '...' : clean;
    }
  }

  const ym = reqText.match(YEARS_RE);
  const yearsMin = ym ? Number(ym[1]) : null;
  const yearsSignal = yearsMin === null ? null : maxYears(corpusLower) >= yearsMin;

  return { text: reqText, keywords, present, missing, status, evidence, yearsMin, yearsSignal };
}

/**
 * Escape a cell value for a Markdown table (pipes and newlines).
 * @param {string} s
 * @returns {string}
 */
function cell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * Build the deterministic coverage scaffold Markdown from the JD, the resume,
 * and optional supplementary evidence. This is a factual first-pass map, not the
 * adversarial screen; the skill layers judgment on top.
 * @param {string} jdText
 * @param {string} cvText
 * @param {string} [digestText]
 * @returns {string}
 */
export function buildGatekeeperScaffold(jdText, cvText, digestText = '') {
  const jd = parseJd(jdText);
  const cvLines = cvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const corpusLower = `${cvText}\n${digestText}`.toLowerCase();
  const rows = jd.requirements.map((r) => matchRequirement(r, corpusLower, cvLines));

  const sources = digestText ? 'cv.md, article-digest.md' : 'cv.md';

  const blocks = [];
  blocks.push('# Gatekeeper coverage scaffold');
  blocks.push(`**Role:** ${cell(jd.title)} | **Company:** ${cell(jd.company)}`);
  blocks.push(`**Sources read:** ${sources}`);
  blocks.push(
    'This is a deterministic first-pass keyword and requirement map, not the ' +
      'adversarial screen. It reports only what the resume literally contains. ' +
      'Judgment, weak-claim analysis, and truthful fixes are layered on top by the ' +
      'gatekeeper skill; do not treat "met" as "defensible" or "absent" as ' +
      '"disqualifying" without that review.',
  );

  const header =
    '| JD requirement | Resume evidence | Status | Years |\n' + '| --- | --- | --- | --- |';
  const tableRows = rows.map((r) => {
    const evidence = r.evidence ? cell(r.evidence) : '—';
    const years =
      r.yearsMin === null
        ? 'n/a'
        : `asks ${r.yearsMin}y; resume >=: ${r.yearsSignal ? 'yes' : 'no'}`;
    return `| ${cell(r.text)} | ${evidence} | ${r.status} | ${years} |`;
  });
  blocks.push('## Requirement coverage');
  blocks.push(rows.length ? `${header}\n${tableRows.join('\n')}` : '_No requirements extracted._');

  const gaps = [];
  const seenGap = new Set();
  for (const r of rows) {
    for (const m of r.missing) {
      if (!seenGap.has(m)) {
        seenGap.add(m);
        gaps.push(m);
      }
    }
  }
  blocks.push('## Keyword gaps');
  blocks.push(
    gaps.length
      ? gaps.map((g) => `- ${g}`).join('\n')
      : 'None: every extracted requirement had at least partial keyword coverage.',
  );

  return blocks.join('\n\n') + '\n';
}
