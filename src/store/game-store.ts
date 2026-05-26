import { create } from 'zustand';
import type { GameState, ValidAction, PlayerSetup, PendingBlock, CharacterName, ActionType } from '@/engine/types';
import {
  initGame,
  submitAction as engineSubmitAction,
  resolveAction,
  loseInfluence,
  resolveExchangeSelect,
} from '@/engine/actions';
import {
  resolveChallenge,
  resolveBlock,
  resolveChallengeBlock,
  passChallenge,
  passBlock,
} from '@/engine/challenges';
import { getAIDecision, shouldChallenge, shouldBlock } from '@/engine/ai';

interface GameStore {
  gameState: GameState | null;
  startGame: (setup: PlayerSetup[]) => void;
  submitAction: (action: ValidAction) => void;
  submitChallenge: (challengerId: string) => void;
  submitBlock: (block: PendingBlock) => void;
  submitPass: () => void;
  revealCard: (cardIndex: number) => void;
  selectExchangeCards: (keptIndices: number[]) => void;
  resetGame: () => void;
}

function nextActivePlayer(state: GameState): string {
  const active = state.players.filter((p) =>
    p.cards.some((c) => !c.revealed)
  );
  if (active.length === 0) return state.currentPlayerId;
  const currentIndex = active.findIndex((p) => p.id === state.currentPlayerId);
  return active[(currentIndex + 1) % active.length].id;
}

function advanceTurn(state: GameState): GameState {
  if (state.phase === 'game_over') return state;
  return {
    ...state,
    phase: 'action',
    currentPlayerId: nextActivePlayer(state),
    pending: null,
    pendingBlock: null,
    exchangeState: null,
    loserId: null,
  };
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,

  startGame: (setup) =>
    set(() => {
      let state = initGame(setup);
      state = maybeRunAITurn(state);
      return { gameState: state };
    }),

  submitAction: (action) =>
    set((store) => {
      if (!store.gameState) return store;
      let next = engineSubmitAction(store.gameState, action);
      if (next.phase === 'action') {
        next = advanceTurn(next);
        next = maybeRunAITurn(next);
      } else {
        next = maybeRunAIResponses(next);
      }
      return { gameState: next };
    }),

  submitChallenge: (challengerId) =>
    set((store) => {
      if (!store.gameState) return store;
      const { phase } = store.gameState;
      let next: GameState;
      if (phase === 'challenge_action') {
        next = resolveChallenge(store.gameState, challengerId);
      } else if (phase === 'challenge_block') {
        next = resolveChallengeBlock(store.gameState, challengerId);
      } else {
        return store;
      }
      return { gameState: next };
    }),

  submitBlock: (block) =>
    set((store) => {
      if (!store.gameState) return store;
      const next = resolveBlock(store.gameState, block);
      return { gameState: maybeRunAIResponses(next) };
    }),

  submitPass: () =>
    set((store) => {
      if (!store.gameState) return store;
      const { phase } = store.gameState;
      let next: GameState;
      if (phase === 'challenge_action') {
        next = passChallenge(store.gameState);
        if (next.phase === 'action') {
          next = advanceTurn(next);
          next = maybeRunAITurn(next);
        }
      } else if (phase === 'challenge_block') {
        next = passBlock(store.gameState);
        next = advanceTurn(next);
        next = maybeRunAITurn(next);
      } else {
        return store;
      }
      return { gameState: next };
    }),

  revealCard: (cardIndex) =>
    set((store) => {
      if (!store.gameState) return store;
      const prevState = store.gameState;

      let next = loseInfluence(prevState, cardIndex);

      if (next.phase === 'game_over') return { gameState: next };

      // W2 fix: if the blocker's bluff was exposed, the original action must still resolve.
      // loseInfluence clears pending, so we use prevState to detect this case.
      const blockerWasExposed =
        prevState.pending !== null &&
        prevState.pendingBlock !== null &&
        prevState.loserId === prevState.pendingBlock.blockerId;

      if (blockerWasExposed && next.phase === 'action') {
        next = resolveAction({ ...next, pending: prevState.pending });
      }

      if (next.phase === 'action') {
        next = advanceTurn(next);
        next = maybeRunAITurn(next);
      }

      return { gameState: next };
    }),

  selectExchangeCards: (keptIndices) =>
    set((store) => {
      if (!store.gameState) return store;
      let next = resolveExchangeSelect(store.gameState, keptIndices);
      next = advanceTurn(next);
      next = maybeRunAITurn(next);
      return { gameState: next };
    }),

  resetGame: () => set(() => ({ gameState: null })),
}));

