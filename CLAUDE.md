## Git Workflow

- Create feature branches off `main` for every discrete piece of work. Name them descriptively: `feat/onboarding-flow`, `feat/paywall-screen`, `fix/revenuecat-entitlement-check`.
- Commit early and often — after every meaningful change, not just at the end of a step. Atomic commits with clear messages: `feat: add subscription tier selection UI` not `wip` or `updates`.
- Push to remote after completing each step. Do not accumulate unpushed local commits.
- Never commit directly to `main`.

## Parallelism

- Use subagents/parallel tasks for work that touches **independent files and modules** — separate screens, isolated components, utility functions, tests for different features.
- **Sequentialize** anything involving:
  - Shared state, global config, or app-level providers/context
  - Database schema or data models that other features depend on
  - Navigation/routing setup
  - The RevenueCat SDK integration layer (single source of truth — build this first, then branch off it)
- When in doubt, sequentialize. A merge conflict at 11pm is worse than a few lost minutes of parallelism.

## Error Handling & Debugging

- When a test or build step fails, **stop**. Do not immediately retry the same approach.
- After the first failure: step back, analyze the error, and generate 2-3 hypotheses for the root cause ranked by likelihood before attempting a fix.
- Try fixes one at a time. If a hypothesis doesn't pan out, revert it cleanly before trying the next.
- If you're on your third failed attempt at the same problem, re-read the relevant documentation or source before continuing. You're likely operating on a wrong assumption.
- Never silence errors, swallow exceptions, or comment out failing tests to make things pass.

## Code Hygiene

- After every successful step, review for dead code: unused imports, commented-out blocks, orphaned functions, leftover debug logs. Remove them before committing.
- Run the linter and formatter before every commit. Do not commit code with lint errors.
- Keep files focused — if a file is growing past ~300 lines, it probably wants to be split.

## Architecture & Dependencies

- Install dependencies explicitly and pin versions. Do not leave floating version ranges for critical packages.
- If you add a new dependency, note *why* in the commit message.
- Keep the dependency footprint minimal. Do not add a library for something achievable in <20 lines.
- All API keys, secrets, and config values go in environment variables. Never hardcode them, never commit them.

## Testing

- Write or update tests alongside the feature, not as a separate phase afterward.
- Every user-facing screen should have at least a basic render/smoke test.
- The RevenueCat purchase flow should have mock tests covering: successful purchase, failed purchase, restore purchases, and entitlement checks.
- Run the full test suite before pushing. Do not push broken tests.

## Documentation

- Update the README if you add setup steps, new env vars, or change the build process.
- Leave brief inline comments only where the *why* isn't obvious from the code. Don't narrate what the code does — the code does that.

## Testing & Retry Protocol
1. Run specified test command
2. Pass -> commit and continue
3. Fail -> read error, fix, retest
4. Fail second time -> **STOP. Re-evaluate.** Re-read code from scratch. "Is my approach fundamentally wrong?" Consider alternatives.
5. **Repeat indefinitely** — re-evaluate every 2 consecutive failures. Never skip a broken step. Never move on with a failing test.
6. After 3+ re-evaluations with no progress -> add full context and ask user for guidance.

## Error Handling
- Every API call gets try/catch
- Every external fetch can fail — always have a fallback
- Never let one failed import crash a batch
- Clear error messages to user, never silent failures
- "Couldn't find a recipe in this video" > generic error

## Hard Rules

- Do not introduce placeholder or mock implementations that you intend to "come back to later." Build it real or skip it.
- Do not refactor working code for aesthetics mid-sprint. Ship first.
- If something is blocked, move to the next unblocked task. Do not spin.
- Prefer boring, proven patterns over clever abstractions. This is a hackathon.
