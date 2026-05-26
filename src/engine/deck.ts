import type { Card, CharacterName } from './types';

const CHARACTERS: CharacterName[] = [
  'Duke',
  'Assassin',
  'Captain',
  'Ambassador',
  'Contessa',
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const character of CHARACTERS) {
    for (let i = 0; i < 3; i++) {
      deck.push({ character, revealed: false });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawCard(deck: Card[]): { card: Card; remaining: Card[] } {
  if (deck.length === 0) throw new Error('Deck is empty');
  const [card, ...remaining] = deck;
  return { card, remaining };
}
