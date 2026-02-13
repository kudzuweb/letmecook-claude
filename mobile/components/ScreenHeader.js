import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing } from '../lib/theme';

export default function ScreenHeader({ title, rightElement }) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.5} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightElement || <View style={{ width: 24 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    gap: 12,
  },
  back: { padding: 4 },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    flex: 1,
  },
});
