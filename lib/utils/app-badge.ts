import { Badge } from '@capawesome/capacitor-badge';
import { Capacitor } from '@capacitor/core';

let currentBadgeCount = 0;

/**
 * Updates the native app launcher icon badge count (like Telegram/TikTok)
 * Automatically checks for permissions and handles platform differences.
 */
export async function updateAppBadge(count: number) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    currentBadgeCount = Math.max(0, count);

    // Request permission if not already granted (Android 13+ / iOS)
    const permissions = await Badge.checkPermissions();
    if (permissions.display !== 'granted') {
      const requested = await Badge.requestPermissions();
      if (requested.display !== 'granted') return;
    }

    if (currentBadgeCount > 0) {
      await Badge.set({ count: currentBadgeCount });
    } else {
      await Badge.clear();
    }
  } catch (error) {
    console.warn('[AppBadge] Failed to update native app badge:', error);
  }
}

/**
 * Increments the current badge count by a specific amount
 */
export async function incrementAppBadge(amount = 1) {
  await updateAppBadge(currentBadgeCount + amount);
}

/**
 * Clears the badge entirely
 */
export async function clearAppBadge() {
  await updateAppBadge(0);
}
