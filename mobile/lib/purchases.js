import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { config } from './config';

let initialized = false;

export async function initPurchases(userId) {
  if (initialized) return;
  const apiKey = Platform.OS === 'ios'
    ? config.revenueCatApiKeyIos
    : config.revenueCatApiKeyAndroid;
  if (!apiKey) return;
  Purchases.configure({ apiKey, appUserID: userId });
  initialized = true;
}

export async function checkSubscription() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active['pro'] !== undefined;
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active['pro'] !== undefined;
}
