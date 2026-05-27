import type { GameState, ValidAction, LLMConfig, CharacterName } from './types';
import { getValidActions } from './actions';
import { getAIDecision } from './ai';

const ACTION_DESCRIPTIONS: Record<string, string> = {
  income: 'Take 1 coin (no claim, cannot be blocked)',
  foreign_aid: 'Take 2 coins (claim not needed, can be blocked by Duke)',
  coup: 'Pay 7 coins to force a player to lose influence (unstoppable)',
  tax: 'Claim Duke — take 3 coins (can be challenged)',
  steal: 'Claim Captain — take 2 coins from target (can be challenged, blocked by Captain/Ambassador)',
  assassinate: 'Pay 3 coins, claim Assassin — target loses influence (can be challenged, blocked by Contessa)',
  exchange: 'Claim Ambassador — swap your cards with the deck (can be challenged)',
};

function buildPrompt(state: GameState, playerId: string): string {
  const player = state.players.find((p) => p.id === playerId)!;
  const validActions = getValidActions({ ...state, currentPlayerId: playerId });
  const opponents = state.players.filter((p) => p.id !== playerId);

  const myCards = player.cards
    .filter((c) => !c.revealed)
    .map((c) => c.character)
    .join(', ');

  const opponentSummary = opponents
    .map((p) => {
      const alive = p.cards.filter((c) => !c.revealed).length;
      return `${p.name}: ${p.coins} coins, ${alive} influence card${alive !== 1 ? 's' : ''}`;
    })
    .join('\n');

  const recentLog = state.log.slice(-5).join('\n');

  const actionsFormatted = validActions
    .map((a) => {
      const base = `{"type": "${a.type}"${a.targetId ? `, "targetId": "${a.targetId}"` : ''}}`;
      const targetName = a.targetId
        ? state.players.find((p) => p.id === a.targetId)?.name
        : null;
      const desc = ACTION_DESCRIPTIONS[a.type] ?? a.type;
      return `  ${base}${targetName ? ` — target: ${targetName}` : ''} — ${desc}`;
    })
    .join('\n');

  return `You are playing Coup, a bluffing card game. Make a strategic decision for your turn.

YOUR STATUS:
- Name: ${player.name}
- Coins: ${player.coins}
- Your secret cards: ${myCards || 'none remaining'}

OPPONENTS:
${opponentSummary}

RECENT EVENTS:
${recentLog || 'Game just started'}

VALID ACTIONS — respond with exactly one of these JSON objects:
${actionsFormatted}

STRATEGY: Bluff when advantageous. Coup is safe but costs 7 coins. Protect your coins. Eliminate the most dangerous opponent first.

Respond with ONLY the JSON object for your chosen action. No explanation.`;
}

