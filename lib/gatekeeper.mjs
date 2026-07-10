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
