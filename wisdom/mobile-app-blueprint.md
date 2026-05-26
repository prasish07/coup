# React Native / Expo Mobile App Blueprint

Everything needed to start a new mobile app with this stack from scratch.
Derived from the Coup game project (2026-05-26).

---

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 56, managed workflow | No Xcode/Android Studio needed for development |
| Language | TypeScript strict mode | `strict: true` in tsconfig.json |
| Routing | Expo Router (file-based) | Screens live in `src/app/`, not `app/` at root |
| State | Zustand ^5 | No Provider needed, use selectors always |
| Animation | React Native Reanimated 4 | Included in SDK 56 template |
| Sound | expo-av | Add at end — causes native crashes if version mismatches |
| Testing | Jest + jest-expo | Engine/store unit tests only |
| Build | EAS (Expo Application Services) | Dev APK, Preview APK, Prod AAB |

---

## Project Bootstrap (step by step)

### 1. Create the Expo project

Expo CLI refuses to run in non-empty directories. Scaffold in /tmp first:
```bash
cd /tmp && npx create-expo-app myapp --template expo-template-blank-typescript
rsync -a --exclude='.git' --exclude='CLAUDE.md' --exclude='.claude' --exclude='.gitignore' /tmp/myapp/ /path/to/myapp/
```

### 2. Move screens to src/app/

The template places screens in `app/` at root. Move them to `src/app/` (cleaner, keeps all source under `src/`):
- Update `tsconfig.json` to add path alias `@/*` → `./src/*`
- Update `package.json` `main` field if needed (stays `expo-router/entry`)

### 3. Fix TypeScript

`tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["jest"],
    "paths": {
      "@/*": ["./src/*"],
      "@/assets/*": ["./assets/*"]
    }
  },
  "exclude": ["examples", "node_modules"]
}
```
- `"types": ["jest"]` is required or `describe`/`it`/`expect` get TS errors
- `exclude: ["examples"]` stops example files from being type-checked

### 4. Install packages

```bash
npm install zustand
npm install --save-dev jest jest-expo @types/jest
```

Do NOT install `expo-av` until the last phase (Polish). It is prone to `LazyKType` native crash if Kotlin version mismatches the EAS build.

### 5. Fix template issues

The SDK 56 template has two TS errors out of the box:
- `src/constants/theme.ts` imports `@/global.css` → remove that line
- `src/components/app-tabs.web.tsx` references `/explore` route → change to `/`

### 6. Set up Jest

In `package.json`:
```json
"jest": {
  "preset": "jest-expo",
  "testMatch": [
    "**/src/engine/**/*.test.ts",
    "**/src/store/**/*.test.ts"
  ]
}
```

---

## Claude Code Project Setup (.claude/ folder)

Do this before writing any app code. It pays back on every future session.

### CLAUDE.md (project root, committed)

Include:
- Commands: `npx expo start`, `npx jest`, `npx tsc --noEmit`, `npx eslint src/`
- Tech stack summary
- Architecture overview (`src/engine/` = pure logic, `src/store/` = wiring, `src/app/` = screens)
- Critical business rules (the things that MUST be enforced — e.g. "must coup at 10 coins")
- Code style rules
- Phase completion workflow (commit → reviewer agent → fix fails → update progress)
- Session start: `@wisdom/progress.md` and other wisdom files

### .claude/settings.json

```json
{
  "enabledMcpServers": [],
  "permissions": {
    "allow": [
      "Bash(npx expo *)", "Bash(npx jest *)", "Bash(npx tsc *)",
      "Bash(npx eslint *)", "Bash(npx prettier *)",
      "Bash(npm install *)", "Bash(npm run *)",
      "Bash(git status)", "Bash(git log *)", "Bash(git diff *)",
      "Bash(git add src/*)", "Bash(git commit *)", "Bash(git push *)",
      "Bash(find . *)", "Bash(ls *)", "Edit", "Read"
    ],
    "deny": [
      "Bash(rm -rf *)", "Read(.env)", "Read(.env.local)",
      "Write(.env)", "Write(.env.local)"
    ]
  },
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "FILE=$(echo \"$CLAUDE_TOOL_INPUT\" | jq -r '.file_path // empty'); if [[ \"$FILE\" == *.ts || \"$FILE\" == *.tsx ]]; then npx prettier --write \"$FILE\" 2>/dev/null; fi"
      }]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "bash .claude/hooks/auto-commit-push.sh" }]
    }]
  }
}
```

