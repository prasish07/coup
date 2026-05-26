import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Spacing } from '@/constants/theme';

interface Standing {
  name: string;
  survived: boolean;
  cards: number;
}

export default function GameOverScreen() {
  const { winner, standings } = useLocalSearchParams<{ winner: string; standings?: string }>();
  const router = useRouter();

  const parsedStandings: Standing[] = standings ? JSON.parse(standings) : [];

  const crownScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const standingsOpacity = useSharedValue(0);

  useEffect(() => {
    crownScale.value = withSpring(1, { damping: 5, stiffness: 150 });
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    standingsOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
  }, []);

  const crownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crownScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: (1 - titleOpacity.value) * 20 }],
  }));

  const standingsStyle = useAnimatedStyle(() => ({
    opacity: standingsOpacity.value,
  }));

  const survivors = parsedStandings.filter((s) => s.survived);
  const eliminated = parsedStandings.filter((s) => !s.survived);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.Text style={[styles.crown, crownStyle]}>👑</Animated.Text>

        <Animated.View style={titleStyle}>
          <Text style={styles.winnerName}>{winner ?? 'Winner'}</Text>
          <Text style={styles.winnerSub}>wins the game!</Text>
        </Animated.View>

        {parsedStandings.length > 0 && (
          <Animated.View style={[styles.standings, standingsStyle]}>
            <Text style={styles.standingsTitle}>Final Standings</Text>

            {survivors.map((s, i) => (
              <View key={s.name} style={[styles.standingRow, styles.survivorRow]}>
                <Text style={styles.rank}>#{i + 1}</Text>
                <Text style={styles.standingName}>{s.name}</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>
                    {s.cards} card{s.cards !== 1 ? 's' : ''} left
                  </Text>
                </View>
              </View>
            ))}

            {eliminated.map((s, i) => (
              <View key={s.name} style={[styles.standingRow, styles.eliminatedRow]}>
                <Text style={styles.rankElim}>#{survivors.length + i + 1}</Text>
                <Text style={styles.standingNameElim}>{s.name}</Text>
                <Text style={styles.eliminatedBadge}>eliminated</Text>
              </View>
            ))}
          </Animated.View>
        )}

        <View style={styles.buttons}>
          <Pressable style={styles.btn} onPress={() => router.replace('/lobby')}>
            <Text style={styles.btnText}>Play Again</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => router.replace('/')}>
            <Text style={[styles.btnText, styles.btnTextSecondary]}>Main Menu</Text>
          </Pressable>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  crown: {
    fontSize: 80,
    marginBottom: Spacing.two,
  },
  winnerName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffd700',
    textAlign: 'center',
  },
  winnerSub: {
    fontSize: 16,
    color: '#8888aa',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  standings: {
    width: '100%',
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  standingsTitle: {
    color: '#8888aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.one,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  survivorRow: {
    opacity: 1,
  },
  eliminatedRow: {
    opacity: 0.5,
  },
  rank: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '800',
    width: 28,
  },
  rankElim: {
    color: '#555',
    fontSize: 12,
    fontWeight: '800',
    width: 28,
  },
  standingName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  standingNameElim: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textDecorationLine: 'line-through',
  },
  cardBadge: {
    backgroundColor: '#14532d',
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  cardBadgeText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '600',
  },
  eliminatedBadge: {
    color: '#7f1d1d',
    fontSize: 11,
    fontWeight: '600',
  },
  buttons: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  btn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: '#aaa',
  },
});
