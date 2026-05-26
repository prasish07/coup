import { getAIDecision, shouldChallenge, shouldBlock } from './ai';
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
  phase: 'action',
  currentPlayerId: 'p1',
  pending: null,
  pendingBlock: null,
  exchangeState: null,
  loserId: null,
  deck: [],
  log: [],
  ...overrides,
});

describe('getAIDecision', () => {
  it('should coup when AI has 10+ coins', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 10 }), makePlayer('p2')],
    });
    const action = getAIDecision(state);
    expect(action.type).toBe('coup');
    expect(action.targetId).toBe('p2');
  });

  it('should coup when AI has 7+ coins', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 7 }), makePlayer('p2')],
    });
    const action = getAIDecision(state);
    expect(action.type).toBe('coup');
  });

  it('should use tax when AI has Duke', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { coins: 2, cards: [makeCard('Duke'), makeCard('Contessa')] }),
        makePlayer('p2'),
      ],
    });
    const action = getAIDecision(state);
    expect(action.type).toBe('tax');
  });

  it('should assassinate when AI has Assassin and 3+ coins', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { coins: 3, cards: [makeCard('Assassin'), makeCard('Contessa')] }),
        makePlayer('p2'),
      ],
    });
    const action = getAIDecision(state);
    expect(action.type).toBe('assassinate');
    expect(action.targetId).toBe('p2');
  });

  it('should not assassinate when AI has fewer than 3 coins', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { coins: 2, cards: [makeCard('Assassin'), makeCard('Contessa')] }),
        makePlayer('p2'),
      ],
    });
    const action = getAIDecision(state);
    expect(action.type).not.toBe('assassinate');
  });

  it('should return a valid action type', () => {
    const validTypes = ['income', 'foreign_aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'];
    const state = makeState();
    const action = getAIDecision(state);
    expect(validTypes).toContain(action.type);
  });
});

describe('shouldChallenge', () => {
  it('should return true when AI accounts for most Duke copies — high bluff probability', () => {
    // p1 holds 2 Dukes, only 1 remains; deck has 3 non-Duke cards
    // totalUnknown = 5, pHasCard = 1*2/5 = 0.4 → bluffProb = 0.6 > 0.55
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Duke'), makeCard('Duke')] }),
        makePlayer('p2'),
      ],
      deck: [makeCard('Contessa'), makeCard('Captain'), makeCard('Assassin')],
    });
    expect(shouldChallenge(state, 'p1', 'Duke', 'p2')).toBe(true);
  });

  it('should return false when bluff probability is below threshold', () => {
    // p1 holds 1 Duke, 2 remain; deck has 3 non-Duke cards
    // totalUnknown = 5, pHasCard = 2*2/5 = 0.8 → bluffProb = 0.2 < 0.55
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Duke'), makeCard('Assassin')] }),
        makePlayer('p2'),
      ],
      deck: [makeCard('Contessa'), makeCard('Captain'), makeCard('Ambassador')],
    });
    expect(shouldChallenge(state, 'p1', 'Duke', 'p2')).toBe(false);
  });
});

describe('shouldBlock', () => {
  it('should block foreign_aid when AI has Duke', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Duke'), makeCard('Captain')] }),
        makePlayer('p2'),
      ],
    });
    expect(shouldBlock(state, 'p1', 'foreign_aid')).toBe(true);
  });

  it('should block assassination when AI has Contessa', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Contessa'), makeCard('Duke')] }),
        makePlayer('p2'),
      ],
    });
    expect(shouldBlock(state, 'p1', 'assassinate')).toBe(true);
  });

  it('should not block when AI lacks the required card', () => {
    const state = makeState({
      players: [
        makePlayer('p1', { cards: [makeCard('Assassin'), makeCard('Captain')] }),
        makePlayer('p2'),
      ],
    });
    expect(shouldBlock(state, 'p1', 'foreign_aid')).toBe(false);
  });

  it('should not block unblockable actions', () => {
    const state = makeState({
      players: [makePlayer('p1'), makePlayer('p2')],
    });
    expect(shouldBlock(state, 'p1', 'income')).toBe(false);
    expect(shouldBlock(state, 'p1', 'coup')).toBe(false);
  });
});
