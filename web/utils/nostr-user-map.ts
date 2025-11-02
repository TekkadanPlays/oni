// Client-side mapping of Oni user IDs to Nostr pubkeys
// This is temporary until we have backend support

const USER_PUBKEY_MAP_KEY = 'nostrUserPubkeyMap';

export interface UserPubkeyMap {
  [userId: string]: string; // userId -> pubkey
}

/**
 * Store the mapping of a user ID to their Nostr pubkey
 */
export function setUserPubkey(userId: string, pubkey: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const map = getUserPubkeyMap();
    map[userId] = pubkey;
    localStorage.setItem(USER_PUBKEY_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error storing user pubkey mapping:', error);
  }
}

/**
 * Get the Nostr pubkey for a user ID
 */
export function getUserPubkey(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const map = getUserPubkeyMap();
    return map[userId] || null;
  } catch (error) {
    console.error('Error getting user pubkey:', error);
    return null;
  }
}

/**
 * Get all user pubkey mappings
 */
export function getUserPubkeyMap(): UserPubkeyMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(USER_PUBKEY_MAP_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading user pubkey map:', error);
    return {};
  }
}

/**
 * Remove a user's pubkey mapping
 */
export function removeUserPubkey(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const map = getUserPubkeyMap();
    delete map[userId];
    localStorage.setItem(USER_PUBKEY_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error removing user pubkey mapping:', error);
  }
}

