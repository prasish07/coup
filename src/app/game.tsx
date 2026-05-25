import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GameScreen() {
  const { setup } = useLocalSearchParams<{ setup: string }>();
  const router = useRouter();
  const players = setup ? JSON.parse(setup) : [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.placeholder}>Game Screen — coming in Phase 2</Text>
        <Text style={styles.info}>{players.length} players loaded</Text>
        <Text style={styles.link} onPress={() => router.replace('/game-over')}>
          → Skip to Game Over screen
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d1a' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  placeholder: { color: '#fff', fontSize: 18, textAlign: 'center' },
  info: { color: '#8888aa' },
  link: { color: '#7c3aed', marginTop: 24 },
});
