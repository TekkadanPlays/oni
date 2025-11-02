// Multi-account Nostr management utilities
// Stores multiple Nostr accounts with per-account relay configurations

export interface NostrAccount {
  pubkey: string;
  displayName?: string;
  picture?: string;
  // Per-account relay configuration
  customRelays: string[]; // List of all available custom relays
  selectedCustomRelays: string[]; // Which custom relays are selected for use
  useDefaultRelays: boolean;
  enabled: boolean;
  // Timestamp when account was added
  addedAt: number;
}

export interface NostrAccountsData {
  accounts: Record<string, NostrAccount>; // Keyed by pubkey
  activeAccountPubkey: string | null;
}

const STORAGE_KEY = 'nostrAccounts';
const STORAGE_KEY_ACTIVE = 'nostrActiveAccount';

/**
 * Get all stored Nostr accounts
 */
export function getAllNostrAccounts(): Record<string, NostrAccount> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const data: NostrAccountsData = JSON.parse(stored);
    const accounts = data.accounts || {};
    console.log('Loaded accounts from storage:', Object.keys(accounts).length, 'accounts');
    return accounts;
  } catch (error) {
    console.error('Error loading Nostr accounts:', error);
    return {};
  }
}

/**
 * Get a specific account by pubkey
 */
export function getNostrAccount(pubkey: string): NostrAccount | null {
  const accounts = getAllNostrAccounts();
  return accounts[pubkey] || null;
}

/**
 * Get the currently active account
 */
export function getActiveNostrAccount(): NostrAccount | null {
  const activePubkey = getActiveAccountPubkey();
  if (!activePubkey) {
    return null;
  }
  return getNostrAccount(activePubkey);
}

/**
 * Get the active account pubkey
 */
export function getActiveAccountPubkey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE);
  } catch (error) {
    console.error('Error loading active account:', error);
    return null;
  }
}

/**
 * Save a Nostr account
 */
export function saveNostrAccount(account: NostrAccount): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const accounts = getAllNostrAccounts();
    accounts[account.pubkey] = account;

    const activePubkey = getActiveAccountPubkey();
    const data: NostrAccountsData = {
      accounts,
      activeAccountPubkey: activePubkey,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('Saved account:', account.pubkey.slice(0, 8), 'Total accounts:', Object.keys(accounts).length);
  } catch (error) {
    console.error('Error saving Nostr account:', error);
  }
}

/**
 * Set the active account
 */
export function setActiveAccount(pubkey: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (pubkey) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, pubkey);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  } catch (error) {
    console.error('Error setting active account:', error);
  }
}

/**
 * Remove an account
 */
export function removeNostrAccount(pubkey: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const accounts = getAllNostrAccounts();
    delete accounts[pubkey];

    const data: NostrAccountsData = {
      accounts,
      activeAccountPubkey: getActiveAccountPubkey(),
    };

    // If the removed account was active, clear active account
    if (getActiveAccountPubkey() === pubkey) {
      setActiveAccount(null);
      data.activeAccountPubkey = null;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error removing Nostr account:', error);
  }
}

/**
 * Update account relay configuration
 */
export function updateAccountRelays(
  pubkey: string,
  updates: {
    customRelays?: string[];
    selectedCustomRelays?: string[];
    useDefaultRelays?: boolean;
    enabled?: boolean;
  },
): void {
  const account = getNostrAccount(pubkey);
  if (!account) {
    return;
  }

  const updatedAccount: NostrAccount = {
    ...account,
    ...updates,
  };

  saveNostrAccount(updatedAccount);
}

/**
 * Get effective relays for an account (combines default and custom)
 */
export function getEffectiveRelaysForAccount(account: NostrAccount | null): string[] {
  if (!account) {
    return [];
  }

  const relays: string[] = [];

  if (account.useDefaultRelays) {
    relays.push(
      'wss://purplepag.es',
      'wss://indexer.coracle.social',
      'wss://user.kindpag.es',
    );
  }

  if (account.selectedCustomRelays && account.selectedCustomRelays.length > 0) {
    relays.push(...account.selectedCustomRelays);
  }

  // Remove duplicates
  return [...new Set(relays)];
}

/**
 * Migrate old single-account storage to new multi-account format
 */
export function migrateOldAccountStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Check if old storage exists
    const oldPubkey = localStorage.getItem('nostrPubkey');
    const oldCustomRelays = localStorage.getItem('nostrCustomRelays');
    const oldSelectedRelays = localStorage.getItem('nostrSelectedCustomRelays');

    if (!oldPubkey) {
      return; // No old account to migrate
    }

    // Check if this account already exists in new format
    const existingAccount = getNostrAccount(oldPubkey);
    if (existingAccount) {
      // Already migrated, clean up old storage
      localStorage.removeItem('nostrPubkey');
      localStorage.removeItem('nostrCustomRelays');
      localStorage.removeItem('nostrSelectedCustomRelays');
      return;
    }

    // Create account from old storage
    const customRelays = oldCustomRelays
      ? oldCustomRelays.split(',').map(r => r.trim()).filter(Boolean)
      : [];

    const selectedCustomRelays = oldSelectedRelays
      ? JSON.parse(oldSelectedRelays)
      : [];

    const account: NostrAccount = {
      pubkey: oldPubkey,
      customRelays,
      selectedCustomRelays,
      useDefaultRelays: true, // Default behavior
      enabled: false,
      addedAt: Date.now(),
    };

    saveNostrAccount(account);
    setActiveAccount(oldPubkey);

    // Clean up old storage
    localStorage.removeItem('nostrPubkey');
    localStorage.removeItem('nostrCustomRelays');
    localStorage.removeItem('nostrSelectedCustomRelays');
  } catch (error) {
    console.error('Error migrating old account storage:', error);
  }
}

