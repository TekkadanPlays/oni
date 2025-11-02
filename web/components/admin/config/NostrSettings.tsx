import { Alert, Button, Space, Spin, Card, Avatar, Select, Popconfirm, Tooltip } from 'antd';
import { SwapOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { Typography } from 'antd';
import { ToggleSwitch } from '../ToggleSwitch';
import { RelayTable } from './RelayTable';
import { EventStore } from 'applesauce-core';
import { createAddressLoader } from 'applesauce-loaders/loaders';
import { RelayPool } from 'applesauce-relay';
import { ProfilePointer } from 'nostr-tools/nip19';
import { ProfileContent } from 'applesauce-core/helpers';
import { getDisplayName, getProfilePicture } from 'applesauce-core/helpers';
import {
  isNostrExtensionAvailable,
  createNostrAuthEvent,
} from '../../../utils/nostr';
import { nostrStreamerProfileAtom } from '../../../utils/nostr-store';
import {
  getAllNostrAccounts,
  getActiveNostrAccount,
  setActiveAccount,
  saveNostrAccount,
  removeNostrAccount,
  updateAccountRelays,
  getEffectiveRelaysForAccount,
  migrateOldAccountStorage,
  type NostrAccount,
} from '../../../utils/nostr-accounts';

// Text component removed as it's not used

// Create event store and relay pool for applesauce
const eventStore = new EventStore();
const pool = new RelayPool();

// Create address loader to load user profiles
const addressLoader = createAddressLoader(pool, {
  eventStore,
  lookupRelays: [
    'wss://purplepag.es',
    'wss://indexer.coracle.social',
    'wss://user.kindpag.es',
  ],
});

eventStore.addressableLoader = addressLoader;
eventStore.replaceableLoader = addressLoader;

export type NostrSettingsProps = {
  // These props are now handled internally via multi-account system
  // but kept for backward compatibility with parent component
  enabled?: boolean;
  useDefaultRelays?: boolean;
  customRelays?: string;
  selectedCustomRelays?: string[];
  onEnabledChange?: (value: boolean) => void;
  onUseDefaultRelaysChange?: (value: boolean) => void;
  onCustomRelaysChange?: (value: string) => void;
  onSelectedCustomRelaysChange?: (selectedRelays: string[]) => void;
  effectiveRelays?: string[];
};

export const NostrSettings: FC<NostrSettingsProps> = ({
  enabled: propEnabled,
  useDefaultRelays: propUseDefaultRelays,
  customRelays: propCustomRelays,
  selectedCustomRelays: propSelectedCustomRelays,
  onEnabledChange: propOnEnabledChange,
  onUseDefaultRelaysChange: propOnUseDefaultRelaysChange,
  onCustomRelaysChange: propOnCustomRelaysChange,
  onSelectedCustomRelaysChange: propOnSelectedCustomRelaysChange,
  effectiveRelays: propEffectiveRelays,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamerProfile, setStreamerProfile] = useRecoilState(nostrStreamerProfileAtom);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [activeAccount, setActiveAccountState] = useState<NostrAccount | null>(null);
  const [allAccounts, setAllAccounts] = useState<Record<string, NostrAccount>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Migrate old storage on mount
  useEffect(() => {
    migrateOldAccountStorage();
    refreshAccounts();
  }, []);

  // Refresh accounts list
  const refreshAccounts = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const accounts = getAllNostrAccounts();
    const active = getActiveNostrAccount();
    
    // Force state update
    setAllAccounts({ ...accounts });
    setActiveAccountState(active);
    setRefreshTrigger(prev => prev + 1);
    
    // Debug logging
    console.log('Refreshed accounts:', Object.keys(accounts).length, 'Active:', active?.pubkey?.slice(0, 8));
  }, []);

  // Sync active account state with localStorage
  useEffect(() => {
    const active = getActiveNostrAccount();
    setActiveAccountState(active);
    
    if (active) {
      // Update streamer profile atom
      setStreamerProfile({
        pubkey: active.pubkey,
        profile: undefined,
        displayName: active.displayName || null,
        picture: active.picture || null,
      });
    } else {
      setStreamerProfile(null);
    }
  }, [refreshTrigger, setStreamerProfile]);

  // Get current account values
  const enabled = activeAccount?.enabled ?? propEnabled ?? false;
  const useDefaultRelays = activeAccount?.useDefaultRelays ?? propUseDefaultRelays ?? true;
  const customRelays = activeAccount?.customRelays?.join(', ') ?? propCustomRelays ?? '';
  const selectedCustomRelays = activeAccount?.selectedCustomRelays ?? propSelectedCustomRelays ?? [];
  const effectiveRelays = activeAccount 
    ? getEffectiveRelaysForAccount(activeAccount)
    : propEffectiveRelays ?? [];

  // Create profile pointer for applesauce
  const profilePointer = useMemo<ProfilePointer | null>(() => {
    if (!activeAccount) return null;
    return {
      pubkey: activeAccount.pubkey,
      relays: effectiveRelays.length > 0 ? effectiveRelays : undefined,
    };
  }, [activeAccount?.pubkey, effectiveRelays.join('|')]);

  // Use applesauce to load profile (only on client)
  const [profileContent, setProfileContent] = useState<ProfileContent | undefined>(undefined);
  
  useEffect(() => {
    setExtensionAvailable(isNostrExtensionAvailable());
  }, []);

  useEffect(() => {
    if (!profilePointer) {
      setProfileContent(undefined);
      return;
    }

    // Subscribe directly to the observable to avoid SSR issues
    const profileObservable = eventStore.profile(profilePointer);
    const subscription = profileObservable.subscribe({
      next: (profile) => {
        console.log('Profile loaded:', profile);
        console.log('Lightning address (lud16):', profile?.lud16);
        console.log('Lightning address (lud06):', profile?.lud06);
        setProfileContent(profile);
        // Update account with loaded profile - get current active account
        const currentActiveAccount = getActiveNostrAccount();
        if (currentActiveAccount) {
          const displayName = getDisplayName(profile, currentActiveAccount.pubkey);
          const picture = getProfilePicture(profile);
          
          const updatedAccount: NostrAccount = {
            ...currentActiveAccount,
            displayName,
            picture,
          };
          saveNostrAccount(updatedAccount);
          
          setStreamerProfile({
            pubkey: currentActiveAccount.pubkey,
            profile,
            displayName: displayName || null,
            picture: picture || null,
          });
          
          // Refresh accounts to update state
          refreshAccounts();
        }
        setLoading(false);
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        setProfileContent(undefined);
        setLoading(false);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [profilePointer?.pubkey, profilePointer?.relays?.join('|'), activeAccount?.pubkey]);

  const handleNostrLogin = async () => {
    if (!extensionAvailable) {
      setErrorMessage(
        'Nostr extension not found. Please install a Nostr browser extension (like nos2x, Alby, or others).',
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Create NIP-98 auth event for authorization
      // This will use whatever account is currently active in the extension
      const currentUrl = window.location.href;
      const authResult = await createNostrAuthEvent(currentUrl, 'GET');
      if (!authResult || !authResult.pubkey) {
        setErrorMessage('Failed to create authorization event. Please try again.');
        setLoading(false);
        return;
      }

      // Use the pubkey from the signed event (this is the actual account that signed)
      const pubkey = authResult.pubkey;

      // Check if account already exists in our accounts list
      const currentAccounts = getAllNostrAccounts();
      const existingAccount = currentAccounts[pubkey];
      
      console.log('Adding account:', pubkey.slice(0, 8), 'Existing accounts:', Object.keys(currentAccounts).length);
      
      if (existingAccount) {
        // Account already exists, just switch to it
        console.log('Account exists, switching to it');
        setActiveAccount(pubkey);
        // Force a fresh read after setting
        setTimeout(() => {
          refreshAccounts();
          setLoading(false);
        }, 50);
        return;
      }

      // Create new account
      console.log('Creating new account');
      const newAccount: NostrAccount = {
        pubkey,
        customRelays: [],
        selectedCustomRelays: [],
        useDefaultRelays: true,
        enabled: false,
        addedAt: Date.now(),
      };

      saveNostrAccount(newAccount);
      setActiveAccount(pubkey);
      
      // Force refresh after a brief delay to ensure localStorage is written
      setTimeout(() => {
        refreshAccounts();
        setLoading(true); // Keep loading while profile loads
      }, 50);
    } catch (error) {
      console.error('Error during Nostr login:', error);
      setErrorMessage('Failed to authenticate with Nostr. Please try again.');
      setLoading(false);
    }
  };

  const handleAccountSwitch = async (newPubkey: string) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Verify the extension can sign for this account
      // First check if extension is available
      if (!extensionAvailable) {
        setErrorMessage('Nostr extension not available. Please install a Nostr browser extension.');
        setLoading(false);
        return;
      }

      // Perform NIP-98 auth check when switching accounts
      // This verifies the extension can sign for this account
      const currentUrl = window.location.href;
      const authResult = await createNostrAuthEvent(currentUrl, 'GET');
      if (!authResult || !authResult.pubkey) {
        setErrorMessage('Failed to create authorization event. Please try again.');
        setLoading(false);
        return;
      }

      // Verify the extension's pubkey matches the account we're switching to
      const currentExtensionPubkey = authResult.pubkey;
      if (currentExtensionPubkey !== newPubkey) {
        setErrorMessage(
          `Account mismatch. Your extension is signed in as ${currentExtensionPubkey.slice(0, 8)}... but you're trying to switch to ${newPubkey.slice(0, 8)}... Please sign in with the correct account in your extension first.`
        );
        setLoading(false);
        return;
      }

      setActiveAccount(newPubkey);
      refreshAccounts();
      setLoading(false);
    } catch (error) {
      console.error('Error switching account:', error);
      setErrorMessage('Failed to switch account. Please try again.');
      setLoading(false);
    }
  };

  const handleRemoveAccount = (pubkey: string) => {
    removeNostrAccount(pubkey);
    refreshAccounts();
  };

  const handleEnabledChange = (value: boolean) => {
    if (!activeAccount) return;
    
    updateAccountRelays(activeAccount.pubkey, { enabled: value });
    refreshAccounts();
    
    if (propOnEnabledChange) {
      propOnEnabledChange(value);
    }
  };

  const handleUseDefaultRelaysChange = (value: boolean) => {
    if (!activeAccount) return;
    
    updateAccountRelays(activeAccount.pubkey, { useDefaultRelays: value });
    refreshAccounts();
    
    if (propOnUseDefaultRelaysChange) {
      propOnUseDefaultRelaysChange(value);
    }
  };

  const handleCustomRelaysChange = (value: string) => {
    if (!activeAccount) return;
    
    const relayArray = value.split(',').map(r => r.trim()).filter(Boolean);
    updateAccountRelays(activeAccount.pubkey, { 
      customRelays: relayArray,
      // Remove selected relays that are no longer in the list
      selectedCustomRelays: activeAccount.selectedCustomRelays.filter(url => relayArray.includes(url)),
    });
    refreshAccounts();
    
    if (propOnCustomRelaysChange) {
      propOnCustomRelaysChange(value);
    }
  };

  const handleSelectedCustomRelaysChange = (selectedRelays: string[]) => {
    if (!activeAccount) return;
    
    updateAccountRelays(activeAccount.pubkey, { selectedCustomRelays: selectedRelays });
    refreshAccounts();
    
    if (propOnSelectedCustomRelaysChange) {
      propOnSelectedCustomRelaysChange(selectedRelays);
    }
  };

  // Calculate account list from current state - use useMemo to ensure it updates
  const accountList = useMemo(() => {
    const accounts = Object.values(allAccounts);
    console.log('Computing accountList:', accounts.length, 'accounts');
    return accounts;
  }, [allAccounts]);
  
  const authenticated = !!activeAccount;
  
  // Debug: Log account list changes
  useEffect(() => {
    console.log('Account list state:', accountList.length, 'accounts', accountList.map(a => a.pubkey.slice(0, 8)));
    console.log('Active account:', activeAccount?.pubkey?.slice(0, 8));
    console.log('Should show switcher:', accountList.length > 1);
  }, [accountList.length, activeAccount?.pubkey]);

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {!authenticated && (
          <Alert
            message="You must sign in with Nostr to enable live event broadcasting."
            type="info"
            showIcon
          />
        )}

        {/* Active Account Card */}
        {activeAccount && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text strong>Active Profile</Typography.Text>
                <Space>
                  {accountList.length > 1 ? (
                    <Tooltip title="Switch Account">
                      <Select
                        value={activeAccount.pubkey}
                        onChange={handleAccountSwitch}
                        style={{ minWidth: 250 }}
                        placeholder="Select account"
                        suffixIcon={<SwapOutlined />}
                      >
                        {accountList.map((account) => (
                          <Select.Option key={account.pubkey} value={account.pubkey}>
                            <Space>
                              {account.picture && <Avatar src={account.picture} size="small" />}
                              <span>
                                {account.displayName || account.pubkey.slice(0, 16) + '...'}
                              </span>
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Add Another Account">
                    <Button
                      type="dashed"
                      icon={<UserAddOutlined />}
                      onClick={handleNostrLogin}
                      disabled={!extensionAvailable}
                    >
                      Add Account
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Remove this account?"
                    onConfirm={() => handleRemoveAccount(activeAccount.pubkey)}
                    okText="Remove"
                    cancelText="Cancel"
                  >
                    <Tooltip title="Remove Account">
                      <Button danger icon={<DeleteOutlined />} size="middle" />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </div>
              
              <Space size="middle" style={{ width: '100%' }}>
                {(activeAccount.picture || streamerProfile?.picture) && (
                  <Avatar 
                    src={activeAccount.picture || streamerProfile?.picture} 
                    size={64} 
                  />
                )}
                <div style={{ flex: 1 }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {activeAccount.displayName || streamerProfile?.displayName || 'Nostr User'}
                  </Typography.Title>
                  <Typography.Text type="secondary" code style={{ display: 'block', marginTop: '4px' }}>
                    {activeAccount.pubkey.slice(0, 16)}...{activeAccount.pubkey.slice(-8)}
                  </Typography.Text>
                  {(profileContent?.lud16 || profileContent?.lud06 || streamerProfile?.profile?.lud16 || streamerProfile?.profile?.lud06) && (
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: '4px' }}>
                      ⚡ {profileContent?.lud16 || profileContent?.lud06 || streamerProfile?.profile?.lud16 || streamerProfile?.profile?.lud06}
                    </Typography.Text>
                  )}
                </div>
              </Space>
            </Space>
          </Card>
        )}

        {!authenticated ? (
          <Button
            type="primary"
            onClick={handleNostrLogin}
            disabled={!extensionAvailable}
            style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6', width: '100%' }}
          >
            {extensionAvailable
              ? 'Sign in with Nostr extension'
              : 'Nostr extension not available'}
          </Button>
        ) : (
          <>
            {errorMessage && <Alert message="Error" description={errorMessage} type="error" showIcon />}

            <ToggleSwitch
              fieldName="nostrLiveEventsEnabled"
              onChange={handleEnabledChange}
              checked={enabled}
              label="Enable Nostr Live Events"
              tip="Broadcast live streaming events to Nostr relays"
            />

            <ToggleSwitch
              fieldName="nostrUseDefaultRelays"
              onChange={handleUseDefaultRelaysChange}
              checked={useDefaultRelays}
              label="Use default broadcast relays"
              tip="Use recommended Nostr relays for broadcasting"
            />

            <div>
              <Typography.Title level={5} style={{ marginBottom: '12px' }}>
                Custom Relays
              </Typography.Title>
              <RelayTable
                relays={customRelays ? customRelays.split(',').map(r => r.trim()).filter(Boolean) : []}
                selectedRelays={selectedCustomRelays}
                onChange={(relayUrls) => {
                  handleCustomRelaysChange(relayUrls.join(', '));
                }}
                onSelectionChange={(selectedRelayUrls) => {
                  handleSelectedCustomRelaysChange(selectedRelayUrls);
                }}
              />
            </div>
          </>
        )}
      </Space>
    </Spin>
  );
};

