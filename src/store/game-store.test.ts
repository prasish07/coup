import { useGameStore } from './game-store';
import type { GameState, Card, Player } from '@/engine/types';

const makeCard = (character: Card['character'], revealed = false): Card => ({
  character,
  revealed,
});

const makePlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
  id,
  name: id,
  isAI: false,
  coins: 2,
  cards: [makeCard('Duke'), makeCard('Assassin')],
  ...overrides,
});

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  players: [makePlayer('p1'), makePlayer('p2')],
  phase: 'action',
  currentPlayerId: 'p1',
  pending: null,
  pendingBlock: null,
  exchangeState: null,
  loserId: null,
  deck: [makeCard('Captain'), makeCard('Contessa'), makeCard('Ambassador')],
  log: [],
  ...overrides,
});

function getStore() {
  return useGameStore.getState();
}

function setState(gameState: GameState) {
  useGameStore.setState({ gameState });
}

beforeEach(() => {
  useGameStore.setState({ gameState: null });
});

describe('startGame', () => {
  it('should initialize game state with given players', () => {
    getStore().startGame([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: false },
    ]);
    const { gameState } = getStore();
    expect(gameState).not.toBeNull();
    expect(gameState?.players).toHaveLength(2);
    expect(gameState?.players[0].name).toBe('Alice');
  });

  it('should deal 2 cards to each player', () => {
    getStore().startGame([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: false },
    ]);
    const { gameState } = getStore();
    gameState?.players.forEach((p) => expect(p.cards).toHaveLength(2));
  });

  it('should set phase to action', () => {
    getStore().startGame([
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
    ]);
    expect(getStore().gameState?.phase).toBe('action');
  });

  it('should give each player 2 coins', () => {
    getStore().startGame([
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
    ]);
    getStore().gameState?.players.forEach((p) => expect(p.coins).toBe(2));
  });
});

describe('submitAction', () => {
  it('should apply income immediately', () => {
    setState(makeState({ players: [makePlayer('p1', { coins: 2 }), makePlayer('p2')] }));
    getStore().submitAction({ type: 'income' });
    expect(getStore().gameState?.players[0].coins).toBe(3);
  });

  it('should enter challenge_action phase for tax', () => {
    setState(makeState());
    getStore().submitAction({ type: 'tax' });
    expect(getStore().gameState?.phase).toBe('challenge_action');
  });

  it('should deduct 3 coins for assassinate before challenge phase', () => {
    setState(makeState({ players: [makePlayer('p1', { coins: 5 }), makePlayer('p2')] }));
    getStore().submitAction({ type: 'assassinate', targetId: 'p2' });
    expect(getStore().gameState?.players[0].coins).toBe(2);
    expect(getStore().gameState?.phase).toBe('challenge_action');
  });

  it('should do nothing when gameState is null', () => {
    getStore().submitAction({ type: 'income' });
    expect(getStore().gameState).toBeNull();
  });
});

describe('submitChallenge', () => {
  it('should expose bluff and move to lose_influence for actor', () => {
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'tax', playerId: 'p1', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1', { cards: [makeCard('Assassin'), makeCard('Captain')] }),
        makePlayer('p2'),
      ],
    }));
    getStore().submitChallenge('p2');
    const gs = getStore().gameState!;
    expect(gs.phase).toBe('lose_influence');
    expect(gs.loserId).toBe('p1');
  });

  it('should fail challenge when actor has the card — challenger loses influence', () => {
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'tax', playerId: 'p1', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1', { cards: [makeCard('Duke'), makeCard('Assassin')] }),
        makePlayer('p2'),
      ],
    }));
    getStore().submitChallenge('p2');
    const gs = getStore().gameState!;
    expect(gs.phase).toBe('lose_influence');
    expect(gs.loserId).toBe('p2');
  });

  it('should handle block challenge', () => {
    setState(makeState({
      phase: 'challenge_block',
      pending: { type: 'foreign_aid', playerId: 'p1' },
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1'),
        makePlayer('p2', { cards: [makeCard('Assassin'), makeCard('Captain')] }),
      ],
    }));
    getStore().submitChallenge('p1');
    const gs = getStore().gameState!;
    expect(gs.loserId).toBe('p2');
  });
});

describe('submitBlock', () => {
  it('should set phase to challenge_block', () => {
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'foreign_aid', playerId: 'p1' },
    }));
    getStore().submitBlock({ blockerId: 'p2', claimedCharacter: 'Duke' });
    expect(getStore().gameState?.phase).toBe('challenge_block');
  });

  it('should record the blocker', () => {
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'foreign_aid', playerId: 'p1' },
    }));
    getStore().submitBlock({ blockerId: 'p2', claimedCharacter: 'Duke' });
    expect(getStore().gameState?.pendingBlock?.blockerId).toBe('p2');
  });
});

describe('submitPass', () => {
  it('should resolve the action and advance turn when passing challenge_action', () => {
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'tax', playerId: 'p1', claimedCharacter: 'Duke' },
    }));
    getStore().submitPass();
    const gs = getStore().gameState!;
    expect(gs.players[0].coins).toBe(5);
    expect(gs.phase).toBe('action');
    expect(gs.currentPlayerId).toBe('p2');
  });

  it('should cancel the action and advance turn when passing challenge_block', () => {
    setState(makeState({
      phase: 'challenge_block',
      pending: { type: 'foreign_aid', playerId: 'p1' },
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
    }));
    getStore().submitPass();
    const gs = getStore().gameState!;
    expect(gs.phase).toBe('action');
    expect(gs.currentPlayerId).toBe('p2');
    expect(gs.players[0].coins).toBe(2);
  });
});

