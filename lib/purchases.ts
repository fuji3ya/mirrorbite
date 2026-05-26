/**
 * Mirrorbite — RevenueCat client wrapper
 *
 * Day 5-7 ship では mock entitlement、Day 6 で実 RevenueCat key を入れて本番化。
 * spec: pricing-matrix-regional.md §5 (Superwall + RevenueCat 課金導線)
 */

import Purchases, { LOG_LEVEL, type PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storage-keys';

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS;
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID;
// Must match RC dashboard entitlement lookup_key.
// RC project proj1294e27b: entitlement `pro` (entld1a244dd2f) — attached to mb_weekly_v1 + mb_annual_v1.
const ENTITLEMENT_ID = 'pro';

let initialized = false;

export async function initPurchases(userId?: string): Promise<void> {
  if (initialized) return;
  const key = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!key) {
    console.warn('RC key missing — mock entitlement mode');
    initialized = true;
    return;
  }
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey: key, appUserID: userId });
  initialized = true;
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!initialized || !RC_API_KEY_IOS) return null;
  const o = await Purchases.getOfferings();
  return o.current ?? null;
}

/**
 * Get localized price strings for the paywall UI.
 * Returns RC priceString when configured (locale-aware), else USD fallback.
 * Apple HIG: prices on paywall must reflect storefront currency exactly.
 *
 * Pricing aligned with Mau Lazymaxxers Prayer Lock pattern (2026-05-20):
 *   weekly $6.99 / yearly $39.99 (Save 89% anchor).
 */
export async function getPlanPrices(): Promise<{ annual: string; weekly: string }> {
  const fallback = { annual: '$39.99 / year', weekly: '$6.99 / week' };
  if (!RC_API_KEY_IOS) return fallback;
  try {
    const offering = await getOfferings();
    const packages = offering?.availablePackages ?? [];
    const ann = packages.find((p) => p.product.identifier === 'mb_annual_v1');
    const wee = packages.find((p) => p.product.identifier === 'mb_weekly_v1');
    return {
      annual: ann?.product.priceString ? `${ann.product.priceString} / year` : fallback.annual,
      weekly: wee?.product.priceString ? `${wee.product.priceString} / week` : fallback.weekly,
    };
  } catch {
    return fallback;
  }
}

export async function purchasePlan(planId: 'annual' | 'weekly'): Promise<boolean> {
  // Mock path — Day 5-7 ship 前は ALWAYS succeed for testing UX
  if (!RC_API_KEY_IOS) {
    await AsyncStorage.setItem(StorageKeys.ENTITLEMENT_ACTIVE, '1');
    return true;
  }
  try {
    const offering = await getOfferings();
    const packages = offering?.availablePackages ?? [];
    const productId = planId === 'annual' ? 'mb_annual_v1' : 'mb_weekly_v1';
    const pkg = packages.find((p) => p.product.identifier === productId);
    if (!pkg) throw new Error(`package_${productId}_not_found`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
    if (active) await AsyncStorage.setItem(StorageKeys.ENTITLEMENT_ACTIVE, '1');
    return active;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    console.warn('purchase failed', e);
    return false;
  }
}

export async function isPro(): Promise<boolean> {
  // Mock fallback when RC not configured
  if (!RC_API_KEY_IOS) {
    return (await AsyncStorage.getItem(StorageKeys.ENTITLEMENT_ACTIVE)) === '1';
  }
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!RC_API_KEY_IOS) return isPro();
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  } catch {
    return false;
  }
}
