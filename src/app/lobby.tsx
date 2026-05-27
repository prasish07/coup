import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AIMode, LLMConfig } from '@/engine/types';
import { useGameStore } from '@/store/game-store';
import { useLLMStore } from '@/store/llm-store';
import { Spacing } from '@/constants/theme';

interface LLMSlotConfig {
  provider: Exclude<AIMode, 'heuristic'>;
  apiKey: string;
  endpoint: string;
  model: string;
}

interface PlayerSlot {
  name: string;
  isAI: boolean;
  aiMode: AIMode;
  llm: LLMSlotConfig;
}

const DEFAULT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];

const DEFAULT_LLM: LLMSlotConfig = {
  provider: 'openai',
  apiKey: '',
  endpoint: 'http://localhost:11434',
  model: '',
};

const PROVIDER_LABELS: Record<Exclude<AIMode, 'heuristic'>, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  ollama: 'Local (Ollama/LM Studio)',
};

const MODEL_PLACEHOLDERS: Record<Exclude<AIMode, 'heuristic'>, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-haiku-4-5-20251001',
  ollama: 'llama3.2',
};

export default function LobbyScreen() {
  const router = useRouter();
  const setLLMConfig = useLLMStore((s) => s.setConfig);
  const clearLLMConfigs = useLLMStore((s) => s.clearConfigs);
  const resetGame = useGameStore((s) => s.resetGame);

  const [count, setCount] = useState(2);
  const [slots, setSlots] = useState<PlayerSlot[]>(
    DEFAULT_NAMES.map((name, i) => ({
      name,
      isAI: i > 0,
      aiMode: 'heuristic' as AIMode,
      llm: { ...DEFAULT_LLM },
    }))
  );

  const activeSlots = slots.slice(0, count);
  const canStart = activeSlots.every((s) => {
    if (!s.name.trim()) return false;
    if (s.isAI && s.aiMode !== 'heuristic') {
      if (s.llm.provider !== 'ollama' && !s.llm.apiKey.trim()) return false;
    }
    return true;
  });

  function updateSlot(index: number, patch: Partial<PlayerSlot>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function updateLLM(index: number, patch: Partial<LLMSlotConfig>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, llm: { ...s.llm, ...patch } } : s))
    );
  }

  function startGame() {
    // Reset stale game state first — if game.tsx mounts while gameState.phase is still
    // 'game_over' from the previous game, its phase-watch effect would immediately navigate
    // back to game-over before startGame() in the mount effect has a chance to run.
    resetGame();
    clearLLMConfigs();
    activeSlots.forEach((slot, i) => {
      const playerId = `p${i + 1}`;
      if (slot.isAI && slot.aiMode !== 'heuristic') {
        const config: LLMConfig = {
          provider: slot.llm.provider,
          apiKey: slot.llm.apiKey || undefined,
          endpoint: slot.llm.provider === 'ollama' ? slot.llm.endpoint : undefined,
          model: slot.llm.model || undefined,
        };
        setLLMConfig(playerId, config);
      }
    });

    const setup = activeSlots.map((s) => ({
      name: s.name,
      isAI: s.isAI,
      aiMode: s.aiMode,
    }));

    router.push({
      pathname: '/game',
      params: { setup: JSON.stringify(setup) },
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
          <View key={slot.name + i} style={styles.slotContainer}>
            {/* Name + Human/AI row */}
            <View style={styles.slot}>
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
                onPress={() => updateSlot(i, { isAI: !slot.isAI, aiMode: 'heuristic' })}
              >
                <Text style={styles.typeBtnText}>{slot.isAI ? 'AI' : 'Human'}</Text>
              </Pressable>
            </View>

            {/* AI mode selector */}
            {slot.isAI && (
              <View style={styles.aiModeRow}>
                <Pressable
                  style={[styles.modeBtn, slot.aiMode === 'heuristic' && styles.modeBtnActive]}
                  onPress={() => updateSlot(i, { aiMode: 'heuristic' })}
                >
                  <Text style={styles.modeBtnText}>Heuristic</Text>
                </Pressable>
                <Pressable
                  style={[styles.modeBtn, slot.aiMode !== 'heuristic' && styles.modeBtnBrain]}
                  onPress={() =>
                    updateSlot(i, {
                      aiMode: slot.aiMode === 'heuristic' ? slot.llm.provider : 'heuristic',
                    })
                  }
                >
                  <Text style={styles.modeBtnText}>🧠 AI Brain</Text>
                </Pressable>
              </View>
            )}

            {/* LLM config panel */}
            {slot.isAI && slot.aiMode !== 'heuristic' && (
              <View style={styles.llmPanel}>
                {/* Provider selector */}
                <View style={styles.providerRow}>
                  {(['openai', 'claude', 'ollama'] as const).map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.providerBtn,
                        slot.llm.provider === p && styles.providerBtnActive,
                      ]}
                      onPress={() => {
                        updateLLM(i, { provider: p });
                        updateSlot(i, { aiMode: p });
                      }}
                    >
                      <Text
                        style={[
                          styles.providerBtnText,
                          slot.llm.provider === p && styles.providerBtnTextActive,
                        ]}
                      >
                        {PROVIDER_LABELS[p]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* API key — OpenAI / Claude */}
                {slot.llm.provider !== 'ollama' && (
                  <TextInput
                    style={styles.keyInput}
                    value={slot.llm.apiKey}
                    onChangeText={(v) => updateLLM(i, { apiKey: v })}
                    placeholder="API Key"
                    placeholderTextColor="#444"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}

                {/* Endpoint — Ollama / LM Studio */}
                {slot.llm.provider === 'ollama' && (
                  <TextInput
                    style={styles.keyInput}
                    value={slot.llm.endpoint}
                    onChangeText={(v) => updateLLM(i, { endpoint: v })}
                    placeholder="http://IP:port  (e.g. 192.168.1.14:1234)"
                    placeholderTextColor="#444"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}

                {/* Model (optional) */}
                <TextInput
                  style={styles.keyInput}
                  value={slot.llm.model}
                  onChangeText={(v) => updateLLM(i, { model: v })}
                  placeholder={`Model (default: ${MODEL_PLACEHOLDERS[slot.llm.provider]})`}
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  back: { padding: 4 },
  backText: { color: '#8888aa', fontSize: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  label: { color: '#aaa', fontSize: 14, width: 60 },
  countButtons: { flexDirection: 'row', gap: Spacing.two },
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
  scrollContent: { padding: Spacing.three, gap: Spacing.two },
  slotContainer: {
    backgroundColor: '#12122a',
    borderRadius: 10,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  slot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  slotNum: { color: '#555', width: 20, textAlign: 'center' },
  nameInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  typeBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#1f1f3a',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 64,
    alignItems: 'center',
  },
  typeBtnHuman: { borderColor: '#7c3aed' },
  typeBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  aiModeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingLeft: 28,
  },
  modeBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    backgroundColor: 'transparent',
  },
  modeBtnActive: { borderColor: '#7c3aed', backgroundColor: '#1a0a3a' },
  modeBtnBrain: { borderColor: '#f59e0b', backgroundColor: '#1a1500' },
  modeBtnText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  llmPanel: {
    paddingLeft: 28,
    paddingTop: Spacing.one,
    gap: Spacing.one,
  },
  providerRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  providerBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  providerBtnActive: { borderColor: '#f59e0b', backgroundColor: '#1a1500' },
  providerBtnText: { color: '#666', fontSize: 12, fontWeight: '600' },
  providerBtnTextActive: { color: '#f59e0b' },
  keyInput: {
    backgroundColor: '#0d0d1a',
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    color: '#ccc',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  footer: { padding: Spacing.three },
  startBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
