/* eslint-disable react/no-unescaped-entities */
import React, { ReactElement, useCallback } from 'react';
import { Typography } from 'antd';
import { NostrSettings } from '../../components/admin/config/NostrSettings';
import { useNostrLiveEvents } from '../../hooks/useNostrLiveEvents';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { getActiveNostrAccount, getEffectiveRelaysForAccount } from '../../utils/nostr-accounts';

const { Title } = Typography;

export default function ConfigNostr() {
  // Get effective relays from active account
  const getEffectiveRelays = useCallback(() => {
    const activeAccount = getActiveNostrAccount();
    if (!activeAccount) {
      return [];
    }
    return getEffectiveRelaysForAccount(activeAccount);
  }, []);

  // Hook to automatically publish NIP-53 live events
  // The hook now reads from the active account internally
  useNostrLiveEvents();

  return (
    <div>
      <Title>Configure Nostr Integration</Title>
      <p>
        Connect your Oni stream to Nostr to automatically broadcast live events when you go live.
      </p>
      <p>
        You can add multiple Nostr accounts and switch between them. Each account maintains its own relay configuration.
      </p>
      <p>
        <a href="https://github.com/vitorpamplona/nips/blob/master/53.md" rel="noopener noreferrer" target="_blank">
          Learn more about NIP-53 live events.
        </a>
      </p>
      <div style={{ marginTop: '24px' }}>
        <NostrSettings />
      </div>
    </div>
  );
}

ConfigNostr.getLayout = function getLayout(page: ReactElement) {
  return <AdminLayout page={page} />;
};

