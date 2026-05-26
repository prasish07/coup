# Good Practices — Patterns to Repeat

Approaches that worked well. Read before starting any new task.

---

## Shared test fixture factories across all engine test files (Phase 2)
**What was done:** Every engine test file defines its own `makeCard()`, `makePlayer()`, and `makeState()` factory functions with sensible defaults and `Partial<T>` overrides. Each test only specifies the fields relevant to its scenario.
**Why it worked:** Tests stay short and readable. Adding a new field to `GameState` or `Player` only requires updating the factory, not every individual test call. The override pattern also makes the test's intent self-documenting — you can see at a glance exactly what is being varied.
**Rule:** For any domain object that appears in 3+ test cases, define a `make*` factory at the top of the test file. Always use `Partial<T>` overrides so callers only specify what matters for the scenario being tested.

## Immutability verified in every engine test suite (Phase 2)
**What was done:** Each test suite includes at least one "should not mutate original state" test that calls the function and then re-asserts the original input object is unchanged.
**Why it worked:** Catches accidental direct mutation immediately — these bugs are otherwise invisible during normal flow tests because the mutated value and returned value look the same.
**Rule:** Add a mutation-check test to every engine function that takes a `GameState` argument. Assert one field of the input that the function is known to modify.

## Coin deduction before challenge phase for assassination (Phase 2)
**What was done:** `submitAction()` in `actions.ts` deducts the action cost (including assassination's 3 coins) immediately, before entering the `challenge_action` phase.
**Why it worked:** This correctly enforces the critical Coup rule that assassination costs 3 coins even if the action is later blocked. The cost is a sunk cost at declaration time, not resolution time.
**Rule:** Action costs are always applied at `submitAction` time — never at `resolveAction` time. This must be preserved in Phase 3 when the store wires `submitAction`.

<!-- Add entries when something works especially well. Format:

## [Short title]
**What was done:** The approach taken.
**Why it worked:** The reason it was effective.
**Rule:** When to apply this again.

-->
