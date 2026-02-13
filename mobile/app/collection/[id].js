import { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '../../lib/theme';
import { useStore } from '../../lib/store';
import ScreenHeader from '../../components/ScreenHeader';
import RecipeCard from '../../components/RecipeCard';
import EmptyState from '../../components/EmptyState';
import * as api from '../../lib/api';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams();
  const { userId, collections } = useStore();
  const [recipes, setRecipes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const collection = collections.find(c => c.id === id);
  const title = collection?.name || 'Collection';

  const loadRecipes = useCallback(async () => {
    try {
      const data = await api.getCollectionRecipes(userId, id);
      setRecipes(data.recipes || []);
    } catch {}
  }, [userId, id]);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }, [loadRecipes]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={title} />
      {recipes.length === 0 ? (
        <EmptyState message="No recipes in this collection yet" />
      ) : (
        <FlatList
          data={recipes}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          keyExtractor={item => item.user_recipe_id || item.recipe_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 40 },
});
