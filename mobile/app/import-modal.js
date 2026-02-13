import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, AlertTriangle } from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../lib/theme';
import { useStore } from '../lib/store';
import * as api from '../lib/api';

function detectUrlType(url) {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com/shorts/') || lower.includes('youtu.be/shorts/'))
    return { type: 'short', label: "Shorts aren't supported — try a regular video link" };
  if (lower.includes('youtube.com/live/'))
    return { type: 'live', label: "Live streams aren't supported — try a regular video link" };
  if (lower.includes('youtube.com/@') || lower.includes('youtube.com/channel/') || lower.includes('youtube.com/c/'))
    return { type: 'channel', label: 'Channel detected' };
  if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/'))
    return { type: 'youtube', label: 'YouTube Video detected' };
  if (lower.startsWith('http'))
    return { type: 'url', label: 'Recipe URL detected' };
  return { type: 'unknown', label: '' };
}

export default function ImportModal() {
  const router = useRouter();
  const { sharedUrl } = useLocalSearchParams();
  const [url, setUrl] = useState(sharedUrl || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { userId, importLimit, refreshRecipes, refreshImportLimit, canAccessPro } = useStore();

  const detected = url.length > 10 ? detectUrlType(url) : null;

  const handleImport = async () => {
    if (!url.trim()) return;
    const det = detectUrlType(url);

    if (det.type === 'short' || det.type === 'live') {
      setError(det.label);
      return;
    }
    if (det.type === 'channel') {
      if (!canAccessPro()) {
        setError('Channel import is a Pro feature. Upgrade to unlock bulk imports.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let data;
      if (det.type === 'youtube') {
        data = await api.importYoutube(url.trim(), userId);
      } else {
        data = await api.importRecipeUrl(url.trim(), userId);
      }
      setResult(data);
      await refreshRecipes();
      await refreshImportLimit();
    } catch (e) {
      setError(e.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Import Recipe</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <X size={24} color={colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <TextInput
            style={styles.input}
            placeholder="Paste a YouTube or recipe URL"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {detected && detected.label && !loading && !result && (
            <View style={styles.detected}>
              <Text style={styles.detectedText}>{detected.label}</Text>
            </View>
          )}

          {!result && !loading && (
            <TouchableOpacity
              style={[styles.importButton, !url.trim() && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={!url.trim()}
            >
              <Text style={styles.importButtonText}>Import</Text>
            </TouchableOpacity>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Finding recipe...</Text>
            </View>
          )}

          {result && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Check size={24} color="#fff" strokeWidth={2} />
              </View>
              <Text style={styles.successName}>{result.recipe_name}</Text>
              <Text style={styles.successMeta}>{result.ingredient_count} ingredients</Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                  router.back();
                  setTimeout(() => router.push(`/recipe/${result.recipe_id}`), 100);
                }}
              >
                <Text style={styles.viewButtonText}>View Recipe</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <AlertTriangle size={20} color={colors.accent} strokeWidth={1.5} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.counter}>
            {importLimit.used} of {importLimit.limit} free imports used this month
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.screenPadding, paddingVertical: 16,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.screenPadding, flex: 1 },
  input: {
    fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.button, padding: 16, marginBottom: 12,
  },
  detected: {
    backgroundColor: colors.chipBg, borderRadius: radius.chip,
    paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16,
  },
  detectedText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  importButton: {
    backgroundColor: colors.accent, borderRadius: radius.button,
    paddingVertical: 14, alignItems: 'center',
  },
  importButtonDisabled: { opacity: 0.5 },
  importButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#fff' },
  loadingContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  loadingText: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary },
  successContainer: { alignItems: 'center', marginTop: 32, gap: 8 },
  successIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center',
  },
  successName: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, textAlign: 'center' },
  successMeta: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  viewButton: {
    backgroundColor: colors.accent, borderRadius: radius.button,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  viewButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D4654A15', borderRadius: radius.button,
    padding: 16, marginTop: 16,
  },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: colors.accent, flex: 1 },
  counter: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary,
    textAlign: 'center', marginTop: 24,
  },
});
