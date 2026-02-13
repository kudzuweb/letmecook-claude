import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Check, X, Lightbulb, ExternalLink, Wrench, AlertTriangle, PenLine, Share2 } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import YoutubePlayer from 'react-native-youtube-iframe';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useStore } from '../../lib/store';
import ScreenHeader from '../../components/ScreenHeader';
import * as api from '../../lib/api';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const { userId, recipes, pantry, updateRecipe } = useStore();
  const [recipe, setRecipe] = useState(null);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const found = recipes.find(r => r.recipe_id === id || r.id === id);
    if (found) {
      setRecipe(found);
      setNotes(found.notes || '');
      setRating(found.rating || 0);
    } else {
      api.getRecipe(id).then(setRecipe).catch(() => {});
    }
  }, [id, recipes]);

  if (!recipe) return null;

  const allPantryItems = [
    ...(pantry.staples || []).map(i => i.name.toLowerCase()),
    ...(pantry.current || []).map(i => i.name.toLowerCase()),
  ];
  const userTools = (pantry.tools || []).map(i => i.name.toLowerCase());

  const handleRate = (star) => {
    const newRating = star === rating ? 0 : star;
    setRating(newRating);
    updateRecipe(id, { rating: newRating || null });
  };

  const handleNotesBlur = () => {
    if (notes !== (recipe.notes || '')) {
      updateRecipe(id, { notes: notes || null });
    }
  };

  const videoId = recipe.youtube_url?.match(/[?&]v=([^&]+)/)?.[1];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Recipe" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.recipeName}>{recipe.recipe_name}</Text>

        {recipe.channel_name && (
          <Text style={styles.chefName}>{recipe.channel_name}</Text>
        )}

        <View style={styles.metaBadges}>
          {recipe.servings && <View style={styles.badge}><Text style={styles.badgeText}>Serves {recipe.servings}</Text></View>}
          {recipe.prep_time && <View style={styles.badge}><Text style={styles.badgeText}>{recipe.prep_time} prep</Text></View>}
          {recipe.cook_time && <View style={styles.badge}><Text style={styles.badgeText}>{recipe.cook_time} cook</Text></View>}
        </View>

        {/* Equipment */}
        {recipe.equipment?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment</Text>
            {recipe.equipment.map((eq, i) => {
              const hasIt = userTools.some(t => t.includes(eq.name.toLowerCase()) || eq.name.toLowerCase().includes(t));
              return (
                <View key={i} style={styles.equipmentRow}>
                  {hasIt ? (
                    <Check size={16} color={colors.success} strokeWidth={2} />
                  ) : eq.is_special ? (
                    <AlertTriangle size={16} color={colors.accent} strokeWidth={1.5} />
                  ) : (
                    <X size={16} color={colors.accent} strokeWidth={2} />
                  )}
                  <Text style={styles.equipmentText}>{eq.name}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => handleRate(i)} hitSlop={4}>
                <Star
                  size={28}
                  color={i <= rating ? colors.gold : colors.border}
                  fill={i <= rating ? colors.gold : 'none'}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {(recipe.ingredients || []).map((ing, i) => {
            const norm = (ing.normalized_name || ing.name || '').toLowerCase();
            const onHand = allPantryItems.some(p => p.includes(norm) || norm.includes(p));
            return (
              <View key={i} style={styles.ingredientRow}>
                {onHand ? (
                  <View style={styles.indicatorGreen}><Check size={12} color="#fff" strokeWidth={2} /></View>
                ) : (
                  <View style={styles.indicatorRed}><X size={12} color="#fff" strokeWidth={2} /></View>
                )}
                <Text style={styles.ingredientText}>
                  {ing.quantity ? `${ing.quantity} ${ing.unit || ''} ` : ''}{ing.name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {(recipe.instructions || []).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PenLine size={16} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="How was it? Notes for next time..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* From the Chef */}
        {(videoId || recipe.recipe_url) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From the Chef</Text>
            {videoId && (
              <View style={styles.videoContainer}>
                <YoutubePlayer height={200} videoId={videoId} />
              </View>
            )}
            {recipe.recipe_url && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => Linking.openURL(recipe.recipe_url)}
              >
                <ExternalLink size={16} color={colors.accent} strokeWidth={1.5} />
                <Text style={styles.linkText}>View Recipe Post</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 40 },
  recipeName: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, marginBottom: 4 },
  chefName: { fontFamily: fonts.body, fontSize: 16, color: colors.accent, marginBottom: 12 },
  metaBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  badge: { backgroundColor: colors.chipBg, borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 8 },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  equipmentText: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  indicatorGreen: { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  indicatorRed: { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  ingredientText: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, flex: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.chipBg, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  stepText: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, flex: 1, lineHeight: 22 },
  notesInput: {
    fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.button, padding: 16, minHeight: 80,
  },
  videoContainer: { borderRadius: radius.card, overflow: 'hidden', marginBottom: 12 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  linkText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.accent },
});
