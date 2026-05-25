# Coup Game — React Native (Expo)

## Commands
- Start dev server: `npx expo start`
- Run tests: `npx jest`
- Type check: `npx tsc --noEmit`
- Lint: `npx eslint src/`

## Tech Stack
- Expo managed workflow (TypeScript)
- Zustand for game state
- React Navigation v7 for screens
- React Native Reanimated 3 for animations
- expo-av for audio

## Architecture
- `src/engine/` — pure game logic with NO React imports (unit-testable)
- `src/store/game-store.ts` — Zustand store wiring UI ↔ engine
- `src/components/` — React Native UI components
- `src/app/` — Expo Router screens (stack: index → lobby → game → game-over)
- Path alias `@/*` maps to `src/*` (e.g. `@/engine/types`)

## Critical Rules
- Never mutate game state directly; always return new objects from engine functions
- Game engine functions must have zero React dependencies
- Player coins are deducted BEFORE the challenge phase (assassin costs 3 even if blocked)
- A player with ≥10 coins MUST Coup — enforce in getValidActions()

## Code Style
- TypeScript strict mode
- No comments unless the WHY is non-obvious
- No default exports from engine/ modules

## Session Start (read in this order)
@wisdom/progress.md
@wisdom/project-map.md
@wisdom/react-native-best-practices.md
@wisdom/mistakes.md
@wisdom/good-practices.md
