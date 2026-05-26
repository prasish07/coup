import type { GameState, CharacterName, PendingBlock } from './types';
import { shuffle } from './deck';
import { resolveAction, loseInfluence } from './actions';

const ACTION_CLAIMED_CHARACTER: Partial<Record<string, CharacterName>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
  block_foreign_aid: 'Duke',
  block_assassination: 'Contessa',
  block_steal: 'Captain',
};

function replaceCard(
  state: GameState,
  playerId: string,
  cardIndex: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const card = player.cards[cardIndex];
  if (!card) return state;

  const newDeck = shuffle([...state.deck, card]);
  const newCard = newDeck[0];
  const remainingDeck = newDeck.slice(1);

  const updatedPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const updatedCards = p.cards.map((c, i) =>
      i === cardIndex ? newCard : c
    );
    return { ...p, cards: updatedCards };
  });

  return { ...state, players: updatedPlayers, deck: remainingDeck };
}

function hasCharacter(state: GameState, playerId: string, character: CharacterName): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  return player.cards.some((c) => c.character === character && !c.revealed);
}

function findCardIndex(state: GameState, playerId: string, character: CharacterName): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return -1;
  return player.cards.findIndex((c) => c.character === character && !c.revealed);
}

export function resolveChallenge(
  state: GameState,
  challengerId: string
): GameState {
  const { pending } = state;
  if (!pending?.claimedCharacter) return state;

  const claimed = pending.claimedCharacter;
  const actorId = pending.playerId;
  const actorHasCard = hasCharacter(state, actorId, claimed);
  const challenger = state.players.find((p) => p.id === challengerId);
  const actor = state.players.find((p) => p.id === actorId);
  if (!challenger || !actor) return state;

  if (actorHasCard) {
    const cardIndex = findCardIndex(state, actorId, claimed);
    const afterReplace = replaceCard(state, actorId, cardIndex);
    return {
      ...afterReplace,
      phase: 'lose_influence',
      loserId: challengerId,
      log: [
        ...afterReplace.log,
        `${challenger.name} challenges ${actor.name} — ${actor.name} reveals ${claimed}, challenge fails`,
      ],
    };
  } else {
    return {
      ...state,
      phase: 'lose_influence',
      loserId: actorId,
      pending: { ...pending, type: 'income' },
      log: [
        ...state.log,
        `${challenger.name} challenges ${actor.name} — bluff exposed, action fails`,
      ],
    };
  }
}

export function resolveBlock(
  state: GameState,
  block: PendingBlock
): GameState {
  const { pending } = state;
  if (!pending) return state;

  const blocker = state.players.find((p) => p.id === block.blockerId);
  if (!blocker) return state;

  const blockActionType = `block_${pending.type}` as string;
  const claimedCharacter = ACTION_CLAIMED_CHARACTER[blockActionType] ?? block.claimedCharacter;

  return {
    ...state,
    pendingBlock: { ...block, claimedCharacter },
    phase: 'challenge_block',
    log: [
      ...state.log,
      `${blocker.name} blocks as ${claimedCharacter}`,
    ],
  };
}

export function resolveChallengeBlock(
  state: GameState,
  challengerId: string
): GameState {
  const { pendingBlock } = state;
  if (!pendingBlock) return state;

  const claimed = pendingBlock.claimedCharacter;
  const blockerId = pendingBlock.blockerId;
  const blockerHasCard = hasCharacter(state, blockerId, claimed);
  const challenger = state.players.find((p) => p.id === challengerId);
  const blocker = state.players.find((p) => p.id === blockerId);
  if (!challenger || !blocker) return state;

  if (blockerHasCard) {
    const cardIndex = findCardIndex(state, blockerId, claimed);
    const afterReplace = replaceCard(state, blockerId, cardIndex);
    return {
      ...afterReplace,
      phase: 'lose_influence',
      loserId: challengerId,
      pendingBlock: null,
      log: [
        ...afterReplace.log,
        `${challenger.name} challenges block — ${blocker.name} reveals ${claimed}, challenge fails, block holds`,
      ],
    };
  } else {
    const afterExposed = {
      ...state,
      phase: 'lose_influence' as const,
      loserId: blockerId,
      pendingBlock: null,
      log: [
        ...state.log,
        `${challenger.name} challenges block — ${blocker.name}'s bluff exposed, block fails`,
      ],
    };
    return afterExposed;
  }
}

export function passBlock(state: GameState): GameState {
  return {
    ...state,
    phase: 'action',
    pending: null,
    pendingBlock: null,
    log: [...state.log, 'Block accepted — action cancelled'],
  };
}

export function passChallenge(state: GameState): GameState {
  if (state.phase === 'challenge_action') {
    return resolveAction({ ...state, phase: 'resolve' });
  }
  if (state.phase === 'challenge_block') {
    return passBlock(state);
  }
  return state;
}
