# Agent Instructions

This is the canonical instruction file for AI coding agents working in this
repository. `AGENTS.md` is a pointer to this file.

## What this project is

career-ops-plugin-gatekeeper is a [career-ops](https://github.com/santifer/career-ops)
plugin that runs a one-shot, JD-specific adversarial resume screen: it
role-plays the skeptical hiring manager for one job, tries to screen the
candidate out, then returns only truthful fixes.

It is built in two layers, because plugin code cannot reach an LLM and the
skill file is what the host agent (which can) actually reads:

1. **The deterministic hook** (`index.mjs`, the `export` hook) and the pure
   engine it calls (`lib/gatekeeper.mjs`). Given the JD, `cv.md`, and optional
   `article-digest.md`, the engine builds a factual coverage scaffold: a
   requirement-to-evidence map (`met`/`thin`/`absent`) plus a keyword-gaps
   list. No judgment, no prose screen, no network, no randomness.
2. **The skill** (`skill.md`), read by the host agent. It layers the actual
   adversarial screen on top of the scaffold: hard questions, a gap table,
   weak-claim challenges, ranked screen-out reasons, and truthful fixes, then
   hands off to career-ops' `interview/practice` mode.

Two guardrails run through the skill and are enforced by `test/skill.mjs`:

- **Anti-fabrication + the retracted-claims gate.** Every proposed fix must
  resolve to real evidence already in an in-scope file (cited), a cut, or
  "supply evidence or it goes." Never invented evidence. Any claim listed in
  `interview-prep/retracted-claims.md` never resurfaces in any output.
- **Decorum.** Tough but professional: attack the resume and the claims, never
  the person. No crass, demeaning, or ad-hominem language.

See `ARCHITECTURE.md` for the layout and data flow. Entry points: `index.mjs`
(the `export` hook), `lib/gatekeeper.mjs` (the coverage engine), `skill.md`
(the adversarial screen), `bin/generate-gatekeeper.mjs` (standalone CLI).

## Non-negotiable invariants

- **Dependency-free at runtime.** The career-ops plugin registry rejects any
  bare (npm) import in plugin source. Use relative modules and the allowlisted
  Node built-ins only (`node:fs`, `node:path`, `node:zlib`, `node:buffer`,
  `node:crypto`, `node:url`, `node:util`, `node:assert`, and the rest of the
  allowlist). No network, no `child_process`, no `worker_threads`, no `eval`.
- **Human-in-the-loop, and never past its lane.** The plugin writes a scaffold
  and a skill teaches the screen; nothing is submitted anywhere.
  `manifest.json` keeps `humanInTheLoop: true`. The plugin (code and skill)
  must never edit core files, change scoring, reveal secrets, or submit
  anything outside the declared `export` hook.
- **The two guardrails are load-bearing.** Anti-fabrication and the
  retracted-claims gate, and the decorum register, are tested directly against
  `skill.md` in `test/skill.mjs`. Do not weaken the language those assertions
  depend on.
- **No personal data in the repo.** Tests and examples use the non-personal
  fixtures only (`examples/jd-example.md`, `examples/cv-fractional-example.md`).
  Never commit a real JD or a real CV.
- **Contained file access.** `jd_path`, `cv_path`, `digest_path`, and
  `output_dir` are resolved and checked to stay inside the project directory.
  Keep that guard.

## Commands

- `npm test` runs the zero-network test suite: the coverage engine
  (`test/gatekeeper.mjs`), the skill guardrails (`test/skill.mjs`), and the
  hook smoke test (`test/smoke.mjs`).
- `npm run format:check` / `npm run format` (Prettier).
- In career-ops: `node plugins.mjs run gatekeeper export` writes
  `output/gatekeeper-<company>-<date>.md`, then invoke the gatekeeper skill to
  run the screen against it.
- Standalone: `npm run screen -- <jd.md> <cv.md> <output.md> [--digest=<path>]`
  (wraps `bin/generate-gatekeeper.mjs`).

## Working conventions

- Conventional Commits; commit messages are linted in CI.
- No AI-authorship trailers, no "Generated with" lines. No em-dashes, no emojis
  in code, comments, docs, commits, issues, or PRs.
- Run `npm test` and `npm run format:check` before opening a PR. The test
  suite covers requirement parsing, coverage matching, the skill's guardrail
  language, and the hook's file handling and determinism.
- Keep the engine (`lib/gatekeeper.mjs`) pure: no filesystem, no network, no
  `Date`, no randomness. The hook (`index.mjs`) owns all I/O and the dated
  output filename; the engine's output must depend only on its input text.

## Fixtures

`examples/jd-example.md` and `examples/cv-fractional-example.md` are the
canonical test inputs: a RevOps job description and a non-personal fractional
operator's CV, chosen so some requirements land `met`, some `thin`, and at
least one (SQL and data-warehouse skills) lands `absent`. Extend these rather
than adding a real JD or CV.
