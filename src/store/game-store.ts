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
import { getLLMDecision, getLLMResponse } from '@/engine/llm-ai';
import { useLLMStore } from './llm-store';

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
        next = maybeRunAIAutomation(next);
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
      return { gameState: maybeRunAIAutomation(next) };
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
        } else {
          next = maybeRunAIAutomation(next);
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

      // W2: block was challenged and blocker's bluff exposed — original action still resolves
      const blockerWasExposed =
        prevState.pending !== null &&
        prevState.pendingBlock !== null &&
        prevState.loserId === prevState.pendingBlock.blockerId;

      // W3: direct challenge failed (actor had the card) — challenger loses influence
      //     but the original action must STILL resolve (tax gives coins, steal takes, etc.)
      //     Bluffing case is detected by pending.type === 'income' (engine sets it to cancel action)
      const failedChallengeNeedsResolution =
        prevState.pending !== null &&
        prevState.pendingBlock === null &&
        prevState.pending.type !== 'income' &&
        prevState.loserId !== prevState.pending.playerId;

      if ((blockerWasExposed || failedChallengeNeedsResolution) && next.phase === 'action') {
        next = resolveAction({ ...next, pending: prevState.pending });
      }

      if (next.phase === 'action') {
        next = advanceTurn(next);
        next = maybeRunAITurn(next);
      }

      // Always run AI automation at the end — maybeRunAITurn can leave the game in
      // lose_influence or exchange_select if an AI targets another AI mid-chain
      next = maybeRunAIAutomation(next);

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

    const llmConfig = useLLMStore.getState().getConfig(ai.id);
    if (llmConfig && llmConfig.provider !== 'heuristic') {
      triggerLLMResponse(next, ai.id);
      return { ...next, phase: 'waiting_for_llm' };
    }

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
    // passChallenge resolved to lose_influence or exchange_select — run AI automation
    return maybeRunAIAutomation(next);
  }

  if (next.phase === 'challenge_block') {
    next = passBlock(next);
    next = advanceTurn(next);
    return maybeRunAITurn(next);
  }

  return next;
}

function maybeRunAIAutomation(state: GameState): GameState {
  // AI auto-reveal when an AI player must lose influence
  if (state.phase === 'lose_influence' && state.loserId) {
    const loser = state.players.find((p) => p.id === state.loserId);
    if (loser?.isAI) {
      const cardIndex = loser.cards.findIndex((c) => !c.revealed);
      if (cardIndex === -1) return state;

      const prevState = state;
      let next = loseInfluence(state, cardIndex);

      if (next.phase === 'game_over') return next;

      // W2: block was challenged and blocker bluffed — original action still resolves
      const blockerWasExposed =
        prevState.pending !== null &&
        prevState.pendingBlock !== null &&
        prevState.loserId === prevState.pendingBlock.blockerId;

      // W3: direct challenge failed (AI auto-reveals) — challenger lost, action still resolves
      const failedChallengeNeedsResolution =
        prevState.pending !== null &&
        prevState.pendingBlock === null &&
        prevState.pending.type !== 'income' &&
        prevState.loserId !== null &&
        prevState.loserId !== prevState.pending.playerId;

      if ((blockerWasExposed || failedChallengeNeedsResolution) && next.phase === 'action') {
        next = resolveAction({ ...next, pending: prevState.pending });
      }

      if (next.phase === 'action') {
        next = advanceTurn(next);
        next = maybeRunAITurn(next);
      }

      return maybeRunAIAutomation(next);
    }
  }

  // AI auto-exchange when an AI player must select exchange cards
  if (state.phase === 'exchange_select' && state.exchangeState) {
    const exchanger = state.players.find((p) => p.id === state.exchangeState!.playerId);
    if (exchanger?.isAI) {
      const keepCount = exchanger.cards.filter((c) => !c.revealed).length;
      // Keep own cards (first keepCount indices), discard drawn cards
      const keptIndices = Array.from({ length: keepCount }, (_, i) => i);
      let next = resolveExchangeSelect(state, keptIndices);
      next = advanceTurn(next);
      return maybeRunAITurn(next);
    }
  }

  return state;
}

function maybeRunAITurn(state: GameState): GameState {
  if (state.phase !== 'action') return state;
  const current = state.players.find((p) => p.id === state.currentPlayerId);
  if (!current?.isAI) return state;

  const llmConfig = useLLMStore.getState().getConfig(current.id);
  if (llmConfig && llmConfig.provider !== 'heuristic') {
    triggerLLMTurn(state, current.id);
    return { ...state, phase: 'waiting_for_llm' };
  }

  const afterAction = engineSubmitAction(state, getAIDecision(state));
  if (afterAction.phase === 'action') {
    const advanced = advanceTurn(afterAction);
    return maybeRunAITurn(advanced);
  }
  return maybeRunAIResponses(afterAction);
}

