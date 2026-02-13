import { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../lib/theme';
import { useStore } from '../../lib/store';
import ScreenHeader from '../../components/ScreenHeader';
import RecipeCard from '../../components/RecipeCard';

export default function ChefScreen() {
  const { id } = useLocalSearchParams();
  const { recipes, userChefs, addFavoriteChef, removeFavoriteChef, refreshChefs } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { refreshChefs(); }, []);

  const chefRecipes = recipes.filter(r => r.channel_id === id);
  const chefName = chefRecipes[0]?.channel_name || 'Chef';
  const chef = userChefs.find(c => c.channel_id === id);
  const isFav = chef?.is_favorite || false;

  const toggleFav = () => {
    if (isFav) removeFavoriteChef(id);
    else addFavoriteChef(id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={chefName}
        rightElement={
          <TouchableOpacity onPress={toggleFav} hitSlop={12}>
            <Heart
              size={24}
              color={colors.accent}
              fill={isFav ? colors.accent : 'none'}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={chefRecipes}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        keyExtractor={item => item.user_recipe_id || item.recipe_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 40 },
});
