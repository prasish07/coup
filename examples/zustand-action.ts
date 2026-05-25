// Pattern for a Zustand store action in src/store/gameStore.ts
// - Calls a pure engine function to compute next state
// - Uses set() with a function — never mutate state directly
// - Keep the store action thin: validate inputs, call engine, update store

import { create } from 'zustand';
import type { GameState } from '../src/engine/types';
import { exampleEngineFunction } from '../src/engine/actions';

interface GameStore {
  gameState: GameState | null;
  giveCoins: (playerId: string, amount: number) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,

  giveCoins: (playerId, amount) =>
    set((store) => {
      if (!store.gameState) return store;
      return { gameState: exampleEngineFunction(store.gameState, playerId, amount) };
    }),
}));
