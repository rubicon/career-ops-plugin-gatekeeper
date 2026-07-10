# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- One-shot, JD-specific adversarial resume screen, exposed as the `export` hook
  (`index.mjs`) and a pure coverage engine (`lib/gatekeeper.mjs`).
- Deterministic JD-vs-resume coverage scaffold: reads the job description,
  `cv.md`, and optional `article-digest.md`, and writes
  `output/gatekeeper-<company>-<date>.md` with a requirement-to-evidence map
  (`met`/`thin`/`absent`) and a keyword-gaps list.
- The `gatekeeper` skill (`skill.md`): the adversarial screen that layers
  judgment on top of the scaffold, gated by an anti-fabrication rule and a
  retracted-claims check, and hands off to `interview/practice`.
- Standalone CLI (`bin/generate-gatekeeper.mjs`) for running the coverage
  engine outside career-ops.
- Configurable `jd_path` (required), `cv_path`, `digest_path`, and `output_dir`
  settings.
- Dependency-free engine (relative modules plus Node built-ins only) and a
  zero-network test suite.
- Non-personal example fixtures at `examples/jd-example.md` and
  `examples/cv-fractional-example.md`.
