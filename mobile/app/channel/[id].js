import { useState, useEffect, useCallback } from 'react';
import { FlatList, Text, StyleSheet, RefreshControl, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, fonts, spacing } from '../../lib/theme';
import { useStore } from '../../lib/store';
import ScreenHeader from '../../components/ScreenHeader';
import RecipeCard from '../../components/RecipeCard';
import * as api from '../../lib/api';

export default function ChannelBrowseScreen() {
  const { id } = useLocalSearchParams();
  const { userId, recipes: userRecipes, refreshRecipes } = useStore();
  const [channelRecipes, setChannelRecipes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await api.getRecipes({ channel_id: id, limit: 100 });
      setChannelRecipes(data.recipes || []);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const userRecipeIds = new Set(userRecipes.map(r => r.recipe_id));

  const handleAdd = async (recipeId) => {
    try {
      await api.addUserRecipe(userId, recipeId);
      await refreshRecipes();
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Browse Recipes" />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
      <>
      <Text style={styles.count}>{channelRecipes.length} recipes</Text>
      <FlatList
        data={channelRecipes}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            showAddButton={!userRecipeIds.has(item.id)}
            onAdd={() => handleAdd(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} />}
      />
      </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  count: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, paddingHorizontal: spacing.screenPadding, marginBottom: 8 },
  listContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 40 },
});
