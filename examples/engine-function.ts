// Pattern for a pure engine function in src/engine/
// - Accepts current state + inputs, returns NEW state (never mutates)
// - No React imports
// - Exported as named export

import type { GameState, Player } from '../src/engine/types';

export function exampleEngineFunction(
  state: GameState,
  playerId: string,
  amount: number
): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  const updatedPlayers: Player[] = state.players.map((p, i) =>
    i === playerIndex ? { ...p, coins: p.coins + amount } : p
  );

  return { ...state, players: updatedPlayers };
}
