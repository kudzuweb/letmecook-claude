import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, Plus, Youtube } from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../lib/theme';
import { useStore } from '../lib/store';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setIsJudge, initialize } = useStore();

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('onboardingDone', 'true');
    await initialize();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>PantryPal</Text>
        <Text style={styles.subtitle}>Turn saved recipes into real meals</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={finishOnboarding}
          >
            <View style={[styles.iconBg, { backgroundColor: '#6B8F7120' }]}>
              <BookOpen size={24} color={colors.success} strokeWidth={1.5} />
            </View>
            <Text style={styles.actionTitle}>Browse Eitan's Recipes</Text>
            <Text style={styles.actionDesc}>Explore pre-loaded recipes and add to your library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={async () => {
              await finishOnboarding();
              setTimeout(() => router.push('/import-modal'), 300);
            }}
          >
            <View style={[styles.iconBg, { backgroundColor: '#D4654A20' }]}>
              <Plus size={24} color={colors.accent} strokeWidth={1.5} />
            </View>
            <Text style={styles.actionTitle}>Import Your Own</Text>
            <Text style={styles.actionDesc}>Paste a YouTube or recipe URL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={finishOnboarding}
          >
            <View style={[styles.iconBg, { backgroundColor: '#D4A84A20' }]}>
              <Youtube size={24} color={colors.gold} strokeWidth={1.5} />
            </View>
            <Text style={styles.actionTitle}>Connect YouTube</Text>
            <Text style={styles.actionDesc}>Import playlists and subscriptions</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.judgeLink}
          onPress={async () => {
            await setIsJudge(true);
            await finishOnboarding();
          }}
        >
          <Text style={styles.judgeLinkText}>
            Hackathon judge? Tap here to bypass paywall
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1, paddingHorizontal: spacing.screenPadding,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display, fontSize: 40, color: colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body, fontSize: 18, color: colors.textSecondary,
    textAlign: 'center', marginBottom: 40,
  },
  actions: { gap: 12 },
  actionCard: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.cardPadding,
  },
  iconBg: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  actionTitle: {
    fontFamily: fonts.display, fontSize: 17, color: colors.textPrimary, marginBottom: 4,
  },
  actionDesc: {
    fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary,
  },
  judgeLink: {
    marginTop: 32, alignSelf: 'center', padding: 8,
  },
  judgeLinkText: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
