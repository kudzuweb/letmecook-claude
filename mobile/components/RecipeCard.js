import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Star, Check, X, Lightbulb, Plus, Clock, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing, radius, iconSizes } from '../lib/theme';

export default function RecipeCard({ recipe, showAddButton, onAdd, substitutions = [] }) {
  const router = useRouter();
  const coverage = recipe.coverage ?? null;
  const pantryMatched = recipe.matched ?? 0;
  const pantryTotal = recipe.total ?? (recipe.ingredients?.length || 0);
  const rating = recipe.rating || 0;

  const ingredientSub = substitutions.find(
    s => s.type === 'ingredient' && recipe.missing_ingredients?.some(m => m.normalized_name === s.missing)
  );

  const handlePress = () => {
    const id = recipe.recipe_id || recipe.id;
    if (id) router.push(`/recipe/${id}`);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {recipe.image_url && (
        <Image source={{ uri: recipe.image_url }} style={styles.thumbnail} />
      )}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>{recipe.recipe_name}</Text>
          {showAddButton && (
            <TouchableOpacity onPress={onAdd} style={styles.addButton} hitSlop={8}>
              <Plus size={16} color={colors.accent} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {recipe.channel_name && (
          <Text style={styles.chef}>{recipe.channel_name}</Text>
        )}

        <View style={styles.metaRow}>
          {recipe.cook_time && (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.metaText}>{recipe.prep_time || recipe.cook_time}</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaItem}>
              <Users size={12} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.metaText}>Serves {recipe.servings}</Text>
            </View>
          )}
        </View>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              size={14}
              color={i <= rating ? colors.gold : colors.border}
              fill={i <= rating ? colors.gold : 'none'}
              strokeWidth={1.5}
            />
          ))}
        </View>

        {coverage !== null && pantryTotal > 0 && (
          <View style={styles.pantrySection}>
            <View style={styles.pantryBarTrack}>
              <View style={[styles.pantryBarFill, { width: `${coverage * 100}%` }]} />
            </View>
            <Text style={styles.pantryLabel}>{pantryMatched} of {pantryTotal} on hand</Text>
          </View>
        )}

        {ingredientSub && (
          <View style={styles.subHint}>
            <Lightbulb size={iconSizes.chip} color={colors.success} strokeWidth={1.5} />
            <Text style={styles.subText}>Could sub: {ingredientSub.substitute}</Text>
          </View>
        )}

        {recipe.missing_ingredients?.length > 0 && coverage !== null && (
          <Text style={styles.missingText} numberOfLines={1}>
            Need: {recipe.missing_ingredients.map(m => m.name).join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.cardGap,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 100,
  },
  content: {
    padding: spacing.cardPadding,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: colors.chipBg,
    borderRadius: radius.chip,
    padding: 6,
  },
  chef: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.accent,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 8,
  },
  pantrySection: {
    marginTop: 10,
  },
  pantryBarTrack: {
    height: 4,
    backgroundColor: colors.chipBg,
    borderRadius: 2,
  },
  pantryBarFill: {
    height: 4,
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  pantryLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  subHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6B8F7115',
    borderRadius: radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  subText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.success,
  },
  missingText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.accent,
    marginTop: 6,
  },
});