function maybeRunAIResponses(state: GameState): GameState {
  if (state.phase !== 'challenge_action' && state.phase !== 'challenge_block') {
    return state;
  }

  const { pending, pendingBlock } = state;

  const nonActorPlayers = state.players.filter((p) => {
    if (!p.cards.some((c) => !c.revealed)) return false;
    if (state.phase === 'challenge_action') {
      return p.id !== pending?.playerId;
    }
    // challenge_block: only the blocker can't challenge their own block
    return p.id !== pendingBlock?.blockerId;
  });

  const humanPlayers = nonActorPlayers.filter((p) => !p.isAI);
  if (humanPlayers.length > 0) return state;

  let next = state;
  for (const ai of nonActorPlayers.filter((p) => p.isAI)) {
    if (next.phase !== 'challenge_action' && next.phase !== 'challenge_block') break;

    if (next.phase === 'challenge_action' && next.pending) {
      const { claimedCharacter, playerId } = next.pending;
      if (claimedCharacter && shouldChallenge(next, ai.id, claimedCharacter, playerId)) {
        return resolveChallenge(next, ai.id);
      }
      if (shouldBlock(next, ai.id, next.pending.type)) {
        const blockChar = getBlockCharacter(next.pending.type, ai.id, next);
        if (blockChar) {
          const blocked = resolveBlock(next, { blockerId: ai.id, claimedCharacter: blockChar });
          return maybeRunAIResponses(blocked);
        }
      }
    } else if (next.phase === 'challenge_block' && next.pendingBlock) {
      const { claimedCharacter, blockerId } = next.pendingBlock;
      if (shouldChallenge(next, ai.id, claimedCharacter, blockerId)) {
        return resolveChallengeBlock(next, ai.id);
      }
    }
  }

  if (next.phase === 'challenge_action') {
    next = passChallenge(next);
    if (next.phase === 'action') {
      next = advanceTurn(next);
      return maybeRunAITurn(next);
    }
    return maybeRunAIResponses(next);
  }

  if (next.phase === 'challenge_block') {
    next = passBlock(next);
    next = advanceTurn(next);
    return maybeRunAITurn(next);
  }

  return next;
}

function maybeRunAITurn(state: GameState): GameState {
  if (state.phase !== 'action') return state;
  const current = state.players.find((p) => p.id === state.currentPlayerId);
  if (!current?.isAI) return state;

  const afterAction = engineSubmitAction(state, getAIDecision(state));
  if (afterAction.phase === 'action') {
    const advanced = advanceTurn(afterAction);
    return maybeRunAITurn(advanced);
  }
  return maybeRunAIResponses(afterAction);
}

function getBlockCharacter(
  actionType: ActionType,
  aiId: string,
  state: GameState
): CharacterName | null {
  const blockMap: Partial<Record<ActionType, CharacterName[]>> = {
    foreign_aid: ['Duke'],
    assassinate: ['Contessa'],
    steal: ['Captain', 'Ambassador'],
  };
  const chars = blockMap[actionType];
  if (!chars) return null;
  const ai = state.players.find((p) => p.id === aiId);
  if (!ai) return null;
  return chars.find((c) => ai.cards.some((card) => card.character === c && !card.revealed)) ?? null;
}