function triggerLLMResponse(state: GameState, responderId: string): void {
  const llmConfig = useLLMStore.getState().getConfig(responderId);
  if (!llmConfig) return;

  const originalPhase = state.phase as 'challenge_action' | 'challenge_block';

  const fallbackToPass = () => {
    const store = useGameStore.getState();
    if (store.gameState?.phase !== 'waiting_for_llm') return;
    const resumed = { ...store.gameState, phase: originalPhase };
    const next = maybeRunAIAutomation(maybeRunAIResponsesExcluding(resumed, responderId));
    useGameStore.setState({ gameState: next });
  };

  getLLMResponse(state, responderId, llmConfig)
    .then((decision) => {
      const store = useGameStore.getState();
      if (store.gameState?.phase !== 'waiting_for_llm') return;

      const resumed = { ...store.gameState, phase: originalPhase };
      let next: GameState;

      if (decision.type === 'challenge') {
        // Only challenge if the action actually has a claimed character to challenge
        const challengeIsValid =
          originalPhase === 'challenge_action'
            ? resumed.pending?.claimedCharacter != null
            : true;

        if (!challengeIsValid) {
          // LLM tried to challenge an unchallengeable action — treat as pass
          next = maybeRunAIResponsesExcluding(resumed, responderId);
        } else {
          next = originalPhase === 'challenge_action'
            ? resolveChallenge(resumed, responderId)
            : resolveChallengeBlock(resumed, responderId);
        }
      } else if (decision.type === 'block' && decision.character) {
        next = resolveBlock(resumed, { blockerId: responderId, claimedCharacter: decision.character });
        next = maybeRunAIResponses(next);
      } else {
        // pass — remove this AI from consideration and continue with remaining responders
        next = maybeRunAIResponsesExcluding(resumed, responderId);
      }

      next = maybeRunAIAutomation(next);
      useGameStore.setState({ gameState: next });
    })
    .catch(fallbackToPass);
}

function maybeRunAIResponsesExcluding(state: GameState, excludeId: string): GameState {
  const originalFilter = state;
  const withExcluded = {
    ...state,
    players: state.players.map((p) =>
      p.id === excludeId
        ? { ...p, cards: p.cards.map((c) => ({ ...c, _responded: true })) }
        : p
    ),
  };
  // Simplest approach: just process remaining by treating excludeId as the actor
  // Re-use maybeRunAIResponses but with modified nonActorPlayers logic
  return maybeRunAIResponsesWithSkip(originalFilter, excludeId);
}

function maybeRunAIResponsesWithSkip(state: GameState, skipId: string): GameState {
  if (state.phase !== 'challenge_action' && state.phase !== 'challenge_block') {
    return state;
  }

  const { pending, pendingBlock } = state;

  const nonActorPlayers = state.players.filter((p) => {
    if (!p.cards.some((c) => !c.revealed)) return false;
    if (p.id === skipId) return false; // already responded (passed)
    if (state.phase === 'challenge_action') return p.id !== pending?.playerId;
    return p.id !== pendingBlock?.blockerId;
  });

  const humanPlayers = nonActorPlayers.filter((p) => !p.isAI);
  if (humanPlayers.length > 0) return state;

  let next = state;
  for (const ai of nonActorPlayers.filter((p) => p.isAI)) {
    if (next.phase !== 'challenge_action' && next.phase !== 'challenge_block') break;

    const llmConfig = useLLMStore.getState().getConfig(ai.id);
    if (llmConfig && llmConfig.provider !== 'heuristic') {
      triggerLLMResponse(next, ai.id);
      return { ...next, phase: 'waiting_for_llm' };
    }

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
    return maybeRunAIAutomation(next);
  }

  if (next.phase === 'challenge_block') {
    next = passBlock(next);
    next = advanceTurn(next);
    return maybeRunAITurn(next);
  }

  return next;
}

function triggerLLMTurn(state: GameState, playerId: string): void {
  const llmConfig = useLLMStore.getState().getConfig(playerId);
  if (!llmConfig) return;

  const fallbackToHeuristic = () => {
    const store = useGameStore.getState();
    if (store.gameState?.phase !== 'waiting_for_llm') return;
    const resumed = { ...store.gameState, phase: 'action' as const };
    const action = getAIDecision(resumed);
    const afterAction = engineSubmitAction(resumed, action);
    let next: GameState;
    if (afterAction.phase === 'action') {
      next = advanceTurn(afterAction);
      next = maybeRunAITurn(next);
    } else {
      next = maybeRunAIResponses(afterAction);
      next = maybeRunAIAutomation(next);
    }
    useGameStore.setState({ gameState: next });
  };

  getLLMDecision(state, playerId, llmConfig)
    .then((action) => {
      const store = useGameStore.getState();
      if (store.gameState?.phase !== 'waiting_for_llm') return;
      const resumed = { ...store.gameState, phase: 'action' as const };
      const afterAction = engineSubmitAction(resumed, action);
      let next: GameState;
      if (afterAction.phase === 'action') {
        next = advanceTurn(afterAction);
        next = maybeRunAITurn(next);
      } else {
        next = maybeRunAIResponses(afterAction);
        next = maybeRunAIAutomation(next);
      }
      useGameStore.setState({ gameState: next });
    })
    .catch(fallbackToHeuristic);
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
