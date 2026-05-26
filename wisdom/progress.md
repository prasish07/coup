# Project Progress

Last updated: 2026-05-26
Read this at the start of every session to know exactly where we are.

---

## Phase Status

| Phase | Name | Status | Review |
|---|---|---|---|
| 0 | Claude Code Project Setup | ✅ Done | ⏭ Skipped (no code) |
| 1 | Expo Project Bootstrap | ✅ Done | ⏭ Skipped (no engine/store yet) |
| EAS | Development Build Setup | ⏳ In Progress | — |
| 2 | Game Engine (pure logic) | ✅ Done (reviewed — warnings, see wisdom/mistakes.md) | ⚠️ PASS WITH WARNINGS |
| 3 | Zustand Store | 🔲 Not started | 🔲 Pending |
| 4 | Screens & UI | 🔲 Not started | 🔲 Pending |
| 5 | Polish (animations, sound) | 🔲 Not started | 🔲 Pending |

### Phase Completion Rule
**After every phase from Phase 2 onwards:**
1. Commit the work
2. Spawn the `phase-reviewer` agent → `.claude/agents/phase-reviewer.md`
3. Fix all ❌ FAIL items
4. Update this table with review result
5. Only then start the next phase

---

## Phase 0 — Claude Code Project Setup ✅

**What was built:**
- `CLAUDE.md` — project context loaded every session
- `.claude/settings.json` — pre-approved Bash permissions, auto-format hook (prettier on save), auto-commit/push hook on Stop
- `.claude/hooks/auto-commit-push.sh` — commits all changes and pushes to GitHub after every Claude session
- `.claude/rules/engine.md` — path-scoped rules loaded only when touching `src/engine/**`
- `.claude/rules/testing.md` — path-scoped rules loaded only when touching `*.test.ts`
- `examples/` — four pattern files (engine function, Zustand action, component, Jest test)
- `wisdom/` — lessons folder (mistakes, good practices, best practices, this file)
- `.gitignore` — covers Expo artifacts, secrets, Claude personal overrides
- GitHub repo created: https://github.com/prasish07/coup

**Key decisions:**
- Auto-commit/push fires on every `Stop` hook event (end of Claude session), not per file edit
- `wisdom/` files are imported in `CLAUDE.md` via `@` syntax so they load every session

---

## Phase 1 — Expo Project Bootstrap ✅

**What was built:**
- Expo SDK 56, Expo Router, TypeScript (strict mode)
- Stack navigation: `index` → `lobby` → `game` → `game-over` (all in `src/app/`)
- **Main Menu** (`src/app/index.tsx`) — "COUP" title, "New Game" button
- **Lobby** (`src/app/lobby.tsx`) — player count (2–6), name inputs, Human/AI toggle per slot
- **Game** (`src/app/game.tsx`) — placeholder screen, receives player setup via params
- **Game Over** (`src/app/game-over.tsx`) — winner display, Play Again / Main Menu
- `src/declarations.d.ts` — CSS module type declaration for template web file
- `eas.json` — development (APK), preview (APK), production (AAB) EAS build profiles
- `expo-dev-client` imported in `_layout.tsx` for custom dev build

**Installed packages:**
- `zustand` ^5.0.13
- `expo-av` ^16.0.8
- `expo-dev-client` ~56.0.15
- `react-native-reanimated` 4.3.1 (included in template)
- `jest`, `jest-expo`, `@types/jest` (dev)

**Key decisions:**
- Expo managed workflow, NOT bare React Native
- `src/app/` for Expo Router screens (template default), NOT `app/` at root
- Path alias `@/*` → `./src/*` (configured in `tsconfig.json`)
- `examples/` excluded from TypeScript compilation via `tsconfig.json` `exclude`
- Jest configured to only match `src/engine/**/*.test.ts` (engine logic only)

**Gotchas discovered:**
- `create-expo-app` refuses to run in a non-empty directory → scaffold in `/tmp/`, then rsync
- Expo Go on Play Store doesn't support SDK 56 → need EAS development build
- Template `CLAUDE.md` just says `@AGENTS.md` → replaced with our full `CLAUDE.md`
- Template `.claude/settings.json` only has `enabledPlugins` → merged into our settings
- Template `src/constants/theme.ts` had `import '@/global.css'` that caused TS error → removed that line

---

## EAS Development Build ⏳

**Status:** User is building the development APK via `eas build --profile development --platform android`

**What this produces:** A custom `.apk` that acts like Expo Go but is pinned to SDK 56.

