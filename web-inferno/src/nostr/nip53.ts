// NIP-53: Live Activities (kind 30311)
import type { NostrEvent, UnsignedEvent } from './event';
import { Kind, createEvent } from './event';
import { signWithExtension } from './nip07';
import { RelayPool } from './pool';
import { Relay } from './relay';
import { unixNow } from './utils';

export interface LiveEventConfig {
  title?: string;
  summary?: string;
  image?: string;
  streamingUrl?: string;
  recordingUrl?: string;
  starts?: number;
  ends?: number;
  status: 'planned' | 'live' | 'ended';
  currentParticipants?: number;
  totalParticipants?: number;
  tags?: string[];
  relays?: string[];
  participants?: Array<{
    pubkey: string;
    relay?: string;
    role: string;
    proof?: string;
  }>;
  identifier?: string;
}

/**
 * Build a NIP-53 kind 30311 unsigned event from config.
 * The caller is responsible for signing (via NIP-07 or NIP-55).
 */
export function buildLiveEventUnsigned(pubkey: string, config: LiveEventConfig): UnsignedEvent {
  const identifier = config.identifier || `oni-${unixNow()}`;
  const tags: string[][] = [['d', identifier]];

  if (config.title) tags.push(['title', config.title]);
  if (config.summary) tags.push(['summary', config.summary]);
  if (config.image) tags.push(['image', config.image]);
  if (config.streamingUrl) tags.push(['streaming', config.streamingUrl]);
  if (config.recordingUrl) tags.push(['recording', config.recordingUrl]);
  if (config.starts) tags.push(['starts', config.starts.toString()]);
  if (config.ends) tags.push(['ends', config.ends.toString()]);
  if (config.status) tags.push(['status', config.status]);
  if (config.currentParticipants !== undefined) {
    tags.push(['current_participants', config.currentParticipants.toString()]);
  }
  if (config.totalParticipants !== undefined) {
    tags.push(['total_participants', config.totalParticipants.toString()]);
  }

  if (config.tags) {
    for (const t of config.tags) {
      tags.push(['t', t]);
    }
  }

  if (config.participants) {
    for (const p of config.participants) {
      const pTag: string[] = ['p', p.pubkey];
      if (p.relay) pTag.push(p.relay);
      pTag.push(p.role);
      if (p.proof) pTag.push(p.proof);
      tags.push(pTag);
    }
  }

  if (config.relays && config.relays.length > 0) {
    tags.push(['relays', ...config.relays]);
  }

  // Self-referencing 'a' tag
  tags.push(['a', `${Kind.LiveEvent}:${pubkey}:${identifier}`]);

  return createEvent(Kind.LiveEvent, '', tags, pubkey);
}

/**
 * Create and sign a NIP-53 live event via NIP-07.
 */
export async function createLiveEvent(pubkey: string, config: LiveEventConfig): Promise<NostrEvent | null> {
  try {
    const unsigned = buildLiveEventUnsigned(pubkey, config);
    return await signWithExtension(unsigned);
  } catch (err) {
    console.error('[nip53] Error creating live event:', err);
    return null;
  }
}

/**
 * Publish a signed live event to the given relay URLs.
 * Opens ephemeral connections, publishes, then disconnects.
 */
export async function publishLiveEvent(
  event: NostrEvent,
  relayUrls: string[],
): Promise<{ published: boolean; results: Map<string, { accepted: boolean; message: string }> }> {
  if (!event || relayUrls.length === 0) {
    return { published: false, results: new Map() };
  }

  const relays: Relay[] = [];
  try {
    // Connect to all relays
    const connectPromises = relayUrls.map(async (url) => {
      const relay = new Relay(url);
      relays.push(relay);
      await relay.connect();
      return relay;
    });
    await Promise.allSettled(connectPromises);

    // Publish to all connected relays
    const results = new Map<string, { accepted: boolean; message: string }>();
    const publishPromises = relays
      .filter((r) => r.status === 'connected')
      .map(async (relay) => {
        try {
          const result = await relay.publish(event);
          results.set(relay.url, result);
        } catch (err) {
          results.set(relay.url, { accepted: false, message: String(err) });
        }
      });
    await Promise.allSettled(publishPromises);

    const published = Array.from(results.values()).some((r) => r.accepted);
    return { published, results };
  } finally {
    // Cleanup ephemeral connections
    for (const relay of relays) {
      relay.disconnect();
    }
  }
}

/**
 * Update an existing live event (creates a new event with same 'd' tag).
 */
export async function updateLiveEvent(
  pubkey: string,
  existingEvent: NostrEvent,
  updates: Partial<LiveEventConfig>,
): Promise<NostrEvent | null> {
  // Extract identifier from existing event
  const dTag = existingEvent.tags.find((t) => t[0] === 'd');
  const identifier = dTag ? dTag[1] : `oni-${unixNow()}`;

  // Extract current config from existing event tags
  const currentConfig: LiveEventConfig = {
    identifier,
    status: 'live',
  };

  for (const tag of existingEvent.tags) {
    switch (tag[0]) {
      case 'title': currentConfig.title = tag[1]; break;
      case 'summary': currentConfig.summary = tag[1]; break;
      case 'image': currentConfig.image = tag[1]; break;
      case 'streaming': currentConfig.streamingUrl = tag[1]; break;
      case 'recording': currentConfig.recordingUrl = tag[1]; break;
      case 'starts': currentConfig.starts = parseInt(tag[1], 10); break;
      case 'ends': currentConfig.ends = parseInt(tag[1], 10); break;
      case 'status': currentConfig.status = tag[1] as any; break;
      case 'current_participants': currentConfig.currentParticipants = parseInt(tag[1], 10); break;
    }
  }

  const merged = { ...currentConfig, ...updates, identifier };
  return createLiveEvent(pubkey, merged);
}
