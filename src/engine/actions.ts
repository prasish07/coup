import type {
  GameState,
  Player,
  PendingAction,
  ValidAction,
  CharacterName,
  PlayerSetup,
} from './types';
import { createDeck, shuffle } from './deck';

const ACTION_COST: Partial<Record<string, number>> = {
  coup: 7,
  assassinate: 3,
};

const ACTION_CLAIMED_CHARACTER: Partial<Record<string, CharacterName>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
};

const BLOCKER_CHARACTERS: Partial<Record<string, CharacterName[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
};

export function initGame(setup: PlayerSetup[]): GameState {
  const deck = shuffle(createDeck());
  const players: Player[] = setup.map((s, i) => ({
    id: `p${i + 1}`,
    name: s.name,
    isAI: s.isAI,
    coins: 2,
    cards: [],
  }));

  let remaining = deck;
  const dealtPlayers = players.map((p) => {
    const card1 = remaining[0];
    const card2 = remaining[1];
    remaining = remaining.slice(2);
    return { ...p, cards: [card1, card2] };
  });

  return {
    players: dealtPlayers,
    phase: 'action',
    currentPlayerId: dealtPlayers[0].id,
    pending: null,
    pendingBlock: null,
    exchangeState: null,
    loserId: null,
    deck: remaining,
    log: ['Game started'],
  };
}

function activePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.cards.some((c) => !c.revealed));
}

export function getValidActions(state: GameState): ValidAction[] {
  const player = state.players.find((p) => p.id === state.currentPlayerId);
  if (!player) return [];

  if (player.coins >= 10) {
    return activePlayers(state.players)
      .filter((p) => p.id !== player.id)
      .map((p) => ({ type: 'coup' as const, targetId: p.id }));
  }

  const actions: ValidAction[] = [{ type: 'income' }, { type: 'foreign_aid' }];

  if (player.coins >= 7) {
    activePlayers(state.players)
      .filter((p) => p.id !== player.id)
      .forEach((p) => actions.push({ type: 'coup', targetId: p.id }));
  }

  actions.push({ type: 'tax' });
  actions.push({ type: 'exchange' });

  if (player.coins >= 3) {
    activePlayers(state.players)
      .filter((p) => p.id !== player.id)
      .forEach((p) => actions.push({ type: 'assassinate', targetId: p.id }));
  }

  activePlayers(state.players)
    .filter((p) => p.id !== player.id)
    .forEach((p) => actions.push({ type: 'steal', targetId: p.id }));

  return actions;
}

export function getBlockers(
  state: GameState,
  action: PendingAction
): string[] {
  const blockableBy = BLOCKER_CHARACTERS[action.type];
  if (!blockableBy) return [];
  return activePlayers(state.players)
    .filter((p) => p.id !== action.playerId)
    .map((p) => p.id);
}

export function getChallengeEligible(
  state: GameState,
  action: PendingAction
): string[] {
  if (!ACTION_CLAIMED_CHARACTER[action.type]) return [];
  return activePlayers(state.players)
    .filter((p) => p.id !== action.playerId)
    .map((p) => p.id);
}

function applyIncome(state: GameState): GameState {
  return applyCoins(state, state.currentPlayerId, 1);
}

function applyForeignAid(state: GameState): GameState {
  return applyCoins(state, state.currentPlayerId, 2);
}

function applyCoup(state: GameState, targetId: string): GameState {
  const actor = state.players.find((p) => p.id === state.currentPlayerId);
  if (!actor) return state;
  return {
    ...state,
    phase: 'lose_influence',
    loserId: targetId,
    log: [
      ...state.log,
      `${actor.name} launches a Coup against ${getPlayerName(state, targetId)}`,
    ],
  };
}

function applyTax(state: GameState): GameState {
  return applyCoins(state, state.currentPlayerId, 3);
}

function applyAssassinate(state: GameState, targetId: string): GameState {
  return {
    ...state,
    phase: 'lose_influence',
    loserId: targetId,
    log: [
      ...state.log,
      `${getPlayerName(state, state.currentPlayerId)} assassinates ${getPlayerName(state, targetId)}`,
    ],
  };
}

function applySteal(state: GameState, targetId: string): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target) return state;
  const stolen = Math.min(2, target.coins);
  let next = applyCoins(state, targetId, -stolen);
  next = applyCoins(next, state.currentPlayerId, stolen);
  return {
    ...next,
    log: [
      ...next.log,
      `${getPlayerName(state, state.currentPlayerId)} steals ${stolen} coins from ${getPlayerName(state, targetId)}`,
    ],
  };
}

function applyExchange(state: GameState): GameState {
  const player = state.players.find((p) => p.id === state.currentPlayerId);
  if (!player) return state;
  if (state.deck.length < 2) return state;

  const [card1, afterFirst] = [state.deck[0], state.deck.slice(1)];
  const [card2, remaining] = [afterFirst[0], afterFirst.slice(1)];

  return {
    ...state,
    deck: remaining,
    phase: 'exchange_select',
    exchangeState: {
      playerId: state.currentPlayerId,
      drawnCards: [card1, card2],
    },
    log: [
      ...state.log,
      `${player.name} exchanges cards with the deck`,
    ],
  };
}

