import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Spacing } from '@/constants/theme';

interface Props {
  log: string[];
}

export function GameLog({ log }: Props) {
  const recent = log.slice(-3).reverse();

  return (
    <View style={styles.container}>
      <FlatList
        data={recent}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <Text style={[styles.entry, index === 0 && styles.latest]}>{item}</Text>
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d20',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3a',
  },
  entry: {
    color: '#8888aa',
    fontSize: 12,
    paddingVertical: 2,
  },
  latest: {
    color: '#ccccee',
    fontWeight: '600',
  },
});
