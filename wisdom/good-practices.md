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

## Store orchestration helpers kept inside the store file (Phase 3)
**What was done:** Turn-advancement helpers (`nextActivePlayer`, `advanceTurn`) and AI-chaining helpers (`maybeRunAITurn`, `maybeRunAIResponses`) are private (unexported) functions defined at the bottom of `game-store.ts`. They call engine functions and compose their results but contain no Coup rule logic themselves.
**Why it worked:** Keeps the public store actions thin (each action is 5–10 lines), while the coordination boilerplate is factored out without leaking into the engine. Because these helpers are unexported they have zero surface area — if they need to change, the change stays inside the store file.
**Rule:** Private coordination helpers in the store are fine as long as they (a) only call engine functions and compose their return values, (b) are not exported, and (c) contain no Coup-rule logic (no coin calculations, no influence tracking, no challenge outcome decisions).

## W2 state-machine fix: detect blocker-was-exposed at store boundary (Phase 3)
**What was done:** The W2 bug (failed block challenge drops the original action) was fixed in `revealCard` in the store. After `loseInfluence` runs, the store inspects `prevState` (captured before the engine call) to detect whether the loserId was the blocker. If so, it replays `resolveAction` with the still-live `pending` from `prevState`.
**Why it worked:** The engine remains pure — `loseInfluence` cannot call `resolveAction` because that would be a policy decision embedded in a low-level primitive. The store is the right place to own multi-step sequence logic. Capturing `prevState` before the engine call and then reasoning about it is the clean pattern for this kind of "what just happened" detection.
**Rule:** When a multi-step game sequence (block → challenge → reveal → resolve) has a branch that must chain two engine calls, implement the chain in the store action, not in the engine. Capture state before the first engine call so the subsequent branch condition can be evaluated cleanly.

## Reanimated 4 card flip using transform-only animation (Phase 4)
**What was done:** `CardFace.tsx` implements the card flip with `useSharedValue`, `useAnimatedStyle`, `interpolate`, and `withTiming`, animating only `transform: [{ rotateY }]` and `opacity`. Width and height are static in `StyleSheet.create`. The `'worklet'` directive is omitted because Reanimated 4 automatically treats `useAnimatedStyle` callbacks as worklets via its Babel plugin.
**Why it worked:** No layout recalculation occurs per frame (anti-pattern #11 avoided). The front/back faces are two absolutely-positioned `Animated.View` layers on a fixed-size container, so the flip is purely a transform — 60fps capable on the UI thread.
**Rule:** For card-flip animations: use two `Animated.View` layers with `StyleSheet.absoluteFill` inside a fixed-size container, `rotateY` transform on each, and `opacity` switching at the midpoint. Never animate `width`/`height` for cosmetic transitions.

## getActiveHumanId helper lifted above the screen component (Phase 4)
**What was done:** The logic that determines which (if any) human player needs to act in the current phase is extracted into a standalone `getActiveHumanId(state: GameState): string | null` function at module level, before the `GameScreen` component definition.
**Why it worked:** Keeps the component function body free of phase-switching logic. The helper is a pure function of `GameState` — it is trivially testable if needed and clearly separated from rendering concerns. It could be unit tested without mounting the component.
**Rule:** When a component needs to derive a non-trivial value from game state (especially phase-based branching), extract the derivation into a module-level pure function before the component. This keeps the component body readable and the logic independently auditable.

<!-- Add entries when something works especially well. Format:

## [Short title]
**What was done:** The approach taken.
**Why it worked:** The reason it was effective.
**Rule:** When to apply this again.

-->
