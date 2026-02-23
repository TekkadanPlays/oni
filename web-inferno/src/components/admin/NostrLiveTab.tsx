import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import {
  Button, Badge, Input, Label, Card,
  CardContent, Separator, Alert, AlertDescription, Switch,
} from 'blazecn';
import { cn } from 'blazecn';
import { getAuthState, subscribeAuth } from '../../nostr/stores/auth';
import {
  getLiveConfig, subscribeLiveConfig, updateLiveConfig,
  addTag, removeTag, addParticipant, removeParticipant,
  loadLiveConfig, type LiveConfig,
} from '../../nostr/stores/liveconfig';
import {
  getLiveEventState, subscribeLiveEvents, setLiveEventsEnabled,
  onStreamStart, onStreamEnd,
} from '../../nostr/stores/liveevents';
import { shortenHex, npubEncode } from '../../nostr/utils';
import { store } from '../../store';

interface NostrLiveTabState {
  pubkey: string | null;
  config: LiveConfig;
  liveEventsEnabled: boolean;
  isPublishing: boolean;
  lastPublished: string | null;
  liveError: string | null;
  currentEventId: string | null;
  online: boolean;
  streamTitle: string;
  viewerCount: number;
  newTag: string;
  newParticipantPubkey: string;
  newParticipantRole: string;
}

export class NostrLiveTab extends Component<{}, NostrLiveTabState> {
  private unsubAuth: (() => void) | null = null;
  private unsubConfig: (() => void) | null = null;
  private unsubLive: (() => void) | null = null;
  private unsubStore: (() => void) | null = null;

  state: NostrLiveTabState = {
    pubkey: getAuthState().pubkey,
    config: getLiveConfig(),
    liveEventsEnabled: getLiveEventState().enabled,
    isPublishing: getLiveEventState().isPublishing,
    lastPublished: getLiveEventState().lastPublished,
    liveError: getLiveEventState().error,
    currentEventId: getLiveEventState().currentEvent?.id || null,
    online: store.getState().status?.online || false,
    streamTitle: store.getState().status?.streamTitle || '',
    viewerCount: store.getState().status?.viewerCount || 0,
    newTag: '',
    newParticipantPubkey: '',
    newParticipantRole: 'Guest',
  };

  componentDidMount() {
    loadLiveConfig();

    this.unsubAuth = subscribeAuth(() => {
      this.setState({ pubkey: getAuthState().pubkey });
    });

    this.unsubConfig = subscribeLiveConfig(() => {
      this.setState({ config: getLiveConfig() });
    });

    this.unsubLive = subscribeLiveEvents(() => {
      const le = getLiveEventState();
      this.setState({
        liveEventsEnabled: le.enabled,
        isPublishing: le.isPublishing,
        lastPublished: le.lastPublished,
        liveError: le.error,
        currentEventId: le.currentEvent?.id || null,
      });
    });

    this.unsubStore = store.subscribe(() => {
      const s = store.getState();
      this.setState({
        online: s.status?.online || false,
        streamTitle: s.status?.streamTitle || '',
        viewerCount: s.status?.viewerCount || 0,
      });
    });
  }

  componentWillUnmount() {
    this.unsubAuth?.();
    this.unsubConfig?.();
    this.unsubLive?.();
    this.unsubStore?.();
  }

  private handleAddTag = () => {
    const tag = this.state.newTag.trim();
    if (tag) {
      addTag(tag);
      this.setState({ newTag: '' });
    }
  };

  private handleAddParticipant = () => {
    const pubkey = this.state.newParticipantPubkey.trim();
    const role = this.state.newParticipantRole.trim() || 'Guest';
    if (pubkey.length >= 64) {
      addParticipant({ pubkey, role });
      this.setState({ newParticipantPubkey: '', newParticipantRole: 'Guest' });
    }
  };

  private handleBroadcastNow = () => {
    const { config, streamTitle, viewerCount } = this.state;
    const title = config.title || streamTitle || 'Live Stream';
    onStreamStart(title, viewerCount);
  };

  private handleEndBroadcast = () => {
    onStreamEnd();
  };

