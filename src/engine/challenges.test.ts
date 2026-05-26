import { resolveChallenge, resolveBlock, resolveChallengeBlock, passBlock, passChallenge } from './challenges';
import type { GameState, Card, Player } from './types';

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
  phase: 'challenge_action',
  currentPlayerId: 'p1',
  pending: {
    type: 'tax',
    playerId: 'p1',
    claimedCharacter: 'Duke',
  },
  pendingBlock: null,
  exchangeState: null,
  loserId: null,
  deck: [makeCard('Captain'), makeCard('Contessa'), makeCard('Duke'), makeCard('Ambassador'), makeCard('Duke')],
  log: [],
  ...overrides,
});

describe('resolveChallenge', () => {
  it('should expose bluff — actor loses influence', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Assassin'), makeCard('Captain')] }),
        makePlayer('p2'),
      ],
    });
    const next = resolveChallenge(state, 'p2');
    expect(next.phase).toBe('lose_influence');
    expect(next.loserId).toBe('p1');
  });

  it('should fail challenge — challenger loses influence', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Duke'), makeCard('Assassin')] }),
        makePlayer('p2'),
      ],
    });
    const next = resolveChallenge(state, 'p2');
    expect(next.phase).toBe('lose_influence');
    expect(next.loserId).toBe('p2');
  });

  it('should swap actor card into deck when challenge fails — deck size unchanged', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Duke'), makeCard('Assassin')] }),
        makePlayer('p2'),
      ],
    });
    const deckSizeBefore = state.deck.length;
    const next = resolveChallenge(state, 'p2');
    expect(next.deck.length).toBe(deckSizeBefore);
    expect(next.players[0].cards).toHaveLength(2);
  });

  it('should not mutate original state', () => {
    const state = makeState();
    resolveChallenge(state, 'p2');
    expect(state.phase).toBe('challenge_action');
    expect(state.loserId).toBeNull();
  });
});

describe('resolveBlock', () => {
  it('should set phase to challenge_block', () => {
    const state = makeState({
      pending: { type: 'foreign_aid', playerId: 'p1' },
    });
    const next = resolveBlock(state, { blockerId: 'p2', claimedCharacter: 'Duke' });
    expect(next.phase).toBe('challenge_block');
  });

  it('should record the blocker and claimed character', () => {
    const state = makeState({
      pending: { type: 'foreign_aid', playerId: 'p1' },
    });
    const next = resolveBlock(state, { blockerId: 'p2', claimedCharacter: 'Duke' });
    expect(next.pendingBlock?.blockerId).toBe('p2');
    expect(next.pendingBlock?.claimedCharacter).toBe('Duke');
  });
});

describe('resolveChallengeBlock', () => {
  it('should fail block challenge when blocker has the card — challenger loses influence', () => {
    const state = makeState({
      phase: 'challenge_block',
      pending: { type: 'foreign_aid', playerId: 'p1' },
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1'),
        makePlayer('p2', { cards: [makeCard('Duke'), makeCard('Captain')] }),
      ],
    });
    const next = resolveChallengeBlock(state, 'p1');
    expect(next.loserId).toBe('p1');
    expect(next.phase).toBe('lose_influence');
  });

  it('should expose block bluff — blocker loses influence', () => {
    const state = makeState({
      phase: 'challenge_block',
      pending: { type: 'foreign_aid', playerId: 'p1' },
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
      players: [
        makePlayer('p1'),
        makePlayer('p2', { cards: [makeCard('Assassin'), makeCard('Captain')] }),
      ],
    });
    const next = resolveChallengeBlock(state, 'p1');
    expect(next.loserId).toBe('p2');
    expect(next.phase).toBe('lose_influence');
  });
});

describe('passBlock', () => {
  it('should cancel the action and return to action phase', () => {
    const state = makeState({
      phase: 'challenge_block',
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
    });
    const next = passBlock(state);
    expect(next.phase).toBe('action');
    expect(next.pending).toBeNull();
    expect(next.pendingBlock).toBeNull();
  });
});

describe('passChallenge', () => {
  it('should resolve the action when passing during challenge_action', () => {
    const state = makeState({
      phase: 'challenge_action',
      pending: { type: 'tax', playerId: 'p1', claimedCharacter: 'Duke' },
    });
    const next = passChallenge(state);
    expect(next.players[0].coins).toBe(5);
  });

  it('should pass the block when passing during challenge_block', () => {
    const state = makeState({
      phase: 'challenge_block',
      pendingBlock: { blockerId: 'p2', claimedCharacter: 'Duke' },
    });
    const next = passChallenge(state);
    expect(next.phase).toBe('action');
  });
});
