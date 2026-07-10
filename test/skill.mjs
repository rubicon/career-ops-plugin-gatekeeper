// The skill is prose, but its guardrails are load-bearing. This test fails if a
// future edit drops a guardrail, a required output section, or the handoff.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const skill = readFileSync(path.join(here, '..', 'skill.md'), 'utf8');

// Guardrail 1: anti-fabrication + retracted-claims hard gate.
assert(/never invent/i.test(skill), 'anti-fabrication: must say never invent');
assert(
  /surface real evidence|real evidence already in|cite the file/i.test(skill),
  'fixes must resolve to surfacing real evidence',
);
assert(/interview-prep\/retracted-claims\.md/.test(skill), 'names the retracted-claims gate file');
assert(/never resurface|never resurfaces/i.test(skill), 'retracted claims never resurface');

// Guardrail 2: decorum.
assert(/attack the resume/i.test(skill), 'decorum: attack the resume');
assert(/never the person/i.test(skill), 'decorum: never the person');
for (const term of ['crass', 'demeaning', 'sarcastic', 'ad-hominem']) {
  assert(new RegExp(term, 'i').test(skill), `decorum: must ban "${term}"`);
}

// The seven required output sections.
for (const marker of [
  'Gatekeeper verdict',
  'Hard questions',
  'Gap table',
  'Weak',
  'screen-out reasons',
  'Truthful fixes',
  'Handoffs',
]) {
  assert(skill.includes(marker), `skill must define the "${marker}" section`);
}

// Verdict vocabulary and the coverage vocabulary from the scaffold.
assert(
  /advance/.test(skill) && /borderline/.test(skill) && /screened-out/.test(skill),
  'verdict vocabulary',
);
assert(/met\/thin\/absent/.test(skill), 'reuses the scaffold coverage vocabulary');

// Risk taxonomy.
for (const risk of ['vague ownership', 'unquantified', 'tool-of-trade', 'authorship']) {
  assert(new RegExp(risk, 'i').test(skill), `risk taxonomy must name "${risk}"`);
}

// Handoff to the live interviewer and scope guard.
assert(/interview\/practice/.test(skill), 'hands off to interview/practice');
assert(
  /not.*(edit|change).*(core|scoring)/i.test(skill) || /must not instruct/i.test(skill),
  'scope guard present',
);

console.log('✓ skill guardrails ok');
