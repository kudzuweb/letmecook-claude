import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors, fonts, radius, iconSizes } from '../lib/theme';

export default function FilterBar({ filters, activeFilters = {}, onFilterPress }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <TouchableOpacity
        style={[styles.chip, !Object.keys(activeFilters).length && styles.chipActive]}
        onPress={() => onFilterPress('reset')}
      >
        <Text style={[styles.chipText, !Object.keys(activeFilters).length && styles.chipTextActive]}>All</Text>
      </TouchableOpacity>
      {filters.map(f => {
        const isActive = !!activeFilters[f.key];
        return (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onFilterPress(f.key)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
            <ChevronDown size={iconSizes.chip} color={isActive ? '#fff' : colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.chipBg,
    borderRadius: radius.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