### .claude/hooks/auto-commit-push.sh

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[[ -d .git ]] || exit 0
git diff --quiet && git diff --staged --quiet && exit 0
git add -A
git commit -m "auto: claude session $(date '+%Y-%m-%d %H:%M')"
git remote get-url origin &>/dev/null && git push origin "$(git branch --show-current)" || true
```
```bash
chmod +x .claude/hooks/auto-commit-push.sh
```

### .claude/rules/engine.md (loads only for src/engine/**)

```markdown
---
paths:
  - "src/engine/**/*.ts"
---
- Pure functions only — same inputs → same outputs, no side effects
- No React imports allowed in this directory
- Return new state objects, never mutate: `{ ...state, field: newValue }`
- Every exported function must have a Jest test
- All types imported from types.ts — never redefined locally
```

### .claude/rules/testing.md (loads only for *.test.ts)

```markdown
---
paths:
  - "**/*.test.ts"
---
- Test file mirrors source path: `src/engine/actions.ts` → `src/engine/actions.test.ts`
- describe = function name, it = "should [expected] when [condition]"
- Never mock internal functions — they are pure, test directly
- Always test edge cases, not just happy path
```

### .claude/agents/phase-reviewer.md

Create a code-quality agent that runs after every phase. It should:
1. Run `tsc --noEmit` and `jest` and report numbers
2. Read every changed file and audit it against per-filetype checklists
3. Verify deliverables match the phase plan
4. Spot-check for known anti-patterns
5. Write findings to `wisdom/mistakes.md` and `wisdom/good-practices.md`
6. Update `wisdom/progress.md` with verdict + date
7. Output PASS / PASS WITH WARNINGS / FAIL with itemized findings

### wisdom/ folder

```
wisdom/
  progress.md           ← Phase status table + detailed notes per phase. READ FIRST each session.
  project-map.md        ← Every file/folder, what it does, when to touch it.
  mistakes.md           ← Anti-patterns actually hit. Updated by phase-reviewer.
  good-practices.md     ← Patterns that worked. Updated by phase-reviewer.
  react-native-best-practices.md ← Researched RN practices (research web, not just training data).
```

Import all of these in CLAUDE.md with `@wisdom/progress.md` etc. so they load every session.

### examples/ folder (excluded from TS build)

```
examples/
  engine-function.ts    ← Pattern: pure engine function with types
  zustand-action.ts     ← Pattern: Zustand store action
  component.tsx         ← Pattern: RN component with selector
  test-case.test.ts     ← Pattern: Jest test with AAA structure
