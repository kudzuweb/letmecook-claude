import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Folder } from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useStore } from '../../lib/store';
import RecipeCard from '../../components/RecipeCard';
import EmptyState from '../../components/EmptyState';

export default function RecipesScreen() {
  const router = useRouter();
  const [view, setView] = useState('library');
  const [refreshing, setRefreshing] = useState(false);
  const { recipes, collections, matches, refreshRecipes, refreshMatches, refreshCollections } = useStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshRecipes(), refreshCollections(), refreshMatches()]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (view === 'cook') refreshMatches();
  }, [view]);

  const renderCollectionCard = ({ item }) => (
    <TouchableOpacity
      style={styles.collectionCard}
      onPress={() => {
        if (item.id === 'all_recipes' || item.id === 'loose_recipes') {
          router.push(`/collection/${item.id}`);
        } else {
          router.push(`/collection/${item.id}`);
        }
      }}
    >
      <View style={styles.collectionThumbGrid}>
        {(item.thumbnails || []).slice(0, 4).map((url, i) => (
          <View key={i} style={styles.collectionThumb}>
            {url ? (
              <Image source={{ uri: url }} style={styles.thumbPlaceholder} />
            ) : (
              <View style={[styles.thumbPlaceholder, { backgroundColor: colors.chipBg }]} />
            )}
          </View>
        ))}
        {(!item.thumbnails || item.thumbnails.length === 0) && (
          <View style={styles.collectionEmptyThumb}>
            <Folder size={24} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
        )}
      </View>
      <Text style={styles.collectionName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.collectionCount}>{item.recipe_count} recipes</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggle, view === 'library' && styles.toggleActive]}
          onPress={() => setView('library')}
        >
          <Text style={[styles.toggleText, view === 'library' && styles.toggleTextActive]}>My Library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, view === 'cook' && styles.toggleActive]}
          onPress={() => setView('cook')}
        >
          <Text style={[styles.toggleText, view === 'cook' && styles.toggleTextActive]}>What Can I Make?</Text>
        </TouchableOpacity>
      </View>

      {view === 'library' ? (
        recipes.length === 0 ? (
          <EmptyState
            message="Import your first recipe"
            actionLabel="Import"
            onAction={() => router.push('/import-modal')}
          />
        ) : (
          <FlatList
            data={collections}
            renderItem={renderCollectionCard}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.collectionRow}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          />
        )
      ) : (
        matches.length === 0 ? (
          <EmptyState
            message={recipes.length === 0
              ? "Import recipes to see what you can cook"
              : "Add items to your pantry to see what you can make"
            }
          />
        ) : (
          <FlatList
            data={matches}
            renderItem={({ item }) => <RecipeCard recipe={item} />}
            keyExtractor={item => item.recipe_id || item.user_recipe_id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          />
        )
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/import-modal')}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toggleRow: {
    flexDirection: 'row', marginHorizontal: spacing.screenPadding,
    backgroundColor: colors.chipBg, borderRadius: radius.toggle, padding: 3, marginBottom: 12, marginTop: 8,
  },
  toggle: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.toggleActive,
  },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  toggleTextActive: { color: colors.textPrimary },
  listContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 80 },
  collectionRow: { gap: spacing.cardGap },
  collectionCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.surfaceBorder, padding: 12, marginBottom: spacing.cardGap,
  },
  collectionThumbGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8,
    height: 60, overflow: 'hidden',
  },
  collectionThumb: { width: '48%', height: 28, borderRadius: 4, overflow: 'hidden' },
  thumbPlaceholder: { flex: 1, borderRadius: 4 },
  collectionEmptyThumb: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  collectionName: { fontFamily: fonts.display, fontSize: 15, color: colors.textPrimary },
  collectionCount: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.screenPadding,
    width: 56, height: 56, borderRadius: radius.fab,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 4,
  },
});
