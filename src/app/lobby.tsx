import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PlayerSlot {
  name: string;
  isAI: boolean;
}

const DEFAULT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];

export default function LobbyScreen() {
  const router = useRouter();
  const [count, setCount] = useState(2);
  const [slots, setSlots] = useState<PlayerSlot[]>(
    DEFAULT_NAMES.map((name, i) => ({ name, isAI: i > 0 }))
  );

  const activeSlots = slots.slice(0, count);
  const canStart = activeSlots.every((s) => s.name.trim().length > 0);

  function updateSlot(index: number, patch: Partial<PlayerSlot>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function startGame() {
    router.push({
      pathname: '/game',
      params: { setup: JSON.stringify(activeSlots) },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Setup</Text>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.label}>Players</Text>
        <View style={styles.countButtons}>
          {[2, 3, 4, 5, 6].map((n) => (
            <Pressable
              key={n}
              style={[styles.countBtn, count === n && styles.countBtnActive]}
              onPress={() => setCount(n)}
            >
              <Text style={[styles.countBtnText, count === n && styles.countBtnTextActive]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeSlots.map((slot, i) => (
          <View key={i} style={styles.slot}>
            <Text style={styles.slotNum}>{i + 1}</Text>
            <TextInput
              style={styles.nameInput}
              value={slot.name}
              onChangeText={(v) => updateSlot(i, { name: v })}
              placeholderTextColor="#555"
              maxLength={16}
            />
            <Pressable
              style={[styles.typeBtn, !slot.isAI && styles.typeBtnHuman]}
              onPress={() => updateSlot(i, { isAI: !slot.isAI })}
            >
              <Text style={styles.typeBtnText}>{slot.isAI ? 'AI' : 'Human'}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          onPress={startGame}
          disabled={!canStart}
        >
          <Text style={styles.startBtnText}>Start Game</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d1a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  back: { padding: 4 },
  backText: { color: '#8888aa', fontSize: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  label: { color: '#aaa', fontSize: 14, width: 60 },
  countButtons: { flexDirection: 'row', gap: 8 },
  countBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  countBtnText: { color: '#666', fontWeight: '600' },
  countBtnTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotNum: { color: '#555', width: 20, textAlign: 'center' },
  nameInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1f1f3a',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 64,
    alignItems: 'center',
  },
  typeBtnHuman: { borderColor: '#7c3aed' },
  typeBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  footer: { padding: 16 },
  startBtn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
