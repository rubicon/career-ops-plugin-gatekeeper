# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1](https://github.com/rubicon/career-ops-plugin-gatekeeper/compare/v0.1.0...v0.1.1) (2026-08-03)


### Features

* add standalone CLI and non-personal example fixtures ([a3b6927](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/a3b6927685c195bc650f3aa952913083baa7dfd5))
* add the adversarial screening skill with guardrail tests ([ffceb98](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/ffceb98250c4bf6cf62b5d60b2d1ffa70fb42da0))
* match JD requirements to resume evidence with coverage status ([d8d5a83](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/d8d5a83549b414521ee45cf17e7e634810284ea8))
* parse JD company, title, and hard requirements ([4dcbaa8](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/4dcbaa86162146575a0fc3ebee56b2f02a174b06))
* render the deterministic JD coverage scaffold ([64845d0](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/64845d033b33124414d5c5cc705bfa179cc4e802))
* write the dated coverage scaffold from the export hook ([ff96dfe](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/ff96dfe473570871a375b6020eb349030ccbdd2f))


### Bug Fixes

* **ci:** address the release-please 1Password item by UUID ([#17](https://github.com/rubicon/career-ops-plugin-gatekeeper/issues/17)) ([ef32d41](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/ef32d4137cb8455bfa2d43dcc3ba4c20cbaf3a83)), closes [#16](https://github.com/rubicon/career-ops-plugin-gatekeeper/issues/16)
* date the scaffold filename from a local calendar date via Intl and an optional time_zone ([bcb59cb](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/bcb59cb9c04d86e4f9ad64a64239b44b560f8614))
* date the scaffold filename in local time ([239b0e3](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/239b0e36716860161d21376c03a685359fa421b0))
* exclude JD headings from the requirement fallback and clean evidence snippets ([c48639b](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/c48639b4d8905b2a106c8dbd5ad15c40214fe1d8))
* only strip real block markers (followed by whitespace) from evidence ([5fa349f](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/5fa349f844922001d06770272dd1568f8e0a3ba9))
* use ASCII punctuation in the skill and scaffold output ([0fd26c6](https://github.com/rubicon/career-ops-plugin-gatekeeper/commit/0fd26c661c809eca0094cdbd2deb795b1a1415eb))

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
