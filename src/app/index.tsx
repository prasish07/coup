import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MainMenuScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>COUP</Text>
          <Text style={styles.subtitle}>The Game of Deception</Text>
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => router.push('/lobby')}
          >
            <Text style={styles.btnText}>New Game</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d1a' },
  container: { flex: 1, justifyContent: 'space-between', padding: 32 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontSize: 64, fontWeight: '900', color: '#ffd700', letterSpacing: 8 },
  subtitle: { fontSize: 16, color: '#8888aa', letterSpacing: 2 },
  buttons: { gap: 12, paddingBottom: 16 },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#7c3aed' },
  btnPressed: { opacity: 0.8 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
});
