import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Player } from '@/engine/types';
import { CardFace } from './CardFace';
import { Spacing } from '@/constants/theme';

interface Props {
  player: Player;
  faceUp: boolean;
  isCurrentTurn?: boolean;
  onCardPress?: (cardIndex: number) => void;
}

export function PlayerBoard({ player, faceUp, isCurrentTurn = false, onCardPress }: Props) {
  const isEliminated = player.cards.every((c) => c.revealed);

  return (
    <View style={[styles.container, isCurrentTurn && styles.activeBorder, isEliminated && styles.eliminated]}>
      <View style={styles.header}>
        <Text style={[styles.name, isEliminated && styles.nameEliminated]} numberOfLines={1}>
          {player.name}
          {player.isAI ? ' 🤖' : ''}
        </Text>
        <View style={styles.coins}>
          <Text style={styles.coinSymbol}>●</Text>
          <Text style={styles.coinCount}>{player.coins}</Text>
        </View>
      </View>
      <View style={styles.cards}>
        {player.cards.map((card, i) => {
          const canPress = onCardPress && !card.revealed;
          return (
            <Pressable
              key={i}
              onPress={() => canPress && onCardPress(i)}
              style={[styles.cardWrapper, canPress && styles.cardPressable]}
            >
              <CardFace
                character={card.character}
                faceUp={faceUp || card.revealed}
                revealed={card.revealed}
              />
              {canPress && <Text style={styles.tapHint}>tap to lose</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 160,
  },
  activeBorder: {
    borderColor: '#ffd700',
  },
  eliminated: {
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  name: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  nameEliminated: {
    color: '#555',
    textDecorationLine: 'line-through',
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1a1a00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  coinSymbol: {
    color: '#ffd700',
    fontSize: 10,
  },
  coinCount: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: '800',
  },
  cards: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  cardPressable: {
    opacity: 0.9,
    transform: [{ scale: 1.05 }],
  },
  tapHint: {
    color: '#ef4444',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
});
