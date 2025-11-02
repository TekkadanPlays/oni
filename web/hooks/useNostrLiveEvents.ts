// Hook to monitor stream status and publish NIP-53 live events
import { useEffect, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { serverStatusState } from '../components/stores/ClientConfigStore';
import { nostrStreamerProfileAtom } from '../utils/nostr-store';
import { createLiveEventEvent, publishLiveEvent, updateLiveEvent } from '../utils/nostr-live-events';
import { getActiveNostrAccount, getEffectiveRelaysForAccount } from '../utils/nostr-accounts';

let currentLiveEvent: any = null;
let eventUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Hook to automatically publish and update NIP-53 live events when stream goes live
 * Now reads configuration from the active Nostr account
 */
export function useNostrLiveEvents() {
  const serverStatus = useRecoilValue(serverStatusState);
  const streamerProfile = useRecoilValue(nostrStreamerProfileAtom);
  const wasOnlineRef = useRef(false);

  useEffect(() => {
    const { online, viewerCount, streamTitle } = serverStatus;

    // Get active account
    const activeAccount = getActiveNostrAccount();
    
    // Check if streamer is authenticated
    if (!activeAccount && !streamerProfile?.pubkey) {
      return;
    }

    const streamerPubkey = activeAccount?.pubkey || streamerProfile?.pubkey;
    if (!streamerPubkey) {
      return;
    }

    // Check if enabled
    if (!activeAccount?.enabled) {
      // If disabled, end any existing event
      if (currentLiveEvent) {
        const relays = getEffectiveRelaysForAccount(activeAccount);
        endLiveEvent(relays);
        currentLiveEvent = null;
      }
      if (eventUpdateInterval) {
        clearInterval(eventUpdateInterval);
        eventUpdateInterval = null;
      }
      return;
    }

    // Get effective relays for the active account
    const relays = getEffectiveRelaysForAccount(activeAccount);

    // Stream just went online
    if (online && !wasOnlineRef.current) {
      wasOnlineRef.current = true;
      startLiveEvent(streamerPubkey, streamTitle, viewerCount || 0, relays);
    }
    // Stream just went offline
    else if (!online && wasOnlineRef.current) {
      wasOnlineRef.current = false;
      endLiveEvent(relays);
      currentLiveEvent = null;
      if (eventUpdateInterval) {
        clearInterval(eventUpdateInterval);
        eventUpdateInterval = null;
      }
    }
    // Stream is online and needs periodic updates
    else if (online && currentLiveEvent) {
      updateCurrentLiveEvent(streamerPubkey, streamTitle, viewerCount || 0, relays);
    }
  }, [serverStatus, streamerProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventUpdateInterval) {
        clearInterval(eventUpdateInterval);
      }
    };
  }, []);
}

async function startLiveEvent(
  pubkey: string,
  title: string | undefined,
  viewerCount: number,
  relays: string[],
) {
  try {
    const streamUrl = window.location.origin;
    const identifier = `oni-${Date.now()}`;

    const event = await createLiveEventEvent({
      identifier,
      title: title || 'Oni Live Stream',
      status: 'live',
      streamingUrl: `${streamUrl}/hls/stream.m3u8`,
      starts: Math.floor(Date.now() / 1000),
      currentParticipants: viewerCount,
      participants: [
        {
          pubkey,
          role: 'Host',
        },
      ],
      relays,
    });

    if (event) {
      currentLiveEvent = event;
      const published = await publishLiveEvent(event, relays);
      if (published) {
        console.log('Nostr live event published:', event.id);

        // Set up periodic updates
        eventUpdateInterval = setInterval(() => {
          updateCurrentLiveEvent(pubkey, title, viewerCount, relays);
        }, 60000); // Update every minute
      }
    }
  } catch (error) {
    console.error('Error starting live event:', error);
  }
}

async function updateCurrentLiveEvent(
  pubkey: string,
  title: string | undefined,
  viewerCount: number,
  relays: string[],
) {
  if (!currentLiveEvent) {
    return;
  }

  try {
    const updatedEvent = await updateLiveEvent(currentLiveEvent, {
      title: title || 'Oni Live Stream',
      currentParticipants: viewerCount,
      status: 'live',
    });

    if (updatedEvent) {
      currentLiveEvent = updatedEvent;
      await publishLiveEvent(updatedEvent, relays);
    }
  } catch (error) {
    console.error('Error updating live event:', error);
  }
}

async function endLiveEvent(relays: string[]) {
  if (!currentLiveEvent) {
    return;
  }

  try {
    const endedEvent = await updateLiveEvent(currentLiveEvent, {
      status: 'ended',
      ends: Math.floor(Date.now() / 1000),
    });

    if (endedEvent) {
      await publishLiveEvent(endedEvent, relays);
      console.log('Nostr live event ended');
    }
  } catch (error) {
    console.error('Error ending live event:', error);
  }
}

