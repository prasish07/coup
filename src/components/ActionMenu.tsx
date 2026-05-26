import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { GameState, ValidAction } from '@/engine/types';
import { getValidActions } from '@/engine/actions';
import { Spacing } from '@/constants/theme';

interface Props {
  gameState: GameState;
  onAction: (action: ValidAction) => void;
}

const ACTION_LABEL: Record<string, string> = {
  income: 'Income  +1',
  foreign_aid: 'Foreign Aid  +2',
  tax: 'Tax (Duke)  +3',
  exchange: 'Exchange (Ambassador)',
  coup: 'Coup',
  assassinate: 'Assassinate (3●)',
  steal: 'Steal (Captain)',
};

const ACTION_COLOR: Record<string, string> = {
  income: '#334155',
  foreign_aid: '#334155',
  tax: '#4c1d95',
  exchange: '#14532d',
  coup: '#7f1d1d',
  assassinate: '#7f1d1d',
  steal: '#1e3a5f',
};

export function ActionMenu({ gameState, onAction }: Props) {
  const validActions = getValidActions(gameState);

  const targeted = validActions.filter((a) => a.targetId);
  const untargeted = validActions.filter((a) => !a.targetId);

  const getTargetName = (id: string) =>
    gameState.players.find((p) => p.id === id)?.name ?? id;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your turn</Text>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {untargeted.map((action, i) => (
          <TouchableOpacity
            key={`${action.type}-${i}`}
            style={[styles.btn, { backgroundColor: ACTION_COLOR[action.type] ?? '#333' }]}
            onPress={() => onAction(action)}
            activeOpacity={0.75}
          >
            <Text style={styles.btnText}>{ACTION_LABEL[action.type] ?? action.type}</Text>
          </TouchableOpacity>
        ))}
        {targeted.map((action, i) => (
          <TouchableOpacity
            key={`${action.type}-${action.targetId}-${i}`}
            style={[styles.btn, styles.btnTargeted, { borderColor: ACTION_COLOR[action.type] ?? '#333' }]}
            onPress={() => onAction(action)}
            activeOpacity={0.75}
          >
            <Text style={styles.btnText}>{ACTION_LABEL[action.type] ?? action.type}</Text>
            <Text style={styles.targetText}>→ {getTargetName(action.targetId!)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d1a',
    borderTopWidth: 1,
    borderColor: '#1e1e3a',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxHeight: 200,
  },
  label: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  btn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    minWidth: 120,
  },
  btnTargeted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  targetText: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
  },
});
