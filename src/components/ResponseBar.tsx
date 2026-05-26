import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ActionType, Card, CharacterName, PendingAction, PendingBlock, Phase } from '@/engine/types';
import { Spacing } from '@/constants/theme';

interface Props {
  responderId: string;
  responderName: string;
  phase: Extract<Phase, 'challenge_action' | 'challenge_block'>;
  pending: PendingAction | null;
  pendingBlock: PendingBlock | null;
  responderCards: Card[];
  onChallenge: () => void;
  onBlock: (character: CharacterName) => void;
  onPass: () => void;
  autoPassSeconds?: number;
}

const BLOCK_CHARS: Partial<Record<ActionType, CharacterName[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
};

export function ResponseBar({
  responderId,
  responderName,
  phase,
  pending,
  pendingBlock,
  responderCards,
  onChallenge,
  onBlock,
  onPass,
  autoPassSeconds = 15,
}: Props) {
  const [seconds, setSeconds] = useState(autoPassSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSeconds(autoPassSeconds);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          onPass();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [responderId, phase]);

  const canChallenge =
    phase === 'challenge_action'
      ? !!pending?.claimedCharacter
      : true;

  const blockOptions: CharacterName[] = (() => {
    if (phase !== 'challenge_action' || !pending) return [];
    const chars = BLOCK_CHARS[pending.type] ?? [];
    return chars.filter((c) =>
      responderCards.some((card) => card.character === c && !card.revealed)
    );
  })();

  const claimLabel =
    phase === 'challenge_action'
      ? pending?.claimedCharacter
        ? `${pending.claimedCharacter}`
        : null
      : pendingBlock?.claimedCharacter ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.prompt}>
          {responderName} — respond to{' '}
          <Text style={styles.claim}>{claimLabel ?? 'action'}</Text>
        </Text>
        <View style={styles.timerBadge}>
          <Text style={[styles.timer, seconds <= 5 && styles.timerUrgent]}>{seconds}s</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {canChallenge && (
          <TouchableOpacity style={[styles.btn, styles.challengeBtn]} onPress={onChallenge} activeOpacity={0.8}>
            <Text style={styles.btnText}>Challenge</Text>
          </TouchableOpacity>
        )}

        {blockOptions.map((char) => (
          <TouchableOpacity
            key={char}
            style={[styles.btn, styles.blockBtn]}
            onPress={() => onBlock(char)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>Block as {char}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.btn, styles.passBtn]} onPress={onPass} activeOpacity={0.8}>
          <Text style={styles.passBtnText}>Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d20',
    borderTopWidth: 1,
    borderColor: '#1e1e3a',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  prompt: {
    color: '#aaa',
    fontSize: 12,
    flex: 1,
  },
  claim: {
    color: '#fff',
    fontWeight: '700',
  },
  timerBadge: {
    backgroundColor: '#1e1e3a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timer: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '700',
  },
  timerUrgent: {
    color: '#ef4444',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  btn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  challengeBtn: {
    backgroundColor: '#7f1d1d',
  },
  blockBtn: {
    backgroundColor: '#14532d',
  },
  passBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  passBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
});
