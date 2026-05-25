---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Testing Rules

- Test file mirrors source path: `src/engine/actions.ts` → `src/engine/actions.test.ts`
- Describe block = function name, it block = "should [expected] when [condition]"
- Never mock internal engine functions — they are pure, test directly
- Always test edge cases: 0 coins, eliminated player, last player standing
