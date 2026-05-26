import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CharacterName, GameState, PlayerSetup } from '@/engine/types';
import { useGameStore } from '@/store/game-store';
import { PlayerBoard } from '@/components/PlayerBoard';
import { ActionMenu } from '@/components/ActionMenu';
import { ResponseBar } from '@/components/ResponseBar';
import { GameLog } from '@/components/GameLog';
import { CardFace } from '@/components/CardFace';
import { Spacing } from '@/constants/theme';

interface ExchangeProps {
  gameState: GameState;
  selected: number[];
  onToggle: (i: number, keepCount: number) => void;
  onConfirm: (indices: number[]) => void;
}

function ExchangeSelector({ gameState, selected, onToggle, onConfirm }: ExchangeProps) {
  const exchanger = gameState.players.find(
    (p) => p.id === gameState.exchangeState!.playerId
  )!;
  const keepCount = exchanger.cards.filter((c) => !c.revealed).length;
  const allOptions = [
    ...exchanger.cards.filter((c) => !c.revealed),
    ...gameState.exchangeState!.drawnCards,
  ];

  return (
    <View style={styles.exchangeContainer}>
      <Text style={styles.exchangeTitle}>
        Choose {keepCount} card{keepCount !== 1 ? 's' : ''} to keep
      </Text>
      <View style={styles.exchangeCards}>
        {allOptions.map((card, i) => (
          <TouchableOpacity
            key={`${card.character}-${i}`}
            onPress={() => onToggle(i, keepCount)}
            style={[styles.exchangeCard, selected.includes(i) && styles.exchangeCardSelected]}
          >
            <CardFace character={card.character} faceUp revealed={false} />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.confirmBtn, selected.length !== keepCount && styles.confirmBtnDisabled]}
        onPress={() => onConfirm(selected)}
        disabled={selected.length !== keepCount}
      >
        <Text style={styles.confirmBtnText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

function getActiveHumanId(state: GameState): string | null {
  const { phase, players, pending, pendingBlock, loserId, exchangeState } = state;
  if (phase === 'waiting_for_llm' || phase === 'game_over') return null;

  const isActive = (id: string) =>
    players.find((p) => p.id === id)?.cards.some((c) => !c.revealed) ?? false;

  if (phase === 'action') {
    const curr = players.find((p) => p.id === state.currentPlayerId);
    return curr && !curr.isAI ? curr.id : null;
  }
  if (phase === 'challenge_action') {
    return players.find((p) => !p.isAI && p.id !== pending?.playerId && isActive(p.id))?.id ?? null;
  }
  if (phase === 'challenge_block') {
    return players.find((p) => !p.isAI && p.id !== pendingBlock?.blockerId && isActive(p.id))?.id ?? null;
  }
  if (phase === 'lose_influence') {
    const loser = players.find((p) => p.id === loserId);
    return loser && !loser.isAI ? loser.id : null;
  }
  if (phase === 'exchange_select') {
    const exchanger = players.find((p) => p.id === exchangeState?.playerId);
    return exchanger && !exchanger.isAI ? exchanger.id : null;
  }
  return null;
}

export default function GameScreen() {
  const { setup } = useLocalSearchParams<{ setup: string }>();
  const router = useRouter();

  const gameState = useGameStore((s) => s.gameState);
  const startGame = useGameStore((s) => s.startGame);
  const submitAction = useGameStore((s) => s.submitAction);
  const submitChallenge = useGameStore((s) => s.submitChallenge);
  const submitBlock = useGameStore((s) => s.submitBlock);
  const submitPass = useGameStore((s) => s.submitPass);
  const revealCard = useGameStore((s) => s.revealCard);
  const selectExchangeCards = useGameStore((s) => s.selectExchangeCards);

  const [exchangeSelected, setExchangeSelected] = useState<number[]>([]);

  useEffect(() => {
    if (setup) {
      const players = JSON.parse(setup) as PlayerSetup[];
      startGame(players);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; setup and startGame are stable by design
  }, []);

  useEffect(() => {
    if (gameState?.phase !== 'exchange_select') {
      setExchangeSelected([]);
    }
  }, [gameState?.phase]);

  useEffect(() => {
    if (gameState?.phase === 'game_over') {
      const winner = gameState.players.find((p) => p.cards.some((c) => !c.revealed));
      router.replace({
        pathname: '/game-over',
        params: { winner: winner?.name ?? 'Unknown' },
      });
    }
  }, [gameState?.phase]);

  if (!gameState) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Starting game…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeHumanId = getActiveHumanId(gameState);
  const humanPlayer = gameState.players.find((p) => !p.isAI) ?? null;
  const opponents = gameState.players.filter((p) => p.id !== humanPlayer?.id);
  const activeHuman = gameState.players.find((p) => p.id === activeHumanId) ?? null;

  const isResponsePhase =
    gameState.phase === 'challenge_action' || gameState.phase === 'challenge_block';
  const isLoseInfluence =
    gameState.phase === 'lose_influence' && activeHumanId !== null;
  const isExchangeSelect =
    gameState.phase === 'exchange_select' &&
    gameState.exchangeState?.playerId === activeHumanId;

  const handleExchangeToggle = (i: number, keepCount: number) => {
    setExchangeSelected((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= keepCount) return prev;
      return [...prev, i];
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Opponents */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.opponents}
        >
          {opponents.map((p) => (
            <PlayerBoard
              key={p.id}
              player={p}
              faceUp={false}
              isCurrentTurn={p.id === gameState.currentPlayerId}
            />
          ))}
        </ScrollView>

        {/* Game log */}
        <View style={styles.logWrapper}>
          <GameLog log={gameState.log} />
        </View>

        {/* Human player */}
        {humanPlayer && (
          <View style={styles.humanBoard}>
            <PlayerBoard
              player={humanPlayer}
              faceUp
              isCurrentTurn={humanPlayer.id === gameState.currentPlayerId}
              onCardPress={
                gameState.phase === 'lose_influence' &&
                gameState.loserId === humanPlayer.id
                  ? revealCard
                  : undefined
              }
            />
          </View>
        )}

        {/* Exchange card selection */}
        {isExchangeSelect && gameState.exchangeState && (
          <ExchangeSelector
            gameState={gameState}
            selected={exchangeSelected}
            onToggle={handleExchangeToggle}
            onConfirm={selectExchangeCards}
          />
        )}

        {/* LLM thinking indicator */}
        {gameState.phase === 'waiting_for_llm' && (
          <View style={styles.llmWaiting}>
            <Text style={styles.llmWaitingText}>
              🧠 {gameState.players.find((p) => p.id === gameState.currentPlayerId)?.name} is thinking…
            </Text>
            <Text style={styles.llmWaitingSubtext}>Consulting AI model</Text>
          </View>
        )}

        {/* Heuristic AI thinking indicator */}
        {!activeHumanId &&
          gameState.phase !== 'waiting_for_llm' &&
          !isLoseInfluence &&
          !isExchangeSelect && (
            <View style={styles.waiting}>
              <Text style={styles.waitingText}>
                {gameState.players.find((p) => p.id === gameState.currentPlayerId)?.name} is thinking…
              </Text>
            </View>
          )}

        {/* Lose influence prompt */}
        {isLoseInfluence && (
          <View style={styles.loseInfluencePrompt}>
            <Text style={styles.loseInfluenceText}>Tap a card to reveal it</Text>
          </View>
        )}

        {/* Action menu */}
        {activeHumanId && gameState.phase === 'action' && (
          <ActionMenu gameState={gameState} onAction={submitAction} />
        )}

        {/* Challenge / block / pass */}
        {activeHumanId && isResponsePhase && activeHuman && (
          <ResponseBar
            responderId={activeHumanId}
            responderName={activeHuman.name}
            phase={gameState.phase as 'challenge_action' | 'challenge_block'}
            pending={gameState.pending}
            pendingBlock={gameState.pendingBlock}
            responderCards={activeHuman.cards}
            onChallenge={() => submitChallenge(activeHumanId)}
            onBlock={(char: CharacterName) =>
              submitBlock({ blockerId: activeHumanId, claimedCharacter: char })
            }
            onPass={submitPass}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  container: {
    flex: 1,
  },
  opponents: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  logWrapper: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  humanBoard: {
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  waiting: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  waitingText: {
    color: '#8888aa',
    fontSize: 13,
    fontStyle: 'italic',
  },
  loseInfluencePrompt: {
    padding: Spacing.three,
    alignItems: 'center',
    backgroundColor: '#1a0000',
    borderTopWidth: 1,
    borderColor: '#7f1d1d',
  },
  loseInfluenceText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  exchangeContainer: {
    padding: Spacing.three,
    backgroundColor: '#0d1a0d',
    borderTopWidth: 1,
    borderColor: '#166534',
  },
  exchangeTitle: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  exchangeCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  exchangeCard: {
    opacity: 0.55,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exchangeCardSelected: {
    opacity: 1,
    borderColor: '#86efac',
  },
  confirmBtn: {
    backgroundColor: '#166534',
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#1a2a1a',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8888aa',
    fontSize: 16,
  },
  llmWaiting: {
    padding: Spacing.three,
    alignItems: 'center',
    backgroundColor: '#1a1500',
    borderTopWidth: 1,
    borderColor: '#f59e0b',
  },
  llmWaitingText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  llmWaitingSubtext: {
    color: '#92661a',
    fontSize: 11,
    marginTop: 2,
  },
});
