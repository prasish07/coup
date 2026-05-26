import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { GameState, ValidAction } from '@/engine/types';
import { getValidActions } from '@/engine/actions';
import { Spacing } from '@/constants/theme';

interface Props {
  gameState: GameState;
  onAction: (action: ValidAction) => void;
}

const ACTION_LABEL: Record<string, string> = {
  income: 'Income +1',
  foreign_aid: 'Foreign Aid +2',
  tax: 'Tax (Duke) +3',
  exchange: 'Exchange',
  coup: 'Coup  7●',
  assassinate: 'Assassinate  3●',
  steal: 'Steal',
};

const ACTION_BG: Record<string, string> = {
  income: '#1e293b',
  foreign_aid: '#1e293b',
  tax: '#2e1065',
  exchange: '#052e16',
  coup: '#450a0a',
  assassinate: '#450a0a',
  steal: '#0c1a2e',
};

const ACTION_BORDER: Record<string, string> = {
  income: '#334155',
  foreign_aid: '#334155',
  tax: '#7c3aed',
  exchange: '#16a34a',
  coup: '#dc2626',
  assassinate: '#dc2626',
  steal: '#2563eb',
};

export function ActionMenu({ gameState, onAction }: Props) {
  const validActions = getValidActions(gameState);

  const simple = validActions.filter((a) => !a.targetId);

  // Group targeted actions by type
  const targetedTypes = Array.from(
    new Set(validActions.filter((a) => a.targetId).map((a) => a.type))
  );

  const getTargetName = (id: string) =>
    gameState.players.find((p) => p.id === id)?.name ?? id;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your turn</Text>
      <ScrollView showsVerticalScrollIndicator>
        {/* Simple (untargeted) actions */}
        <View style={styles.row}>
          {simple.map((action, i) => (
            <TouchableOpacity
              key={`${action.type}-${i}`}
              style={[
                styles.btn,
                {
                  backgroundColor: ACTION_BG[action.type] ?? '#1e293b',
                  borderColor: ACTION_BORDER[action.type] ?? '#334155',
                },
              ]}
              onPress={() => onAction(action)}
              activeOpacity={0.75}
            >
              <Text style={styles.btnText}>{ACTION_LABEL[action.type] ?? action.type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Targeted actions grouped by type */}
        {targetedTypes.map((type) => {
          const actions = validActions.filter((a) => a.type === type && a.targetId);
          return (
            <View key={type} style={styles.targetGroup}>
              <Text style={[styles.targetGroupLabel, { color: ACTION_BORDER[type] ?? '#aaa' }]}>
                {ACTION_LABEL[type] ?? type}
              </Text>
              <View style={styles.targetRow}>
                {actions.map((action) => (
                  <TouchableOpacity
                    key={`${action.type}-${action.targetId}`}
                    style={[
                      styles.targetBtn,
                      {
                        backgroundColor: ACTION_BG[action.type] ?? '#1e293b',
                        borderColor: ACTION_BORDER[action.type] ?? '#334155',
                      },
                    ]}
                    onPress={() => onAction(action)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.targetBtnText}>{getTargetName(action.targetId!)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a18',
    borderTopWidth: 1,
    borderColor: '#1e1e3a',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxHeight: 260,
  },
  label: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  btn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  targetGroup: {
    marginBottom: Spacing.two,
  },
  targetGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  targetBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    borderWidth: 1,
  },
  targetBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomPad: {
    height: Spacing.two,
  },
});