export function resolveAction(state: GameState): GameState {
  const { pending } = state;
  if (!pending) return state;

  switch (pending.type) {
    case 'income':
      return applyIncome(state);
    case 'foreign_aid':
      return applyForeignAid(state);
    case 'coup':
      return applyCoup(state, pending.targetId!);
    case 'tax':
      return applyTax(state);
    case 'assassinate':
      return applyAssassinate(state, pending.targetId!);
    case 'steal':
      return applySteal(state, pending.targetId!);
    case 'exchange':
      return applyExchange(state);
    default:
      return state;
  }
}

export function submitAction(state: GameState, action: ValidAction): GameState {
  const actor = state.players.find((p) => p.id === state.currentPlayerId);
  if (!actor) return state;

  const cost = ACTION_COST[action.type] ?? 0;
  const claimedCharacter = ACTION_CLAIMED_CHARACTER[action.type];

  let players = state.players;
  if (cost > 0) {
    players = state.players.map((p) =>
      p.id === state.currentPlayerId ? { ...p, coins: p.coins - cost } : p
    );
  }

  const pending = {
    type: action.type,
    playerId: state.currentPlayerId,
    targetId: action.targetId,
    claimedCharacter,
  };

  if (action.type === 'coup' || action.type === 'income') {
    return resolveAction({
      ...state,
      players,
      pending,
      phase: 'resolve',
    });
  }

  const log = [
    ...state.log,
    buildActionLog(actor.name, action, state),
  ];

  return {
    ...state,
    players,
    pending,
    phase: 'challenge_action',
    log,
  };
}

export function resolveExchangeSelect(
  state: GameState,
  keptIndices: number[]
): GameState {
  const { exchangeState } = state;
  if (!exchangeState) return state;

  const player = state.players.find((p) => p.id === exchangeState.playerId);
  if (!player) return state;

  const activePLayerCards = player.cards.filter((c) => !c.revealed);
  const allOptions = [...activePLayerCards, ...exchangeState.drawnCards];

  if (keptIndices.length !== activePLayerCards.length) return state;

  const kept = keptIndices.map((i) => allOptions[i]);
  const returned = allOptions.filter((_, i) => !keptIndices.includes(i));

  const updatedPlayers = state.players.map((p) => {
    if (p.id !== exchangeState.playerId) return p;
    const revealedCards = p.cards.filter((c) => c.revealed);
    return { ...p, cards: [...revealedCards, ...kept] };
  });

  return {
    ...state,
    players: updatedPlayers,
    deck: shuffle([...state.deck, ...returned]),
    phase: 'resolve',
    exchangeState: null,
  };
}

export function loseInfluence(state: GameState, cardIndex: number): GameState {
  const { loserId } = state;
  if (!loserId) return state;

  const updatedPlayers = state.players.map((p) => {
    if (p.id !== loserId) return p;
    const updatedCards = p.cards.map((c, i) =>
      i === cardIndex ? { ...c, revealed: true } : c
    );
    return { ...p, cards: updatedCards };
  });

  const loser = updatedPlayers.find((p) => p.id === loserId)!;
  const loserOut = loser.cards.every((c) => c.revealed);

  const remaining = activePlayers(updatedPlayers);
  if (remaining.length === 1) {
    return {
      ...state,
      players: updatedPlayers,
      phase: 'game_over',
      loserId: null,
      log: [
        ...state.log,
        `${remaining[0].name} wins!`,
      ],
    };
  }

  return {
    ...state,
    players: updatedPlayers,
    phase: 'action',
    loserId: null,
    pending: null,
    pendingBlock: null,
    log: loserOut
      ? [...state.log, `${loser.name} is eliminated`]
      : state.log,
  };
}

function applyCoins(
  state: GameState,
  playerId: string,
  delta: number
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, coins: p.coins + delta } : p
    ),
  };
}

function getPlayerName(state: GameState, playerId: string): string {
  return state.players.find((p) => p.id === playerId)?.name ?? playerId;
}

function buildActionLog(
  actorName: string,
  action: ValidAction,
  state: GameState
): string {
  switch (action.type) {
    case 'income':
      return `${actorName} takes income`;
    case 'foreign_aid':
      return `${actorName} takes foreign aid`;
    case 'tax':
      return `${actorName} claims Duke — takes tax`;
    case 'steal':
      return `${actorName} claims Captain — steals from ${getPlayerName(state, action.targetId!)}`;
    case 'assassinate':
      return `${actorName} claims Assassin — targets ${getPlayerName(state, action.targetId!)}`;
    case 'exchange':
      return `${actorName} claims Ambassador — exchanges cards`;
    default:
      return `${actorName} performs ${action.type}`;
  }
}
