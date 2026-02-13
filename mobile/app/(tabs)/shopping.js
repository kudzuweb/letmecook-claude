import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Share2, ShoppingCart, Trash2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';

export default function ShoppingScreen() {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([]);
  const [generatedList, setGeneratedList] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const { userId, recipes, savedLists, refreshSavedLists } = useStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSavedLists();
    setRefreshing(false);
  }, []);

  const toggleRecipe = (id) => {
    setSelectedRecipeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const generateList = async () => {
    if (selectedRecipeIds.length === 0) return;
    try {
      const data = await api.generateShoppingList(userId, selectedRecipeIds);
      setGeneratedList(data.items);
      setCheckedItems({});
    } catch {}
  };

  const toggleCheck = (name) => {
    setCheckedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const exportList = async () => {
    if (!generatedList) return;
    let text = 'Shopping List\n\n';
    for (const cat of generatedList) {
      text += `${cat.category.toUpperCase()}\n`;
      for (const ing of cat.ingredients) {
        const check = checkedItems[ing.name] ? '[x]' : '[ ]';
        text += `${check} ${ing.quantity ? ing.quantity + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}\n`;
      }
      text += '\n';
    }
    try {
      await Sharing.shareAsync('data:text/plain,' + encodeURIComponent(text), { mimeType: 'text/plain' });
    } catch {}
  };

  const saveList = async () => {
    if (!generatedList) return;
    try {
      await api.saveShoppingList(userId, 'Shopping List', selectedRecipeIds, generatedList);
      await refreshSavedLists();
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.title}>Shopping Lists</Text>

        <Text style={styles.sectionLabel}>Select Recipes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipeChips}>
          {recipes.map(r => {
            const id = r.recipe_id || r.id;
            const selected = selectedRecipeIds.includes(id);
            return (
              <TouchableOpacity
                key={id}
                style={[styles.recipeChip, selected && styles.recipeChipSelected]}
                onPress={() => toggleRecipe(id)}
              >
                <Text style={[styles.recipeChipText, selected && styles.recipeChipTextSelected]} numberOfLines={1}>
                  {r.recipe_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.generateButton} onPress={generateList} disabled={selectedRecipeIds.length === 0}>
          <ShoppingCart size={18} color="#fff" strokeWidth={1.5} />
          <Text style={styles.generateButtonText}>Generate List</Text>
        </TouchableOpacity>

        {generatedList && (
          <View style={styles.generatedSection}>
            {generatedList.map(cat => (
              <View key={cat.category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{cat.category}</Text>
                {cat.ingredients.map(ing => (
                  <TouchableOpacity
                    key={ing.name}
                    style={styles.ingredientRow}
                    onPress={() => toggleCheck(ing.name)}
                  >
                    <View style={[styles.checkbox, checkedItems[ing.name] && styles.checkboxChecked]}>
                      {checkedItems[ing.name] && <Check size={12} color="#fff" strokeWidth={2} />}
                    </View>
                    <Text style={[styles.ingredientText, checkedItems[ing.name] && styles.ingredientChecked]}>
                      {ing.quantity ? `${ing.quantity} ${ing.unit || ''} ` : ''}{ing.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={saveList}>
                <Text style={styles.actionButtonText}>Save List</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={exportList}>
                <Share2 size={16} color={colors.accent} strokeWidth={1.5} />
                <Text style={styles.actionButtonSecondaryText}>Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {savedLists.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.sectionLabel}>Saved Lists</Text>
            {savedLists.map(list => (
              <View key={list.id} style={styles.savedCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedName}>{list.name}</Text>
                  <Text style={styles.savedMeta}>
                    {(list.items || []).reduce((sum, cat) => sum + (cat.ingredients?.length || 0), 0)} items
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await api.deleteShoppingList(userId, list.id);
                    await refreshSavedLists();
                  }}
                  hitSlop={8}
                >
                  <Trash2 size={18} color={colors.textSecondary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 40 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, marginBottom: 16, marginTop: 8 },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  recipeChips: { flexGrow: 0, marginBottom: 16 },
  recipeChip: {
    backgroundColor: colors.chipBg, borderRadius: radius.chip,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxWidth: 160,
  },
  recipeChipSelected: { backgroundColor: colors.accent },
  recipeChipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  recipeChipTextSelected: { color: '#fff' },
  generateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 14, marginBottom: 16,
  },
  generateButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#fff' },
  generatedSection: { marginBottom: 24 },
  categorySection: { marginBottom: 16 },
  categoryTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: 8, textTransform: 'capitalize' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  ingredientText: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, flex: 1 },
  ingredientChecked: { textDecorationLine: 'line-through', color: colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 12, alignItems: 'center' },
  actionButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },
  actionButtonSecondary: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radius.button, paddingVertical: 12, alignItems: 'center',
  },
  actionButtonSecondaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
  savedSection: { marginTop: 8 },
  savedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.surfaceBorder, padding: 16, marginBottom: 8,
  },
  savedName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  savedMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