describe('revealCard', () => {
  it('should reveal the chosen card', () => {
    setState(makeState({ loserId: 'p1', phase: 'lose_influence' }));
    getStore().revealCard(0);
    expect(getStore().gameState?.players[0].cards[0].revealed).toBe(true);
  });

  it('should advance to next player after reveal', () => {
    setState(makeState({ loserId: 'p1', phase: 'lose_influence' }));
    getStore().revealCard(0);
    expect(getStore().gameState?.currentPlayerId).toBe('p2');
  });

  it('should resolve original action after failed block challenge (W2 fix)', () => {
    setState(makeState({
      phase: 'lose_influence',
      loserId: 'p2',
      pending: { type: 'foreign_aid', playerId: 'p1' },
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1', { coins: 2 }),
        makePlayer('p2'),
      ],
    }));
    getStore().revealCard(0);
    expect(getStore().gameState?.players[0].coins).toBe(4);
  });

  it('should transition to game_over when last player is eliminated', () => {
    setState(makeState({
      phase: 'lose_influence',
      loserId: 'p2',
      players: [
        makePlayer('p1'),
        makePlayer('p2', { cards: [makeCard('Duke'), makeCard('Assassin', true)] }),
      ],
    }));
    getStore().revealCard(0);
    expect(getStore().gameState?.phase).toBe('game_over');
  });
});

describe('selectExchangeCards', () => {
  it('should update player cards and advance turn', () => {
    setState(makeState({
      phase: 'exchange_select',
      exchangeState: {
        playerId: 'p1',
        drawnCards: [makeCard('Contessa'), makeCard('Captain')],
      },
    }));
    getStore().selectExchangeCards([2, 3]);
    const gs = getStore().gameState!;
    expect(gs.players[0].cards.map((c) => c.character)).toEqual(['Contessa', 'Captain']);
    expect(gs.phase).toBe('action');
    expect(gs.currentPlayerId).toBe('p2');
  });
});

describe('AI automation', () => {
  it('should auto-reveal AI card when bluff is exposed by human challenge', () => {
    // p2 (AI) claims tax bluffing — no Duke
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'tax', playerId: 'p2', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1'),
        makePlayer('p2', { isAI: true, cards: [makeCard('Assassin'), makeCard('Captain')] }),
      ],
      deck: [makeCard('Duke'), makeCard('Contessa'), makeCard('Duke')],
    }));
    getStore().submitChallenge('p1');
    const gs = getStore().gameState!;
    // p2 (AI) should have auto-revealed — game must have advanced past lose_influence
    expect(gs.phase).not.toBe('lose_influence');
    expect(gs.players[1].cards.some((c) => c.revealed)).toBe(true);
  });

  it('should auto-reveal AI card when targeted by coup', () => {
    setState(makeState({
      players: [
        makePlayer('p1', { coins: 7 }),
        makePlayer('p2', { isAI: true }),
      ],
      deck: [makeCard('Duke'), makeCard('Contessa'), makeCard('Duke')],
    }));
    getStore().submitAction({ type: 'coup', targetId: 'p2' });
    const gs = getStore().gameState!;
    expect(gs.phase).not.toBe('lose_influence');
    expect(gs.players[1].cards.some((c) => c.revealed)).toBe(true);
  });

  it('should auto-exchange cards for AI when human passes the challenge', () => {
    // p2 (AI) claims exchange — human p1 passes — exchange_select fires for AI p2
    setState(makeState({
      phase: 'challenge_action',
      currentPlayerId: 'p2',
      pending: { type: 'exchange', playerId: 'p2', claimedCharacter: 'Ambassador' },
      players: [
        makePlayer('p1'),
        makePlayer('p2', { isAI: true }),
      ],
      deck: [makeCard('Contessa'), makeCard('Duke'), makeCard('Captain')],
    }));
    getStore().submitPass();
    const gs = getStore().gameState!;
    // AI should have auto-selected cards — must not be stuck at exchange_select
    expect(gs.phase).not.toBe('exchange_select');
  });
});

describe('resetGame', () => {
  it('should clear game state', () => {
    getStore().startGame([{ name: 'A', isAI: false }, { name: 'B', isAI: false }]);
    getStore().resetGame();
    expect(getStore().gameState).toBeNull();
  });
});

describe('AI turn automation', () => {
  it('should auto-advance through AI turns at game start', () => {
    getStore().startGame([
      { name: 'Human', isAI: false },
      { name: 'Bot', isAI: true },
    ]);
    const gs = getStore().gameState!;
    expect(gs.phase).toBe('action');
    expect(gs.currentPlayerId).toBe('p1');
  });

  it('should auto-take AI turn after human passes', () => {
    setState(makeState({
      phase: 'challenge_action',
      pending: { type: 'tax', playerId: 'p1', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1', { coins: 2, isAI: false }),
        makePlayer('p2', { isAI: true }),
      ],
    }));
    getStore().submitPass();
    const gs = getStore().gameState!;
    expect(gs.phase).toBe('challenge_action');
    expect(gs.pending?.playerId).toBe('p2');
  });
});
