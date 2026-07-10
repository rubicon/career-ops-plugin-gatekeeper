// @ts-check
// career-ops-plugin-gatekeeper: run a one-shot adversarial resume screen for a
// specific job. Walking skeleton — the real engine is wired in Task 5.
//
// Local, no-network, no-key plugin. Uses the `export` hook (the consumer hook
// that produces an artifact). It ignores the tracker snapshot on purpose: a
// screen is about the JD and cv.md, not the pipeline.
//
// Registry rules honored: no bare (npm) imports, no network, no child_process.

export default {
  /**
   * @param {Readonly<object>} _snapshot - Tracker snapshot (unused: a screen reads the JD + cv.md, not the pipeline).
   * @param {{settings?: Record<string, unknown>, log?: (...a: unknown[]) => void, dryRun?: boolean}} ctx
   * @returns {Promise<{pushed: number}>}
   */
  async export(_snapshot, ctx) {
    const log = (ctx && ctx.log) || console.log;
    log('gatekeeper: not yet implemented.');
    return { pushed: 0 };
  },
};
