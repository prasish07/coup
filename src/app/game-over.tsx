import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GameOverScreen() {
  const { winner } = useLocalSearchParams<{ winner: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>{winner ?? 'Winner'}</Text>
        <Text style={styles.subtitle}>wins the game!</Text>

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
  safe: { flex: 1, backgroundColor: '#0d0d1a' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  crown: { fontSize: 80, marginBottom: 8 },
  title: { fontSize: 40, fontWeight: '900', color: '#ffd700' },
  subtitle: { fontSize: 18, color: '#8888aa', marginBottom: 32 },
  buttons: { gap: 12, alignSelf: 'stretch' },
  btn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  btnTextSecondary: { color: '#aaa' },
});
