# career-ops-plugin-gatekeeper

Run a hardball, one-shot adversarial resume screen against one specific job
description, before you submit. A [career-ops](https://github.com/santifer/career-ops)
community plugin.

[![CI](https://github.com/rubicon/career-ops-plugin-gatekeeper/actions/workflows/ci.yaml/badge.svg)](https://github.com/rubicon/career-ops-plugin-gatekeeper/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What it does

career-ops helps you build and tailor a CV. This plugin stress-tests one
before you send it. It plays the skeptical hiring manager for a specific job,
tries to screen the candidate out, and then turns around and gives back only
truthful fixes: real evidence already in your files, a cut, or "supply
evidence or it goes." It never invents a metric, a title, or a scope to make a
weak claim look strong.

This is a single written pass, not a conversation. The live back-and-forth
already exists as career-ops' `interview/practice` mode; the gatekeeper hands
off to it once the screen is done.

## The two-layer design

Plugin code cannot reach an LLM, and the adversarial screen needs judgment, so
the plugin is split in two:

1. **A deterministic hook** (`index.mjs`) built on a pure engine
   (`lib/gatekeeper.mjs`). It reads the job description, `cv.md`, and an
   optional `article-digest.md`, and writes a factual coverage scaffold: a
   requirement-to-evidence map with a `met`/`thin`/`absent` status per
   requirement, and a keyword-gaps list. No judgment, no network, no
   randomness: the same inputs always produce the same scaffold.
2. **The `gatekeeper` skill** (`skill.md`), read by the host agent that runs
   you. It layers the actual screen on top of the scaffold: hard questions,
   weak-claim challenges, a ranked list of likely screen-out reasons, and
   truthful fixes.

The scaffold is the deterministic, factual half. The screen itself, and the
judgment behind it, is the skill's job.

## Install

This is a career-ops plugin. From your career-ops checkout:

```bash
node plugins.mjs add gatekeeper
```

Then enable it in `config/plugins.yml`:

```yaml
plugins:
  gatekeeper:
    enabled: true
    jd_path: jd.md
```

## Usage

1. Save the job description to a file in your project (the screen is
   JD-specific, so it has to be on disk, not just pasted into chat).
2. Run the hook to build the coverage scaffold:

   ```bash
   node plugins.mjs run gatekeeper export
   ```

   This writes `output/gatekeeper-<company>-<date>.md`.

3. Invoke the gatekeeper skill. It reads the scaffold, runs the adversarial
   screen, and hands off to `interview/practice` for the live defense.

## Configuration

Settings under `plugins.gatekeeper` in `config/plugins.yml`:

| Setting       | Default             | Meaning                                                                                 |
| ------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `jd_path`     | (required)          | The job description file, relative to the project root                                  |
| `cv_path`     | `cv.md`             | The resume being screened                                                               |
| `digest_path` | `article-digest.md` | Optional supplementary evidence that widens the search corpus                           |
| `output_dir`  | `output`            | Where the coverage scaffold is written                                                  |
| `time_zone`   | (host zone)         | Optional IANA zone (e.g. `America/Chicago`) for the local calendar date in the filename |

The filename date is the local calendar date (`YYYY-MM-DD`) for the day the screen is run. It is formatted with `Intl.DateTimeFormat` in the `time_zone` above, falling back to the host's local zone. It is never a UTC instant, so an evening run does not roll the date forward a day.

## What the scaffold contains

The scaffold (`output/gatekeeper-<company>-<date>.md`) is a Markdown report
with:

- The role and company parsed from the job description.
- A **requirement coverage table**: each JD requirement, any resume evidence
  found for it, a `met`/`thin`/`absent` status, and a years-of-experience
  check where the JD states a minimum.
- A **keyword gaps** list: distinctive JD terms that never appear anywhere in
  the resume (or the optional digest).

It reports only what the resume literally contains. Whether "met" is
defensible, or "absent" is disqualifying, is judgment the skill applies on
top, not something the scaffold decides.

## The two guardrails

1. **Anti-fabrication and the retracted-claims gate.** Every fix the skill
   proposes resolves to real evidence already in an in-scope file (cited), a
   cut, or "supply evidence or it goes." Nothing is invented. Any claim listed
   in `interview-prep/retracted-claims.md` is dead: it never resurfaces, in a
   question, a gap table, or a suggested fix.
2. **Decorum.** Tough but professional. The skill attacks the resume and the
   claims, never the person. No crass, demeaning, or ad-hominem language: the
   pressure comes from specific, well-aimed doubt, not from tone.

## CLI usage

The coverage engine also runs standalone, outside career-ops:

```bash
node bin/generate-gatekeeper.mjs <jd.md> <cv.md> <output.md> [--digest=<path>]
```

## Development

```bash
npm install        # dev tooling only (Prettier, commitlint); the plugin ships with no runtime deps
npm test           # zero-network test suite: engine, skill guardrails, hook smoke test
npm run format:check
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and discussion are welcome.
This plugin is human-in-the-loop by design: it screens and proposes, it never
edits core, changes scoring, or submits anything on its own.

## License

MIT. See [LICENSE](LICENSE).

## Contributors

![Contributors](https://contrib.rocks/image?repo=rubicon/career-ops-plugin-gatekeeper)
