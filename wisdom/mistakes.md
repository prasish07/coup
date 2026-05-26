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

## Loose `string` key type in store's getBlockCharacter helper (Phase 3)
**What happened:** `getBlockCharacter` in `game-store.ts` declares its first parameter as `actionType: string` and uses `Partial<Record<string, CharacterName[]>>` for its lookup map, even though the caller always passes `next.pending.type` which is typed as `ActionType`.
**Why it was wrong:** The `string` key widens the type unnecessarily. If a new `ActionType` variant is added, TypeScript won't flag the missing block-map entry at compile time the way it would with `Partial<Record<ActionType, CharacterName[]>>`. It also duplicates block-character knowledge that already exists in `ACTION_CLAIMED_CHARACTER` in `types.ts`.
**Rule:** When a store helper uses a lookup keyed on a union type, use the exact union (`ActionType`, not `string`) so TypeScript can enforce exhaustiveness. Prefer importing `ACTION_CLAIMED_CHARACTER` from `types.ts` instead of re-defining block mappings in the store.

## Array index used as FlatList keyExtractor in GameLog (Phase 4)
**What happened:** `GameLog.tsx` uses `keyExtractor={(_, i) => String(i)}` on its FlatList. The data (`recent`) is a reversed slice of the log array — plain strings with no stable IDs.
**Why it was wrong:** Array index as a key corrupts reconciliation when items reorder, insert, or delete. The best-practices guide lists this as anti-pattern #5. Even though GameLog only appends (new entries appear at the front after reversing), a dedicated stable key (e.g. log-entry index from the original array position) would be safer and follows the rule unconditionally.
**Rule:** Never pass array position to `keyExtractor`. For log strings, derive the key from the original array index before reversing: `log.slice(-3).map((entry, i) => ({ entry, key: String(log.length - 3 + i) }))` and then `keyExtractor={(item) => item.key}`.

## Loose `string` key type in ResponseBar's BLOCK_CHARS lookup (Phase 4)
**What happened:** `ResponseBar.tsx` declares `const BLOCK_CHARS: Partial<Record<string, CharacterName[]>>` using `string` as the key type, then indexes it with `pending.type` which is `ActionType`. Same pattern as the Phase 3 store mistake.
**Why it was wrong:** `Partial<Record<ActionType, CharacterName[]>>` would let TypeScript flag any new `ActionType` variant that is blockable but missing from the map. The `string` widening silently drops that compile-time coverage. It also re-defines block-character mappings that already exist in `ACTION_CLAIMED_CHARACTER` in `types.ts`.
**Rule:** Any lookup table keyed on a union type must use that union as the record key, not `string`. Import and reuse `ACTION_CLAIMED_CHARACTER` from `@/engine/types` rather than defining parallel maps in UI components.

## useEffect with empty deps array reads setup param and startGame without listing them (Phase 4)
**What happened:** In `game.tsx` lines 55–61, `useEffect(() => { startGame(...) }, [])` uses `setup` (from `useLocalSearchParams`) and `startGame` (from Zustand) but lists neither in the dependency array.
**Why it was wrong:** This violates the `react-hooks/exhaustive-deps` rule. Even though both values are stable in practice (params don't change after navigation, Zustand functions have referential identity), a linter-clean project should either list the deps or add an explicit `// eslint-disable-next-line` with a justification comment explaining why the empty array is intentional.
**Rule:** Every `useEffect` must either list all referenced values in its deps array, or carry an explicit suppression comment that names the reason the omission is intentional (e.g. `// run only on mount — setup and startGame are stable by design`).

## isActive prop declared in PlayerBoard interface but never applied in JSX (Phase 4)
**What happened:** `PlayerBoard.tsx` declares `isActive?: boolean` in its `Props` interface and destructures it with a default value of `false`, but the prop is never referenced anywhere in the component body or JSX.
**Why it was wrong:** Dead code in a public interface is confusing — callers may pass the prop expecting an effect, and future maintainers may not realise it does nothing. TypeScript `strict` mode does not flag unused destructured parameters, so this silently accumulates.
**Rule:** Every prop in a component's `Props` interface must be actively used in the JSX or component logic. If a prop is not yet implemented, either add the implementation or remove it from the interface.

## Dead useSharedValue declared but never consumed in useAnimatedStyle (Phase 5)
**What happened:** `PlayerBoard.tsx` declares `coinColor = useSharedValue(0)` and animates it inside a `useEffect`, but `coinColor.value` is never read inside any `useAnimatedStyle` callback and the animated value is never applied to any JSX node.
**Why it was wrong:** The shared value drives no visual output — the animation fires on every coin change but produces no effect. It also keeps a Reanimated worklet alive on the UI thread for no reason. This is the same pattern as Phase 4's dead `isActive` prop: code that looks like it does something but silently does nothing.
**Rule:** Every `useSharedValue` must be consumed by at least one `useAnimatedStyle` (or passed directly as an animated prop). After writing a shared value, immediately verify it appears in a `useAnimatedStyle` return value or an `Animated.*` prop. If the visual effect is not yet implemented, remove the shared value rather than leaving dead animation code.

## useEffect references new values without updating deps or adding suppression comment (Phase 5)
**What happened:** In `game.tsx` the second `useEffect` (dep: `[gameState?.phase]`) was expanded in Phase 5 to call `play('card_flip')` and read `prevPhaseRef.current`, but `play` (a `useCallback` from `useSound`) was not added to the deps array and no suppression comment was added. The third `useEffect` (dep: `[gameState?.phase]`) was similarly expanded to access `gameState.players` for building `standings` and `router.replace`, but neither `gameState` nor `router` was added to the deps.
**Why it was wrong:** Both `play` (stable `useCallback`) and `router` (stable Expo Router ref) are referentially stable so there is no actual stale-closure bug at runtime. However, the code now has exhaustive-deps violations that silently bake in an assumption about stability that is not expressed or enforced anywhere. The Phase 4 review already flagged this pattern in the first `useEffect` and required a suppression comment — the Phase 5 additions repeated the pattern without following the established fix.
**Rule:** When expanding an existing `useEffect` to reference new values, either (a) add those values to the deps array, or (b) add an `// eslint-disable-next-line react-hooks/exhaustive-deps` comment with an explicit reason for each value omitted. Never silently rely on incidental referential stability.

<!-- Add entries as mistakes are discovered. Format:

## [Short title]
**What happened:** What was tried.
**Why it was wrong:** Root cause.
**Rule:** The rule to follow instead.

-->