  render() {
    const {
      pubkey, config, liveEventsEnabled, isPublishing,
      lastPublished, liveError, currentEventId, online,
      streamTitle, viewerCount, newTag, newParticipantPubkey, newParticipantRole,
    } = this.state;

    if (!pubkey) {
      return (
        <div class="py-12 text-center">
          <p class="text-sm text-muted-foreground">Connect your Nostr identity to configure live events.</p>
        </div>
      );
    }

    return (
      <div class="space-y-6">
        {/* Header */}
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Nostr Live</h2>
          <p class="text-sm text-muted-foreground">
            Configure your NIP-53 live event metadata. These settings are used when broadcasting to Nostr.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class={cn(
                  'size-3 rounded-full',
                  currentEventId ? 'bg-success live-dot' : online ? 'bg-amber-400' : 'bg-muted-foreground/30'
                )} />
                <div>
                  <p class="text-sm font-medium">
                    {currentEventId ? 'Broadcasting to Nostr' : online ? 'Stream is live' : 'Stream offline'}
                  </p>
                  <p class="text-[11px] text-muted-foreground">
                    {currentEventId
                      ? `Event: ${currentEventId.slice(0, 16)}...`
                      : lastPublished
                        ? `Last broadcast: ${new Date(lastPublished).toLocaleTimeString()}`
                        : 'No broadcast yet'}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Auto-broadcast</Label>
                <Switch
                  checked={liveEventsEnabled}
                  onChange={(checked: boolean) => setLiveEventsEnabled(checked)}
                />
              </div>
            </div>

            {liveError && (
              <Alert variant="destructive" className="mt-3 py-2">
                <AlertDescription className="text-xs">{liveError}</AlertDescription>
              </Alert>
            )}

            {/* Manual broadcast controls */}
            {online && (
              <div class="flex gap-2 mt-3 pt-3 border-t border-border/50">
                {!currentEventId ? (
                  <Button
                    size="sm"
                    onClick={this.handleBroadcastNow}
                    disabled={isPublishing}
                    className="gap-1.5"
                  >
                    {isPublishing ? (
                      <svg class="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                    ) : (
                      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    )}
                    Broadcast Now
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={this.handleEndBroadcast}
                    className="gap-1.5"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                    End Broadcast
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Event Metadata */}
        <div class="space-y-4">
          <h3 class="text-sm font-semibold">Event Metadata</h3>

          {/* Title */}
          <div class="space-y-1.5">
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={config.title}
              onInput={(e: Event) => updateLiveConfig({ title: (e.target as HTMLInputElement).value })}
              placeholder={streamTitle || 'Live Stream'}
              className="h-9"
            />
            <p class="text-[10px] text-muted-foreground">
              Override the stream title for Nostr. Leave empty to use the server title.
            </p>
          </div>

          {/* Summary */}
          <div class="space-y-1.5">
            <Label className="text-xs font-medium">Summary</Label>
            <textarea
              value={config.summary}
              onInput={(e: Event) => updateLiveConfig({ summary: (e.target as HTMLTextAreaElement).value })}
              placeholder="A brief description of your stream..."
              rows={3}
              class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Image */}
          <div class="space-y-1.5">
            <Label className="text-xs font-medium">Cover Image URL</Label>
            <Input
              value={config.image}
              onInput={(e: Event) => updateLiveConfig({ image: (e.target as HTMLInputElement).value })}
              placeholder="https://example.com/stream-cover.jpg"
              className="h-9"
            />
            {config.image && (
              <div class="mt-2 rounded-md overflow-hidden border border-border/50 max-w-xs">
                <img src={config.image} alt="Cover preview" class="w-full h-auto object-cover max-h-40" />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Tags */}
        <div class="space-y-3">
          <h3 class="text-sm font-semibold">Tags</h3>
          <p class="text-[10px] text-muted-foreground">
            Hashtags help people discover your stream on Nostr clients.
          </p>

          {config.tags.length > 0 && (
            <div class="flex flex-wrap gap-1.5">
              {config.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 text-xs pr-1">
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    class="ml-0.5 size-4 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <svg class="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div class="flex gap-2">
            <Input
              value={newTag}
              onInput={(e: Event) => this.setState({ newTag: (e.target as HTMLInputElement).value })}
              onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); this.handleAddTag(); } }}
              placeholder="Add a tag..."
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" variant="outline" onClick={this.handleAddTag} className="h-8 text-xs px-3">
              Add
            </Button>
          </div>
        </div>

        <Separator />

        {/* Participants */}
        <div class="space-y-3">
          <h3 class="text-sm font-semibold">Participants</h3>
          <p class="text-[10px] text-muted-foreground">
            Add co-hosts, guests, or other participants to your live event. Your pubkey is automatically included as Host.
          </p>

          {/* Current host */}
          <div class="rounded-md border border-border/50 divide-y divide-border/30">
            <div class="flex items-center justify-between px-3 py-2">
              <div class="flex items-center gap-2">
                <Badge variant="default" className="text-[10px]">Host</Badge>
                <span class="text-xs font-mono text-muted-foreground">
                  {(() => { try { return npubEncode(pubkey).slice(0, 20) + '...'; } catch { return shortenHex(pubkey); } })()}
                </span>
              </div>
              <span class="text-[10px] text-muted-foreground italic">you</span>
            </div>

            {config.participants.map((p) => (
              <div key={p.pubkey} class="flex items-center justify-between px-3 py-2">
                <div class="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{p.role}</Badge>
                  <span class="text-xs font-mono text-muted-foreground">{shortenHex(p.pubkey)}</span>
                </div>
                <button
                  onClick={() => removeParticipant(p.pubkey)}
                  class="size-6 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add participant */}
          <div class="flex gap-2">
            <Input
              value={newParticipantPubkey}
              onInput={(e: Event) => this.setState({ newParticipantPubkey: (e.target as HTMLInputElement).value })}
              placeholder="Hex pubkey (64 chars)"
              className="h-8 text-xs flex-1 font-mono"
            />
            <Input
              value={newParticipantRole}
              onInput={(e: Event) => this.setState({ newParticipantRole: (e.target as HTMLInputElement).value })}
              placeholder="Role"
              className="h-8 text-xs w-24"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleAddParticipant}
              disabled={newParticipantPubkey.trim().length < 64}
              className="h-8 text-xs px-3"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
