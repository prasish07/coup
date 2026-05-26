export type CharacterName =
  | 'Duke'
  | 'Assassin'
  | 'Captain'
  | 'Ambassador'
  | 'Contessa';

export type ActionType =
  | 'income'
  | 'foreign_aid'
  | 'coup'
  | 'tax'
  | 'assassinate'
  | 'steal'
  | 'exchange'
  | 'block_foreign_aid'
  | 'block_assassination'
  | 'block_steal';

export type Phase =
  | 'action'
  | 'challenge_action'
  | 'block'
  | 'challenge_block'
  | 'resolve'
  | 'lose_influence'
  | 'exchange_select'
  | 'waiting_for_llm'
  | 'game_over';

export type AIMode = 'heuristic' | 'openai' | 'claude' | 'ollama';

export interface LLMConfig {
  provider: AIMode;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export interface Card {
  character: CharacterName;
  revealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  coins: number;
  cards: Card[];
}

export interface PendingAction {
  type: ActionType;
  playerId: string;
  targetId?: string;
  claimedCharacter?: CharacterName;
}

export interface PendingBlock {
  blockerId: string;
  claimedCharacter: CharacterName;
}

export interface ExchangeState {
  playerId: string;
  drawnCards: Card[];
}

export interface GameState {
  players: Player[];
  phase: Phase;
  currentPlayerId: string;
  pending: PendingAction | null;
  pendingBlock: PendingBlock | null;
  exchangeState: ExchangeState | null;
  loserId: string | null;
  deck: Card[];
  log: string[];
}

export interface PlayerSetup {
  name: string;
  isAI: boolean;
  aiMode?: AIMode;
}

export interface ValidAction {
  type: ActionType;
  targetId?: string;
}

export const ACTION_CLAIMED_CHARACTER: Partial<Record<ActionType, CharacterName>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
  block_foreign_aid: 'Duke',
  block_assassination: 'Contessa',
  block_steal: 'Captain',
};
