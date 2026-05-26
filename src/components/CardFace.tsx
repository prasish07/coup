import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { CharacterName } from '@/engine/types';

interface Props {
  character: CharacterName;
  faceUp: boolean;
  revealed: boolean;
}

const CHARACTER_COLOR: Record<CharacterName, string> = {
  Duke: '#7c3aed',
  Assassin: '#991b1b',
  Captain: '#1e40af',
  Ambassador: '#166534',
  Contessa: '#9d174d',
};

const CHARACTER_SYMBOL: Record<CharacterName, string> = {
  Duke: 'D',
  Assassin: 'A',
  Captain: 'C',
  Ambassador: 'Am',
  Contessa: 'Co',
};

export function CardFace({ character, faceUp, revealed }: Props) {
  const rotation = useSharedValue(faceUp ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(faceUp ? 1 : 0, { duration: 350 });
  }, [faceUp, rotation]);

  const frontStyle = useAnimatedStyle(() => {
    const rotY = interpolate(rotation.value, [0, 0.5, 1], [180, 90, 0]);
    return {
      transform: [{ rotateY: `${rotY}deg` }],
      opacity: rotation.value >= 0.5 ? 1 : 0,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotY = interpolate(rotation.value, [0, 0.5], [0, 90]);
    return {
      transform: [{ rotateY: `${rotY}deg` }],
      opacity: rotation.value < 0.5 ? 1 : 0,
    };
  });

  const color = CHARACTER_COLOR[character];

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.card, styles.cardBack, backStyle]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.card,
          { backgroundColor: revealed ? '#2a2a3a' : color },
          frontStyle,
        ]}
      >
        <Text style={[styles.symbol, revealed && styles.symbolRevealed]}>
          {CHARACTER_SYMBOL[character]}
        </Text>
        <Text style={[styles.name, revealed && styles.nameRevealed]} numberOfLines={1}>
          {character}
        </Text>
        {revealed && <Text style={styles.revealedLabel}>LOST</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 90,
  },
  card: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardBack: {
    backgroundColor: '#1e1e3a',
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  symbol: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  symbolRevealed: {
    color: '#555',
  },
  name: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textAlign: 'center',
  },
  nameRevealed: {
    color: '#555',
  },
  revealedLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ef4444',
    marginTop: 2,
    letterSpacing: 1,
  },
});
