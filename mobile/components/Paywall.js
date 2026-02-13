import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Check, Zap } from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../lib/theme';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/purchases';
import { useStore } from '../lib/store';

const PRO_FEATURES = [
  'Unlimited recipe imports',
  'Bulk import (playlists & channels)',
  'Up to 10 saved shopping lists',
  'Instacart integration (coming soon)',
];

export default function Paywall({ onClose }) {
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(false);
  const refreshProStatus = useStore(s => s.refreshProStatus);

  useEffect(() => {
    getOfferings().then(setOfferings).catch(() => {});
  }, []);

  const handlePurchase = async (pkg) => {
    setLoading(true);
    try {
      const isPro = await purchasePackage(pkg);
      if (isPro) {
        await refreshProStatus?.();
        onClose?.();
      }
    } catch {}
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const isPro = await restorePurchases();
      if (isPro) {
        await refreshProStatus?.();
        onClose?.();
      }
    } catch {}
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
        <X size={24} color={colors.textPrimary} strokeWidth={1.5} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconBg}>
          <Zap size={28} color="#fff" strokeWidth={2} />
        </View>
        <Text style={styles.title}>Upgrade to Pro</Text>
      </View>

      <View style={styles.featureList}>
        {PRO_FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={18} color={colors.success} strokeWidth={2} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.packages}>
          {offerings?.monthly && (
            <TouchableOpacity
              style={styles.packageButton}
              onPress={() => handlePurchase(offerings.monthly)}
            >
              <Text style={styles.packagePrice}>
                {offerings.monthly.product?.priceString || '$4.99'}/month
              </Text>
            </TouchableOpacity>
          )}
          {offerings?.annual && (
            <TouchableOpacity
              style={[styles.packageButton, styles.packageButtonPrimary]}
              onPress={() => handlePurchase(offerings.annual)}
            >
              <Text style={[styles.packagePrice, styles.packagePricePrimary]}>
                {offerings.annual.product?.priceString || '$29.99'}/year
              </Text>
              <Text style={styles.savingsText}>Save 50%</Text>
            </TouchableOpacity>
          )}
          {!offerings && (
            <>
              <TouchableOpacity style={styles.packageButton}>
                <Text style={styles.packagePrice}>$4.99/month</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.packageButton, styles.packageButtonPrimary]}>
                <Text style={[styles.packagePrice, styles.packagePricePrimary]}>$29.99/year</Text>
                <Text style={styles.savingsText}>Save 50%</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.screenPadding, paddingTop: 16, paddingBottom: 40,
  },
  closeButton: { alignSelf: 'flex-end', padding: 4 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconBg: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary },
  featureList: { gap: 12, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary },
  packages: { gap: 12 },
  packageButton: {
    borderWidth: 2, borderColor: colors.border, borderRadius: radius.button,
    paddingVertical: 16, alignItems: 'center',
  },
  packageButtonPrimary: { borderColor: colors.accent, backgroundColor: colors.accent },
  packagePrice: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  packagePricePrimary: { color: '#fff' },
  savingsText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#fff', marginTop: 2 },
  restoreButton: { alignSelf: 'center', marginTop: 16, padding: 8 },
  restoreText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },
});
