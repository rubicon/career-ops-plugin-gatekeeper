# Architecture

career-ops-plugin-gatekeeper runs a one-shot adversarial resume screen against
one job description. It is a career-ops plugin, so it must be dependency-free:
relative modules plus allowlisted Node built-ins only, no network, no process
spawning.

## Layout

```
career-ops-plugin-gatekeeper/
  manifest.json          # plugin manifest (export hook, no env, no hosts)
  index.mjs              # the export hook: read JD + cv.md, write the coverage scaffold
  lib/
    gatekeeper.mjs        # pure engine: JD parsing + coverage matching + scaffold rendering
  skill.md                # the adversarial screen, read by the host agent
  bin/
    generate-gatekeeper.mjs  # standalone CLI, for use outside career-ops
  test/
    gatekeeper.mjs         # engine unit tests
    skill.mjs              # asserts the skill's guardrail language and sections
    smoke.mjs              # zero-network hook smoke test
  examples/
    jd-example.md              # non-personal sample job description
    cv-fractional-example.md   # non-personal sample resume
```

## Why two layers

Plugin code has no path to an LLM: it can only read and write files inside the
project directory. The adversarial screen, weak-claim judgment, and truthful
fixes all require reasoning that only the host agent (the one running the
skill) can do. So the plugin is split at that boundary:

- **The engine and the hook are code.** They run deterministically, every
  time, with no model in the loop. Their job is narrow: turn the JD and the
  resume into a factual coverage map. They do not judge whether a claim is
  defensible, and they never produce prose about the candidate.
- **The skill is read by the host agent.** `skill.md` is not executed; it is a
  set of instructions the agent follows once it is invoked. That is where the
  actual screen happens: hard questions, the risk taxonomy, the ranked
  screen-out reasons, and the truthful fixes.

The scaffold is the contract between the two layers. The hook always produces
it; the skill always consumes it and is not allowed to treat its `met` status
as the final word.

## The engine's contract and determinism guarantee

`lib/gatekeeper.mjs` exports three pure functions:

- `parseJd(jdText)` extracts `{company, title, requirements}` from the JD.
- `matchRequirement(reqText, corpusLower, cvLines)` classifies one requirement
  against the resume (plus optional digest) corpus as `met`, `thin`, or
  `absent`, and returns the matched keywords, an evidence snippet, and a weak
  years-of-experience signal.
- `buildGatekeeperScaffold(jdText, cvText, digestText?)` combines the two into
  the Markdown scaffold.

None of these touch the filesystem, the network, `Date`, or any source of
randomness. Given the same JD text, CV text, and digest text, the scaffold is
byte-for-byte identical on every run. That determinism is load-bearing: it is
what lets the hook be a plain, testable transform, and what lets
`test/gatekeeper.mjs` assert exact output instead of approximate behavior.

## The date-only-in-filename decision

The hook (`index.mjs`), not the engine, appends today's date to the output
filename (`gatekeeper-<company>-<date>.md`). `Date` is impure, so it is kept
strictly out of `lib/gatekeeper.mjs`: the engine's return value never depends
on when it runs. The date exists only so that re-running the hook on a
different day does not silently overwrite yesterday's screen; the scaffold
content itself carries no date and stays deterministic.

## Registry constraints

The career-ops plugin registry statically audits plugin source and rejects:

- Any bare (npm) import. Only relative modules and the Node built-in allowlist
  (`node:fs`, `node:path`, and so on) are permitted.
- Any network access outside `ctx.fetch*` (which this plugin does not use at
  all: `manifest.json` declares `allowedHosts: []`).
- Any use of `child_process`, `worker_threads`, or `eval`.

The engine has no reason to need any of these: it is string processing over
text already read from disk by the hook.

## The boundary

The plugin never edits core career-ops files, never changes how a candidate is
scored elsewhere in the pipeline, and never submits anything anywhere. It
writes one scaffold file for a human (or the host agent, on the human's
behalf) to read, and the skill that reads it is scoped to producing a screen
and handing off to `interview/practice`, not to acting outside that lane.

## Data flow

```
jd.md ──> parseJd ──> {company, title, requirements}
                                │
cv.md, article-digest.md ──> matchRequirement (per requirement) ──> rows[]
                                │
                                ▼
                     buildGatekeeperScaffold(jdText, cvText, digestText?)
                                │
                                ▼
                output/gatekeeper-<company>-<date>.md (written by index.mjs)
                                │
                                ▼
              skill.md (host agent) ──> the adversarial screen
```
