// Pattern for a game UI component in src/components/
// - Reads from Zustand store with a selector (avoids re-renders on unrelated state)
// - Props are typed with an interface
// - Styles at bottom with StyleSheet.create

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../src/store/gameStore';

interface ExampleComponentProps {
  playerId: string;
}

export function ExampleComponent({ playerId }: ExampleComponentProps) {
  const coins = useGameStore(
    (s) => s.gameState?.players.find((p) => p.id === playerId)?.coins ?? 0
  );

  return (
    <View style={styles.container}>
      <Text style={styles.coins}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a2e',
  },
  coins: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
