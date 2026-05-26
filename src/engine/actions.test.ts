import { getValidActions, submitAction, resolveAction, initGame, loseInfluence, resolveExchangeSelect, getBlockers, getChallengeEligible } from './actions';
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
  deck: [makeCard('Captain'), makeCard('Contessa'), makeCard('Duke')],
  log: [],
  ...overrides,
});

describe('initGame', () => {
  it('should create players with 2 coins each', () => {
    const state = initGame([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: true },
    ]);
    expect(state.players[0].coins).toBe(2);
    expect(state.players[1].coins).toBe(2);
  });

  it('should deal 2 cards to each player', () => {
    const state = initGame([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: false },
      { name: 'Carol', isAI: false },
    ]);
    state.players.forEach((p) => expect(p.cards).toHaveLength(2));
  });

  it('should leave 9 cards in deck for 3 players', () => {
    const state = initGame([
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
      { name: 'C', isAI: false },
    ]);
    expect(state.deck).toHaveLength(9);
  });

  it('should set first player as current', () => {
    const state = initGame([
      { name: 'Alice', isAI: false },
      { name: 'Bob', isAI: false },
    ]);
    expect(state.currentPlayerId).toBe('p1');
  });

  it('should set phase to action', () => {
    const state = initGame([
      { name: 'A', isAI: false },
      { name: 'B', isAI: false },
    ]);
    expect(state.phase).toBe('action');
  });
});

describe('getValidActions', () => {
  it('should include income and foreign_aid always', () => {
    const state = makeState();
    const actions = getValidActions(state);
    expect(actions.some((a) => a.type === 'income')).toBe(true);
    expect(actions.some((a) => a.type === 'foreign_aid')).toBe(true);
  });

  it('should not include assassinate when player has fewer than 3 coins', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 2 }), makePlayer('p2')],
    });
    const actions = getValidActions(state);
    expect(actions.some((a) => a.type === 'assassinate')).toBe(false);
  });

  it('should include assassinate when player has 3+ coins', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 3 }), makePlayer('p2')],
    });
    const actions = getValidActions(state);
    expect(actions.some((a) => a.type === 'assassinate')).toBe(true);
  });

  it('should return ONLY coup actions when player has 10+ coins', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 10 }), makePlayer('p2')],
    });
    const actions = getValidActions(state);
    expect(actions.every((a) => a.type === 'coup')).toBe(true);
    expect(actions.length).toBe(1);
  });

  it('should not include coup when player has fewer than 7 coins', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 6 }), makePlayer('p2')],
    });
    const actions = getValidActions(state);
    expect(actions.some((a) => a.type === 'coup')).toBe(false);
  });

  it('should not include actions targeting eliminated players', () => {
    const eliminated = makePlayer('p2', {
      cards: [makeCard('Duke', true), makeCard('Assassin', true)],
    });
    const state = makeState({
      players: [makePlayer('p1', { coins: 7 }), eliminated],
    });
    const actions = getValidActions(state);
    expect(actions.some((a) => a.targetId === 'p2')).toBe(false);
  });
});

describe('submitAction', () => {
  it('should deduct 7 coins for coup', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 7 }), makePlayer('p2')],
    });
    const next = submitAction(state, { type: 'coup', targetId: 'p2' });
    expect(next.players[0].coins).toBe(0);
  });

  it('should deduct 3 coins for assassinate', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 5 }), makePlayer('p2')],
    });
    const next = submitAction(state, { type: 'assassinate', targetId: 'p2' });
    expect(next.players[0].coins).toBe(2);
  });

  it('should set phase to challenge_action for claimable actions', () => {
    const state = makeState();
    const next = submitAction(state, { type: 'tax' });
    expect(next.phase).toBe('challenge_action');
  });

  it('should resolve income immediately without challenge phase', () => {
    const state = makeState({ players: [makePlayer('p1', { coins: 2 }), makePlayer('p2')] });
    const next = submitAction(state, { type: 'income' });
    expect(next.players[0].coins).toBe(3);
  });

  it('should not mutate original state', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 5 }), makePlayer('p2')],
    });
    submitAction(state, { type: 'assassinate', targetId: 'p2' });
    expect(state.players[0].coins).toBe(5);
  });
});

describe('resolveAction', () => {
  it('should give 2 coins for foreign_aid', () => {
    const state = makeState({
      pending: { type: 'foreign_aid', playerId: 'p1' },
    });
    const next = resolveAction(state);
    expect(next.players[0].coins).toBe(4);
  });

  it('should give 3 coins for tax', () => {
    const state = makeState({
      pending: { type: 'tax', playerId: 'p1', claimedCharacter: 'Duke' },
    });
    const next = resolveAction(state);
    expect(next.players[0].coins).toBe(5);
  });

  it('should steal min(2, target.coins) — target has 1 coin', () => {
    const state = makeState({
      players: [makePlayer('p1', { coins: 2 }), makePlayer('p2', { coins: 1 })],
      pending: { type: 'steal', playerId: 'p1', targetId: 'p2', claimedCharacter: 'Captain' },
    });
    const next = resolveAction(state);
    expect(next.players[0].coins).toBe(3);
    expect(next.players[1].coins).toBe(0);
  });

  it('should steal 2 coins when target has 2+', () => {
    const state = makeState({
      pending: { type: 'steal', playerId: 'p1', targetId: 'p2', claimedCharacter: 'Captain' },
    });
    const next = resolveAction(state);
    expect(next.players[0].coins).toBe(4);
    expect(next.players[1].coins).toBe(0);
  });

  it('should return unchanged state when pending is null', () => {
    const state = makeState({ pending: null });
    expect(resolveAction(state)).toBe(state);
  });
});

