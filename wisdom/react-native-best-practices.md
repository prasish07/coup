# React Native Best Practices (2024/2025)

Researched from official docs, engineering blogs, and community sources. Every rule has a source citation.
**One flow only — do not mix patterns.**

---

## 1. Project Structure

### Folder Layout
- Use **feature-based (domain-based)** structure for anything beyond ~5 screens. Group all files for a feature (components, screens, API, state, types) in one directory. ([obytes/starter](https://starter.obytes.com/getting-started/project-structure/))
- Recommended layout for this project:
  ```
  src/
    app/           ← Expo Router screens — thin wrappers only, no logic
    engine/        ← Pure game logic, zero React dependencies
    store/         ← Zustand stores
    components/    ← Shared UI components
    hooks/         ← Shared custom hooks
    constants/     ← Design tokens (theme, colors, spacing)
  ```
- Keep `src/app/` screens as **thin re-export wrappers** — all real logic lives in `engine/`, `store/`, or custom hooks. ([obytes/starter](https://starter.obytes.com/getting-started/project-structure/))
- **Do not import between feature modules.** Only import from `@/components`, `@/hooks`, `@/constants`, and your own feature. ([obytes/starter](https://starter.obytes.com/getting-started/project-structure/))
- Layer-based structure (all-screens/, all-components/, all-hooks/) is only appropriate for apps with ≤5 screens. ([reboot.studio](https://reboot.studio/blog/folder-structures-to-organize-react-project))
- Use **kebab-case for folder names** — avoids case-sensitivity bugs on Linux CI servers. ([blog.stackademic.com](https://blog.stackademic.com/best-practices-for-folder-structures-in-react-native-projects-9c78c3866dd4))

### Barrel Exports — NEVER USE
- **Never create barrel `index.ts` files** (files that only re-export other files). They:
  - Break Fast Refresh (any change triggers a full reload)
  - Prevent Metro's tree-shaking from removing unused modules
  - Cause bundlers to pull in entire feature trees when only one export is needed
  ([obytes/starter](https://starter.obytes.com/getting-started/project-structure/), [Expo tree-shaking](https://docs.expo.dev/guides/tree-shaking/))
- Always use **direct file path imports**: `import { foo } from '@/engine/actions'` not `import { foo } from '@/engine'`.

### Path Aliases
- `@/*` maps to `./src/*` in `tsconfig.json`. This is already configured. ([reactnative.dev/docs/typescript](https://reactnative.dev/docs/typescript))
- Always use `@/` imports, never relative `../../` paths.

---

## 2. Component Design

### The Rule: Thin Screens, Logic in Hooks/Engine
- Components are **dedicated to rendering only**. No business logic, no data fetching, no direct store mutations inside JSX. ([reactnative.dev/docs/testing-overview](https://reactnative.dev/docs/testing-overview))
- A screen file that mixes API calls, state, and UI is the single most common structural anti-pattern in RN. Split it: logic to custom hook, UI to component. ([jsmastery.com](https://jsmastery.com/blogs/most-common-mistakes-developers-make-in-react-native))
- **Never define a child component inside a parent component function.** The child is recreated on every render, breaks all memoization, and reinitializes hooks. Define every component at module level. ([perssondennis.com](https://www.perssondennis.com/articles/react-anti-patterns-and-best-practices-dos-and-donts))
- Split a component when it exceeds ~150 lines or when the same JSX block appears in 2+ places.

### Prop Drilling vs Store
- Prop drilling is a problem when data passes through 3+ components that don't use it. ([geeksforgeeks](https://www.geeksforgeeks.org/reactjs/what-is-prop-drilling-and-how-to-avoid-it/))
- **Context API** is appropriate only for rarely-changing app-wide data (theme, locale, auth). Any context value change re-renders every consumer — never use it for game state. ([medium.com 2025](https://medium.com/@sharmapraveen91/mastering-state-management-in-react-native-apps-in-2025-a-comprehensive-guide-5399b6693dc1))
- For frequently-changing shared state: **Zustand**. For prop drilling avoidance: **Zustand**. ([dev.to context vs zustand](https://dev.to/cathylai/context-api-vs-zustand-why-your-e-commerce-app-needs-a-bear-not-a-provider-dg2))

---

## 3. State Management — Zustand (The Single Flow)

### Store Structure
- Create **domain-focused stores**, one per concern. Keep individual stores under ~50 lines. ([medium.com zustand](https://medium.com/@harshitmadhav/from-basics-to-pro-mastering-zustand-in-react-native-7f372464d984))
- Always type the store with an explicit interface:
  ```ts
  interface GameStore {
    gameState: GameState | null;
    startGame: (setup: PlayerSetup[]) => void;
    submitAction: (action: PendingAction) => void;
  }
  export const useGameStore = create<GameStore>((set) => ({ ... }));
  ```
- Zustand requires **no Provider** — no wrapping the component tree. ([pmndrs/zustand](https://github.com/pmndrs/zustand))

### Selectors — Always
- **Always use selectors** to subscribe to the minimum required slice:
  ```ts
  // CORRECT — re-renders only when coins changes
  const coins = useGameStore((s) => s.gameState?.players[0].coins);

  // WRONG — re-renders on any store change
  const { gameState } = useGameStore();
  ```
  ([medium.com zustand](https://medium.com/@harshitmadhav/from-basics-to-pro-mastering-zustand-in-react-native-7f372464d984))

### Local vs Global State
- **Local state (`useState`)**: form inputs, modal visibility, component-specific loading flags. ([medium.com 2025](https://medium.com/@sharmapraveen91/mastering-state-management-in-react-native-apps-in-2025-a-comprehensive-guide-5399b6693dc1))
- **Global state (Zustand)**: game state, user preferences, theme, anything 2+ components share.
- **Do NOT** put server/API response data in Zustand — use React Query/TanStack Query for that (handles caching, deduplication, background refetch automatically). ([dev.to zustand+react-query](https://dev.to/neetigyachahar/architecture-guide-building-scalable-react-or-react-native-apps-with-zustand-react-query-1nn4))

### Immutability — Always Return New Objects
- Never mutate state directly. Always return new objects:
  ```ts
  // CORRECT
  return { ...state, players: state.players.map(p => p.id === id ? { ...p, coins: p.coins + 1 } : p) };

  // WRONG — mutates state
  state.players[0].coins += 1;
  ```
- Flat state structures perform measurably better on low-end Android compared to deeply nested objects. ([reactnativeexample.com](https://reactnativeexample.com/zustand-react-native-implementation-guide-2025/))

---

## 4. TypeScript

- Enable `strict: true` in `tsconfig.json` — already configured. ([dev.to typescript RN](https://dev.to/aneeqakhan/using-typescript-with-react-native-best-practices-62))
- Define an explicit `Props` type for every component and export it. ([reactnative.dev/docs/typescript](https://reactnative.dev/docs/typescript))
- **Never use `any`** — configure ESLint with `@typescript-eslint/no-explicit-any: error`. Use `unknown` for genuinely unknown values.
- Use **discriminated unions** for action types and async states:
  ```ts
  type GamePhase =
    | { phase: 'action' }
    | { phase: 'challenge'; challengerId: string }
    | { phase: 'game_over'; winnerId: string };
  ```
  TypeScript narrows correctly in each `case` and gives compile errors when new variants are unhandled. ([medium.com discriminated unions](https://medium.com/@uramanovich/typescript-discriminated-unions-for-robust-react-components-58bc06f37299))
- Use `interface` for object shapes; use `type` for unions, intersections, and aliases. ([dev.to typescript RN](https://dev.to/aneeqakhan/using-typescript-with-react-native-best-practices-62))

---

## 5. Performance

### Lists
- Use **`FlatList`** for any list with more than ~20 items — it virtualizes and only renders the visible window. ([medium.com flatlist vs scrollview](https://medium.com/@csta.puja/scrollview-vs-flatlist-vs-flashlist-in-react-native-understanding-list-performance-e6b34334a079))
- Use `ScrollView` only for short content where the full subtree should always be mounted (forms, settings screens).
- Critical FlatList props:
  - `keyExtractor` — use stable unique IDs, **never array index**
  - `getItemLayout` — skip expensive item measurement when item heights are fixed
  - `removeClippedSubviews={true}` — detach off-screen views on Android
  ([reactnative.dev/docs/performance](https://reactnative.dev/docs/performance))

### Memoization — Only When Needed
- Write code **without** memoization first. Add `useMemo`/`useCallback` only when profiling proves a render is expensive or a stable reference is required for a memoized child. ([github.com RN advanced guide](https://github.com/anisurrahman072/React-Native-Advanced-Guide/blob/master/Performance-Optimization/Performance-Optimization-coding-guide.md))
- `useMemo` with `[]` as deps is an anti-pattern — if the value never changes, move it outside the component entirely. ([perssondennis.com](https://www.perssondennis.com/articles/react-anti-patterns-and-best-practices-dos-and-donts))
- `React.memo` only does shallow comparison. If you pass inline object/array props, memo always misses — memoize those props in the parent first.

### Styles
- **Always use `StyleSheet.create()`** for static styles — styles are registered once with a numeric ID and serialized once. ([geeksforgeeks stylesheets](https://www.geeksforgeeks.org/reactjs/what-does-stylesheet-create-do-and-why-is-it-useful/))
- Inline style objects in list `renderItem` create new objects on every render, defeating `React.memo` on list rows. ([medium.com performance-driven styling](https://medium.com/@Blochware/performance-driven-styling-in-react-native-tips-and-tricks-for-optimized-ui-rendering-eb272a9f4e29))
- Acceptable inline use: `style={[styles.base, { opacity: isDisabled ? 0.5 : 1 }]}` — keep base in `StyleSheet`, compute only the dynamic part inline.

### Animations — Reanimated
- React Native Reanimated runs **worklets on the UI thread**, bypassing the JS bridge — correct tool for 60/120fps animations. ([dev.to worklets](https://dev.to/ajmal_hasan/worklets-and-threading-in-reanimated-for-smooth-animations-in-react-native-98))
- Add the `'worklet'` directive to any function called inside an animated style. Forgetting it silently runs on the JS thread with full bridge overhead. ([docs.swmansion.com worklets](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/))
- Keep worklets minimal — pure value computations only. Business logic belongs on the JS thread. ([tothenew.com](https://www.tothenew.com/blog/mastering-react-native-reanimated-building-60-fps-animations-without-blocking-the-js-thread))
- **Never animate `width`/`height` directly** — triggers expensive layout recalculation every frame. Use `transform: [{ scale }, { translateX }]`. ([reactnative.dev/docs/performance](https://reactnative.dev/docs/performance))

### General
- **Always test performance in release builds**, not dev mode — dev mode JS is an order of magnitude slower. ([reactnative.dev/docs/performance](https://reactnative.dev/docs/performance))
- Remove all `console.log()` calls before production — they block the JS thread even with DevTools disconnected. Use `babel-plugin-transform-remove-console`.
- Defer expensive operations until after navigation animations complete using `InteractionManager.runAfterInteractions()`. ([reactnative.dev/docs/performance](https://reactnative.dev/docs/performance))

---

## 6. Navigation — Expo Router (The Single Flow)

- **One navigational pattern: Stack only** for this project — `src/app/_layout.tsx` uses `<Stack>`, no tabs.
- Use `useRouter()` for imperative navigation — no passing `navigation` as a prop. ([docs.expo.dev router](https://docs.expo.dev/router/basics/navigation/))
- **Never pass large objects through params.** Pass only an identifier:
  ```ts
  // CORRECT — pass setup as JSON string
  router.push({ pathname: '/game', params: { setup: JSON.stringify(players) } });

  // WRONG — bloated params
  router.push({ pathname: '/game', params: { players: allPlayersData } });
  ```
  ([jsmastery.com](https://jsmastery.com/blogs/most-common-mistakes-developers-make-in-react-native))
- Type route params with `useLocalSearchParams<{ param: string }>()`. ([docs.expo.dev typed routes](https://docs.expo.dev/router/reference/typed-routes/))
- Typed routes are enabled (`experiments.typedRoutes: true` in `app.json`) — compile errors on broken routes.
- Always provide an explicit `index.tsx` — do not rely on alphabetical resolution. ([medium.com expo router](https://medium.com/@siddhantshelake/best-practices-for-expo-router-tabs-stacks-shared-screens-b3cacc3e8ebb))

---

## 7. Styling

- All design tokens live in `src/constants/theme.ts`: colors, spacing scale, font sizes. Import named tokens, never magic numbers.
- The spacing scale is multiples of 4/8 (already set up in `theme.ts`).
- Use `StyleSheet.create()` for all styles. ([geeksforgeeks](https://www.geeksforgeeks.org/reactjs/what-does-stylesheet-create-do-and-why-is-it-useful/))
- Dark background color: `#0d0d1a`. Accent: `#7c3aed`. Gold: `#ffd700`. These are the game's palette.
- Build reusable components (`<Card>`, `<Row>`, `<Spacer />`) rather than duplicating `StyleSheet` objects across files. ([dianapps.com](https://dianapps.com/blog/best-practices-for-styling-in-react-native))

---

## 8. Testing

### What to Test (Testing Pyramid)
- **70% unit** (pure engine functions) → **20% component** (UI behavior) → **10% E2E** (critical flows). ([reactnativerelay.com](https://reactnativerelay.com/article/complete-guide-testing-react-native-apps-2026-unit-tests-e2e-maestro))
- Unit test all `src/engine/` functions — they are pure, zero dependencies, trivially testable.
- Component tests verify: correct text given these props, correct handler called on press.
- Always test error scenarios, empty states, and boundary values. ([gigson.co](https://www.gigson.co/blog/testing-react-native-apps-jest-react-native-testing-library-and-e2e-testing))

### Jest Setup Rules
- Use **`jest-expo` preset** (already configured).
- Test file location: mirrors source path — `src/engine/actions.ts` → `src/engine/actions.test.ts`.
- Test naming: Given/When/Then — `'should return 0 when player has no coins'`.
- Use **AAA pattern** — Arrange, Act, Assert. ([reactnative.dev/docs/testing-overview](https://reactnative.dev/docs/testing-overview))

### What NOT to Mock
- Mock at the boundary only (network, native modules). Let all internal code run as-is. ([reactnativerelay.com](https://reactnativerelay.com/article/complete-guide-testing-react-native-apps-2026-unit-tests-e2e-maestro))
- Do **not** mock internal engine functions — they are pure, test them directly.
- "Generally, using real objects in your tests is better than using mocks." ([reactnative.dev/docs/testing-overview](https://reactnative.dev/docs/testing-overview))

---

## 9. Error Handling

- **Error boundaries** catch render errors. Use the three-tier strategy: root → feature → section. ([reactnative.university](https://www.reactnative.university/blog/react-native-error-boundaries))
- Error boundaries do **not** catch: event handler errors, async errors, errors in the boundary itself. Use `try/catch` for those. ([legacy.reactjs.org](https://legacy.reactjs.org/docs/error-boundaries.html))
- Use `try/catch` for all async operations and event handlers. ([medium.com error handling](https://medium.com/@maham.cheema91/react-error-handling-best-practices-using-error-boundaries-try-catch-and-logging-9d80d351cf52))

---

## 10. Hooks

- Custom hooks start with `use` — required for `react-hooks/rules-of-hooks` to work.
- Extract repeated `useState`/`useEffect` combinations appearing in 2+ components into a custom hook.
- **Never call hooks conditionally** — never inside `if`, after early `return`, or inside loops. ([linkedin.com](https://www.linkedin.com/advice/0/what-some-common-pitfalls-anti-patterns-using))
- **Always list every value your hook reads in the dependency array.** Treat `react-hooks/exhaustive-deps` as an error, not a warning. ([tkdodo.eu](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures))
- Use functional state updates to avoid stale closures: `setCount(prev => prev + 1)`.
- Use `useRef` (not `useState`) for values that don't affect rendering — avoids spurious re-renders. ([perssondennis.com](https://www.perssondennis.com/articles/react-anti-patterns-and-best-practices-dos-and-donts))

---

## 11. File Naming

| File Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `CardFace.tsx`, `PlayerBoard.tsx` |
| Screens (app/) | PascalCase | `index.tsx`, `game.tsx` (Expo Router handles naming) |
| Custom hooks | `use` + camelCase | `useGameTimer.ts`, `usePlayerActions.ts` |
| Zustand stores | `use-*-store.ts` | `use-game-store.ts` |
| Engine modules | camelCase | `actions.ts`, `challenges.ts`, `ai.ts` |
| Type files | `types.ts` | `src/engine/types.ts` |
| Constants | camelCase file | `theme.ts`, `cards.ts` |
| Folders | kebab-case | `src/engine/`, `src/components/` |
| Image assets | kebab-case | `card-duke.png`, `icon-coin.png` |

Sources: ([medium.com naming](https://medium.com/@imranrafeek/best-practices-for-naming-conventions-in-react-native-21f16df6179e), [obytes/starter](https://starter.obytes.com/getting-started/project-structure/))

---

## 12. Anti-Patterns — Never Do These

| # | Anti-Pattern | Why It's Wrong | Source |
|---|---|---|---|
| 1 | `ScrollView` for large lists | Renders all children at once, causes memory pressure on low-end Android | [medium.com](https://medium.com/@csta.puja/scrollview-vs-flatlist-vs-flashlist-in-react-native-understanding-list-performance-e6b34334a079) |
| 2 | Inline style objects in `renderItem` | New object every render, defeats `React.memo` on list rows | [medium.com](https://medium.com/@Blochware/performance-driven-styling-in-react-native-tips-and-tricks-for-optimized-ui-rendering-eb272a9f4e29) |
| 3 | Defining components inside components | Recreated every render, breaks memoization, resets hook state | [perssondennis.com](https://www.perssondennis.com/articles/react-anti-patterns-and-best-practices-dos-and-donts) |
| 4 | Large objects in navigation params | Wastes memory, breaks deep linking | [jsmastery.com](https://jsmastery.com/blogs/most-common-mistakes-developers-make-in-react-native) |
| 5 | Array index as `keyExtractor` | Corrupts state on reorder/insert/delete | [medium.com](https://medium.com/@baheer224/7-common-react-anti-patterns-to-avoid-at-all-costs-513ed3c11806) |
| 6 | Server state in Zustand | React Query handles caching/dedup/refetch automatically; reimplementing it adds subtle bugs | [dev.to](https://dev.to/neetigyachahar/architecture-guide-building-scalable-react-or-react-native-apps-with-zustand-react-query-1nn4) |
| 7 | Context for frequently-changing state | Every context change re-renders every consumer | [medium.com](https://medium.com/@sharmapraveen91/mastering-state-management-in-react-native-apps-in-2025-a-comprehensive-guide-5399b6693dc1) |
| 8 | Ignoring `exhaustive-deps` ESLint rule | Causes stale closure bugs that are very hard to trace | [tkdodo.eu](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures) |
| 9 | Profiling in dev mode | JS is an order of magnitude slower in dev — profiling decisions are unreliable | [reactnative.dev](https://reactnative.dev/docs/performance) |
| 10 | `console.log()` in production | Synchronously blocks the JS thread | [reactnative.dev](https://reactnative.dev/docs/performance) |
| 11 | Animating `width`/`height` directly | Triggers expensive layout recalculation every frame — use `transform` | [reactnative.dev](https://reactnative.dev/docs/performance) |
| 12 | Barrel `index.ts` re-export files | Breaks Fast Refresh, prevents tree-shaking | [obytes/starter](https://starter.obytes.com/getting-started/project-structure/) |
| 13 | `useMemo(fn, [])` with empty deps | Value never changes — move it outside the component | [perssondennis.com](https://www.perssondennis.com/articles/react-anti-patterns-and-best-practices-dos-and-donts) |
| 14 | Treating RN like web React | No DOM, no `px`, Flexbox defaults to column, raw text nodes crash at runtime | [jsmastery.com](https://jsmastery.com/blogs/most-common-mistakes-developers-make-in-react-native) |

---

## References

- [React Native — Performance](https://reactnative.dev/docs/performance)
- [React Native — TypeScript](https://reactnative.dev/docs/typescript)
- [React Native — Testing Overview](https://reactnative.dev/docs/testing-overview)
- [Expo Router — Introduction](https://docs.expo.dev/router/introduction/)
- [Expo Router — Typed Routes](https://docs.expo.dev/router/reference/typed-routes/)
- [Expo — Tree Shaking Guide](https://docs.expo.dev/guides/tree-shaking/)
- [Expo — Unit Testing with Jest](https://docs.expo.dev/develop/unit-testing/)
- [obytes/starter — Project Structure](https://starter.obytes.com/getting-started/project-structure/)
- [pmndrs/zustand GitHub](https://github.com/pmndrs/zustand)
- [Reanimated — Worklets Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/)
- [Reanimated — Performance Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [TkDodo — Hooks, Dependencies and Stale Closures](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures)
- [React Native University — Error Boundaries](https://www.reactnative.university/blog/react-native-error-boundaries)
- [DEV — RNTL Recommended Practices 2024](https://dev.to/mdj_dev/react-native-testing-library-recommended-practices-for-2024-5a17)
- [DEV — Zustand + React Query Architecture](https://dev.to/neetigyachahar/architecture-guide-building-scalable-react-or-react-native-apps-with-zustand-react-query-1nn4)
- [GitHub — RN Advanced Guide (Performance)](https://github.com/anisurrahman072/React-Native-Advanced-Guide/blob/master/Performance-Optimization/Performance-Optimization-coding-guide.md)
- [LogRocket — React Native Styling](https://blog.logrocket.com/react-native-styling-tutorial-examples/)
- [JS Mastery — Common Mistakes in React Native](https://jsmastery.com/blogs/most-common-mistakes-developers-make-in-react-native)
- [perssondennis.com — React Anti-Patterns](https://www.perssondennis.com/articles/react-anti-patterns-and-best-practices-dos-and-donts)
- [Medium — FlatList vs ScrollView vs FlashList](https://medium.com/@csta.puja/scrollview-vs-flatlist-vs-flashlist-in-react-native-understanding-list-performance-e6b34334a079)
- [Callstack — Ultimate Guide to React Native Optimization](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-optimization)
