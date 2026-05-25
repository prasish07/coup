# Project Map — File Navigation Guide

Every file and folder in the project, what it does, and when to touch it.

---

## Root

```
coup/
├── CLAUDE.md                  ← Session context. Edit when architecture changes.
├── app.json                   ← Expo config. Edit for app name, icons, Android pkg.
├── eas.json                   ← EAS build profiles (dev APK, preview APK, prod AAB).
├── package.json               ← Dependencies and npm scripts.
├── tsconfig.json              ← TypeScript config. @/* alias → src/*. examples/ excluded.
├── .gitignore                 ← Covers node_modules, .expo, secrets, .env files.
├── README.md                  ← GitHub README.
├── AGENTS.md                  ← Expo template agent context (do not edit).
└── LICENSE                    ← MIT license from Expo template.
```

---

## `.claude/` — Claude Code Configuration

```
.claude/
├── settings.json              ← Permissions + hooks. Edit to add new allowed commands.
│                                 PostToolUse: auto-formats .ts/.tsx with prettier on save.
│                                 Stop: runs auto-commit-push.sh after every session.
│
├── hooks/
│   └── auto-commit-push.sh   ← Commits all changes + pushes to GitHub on session end.
│                                 Skips if no git repo or nothing changed. Safe to run always.
│
└── rules/
    ├── engine.md              ← Loaded ONLY when touching src/engine/**. Pure function rules.
    └── testing.md             ← Loaded ONLY when touching *.test.ts. Test naming/structure rules.
```

---

## `wisdom/` — Project Knowledge Base (auto-loaded every session)

```
wisdom/
├── progress.md                ← ⭐ START HERE each session. Phase status, decisions, gotchas.
├── project-map.md             ← This file. File/folder navigation guide.
├── react-native-best-practices.md ← Researched RN best practices (40+ sources). Read before
│                                     writing any component, hook, or store.
├── mistakes.md                ← Anti-patterns we actually hit. Updated as we go.
└── good-practices.md          ← Patterns that worked well. Updated as we go.
```

**Rule:** At the start of every new session, read `progress.md` first. It tells you exactly what is done, what is next, and what decisions were made.

---

## `examples/` — Code Patterns (excluded from TypeScript build)

```
examples/
├── engine-function.ts         ← Pattern: pure engine function returning new state
├── zustand-action.ts          ← Pattern: Zustand store action calling engine
├── component.tsx              ← Pattern: React Native component with Zustand selector
└── test-case.test.ts          ← Pattern: Jest test with edge case coverage
```

**Rule:** Before writing any new engine function, store action, component, or test — read the matching example first and follow the same pattern.

---

## `src/` — All Application Code

### `src/app/` — Expo Router Screens (thin wrappers only, no logic)

```
src/app/
├── _layout.tsx                ← Root stack layout. StatusBar + Stack navigator.
│                                 Imports expo-dev-client (required for custom builds).
│                                 Dark background #0d0d1a applied here.
│
├── index.tsx                  ← Main Menu screen. "COUP" title + New Game button.
│                                 Navigates to: /lobby
│
├── lobby.tsx                  ← Game setup screen.
│                                 Player count (2-6), names, Human/AI toggle.
│                                 Navigates to: /game with setup param (JSON string).
│
├── game.tsx                   ← Main game screen. [PLACEHOLDER — Phase 4]
│                                 Receives: setup param (JSON string of PlayerSetup[]).
│                                 Navigates to: /game-over when game ends.
│
└── game-over.tsx              ← Winner screen.
                                  Receives: winner param (player name string).
                                  Navigates to: /lobby (Play Again) or / (Main Menu).
```

**Rule:** Screens must not contain business logic. They import from `src/store/` and `src/components/` only.

---

### `src/engine/` — Pure Game Logic (zero React, fully unit-testable)

```
src/engine/
├── types.ts                   ← [Phase 2] All game types. THE source of truth for types.
│                                 CharacterName, ActionType, Phase, Card, Player,
│                                 PendingAction, PendingBlock, GameState
│
├── deck.ts                    ← [Phase 2] createDeck() + shuffle().
│                                 15-card deck: 3× Duke, Assassin, Captain, Ambassador, Contessa
│
├── actions.ts                 ← [Phase 2] getValidActions() + resolveAction().
│                                 getValidActions: returns legal moves for current player.
│                                 resolveAction: applies confirmed action, returns new state.
│
├── challenges.ts              ← [Phase 2] resolveChallenge() + resolveBlock().
│                                 Challenge: reveal card, loser loses influence.
│                                 Block: negate action or open to counter-challenge.
│
└── ai.ts                      ← [Phase 2] AI decision function getAIDecision().
                                  Heuristic: Coup if ≥7 coins, challenge if bluff prob >55%.
```

