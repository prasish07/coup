# Mistakes — Patterns to Avoid

Things that went wrong during this project. Read before starting any new task.

---

## Exported helper functions left untested (Phase 2)
**What happened:** `getBlockers()` and `getChallengeEligible()` were exported from `src/engine/actions.ts` but no tests were written for them in `actions.test.ts`.
**Why it was wrong:** The engine rule is explicit: every exported function must have a matching test. These two functions determine which players can legally block or challenge a given action — incorrect behavior here would allow illegal responses and corrupt game state.
**Rule:** Before committing, grep the test file for every name that appears after `export function` in the source file. If a name is missing, write the test first.

## Failed block challenge does not re-execute the original action (Phase 2)
**What happened:** In `src/engine/challenges.ts`, `resolveChallengeBlock()` correctly marks the blocker for `lose_influence` when their bluff is exposed, but `loseInfluence()` in `actions.ts` unconditionally clears `pending: null` when it returns `phase: 'action'`. So the original action (e.g. `foreign_aid`) is silently dropped after the blocker loses their card.
**Why it was wrong:** The Coup rule is: if a block is challenged and the blocker was bluffing, the block fails and the **original action resolves**. The engine currently skips that resolution entirely.
**Rule:** When designing multi-step resolution sequences (block → challenge → reveal), trace the full state machine through every outcome and verify each terminal path explicitly in a test. The store's `nextTurn()` in Phase 3 must detect `pending !== null` after `loseInfluence` returns `phase: 'action'` and call `resolveAction()` — or `loseInfluence` itself must call `resolveAction` when the preceding phase was `challenge_block`.

## Duplicated ACTION_CLAIMED_CHARACTER constant across two modules (Phase 2)
**What happened:** `src/engine/actions.ts` and `src/engine/challenges.ts` each define a private `ACTION_CLAIMED_CHARACTER` constant. The four base entries (`tax`, `assassinate`, `steal`, `exchange`) are duplicated verbatim; `challenges.ts` adds the three `block_*` variants.
**Why it was wrong:** DRY violation — if a character mapping changes (e.g. `block_steal` allowed by Ambassador only) it must be updated in two places and the second copy is easy to miss.
**Rule:** Shared lookup tables that are needed by more than one engine module should live in `types.ts` or a dedicated `constants.ts` inside `src/engine/`, then imported by both consumers.

<!-- Add entries as mistakes are discovered. Format:

## [Short title]
**What happened:** What was tried.
**Why it was wrong:** Root cause.
**Rule:** The rule to follow instead.

-->