describe('loseInfluence', () => {
  it('should reveal the chosen card', () => {
    const state = makeState({ loserId: 'p1' });
    const next = loseInfluence(state, 0);
    expect(next.players[0].cards[0].revealed).toBe(true);
  });

  it('should transition to game_over when last opponent is eliminated', () => {
    const state = makeState({
      players: [
        makePlayer('p1'),
        makePlayer('p2', { cards: [makeCard('Duke'), makeCard('Assassin', true)] }),
      ],
      loserId: 'p2',
    });
    const next = loseInfluence(state, 0);
    expect(next.phase).toBe('game_over');
  });

  it('should return to action phase when eliminated player still has others alive', () => {
    const threePlayerState = makeState({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      loserId: 'p2',
    });
    const next = loseInfluence(threePlayerState, 0);
    expect(next.phase).not.toBe('game_over');
  });

  it('should not mutate original state', () => {
    const state = makeState({ loserId: 'p1' });
    loseInfluence(state, 0);
    expect(state.players[0].cards[0].revealed).toBe(false);
  });
});

describe('getBlockers', () => {
  it('should return all other active players for foreign_aid', () => {
    const state = makeState();
    const pending = { type: 'foreign_aid' as const, playerId: 'p1' };
    const blockers = getBlockers(state, pending);
    expect(blockers).toContain('p2');
    expect(blockers).not.toContain('p1');
  });

  it('should return empty array for income (unblockable)', () => {
    const state = makeState();
    const pending = { type: 'income' as const, playerId: 'p1' };
    expect(getBlockers(state, pending)).toHaveLength(0);
  });

  it('should return empty array for coup (unblockable)', () => {
    const state = makeState();
    const pending = { type: 'coup' as const, playerId: 'p1', targetId: 'p2' };
    expect(getBlockers(state, pending)).toHaveLength(0);
  });

  it('should exclude eliminated players', () => {
    const eliminated = makePlayer('p3', {
      cards: [makeCard('Duke', true), makeCard('Assassin', true)],
    });
    const state = makeState({
      players: [makePlayer('p1'), makePlayer('p2'), eliminated],
    });
    const pending = { type: 'foreign_aid' as const, playerId: 'p1' };
    const blockers = getBlockers(state, pending);
    expect(blockers).not.toContain('p3');
  });
});

describe('getChallengeEligible', () => {
  it('should return all other active players for a claimable action', () => {
    const state = makeState();
    const pending = { type: 'tax' as const, playerId: 'p1', claimedCharacter: 'Duke' as const };
    const eligible = getChallengeEligible(state, pending);
    expect(eligible).toContain('p2');
    expect(eligible).not.toContain('p1');
  });

  it('should return empty array for income (no claim)', () => {
    const state = makeState();
    const pending = { type: 'income' as const, playerId: 'p1' };
    expect(getChallengeEligible(state, pending)).toHaveLength(0);
  });

  it('should return empty array for coup (no claim)', () => {
    const state = makeState();
    const pending = { type: 'coup' as const, playerId: 'p1', targetId: 'p2' };
    expect(getChallengeEligible(state, pending)).toHaveLength(0);
  });

  it('should exclude eliminated players', () => {
    const eliminated = makePlayer('p3', {
      cards: [makeCard('Duke', true), makeCard('Assassin', true)],
    });
    const state = makeState({
      players: [makePlayer('p1'), makePlayer('p2'), eliminated],
    });
    const pending = { type: 'tax' as const, playerId: 'p1', claimedCharacter: 'Duke' as const };
    const eligible = getChallengeEligible(state, pending);
    expect(eligible).not.toContain('p3');
  });
});

describe('resolveExchangeSelect', () => {
  it('should replace active cards with kept cards', () => {
    const state = makeState({
      phase: 'exchange_select',
      exchangeState: {
        playerId: 'p1',
        drawnCards: [makeCard('Contessa'), makeCard('Captain')],
      },
    });
    const next = resolveExchangeSelect(state, [2, 3]);
    expect(next.players[0].cards.map((c) => c.character)).toEqual(['Contessa', 'Captain']);
  });

  it('should return discarded cards to deck', () => {
    const state = makeState({
      phase: 'exchange_select',
      deck: [],
      exchangeState: {
        playerId: 'p1',
        drawnCards: [makeCard('Contessa'), makeCard('Captain')],
      },
    });
    const next = resolveExchangeSelect(state, [2, 3]);
    expect(next.deck).toHaveLength(2);
  });
});