**Once APK is installed on phone:**
- Start dev server with: `npx expo start --dev-client`
- The custom app connects via QR code
- All future phases can be tested on-device immediately

**EAS Project ID:** `6700a674-baa8-4d0a-9b07-534a0123d2c1` (in `app.json`)

---

## Phase 2 — Game Engine ✅ (reviewed — warnings)

**Review result:** PASS WITH WARNINGS
**Review date:** 2026-05-26
**Findings:** 59 tests passing, 0 TypeScript errors. Three warnings all resolved post-review: (1) Added tests for `getBlockers` and `getChallengeEligible` — now 67 tests total; (2) W2 noted for Phase 3 store — `nextTurn` must call `resolveAction` when `pending` is set after a failed block challenge; (3) Extracted `ACTION_CLAIMED_CHARACTER` to `types.ts`, deleted duplicates from `actions.ts` and `challenges.ts`.

**Goal:** Pure TypeScript logic in `src/engine/` — zero React imports.

**Files to create:**
```
src/engine/
  types.ts        ← All game types (CharacterName, ActionType, Phase, Card, Player, GameState)
  deck.ts         ← createDeck() 15 cards (3× each of 5 chars), shuffle()
  actions.ts      ← getValidActions(), resolveAction() for all 8 action types
  challenges.ts   ← resolveChallenge(), resolveBlock(), card reveal logic
  ai.ts           ← AI decision tree (heuristic: Coup if ≥7 coins, challenge if bluff prob >55%)
```

**Tests to write (alongside each file):**
```
src/engine/
  actions.test.ts
  challenges.test.ts
  deck.test.ts
  ai.test.ts
```

**Critical Coup rules to enforce in engine:**
- Must Coup if ≥10 coins (enforce in `getValidActions()`)
- Coup cannot be blocked or challenged (skip challenge phase)
- Assassination costs 3 coins upfront, even if blocked
- Steal takes `min(2, target.coins)`
- Exchange draws 2 from deck; player keeps exactly 2 total
- Eliminated player (0 cards) cannot respond
- A block can itself be challenged

---

## Phase 3 — Zustand Store 🔲

**Goal:** Wire engine → UI via `src/store/game-store.ts`.

**Store actions to implement:**
```
startGame(setup)        → init state, deal 2 cards, set first player
submitAction(action)    → validate → deduct cost → enter challenge_action phase
submitResponse(type)    → challenge / block / pass from non-active players
revealCard(index)       → forced reveal during challenge resolution
nextTurn()              → advance currentPlayerId, reset pending
```

**Selector pattern to follow (from best practices):**
```ts
// CORRECT — each component subscribes to minimum slice
const coins = useGameStore(s => s.gameState?.players[0].coins);
// WRONG — subscribes to full store
const { gameState } = useGameStore();
```

---

## Phase 4 — Screens & UI 🔲

**Goal:** Replace placeholder screens with real game UI.

**Game screen layout:**
```
┌─────────────────────────┐
│  Opponent boards        │  PlayerBoard × (N-1), face-down cards + coin count
├─────────────────────────┤
│  Game Log (last 3)      │  Scrollable event history
├─────────────────────────┤
│  Your cards + coins     │  PlayerBoard (human), cards face-up
├─────────────────────────┤
│  ActionMenu / Response  │  Contextual: action picker OR challenge/block/pass
└─────────────────────────┘
```

**Components to build:**
```
src/components/
  CardFace.tsx      ← Character card (face-up/face-down), Reanimated flip on reveal
  PlayerBoard.tsx   ← Coins + influence cards for one player
  ActionMenu.tsx    ← Turn action picker modal (grayed out if unaffordable)
  ResponseBar.tsx   ← Challenge / Block / Pass — 15s auto-pass timer
  GameLog.tsx       ← Scrollable event history (last 3 events visible)
```

---

## Phase 5 — Polish 🔲

**Goal:** Animations, sound, final UX pass.

- Card flip animation: Reanimated `useSharedValue` + `withTiming` + `interpolate`
- Coin gain/loss animation
- Sound effects via `expo-av`: shuffle, coin clink, card reveal, elimination fanfare
- Winner screen final standings
- `babel-plugin-transform-remove-console` to strip all `console.log` in production builds

---

## Commit History Summary

| Commit | Description |
|---|---|
| `c2c59ce` | chore: Claude Code project setup (Phase 0) |
| `4355c7a` | feat: Phase 1 — Expo project bootstrap |
| `cbb8150` | chore: add EAS build config and expo-dev-client |
| `cbe20cf` | docs: add React Native best practices reference guide |