function parseAction(text: string, validActions: ValidAction[]): ValidAction | null {
  const match = text.match(/\{[^}]+\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as { type?: string; targetId?: string };
    const action = validActions.find(
      (a) => a.type === parsed.type && a.targetId === parsed.targetId
    );
    return action ?? null;
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string, config: LLMConfig): Promise<string> {
  const model = config.model ?? 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

async function callClaude(prompt: string, config: LLMConfig): Promise<string> {
  const model = config.model ?? 'claude-haiku-4-5-20251001';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = (await res.json()) as { content: { text: string }[] };
  return data.content[0]?.text ?? '';
}

async function callOllama(prompt: string, config: LLMConfig): Promise<string> {
  const endpoint = (config.endpoint ?? 'http://localhost:11434').replace(/\/$/, '');
  const model = config.model ?? 'llama3.2';
  const res = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64,
      temperature: 0.3,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Local LLM error: ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

interface LLMResponse {
  type: 'challenge' | 'block' | 'pass';
  character?: CharacterName;
}

function buildResponsePrompt(state: GameState, responderId: string): string {
  const responder = state.players.find((p) => p.id === responderId)!;
  const { pending, pendingBlock, phase } = state;

  const myCards = responder.cards
    .filter((c) => !c.revealed)
    .map((c) => c.character)
    .join(', ');

  let situationText: string;
  let canBlock = false;
  const blockOptions: CharacterName[] = [];

  const BLOCK_CHARS: Partial<Record<string, CharacterName[]>> = {
    foreign_aid: ['Duke'],
    assassinate: ['Contessa'],
    steal: ['Captain', 'Ambassador'],
  };

  if (phase === 'challenge_action' && pending) {
    const actor = state.players.find((p) => p.id === pending.playerId)!;
    situationText = `${actor.name} claims to be ${pending.claimedCharacter ?? 'unknown'} and wants to use ${pending.type}.`;
    const possible = BLOCK_CHARS[pending.type] ?? [];
    blockOptions.push(
      ...possible.filter((c) =>
        responder.cards.some((card) => card.character === c && !card.revealed)
      )
    );
    canBlock = blockOptions.length > 0;
  } else if (phase === 'challenge_block' && pendingBlock) {
    const blocker = state.players.find((p) => p.id === pendingBlock.blockerId)!;
    situationText = `${blocker.name} is blocking as ${pendingBlock.claimedCharacter}.`;
  } else {
    situationText = 'Unknown situation.';
  }

  const options = [
    `{"response": "challenge"} — call their bluff; they lose influence if caught lying, you lose if they're honest`,
    canBlock
      ? blockOptions.map((c) => `{"response": "block", "character": "${c}"} — block as ${c}`).join('\n')
      : null,
    `{"response": "pass"} — allow it to proceed`,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are playing Coup. You must respond to another player's action.

SITUATION: ${situationText}

YOUR STATUS:
- Name: ${responder.name}
- Coins: ${responder.coins}
- Your secret cards: ${myCards || 'none remaining'}

RECENT EVENTS:
${state.log.slice(-3).join('\n') || 'Game just started'}

YOUR OPTIONS:
${options}

Respond with ONLY one JSON object. No explanation.`;
}

function parseResponse(text: string): LLMResponse | null {
  const match = text.match(/\{[^}]+\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { response?: string; character?: string };
    if (parsed.response === 'challenge') return { type: 'challenge' };
    if (parsed.response === 'block' && parsed.character)
      return { type: 'block', character: parsed.character as CharacterName };
    if (parsed.response === 'pass') return { type: 'pass' };
    return null;
  } catch {
    return null;
  }
}

export async function getLLMResponse(
  state: GameState,
  responderId: string,
  config: LLMConfig
): Promise<LLMResponse> {
  const fallback = (): LLMResponse => ({ type: 'pass' });

  try {
    const prompt = buildResponsePrompt(state, responderId);
    let text: string;

    switch (config.provider) {
      case 'openai': text = await callOpenAI(prompt, config); break;
      case 'claude': text = await callClaude(prompt, config); break;
      case 'ollama': text = await callOllama(prompt, config); break;
      default: return fallback();
    }

    return parseResponse(text) ?? fallback();
  } catch {
    return fallback();
  }
}

export async function getLLMDecision(
  state: GameState,
  playerId: string,
  config: LLMConfig
): Promise<ValidAction> {
  const validActions = getValidActions({ ...state, currentPlayerId: playerId });
  const fallback = () => getAIDecision({ ...state, currentPlayerId: playerId });

  if (validActions.length === 0) return fallback();

  try {
    const prompt = buildPrompt(state, playerId);
    let response: string;

    switch (config.provider) {
      case 'openai':
        response = await callOpenAI(prompt, config);
        break;
      case 'claude':
        response = await callClaude(prompt, config);
        break;
      case 'ollama':
        response = await callOllama(prompt, config);
        break;
      default:
        return fallback();
    }

    const action = parseAction(response, validActions);
    return action ?? fallback();
  } catch {
    return fallback();
  }
}
