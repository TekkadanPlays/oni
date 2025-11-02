// NIP-53 Live Event Broadcasting utilities
import { getNostrPublicKey } from './nostr';

// NIP-53: kind 30311 for Live Events
const LIVE_EVENT_KIND = 30311;

export interface LiveEventConfig {
  title?: string;
  summary?: string;
  image?: string;
  streamingUrl?: string;
  recordingUrl?: string;
  starts?: number; // Unix timestamp
  ends?: number; // Unix timestamp
  status: 'planned' | 'live' | 'ended';
  currentParticipants?: number;
  totalParticipants?: number;
  tags?: string[]; // Hashtags
  relays?: string[];
  participants?: Array<{
    pubkey: string;
    relay?: string;
    role: string; // 'Host', 'Speaker', 'Participant'
    proof?: string; // SHA256 hex of a tag signed by participant
  }>;
  identifier?: string; // d tag value - unique identifier for this live event
}

/**
 * Creates a NIP-53 kind 30311 Live Event
 */
export async function createLiveEventEvent(config: LiveEventConfig): Promise<any | null> {
  if (typeof window === 'undefined' || !window.nostr) {
    return null;
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    if (!pubkey) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const identifier = config.identifier || `oni-${now}`;

    // Build tags
    const tags: string[][] = [
      ['d', identifier], // Required: unique identifier
    ];

    if (config.title) {
      tags.push(['title', config.title]);
    }

    if (config.summary) {
      tags.push(['summary', config.summary]);
    }

    if (config.image) {
      tags.push(['image', config.image]);
    }

    if (config.streamingUrl) {
      tags.push(['streaming', config.streamingUrl]);
    }

    if (config.recordingUrl) {
      tags.push(['recording', config.recordingUrl]);
    }

    if (config.starts) {
      tags.push(['starts', config.starts.toString()]);
    }

    if (config.ends) {
      tags.push(['ends', config.ends.toString()]);
    }

    if (config.status) {
      tags.push(['status', config.status]);
    }

    if (config.currentParticipants !== undefined) {
      tags.push(['current_participants', config.currentParticipants.toString()]);
    }

    if (config.totalParticipants !== undefined) {
      tags.push(['total_participants', config.totalParticipants.toString()]);
    }

    // Add hashtags
    if (config.tags && config.tags.length > 0) {
      config.tags.forEach(tag => {
        tags.push(['t', tag]);
      });
    }

    // Add participants (p tags)
    if (config.participants && config.participants.length > 0) {
      config.participants.forEach(participant => {
        const pTag: string[] = ['p', participant.pubkey];
        if (participant.relay) {
          pTag.push(participant.relay);
        }
        pTag.push(participant.role);
        if (participant.proof) {
          pTag.push(participant.proof);
        }
        tags.push(pTag);
      });
    }

    // Add relays
    if (config.relays && config.relays.length > 0) {
      tags.push(['relays', ...config.relays]);
    }

    // Add a tag (NIP-19 naddr)
    const aTag = `${LIVE_EVENT_KIND}:${pubkey}:${identifier}`;
    tags.push(['a', aTag]);

    const event = {
      created_at: now,
      kind: LIVE_EVENT_KIND,
      tags,
      content: '',
    };

    // Sign the event
    const signedEvent = await window.nostr.signEvent(event);
    return signedEvent;
  } catch (error) {
    console.error('Error creating live event:', error);
    return null;
  }
}

/**
 * Publishes a live event to Nostr relays
 */
export async function publishLiveEvent(
  event: any,
  relays: string[],
): Promise<boolean> {
  if (!event || !relays || relays.length === 0) {
    return false;
  }

  try {
    // Use RelayPool from applesauce-relay to publish
    const { RelayPool } = await import('applesauce-relay');
    const pool = new RelayPool();
    
    const responses = await pool.publish(relays, event);
    
    // Check if at least one relay accepted the event
    const published = responses.some(response => response.ok);
    
    if (published) {
      console.log('Live event published successfully to at least one relay');
    } else {
      console.warn('Failed to publish live event to any relay:', responses);
    }
    
    return published;
  } catch (error) {
    console.error('Error publishing live event:', error);
    return false;
  }
}

/**
 * Updates an existing live event (status, participants, etc.)
 */
export async function updateLiveEvent(
  existingEvent: any,
  updates: Partial<LiveEventConfig>,
): Promise<any | null> {
  if (!existingEvent) {
    return null;
  }

  // Extract identifier from existing event
  const dTag = existingEvent.tags.find((tag: string[]) => tag[0] === 'd');
  const identifier = dTag ? dTag[1] : `oni-${Math.floor(Date.now() / 1000)}`;

  // Merge updates
  const updatedConfig: LiveEventConfig = {
    ...existingEvent,
    ...updates,
    identifier,
  };

  return createLiveEventEvent(updatedConfig);
}

