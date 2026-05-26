import { createDeck, shuffle, drawCard } from './deck';

describe('createDeck', () => {
  it('should return 15 cards', () => {
    expect(createDeck()).toHaveLength(15);
  });

  it('should have exactly 3 copies of each character', () => {
    const deck = createDeck();
    const counts: Record<string, number> = {};
    for (const card of deck) {
      counts[card.character] = (counts[card.character] ?? 0) + 1;
    }
    expect(counts['Duke']).toBe(3);
    expect(counts['Assassin']).toBe(3);
    expect(counts['Captain']).toBe(3);
    expect(counts['Ambassador']).toBe(3);
    expect(counts['Contessa']).toBe(3);
  });

  it('should return all cards with revealed=false', () => {
    const deck = createDeck();
    expect(deck.every((c) => c.revealed === false)).toBe(true);
  });

  it('should return a new array each call (no shared reference)', () => {
    const a = createDeck();
    const b = createDeck();
    expect(a).not.toBe(b);
  });
});

describe('shuffle', () => {
  it('should return the same number of cards', () => {
    const deck = createDeck();
    expect(shuffle(deck)).toHaveLength(15);
  });

  it('should not mutate the original deck', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });

  it('should contain the same cards after shuffling', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const sortFn = (a: { character: string }, b: { character: string }) =>
      a.character.localeCompare(b.character);
    expect([...shuffled].sort(sortFn)).toEqual([...deck].sort(sortFn));
  });
});

describe('drawCard', () => {
  it('should return the first card and the remaining deck', () => {
    const deck = createDeck();
    const { card, remaining } = drawCard(deck);
    expect(card).toEqual(deck[0]);
    expect(remaining).toHaveLength(14);
    expect(remaining).toEqual(deck.slice(1));
  });

  it('should throw when deck is empty', () => {
    expect(() => drawCard([])).toThrow('Deck is empty');
  });
});