**Rule:** No React imports ever. All functions must be pure (same in → same out). Every exported function must have a Jest test.

---

### `src/store/` — Zustand Stores

```
src/store/
└── game-store.ts              ← [Phase 3] Single Zustand store for all game state.
                                  Calls engine functions — never implements logic directly.
                                  Exports: useGameStore hook.
```

**Rule:** Store actions must be thin. Validate input → call engine function → call `set()`. No game logic inside the store itself.

---

### `src/components/` — Shared UI Components

```
src/components/
│
│  ── Game components (Phase 4) ──
├── CardFace.tsx               ← [Phase 4] Character card render. Reanimated flip on reveal.
│                                 Face-up shows character name + color. Face-down shows back.
├── PlayerBoard.tsx            ← [Phase 4] One player's coins + influence cards.
├── ActionMenu.tsx             ← [Phase 4] Turn action picker modal. Grays out unaffordable.
├── ResponseBar.tsx            ← [Phase 4] Challenge / Block / Pass buttons. 15s auto-pass.
├── GameLog.tsx                ← [Phase 4] Scrollable event history. Shows last 3 events.
│
│  ── Template components (from Expo SDK 56 template, may be replaced) ──
├── animated-icon.tsx          ← Expo animated logo. Not used in game.
├── animated-icon.web.tsx      ← Web-only version. Not used in game.
├── animated-icon.module.css   ← CSS for web version. Not used in game.
├── app-tabs.tsx               ← Template tab nav. Not used (we use Stack).
├── app-tabs.web.tsx           ← Web version. Not used.
├── external-link.tsx          ← Link with external browser. May be reused.
├── hint-row.tsx               ← Template UI row. Not used in game.
├── themed-text.tsx            ← Text with theme colors. May be reused.
├── themed-view.tsx            ← View with theme colors. May be reused.
├── web-badge.tsx              ← Expo web badge. Not used in game.
└── ui/
    └── collapsible.tsx        ← Animated collapsible section. May be reused.
```

---

### `src/constants/` — Design Tokens

```
src/constants/
└── theme.ts                   ← Colors, spacing scale, font sizes, platform fonts.
                                  The spacing scale uses named values (one=4, two=8, etc.).
                                  Game palette: #0d0d1a (bg), #7c3aed (accent), #ffd700 (gold).
```

---

### `src/hooks/` — Shared Custom Hooks

```
src/hooks/
├── use-color-scheme.ts        ← From template. Returns 'light' | 'dark'.
├── use-color-scheme.web.ts    ← Web override. Not used in game.
└── use-theme.ts               ← Returns theme colors based on color scheme.
```

---

### `src/` Root Files

```
src/
├── declarations.d.ts          ← CSS module type declaration (*.module.css).
│                                 Added to fix TS error from template web component.
└── global.css                 ← NativeWind/web global styles from template. Not used in game.
```

---

## `assets/` — Static Assets

```
assets/
├── images/
│   ├── icon.png               ← App icon (currently Expo default, replace in Phase 5).
│   ├── splash-icon.png        ← Splash screen icon.
│   ├── android-icon-*.png     ← Adaptive icon layers (foreground, background, monochrome).
│   └── ...                    ← Other template images, not used in game.
└── expo.icon/                 ← iOS icon source (Expo format).
```

**To add game card art:** Create `assets/cards/` in Phase 4 and add images per character.
**To add sounds:** Create `assets/sounds/` in Phase 5 (shuffle.mp3, coin.mp3, reveal.mp3, etc.).

---

## `scripts/`

```
scripts/
└── reset-project.js           ← Expo template script. Resets app/ to blank template.
                                  Do NOT run — it would delete our game screens.
```

---

## Navigation Flow

```
/  (index.tsx)
│
└── "New Game" → /lobby  (lobby.tsx)
                 │
                 └── "Start Game" → /game  (game.tsx)
                                    │
                                    └── [game ends] → /game-over  (game-over.tsx)
                                                       │
                                                       ├── "Play Again" → /lobby
                                                       └── "Main Menu" → /
```

---

## Data Flow (current + planned)

```
User tap
  ↓
src/app/*.tsx           ← screen reads params, calls store action
  ↓
src/store/game-store.ts ← validates, calls engine function
  ↓
src/engine/*.ts         ← pure function returns new GameState
  ↓
Zustand set()           ← updates state
  ↓
Component selector re-renders
```

---

## Key Constraints (do not forget)

- `src/engine/` must have **zero React imports** — it runs pure logic
- Every screen param goes through `useLocalSearchParams<{ param: string }>()`
- Never pass large objects through navigation — pass IDs or JSON-stringified minimal data
- All styles use `StyleSheet.create()` — no inline objects in list `renderItem`
- Every Zustand subscriber uses a **selector** — never destructure the whole store
- Auto-commit/push runs after every Claude session — every session ends with a commit
