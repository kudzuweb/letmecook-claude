import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useStore } from '../../lib/store';

const TABS = [
  { key: 'staples', label: 'Staples', hint: 'Ingredients you always have on hand. These won\'t appear on shopping lists.' },
  { key: 'current', label: 'Current', hint: 'What\'s in your kitchen right now.' },
  { key: 'tools', label: 'Tools', hint: 'Kitchen equipment you have.' },
];

export default function PantryScreen() {
  const [activeTab, setActiveTab] = useState('staples');
  const [inputValue, setInputValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { pantry, addPantryItem, removePantryItem, refreshPantry } = useStore();

  const items = pantry[activeTab] || [];
  const currentTabInfo = TABS.find(t => t.key === activeTab);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPantry();
    setRefreshing(false);
  }, []);

  const handleAdd = async () => {
    const name = inputValue.trim().toLowerCase();
    if (!name) return;
    const category = activeTab === 'staples' ? 'staple' : activeTab === 'tools' ? 'tool' : 'current';
    await addPantryItem(name, category);
    setInputValue('');
  };

  const renderChip = ({ item }) => (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{item.name}</Text>
      <TouchableOpacity onPress={() => removePantryItem(item.id)} hitSlop={8}>
        <X size={14} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <Text style={styles.title}>Pantry</Text>

        <View style={styles.segmentedControl}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.segment, activeTab === tab.key && styles.segmentActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.segmentText, activeTab === tab.key && styles.segmentTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>{currentTabInfo?.hint}</Text>

        <FlatList
          data={items}
          renderItem={renderChip}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.chipRow}
          contentContainerStyle={styles.chipList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`Add ${activeTab === 'tools' ? 'tool' : 'item'}...`}
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]} onPress={handleAdd} disabled={!inputValue.trim()}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary,
    paddingHorizontal: spacing.screenPadding, marginBottom: 12, marginTop: 8,
  },
  segmentedControl: {
    flexDirection: 'row', marginHorizontal: spacing.screenPadding,
    backgroundColor: colors.chipBg, borderRadius: radius.toggle, padding: 3, marginBottom: 8,
  },
  segment: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.toggleActive,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  segmentTextActive: { color: colors.textPrimary },
  hint: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary,
    paddingHorizontal: spacing.screenPadding, marginBottom: 12,
  },
  chipList: { paddingHorizontal: spacing.screenPadding, paddingBottom: 16 },
  chipRow: { gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.chipBg, borderRadius: radius.chip,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  inputRow: {
    flexDirection: 'row', paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.button, paddingHorizontal: 16, paddingVertical: 12,
  },
  addButton: {
    backgroundColor: colors.accent, borderRadius: radius.button,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  addButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },
  addButtonDisabled: { opacity: 0.5 },
});
