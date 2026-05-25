---
paths:
  - "src/engine/**/*.ts"
---

# Game Engine Rules

- Functions must be pure: same inputs → same outputs, no side effects
- No React imports allowed in this directory
- Return new state objects, never mutate: `{ ...state, players: [...] }`
- Every exported function must have a corresponding Jest test
- CharacterName and ActionType enums live in types.ts — import from there