```

---

## Architecture — The Three-Layer Pattern

```
src/app/*.tsx           ← Screens: thin wrappers, NO logic
      ↕
src/store/*.ts          ← Store: thin wiring, calls engine, no game rules
      ↕
src/engine/*.ts         ← Engine: pure functions, NO React imports, fully testable
```

### Engine layer rules
- Zero React imports — ever
- Every function is pure: same input → same output
- Never mutate state: always return `{ ...state, changed: newValue }`
- All types in `types.ts` — the single source of truth
- Every export has a test

### Store layer rules (Zustand)
- Explicit TypeScript interface for the store
- Actions are thin: validate → call engine → call `set()`
- No game logic inside the store
- Private helpers for orchestration (turn advancement, AI chaining) are fine
- Never destructure the whole store in components — use selectors

### Screen layer rules
- No business logic in screens
- Typed params via `useLocalSearchParams<{ param: string }>()`
- Never pass large objects through navigation params — use JSON.stringify for small payloads

---

## Zustand Patterns

### Store definition
```ts
interface AppStore {
  gameState: GameState | null;
  startGame: (setup: PlayerSetup[]) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  gameState: null,
  startGame: (setup) =>
    set(() => ({ gameState: initGame(setup) })),
}));
```

### Selectors (always — never destructure)
```ts
// CORRECT
const coins = useAppStore((s) => s.gameState?.players[0].coins);

// WRONG — re-renders on every store change
const { gameState } = useAppStore();
```

### Testing the store
```ts
import { useMyStore } from './my-store';

function getStore() { return useMyStore.getState(); }
function setState(partial) { useMyStore.setState(partial); }

beforeEach(() => useMyStore.setState({ gameState: null }));

it('should ...', () => {
  setState({ gameState: someFixture });
  getStore().someAction();
  expect(getStore().gameState?.field).toBe(expected);
});
```

---

## EAS Build Setup

### eas.json
```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### app.json requirements
```json
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "package": "com.mycompany.myapp",
      "adaptiveIcon": { "backgroundColor": "#your-color" }
    },
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### Import expo-dev-client in root layout
```tsx
// src/app/_layout.tsx — must be FIRST import
import 'expo-dev-client';
```

### Workflow
1. `npx eas build --profile development --platform android` → get APK (~15 min)
2. Install APK on phone (enable "install from unknown sources")
3. `npx expo start --dev-client` on computer
4. Open app → scan QR code

### Gotchas
- **Expo Go on Play Store does NOT support SDK 56+** → must use EAS dev build
- **`expo-av` crashes with `LazyKType`** on some SDK 56 builds → exclude it from early builds, add only in the final polish phase
- EAS builds are tied to the native modules present at build time — JS changes are hot-reloaded, native module changes require a new build

---

## Navigation (Expo Router)

### Stack setup (src/app/_layout.tsx)
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0d0d1a' },
        animation: 'slide_from_right',
      }} />
    </>
  );
}
```

### Navigating
```tsx
import { useRouter } from 'expo-router';
const router = useRouter();

// Push with params (small payload only)
router.push({ pathname: '/game', params: { setup: JSON.stringify(players) } });
```

### Reading params
```tsx
import { useLocalSearchParams } from 'expo-router';
const { setup } = useLocalSearchParams<{ setup: string }>();
const players = JSON.parse(setup);
```

---

## TypeScript Strict Mode Patterns

### Discriminated unions for state phases
```ts
type Phase =
  | 'action'
  | 'challenge_action'
  | 'block'
  | 'challenge_block'
  | 'lose_influence'
  | 'exchange_select'
  | 'game_over';
```
TypeScript narrows each case in switch statements — compile error if a new variant is unhandled.

### No `any` — use `unknown` at boundaries
```ts
// At JSON parse boundary:
const data: unknown = JSON.parse(raw);
// Then validate/cast explicitly
```

### Shared lookup constants belong in types.ts
```ts
// types.ts — not duplicated across modules
export const ACTION_CLAIMED_CHARACTER: Partial<Record<ActionType, CharacterName>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  // ...
};
```

---

## Performance Rules (React Native specific)

| Rule | Why |
|---|---|
| `StyleSheet.create()` for all styles | Styles registered once as numeric IDs, not re-created each render |
| `FlatList` for lists >20 items | Virtualizes — `ScrollView` renders everything at once |
| Selectors for all Zustand reads | Prevents re-renders when unrelated store slice changes |
| Never animate `width`/`height` | Use `transform: [{ scale }, { translateX }]` instead |
| Remove `console.log` before release | Synchronously blocks the JS thread |
| Never define child components inside parent | Recreated on every render, breaks memoization |
| No barrel `index.ts` re-export files | Breaks Fast Refresh and tree shaking |

---

## Testing Pyramid

```
70% unit     — pure engine functions (Jest, no RN needed)
20% store    — Zustand store actions (Jest, no RN needed)  
10% E2E      — critical flows (Maestro or Detox, device needed)
```

### Engine test pattern
```ts
const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  // sensible defaults
  ...overrides,
});

describe('myFunction', () => {
  it('should do X when Y', () => {
    const state = makeState({ field: specificValue });
    const next = myFunction(state);
    expect(next.field).toBe(expected);
    // Always test immutability too:
    expect(state.field).toBe(original);
  });
});
```

---

## Phase-Based Development

For complex apps, split work into phases. Each phase has a gate:
1. Commit the work
2. Spawn the `phase-reviewer` agent
3. Fix all ❌ items
4. Update `wisdom/progress.md`
5. Only then start the next phase

### Recommended phases for a game/complex app

| Phase | What | Gate |
|---|---|---|
| 0 | Claude Code setup (CLAUDE.md, hooks, wisdom/) | Skip review (no code) |
| 1 | Expo bootstrap (screens, navigation shell) | Skip review (no engine/store) |
| EAS | Development build | — |
| 2 | Pure engine / business logic + tests | Full review |
| 3 | Zustand store + tests | Full review |
| 4 | Screens & components (real UI) | Full review |
| 5 | Polish (animations, sound, production build) | Full review |

---

## Common Gotchas Reference

| Situation | Fix |
|---|---|
| `create-expo-app` refuses non-empty dir | Scaffold in `/tmp/`, rsync to project dir |
| Expo Go "incompatible version" | Need EAS development build (custom APK) |
| `expo-av` → `LazyKType` crash on launch | Remove `expo-av` until final phase, rebuild APK |
| `describe`/`it` TS errors in test files | Add `"types": ["jest"]` to `tsconfig.json` |
| Template route `/explore` TS error | Change to valid route like `/` in `app-tabs.web.tsx` |
| `theme.ts` `@/global.css` import TS error | Remove the CSS side-effect import |
| EAS build has old native deps | Native modules are baked at build time — JS is live, native changes need rebuild |
| State mutation bug silent in tests | Write "should not mutate original state" test for every engine function |
| Block challenge drops original action (W2) | In `revealCard`, capture `prevState` before `loseInfluence`, detect blocker-was-exposed from `prevState.pendingBlock.blockerId === prevState.loserId`, then call `resolveAction` before advancing turn |
