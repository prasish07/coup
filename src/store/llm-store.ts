import { create } from 'zustand';
import type { LLMConfig } from '@/engine/types';

interface LLMStore {
  configs: Record<string, LLMConfig>;
  setConfig: (playerId: string, config: LLMConfig) => void;
  getConfig: (playerId: string) => LLMConfig | null;
  clearConfigs: () => void;
}

export const useLLMStore = create<LLMStore>((set, get) => ({
  configs: {},

  setConfig: (playerId, config) =>
    set((s) => ({ configs: { ...s.configs, [playerId]: config } })),

  getConfig: (playerId) => get().configs[playerId] ?? null,

  clearConfigs: () => set({ configs: {} }),
}));
