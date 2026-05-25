// Pattern for a Jest test in src/engine/*.test.ts
// - Describe block = function name
// - it block = "should [expected] when [condition]"
// - Build minimal state fixtures inline — no shared mutable setup
// - Always cover the edge case, not just the happy path

import { exampleEngineFunction } from '../src/engine/actions';
import type { GameState } from '../src/engine/types';

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [
    { id: 'p1', name: 'Alice', isAI: false, coins: 2, cards: [] },
    { id: 'p2', name: 'Bob', isAI: false, coins: 2, cards: [] },
  ],
  phase: 'action',
  currentPlayerId: 'p1',
  pending: null,
  pendingBlock: null,
  deck: [],
  log: [],
  ...overrides,
});

describe('exampleEngineFunction', () => {
  it('should increase coins when amount is positive', () => {
    const state = makeState();
    const next = exampleEngineFunction(state, 'p1', 3);
    expect(next.players[0].coins).toBe(5);
  });

  it('should not mutate the original state', () => {
    const state = makeState();
    exampleEngineFunction(state, 'p1', 3);
    expect(state.players[0].coins).toBe(2);
  });

  it('should return unchanged state when player id does not exist', () => {
    const state = makeState();
    const next = exampleEngineFunction(state, 'unknown', 3);
    expect(next).toBe(state);
  });
});
