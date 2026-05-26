import type { GameState, ValidAction, CharacterName } from './types';
import { getValidActions } from './actions';

const BLUFF_THRESHOLD = 0.55;
const COUP_COIN_THRESHOLD = 7;

const CHARACTER_ACTION: Partial<Record<CharacterName, string>> = {
  Duke: 'tax',
  Assassin: 'assassinate',
  Captain: 'steal',
  Ambassador: 'exchange',
};

function hasCharacter(state: GameState, playerId: string, character: CharacterName): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  return player.cards.some((c) => c.character === character && !c.revealed);
}

function estimateBluffProbability(
  state: GameState,
  aiId: string,
  claimantId: string,
  claimedCharacter: CharacterName
): number {
  const visibleCopies = state.players.reduce((sum, p) => {
    if (p.id === aiId) {
      return sum + p.cards.filter((c) => c.character === claimedCharacter).length;
    }
    return sum + p.cards.filter((c) => c.revealed && c.character === claimedCharacter).length;
  }, 0);

  const remaining = 3 - visibleCopies;
  if (remaining <= 0) return 1;

  const claimant = state.players.find((p) => p.id === claimantId);
  const claimantHidden = claimant ? claimant.cards.filter((c) => !c.revealed).length : 0;
  const totalUnknown = state.deck.length + claimantHidden;

  if (totalUnknown === 0) return remaining > 0 ? 1 : 0;

  const pHasCard = Math.min(1, (remaining * claimantHidden) / totalUnknown);
  return 1 - pHasCard;
}

function pickTarget(state: GameState, aiId: string): string | undefined {
  const opponents = state.players.filter(
    (p) => p.id !== aiId && p.cards.some((c) => !c.revealed)
  );
  if (opponents.length === 0) return undefined;
  return opponents.reduce((weakest, p) =>
    p.cards.filter((c) => !c.revealed).length <
    weakest.cards.filter((c) => !c.revealed).length
      ? p
      : weakest
  ).id;
}

export function getAIDecision(state: GameState): ValidAction {
  const aiId = state.currentPlayerId;
  const ai = state.players.find((p) => p.id === aiId);
  if (!ai) return { type: 'income' };

  const validActions = getValidActions(state);

  if (ai.coins >= 10) {
    const coup = validActions.find((a) => a.type === 'coup');
    if (coup) return coup;
  }

  if (ai.coins >= COUP_COIN_THRESHOLD) {
    const coup = validActions.find((a) => a.type === 'coup');
    if (coup) return coup;
  }

  for (const character of ['Duke', 'Assassin', 'Captain', 'Ambassador'] as CharacterName[]) {
    if (hasCharacter(state, aiId, character)) {
      const actionType = CHARACTER_ACTION[character];
      if (actionType === 'assassinate' && ai.coins >= 3) {
        const target = pickTarget(state, aiId);
        const action = validActions.find(
          (a) => a.type === 'assassinate' && a.targetId === target
        );
        if (action) return action;
      } else if (actionType === 'steal') {
        const target = pickTarget(state, aiId);
        const action = validActions.find(
          (a) => a.type === 'steal' && a.targetId === target
        );
        if (action) return action;
      } else if (actionType === 'tax') {
        const tax = validActions.find((a) => a.type === 'tax');
        if (tax) return tax;
      } else if (actionType === 'exchange') {
        const exchange = validActions.find((a) => a.type === 'exchange');
        if (exchange) return exchange;
      }
    }
  }

  const tax = validActions.find((a) => a.type === 'tax');
  if (tax) return tax;

  return validActions.find((a) => a.type === 'foreign_aid') ?? { type: 'income' };
}

export function shouldChallenge(
  state: GameState,
  aiId: string,
  claimedCharacter: CharacterName,
  claimantId: string
): boolean {
  const bluffProb = estimateBluffProbability(state, aiId, claimantId, claimedCharacter);
  return bluffProb > BLUFF_THRESHOLD;
}

export function shouldBlock(
  state: GameState,
  aiId: string,
  actionType: string
): boolean {
  const blockMap: Partial<Record<string, CharacterName[]>> = {
    foreign_aid: ['Duke'],
    assassinate: ['Contessa'],
    steal: ['Captain', 'Ambassador'],
  };

  const blockers = blockMap[actionType];
  if (!blockers) return false;

  return blockers.some((char) => hasCharacter(state, aiId, char));
}
