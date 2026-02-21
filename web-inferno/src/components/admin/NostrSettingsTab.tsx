import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Button, Badge, Avatar, AvatarImage, AvatarFallback, Switch, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator, Alert, AlertDescription, Skeleton, Spinner } from 'blazecn';
import { cn } from 'blazecn';
import { getAuthState, subscribeAuth, login, logout } from '../../nostr/stores/auth';
import { getBootstrapState, subscribeBootstrap, type BootstrapProfile, type BootstrapPhase, type RelayListEntry } from '../../nostr/stores/bootstrap';
import { getLiveEventState, subscribeLiveEvents, setLiveEventsEnabled } from '../../nostr/stores/liveevents';
import {
  getBroadcastState, subscribeBroadcast, discoverBroadcastRelays,
  toggleBroadcastRelay, selectAllBroadcast, deselectAllBroadcast,
  type BroadcastRelay, type BroadcastState,
} from '../../nostr/stores/broadcast';
import {
  getRelayManagerState, subscribeRelayManager,
  addRelayToProfile, removeRelayFromProfile,
  createProfile, deleteProfile,
  type RelayManagerState,
} from '../../nostr/stores/relaymanager';
import { shortenHex, npubEncode } from '../../nostr/utils';

type RelayTab = 'outbox' | 'broadcast' | 'custom';

interface NostrSettingsTabState {
  pubkey: string | null;
  authLoading: boolean;
  authError: string | null;
  profile: BootstrapProfile | null;
  bootstrapPhase: BootstrapPhase;
  relayList: RelayListEntry[];
  followingCount: number;
  liveEventsEnabled: boolean;
  liveEventPublishing: boolean;
  liveEventError: string | null;
  lastPublished: string | null;
  broadcast: BroadcastState;
  manager: RelayManagerState;
  // Outbox relay selection for NIP-53 (persisted to localStorage)
  selectedOutbox: Set<string>;
  newCustomRelayUrl: string;
  newProfileName: string;
  relayTab: RelayTab;
}

const OUTBOX_STORAGE_KEY = 'oni_outbox_relays_selected';

function loadSelectedOutbox(): Set<string> {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function persistSelectedOutbox(urls: Set<string>) {
  localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([...urls]));
}

export class NostrSettingsTab extends Component<{}, NostrSettingsTabState> {
  private unsubAuth: (() => void) | null = null;
  private unsubBootstrap: (() => void) | null = null;
  private unsubLive: (() => void) | null = null;
  private unsubBroadcast: (() => void) | null = null;
  private unsubManager: (() => void) | null = null;

  state: NostrSettingsTabState = {
    pubkey: getAuthState().pubkey,
    authLoading: getAuthState().isLoading,
    authError: getAuthState().error,
    profile: getBootstrapState().profile,
    bootstrapPhase: getBootstrapState().phase,
    relayList: getBootstrapState().relayList,
    followingCount: getBootstrapState().followingCount,
    liveEventsEnabled: getLiveEventState().enabled,
    liveEventPublishing: getLiveEventState().isPublishing,
    liveEventError: getLiveEventState().error,
    lastPublished: getLiveEventState().lastPublished,
    broadcast: getBroadcastState(),
    manager: getRelayManagerState(),
    selectedOutbox: loadSelectedOutbox(),
    newCustomRelayUrl: '',
    newProfileName: '',
    relayTab: 'outbox' as RelayTab,
  };

  componentDidMount() {
    this.unsubAuth = subscribeAuth(() => {
      const auth = getAuthState();
      this.setState({
        pubkey: auth.pubkey,
        authLoading: auth.isLoading,
        authError: auth.error,
      });
    });

    this.unsubBootstrap = subscribeBootstrap(() => {
      const bs = getBootstrapState();
      this.setState({
        profile: bs.profile,
        bootstrapPhase: bs.phase,
        relayList: bs.relayList,
        followingCount: bs.followingCount,
      });
    });

    this.unsubLive = subscribeLiveEvents(() => {
      const le = getLiveEventState();
      this.setState({
        liveEventsEnabled: le.enabled,
        liveEventPublishing: le.isPublishing,
        liveEventError: le.error,
        lastPublished: le.lastPublished,
      });
    });

    this.unsubBroadcast = subscribeBroadcast(() => {
      this.setState({ broadcast: getBroadcastState() });
    });

    this.unsubManager = subscribeRelayManager(() => {
      this.setState({ manager: getRelayManagerState() });
    });

    // Start broadcast relay discovery
    discoverBroadcastRelays(20);
  }

  componentWillUnmount() {
    this.unsubAuth?.();
    this.unsubBootstrap?.();
    this.unsubLive?.();
    this.unsubBroadcast?.();
    this.unsubManager?.();
  }

  private toggleOutboxRelay = (url: string) => {
    const next = new Set(this.state.selectedOutbox);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    this.setState({ selectedOutbox: next });
    persistSelectedOutbox(next);
  };

  private selectAllOutbox = () => {
    const outbox = this.state.relayList.filter((r) => r.write).map((r) => r.url);
    const next = new Set(outbox);
    this.setState({ selectedOutbox: next });
    persistSelectedOutbox(next);
  };

  private deselectAllOutbox = () => {
    const next = new Set<string>();
    this.setState({ selectedOutbox: next });
    persistSelectedOutbox(next);
  };

  private handleAddCustomRelay = (profileId: string) => {
    let url = this.state.newCustomRelayUrl.trim();
    if (!url) return;
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) url = 'wss://' + url;
    addRelayToProfile(profileId, url);
    this.setState({ newCustomRelayUrl: '' });
  };

  private handleCreateProfile = () => {
    const name = this.state.newProfileName.trim();
    if (!name) return;
    createProfile(name);
    this.setState({ newProfileName: '' });
  };

  render() {
    const {
      pubkey, authLoading, authError, profile, bootstrapPhase,
      relayList, followingCount, liveEventsEnabled, liveEventPublishing,
      liveEventError, lastPublished, broadcast, manager, selectedOutbox,
      newCustomRelayUrl, newProfileName, relayTab,
    } = this.state;

    const outboxRelays = relayList.filter((r) => r.write);
    const relayCount = relayList.length;
    const customRelayCount = manager.profiles
      .filter((p) => !p.builtin)
      .reduce((sum, p) => sum + p.relays.length, 0);

    return (
      <div class="max-w-3xl space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight">Nostr Identity</h1>
          <p class="text-sm text-muted-foreground mt-1">Connect your Nostr account, manage relay selection, and control live event publishing.</p>
        </div>

        {/* ── Account Section ── */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            {pubkey ? (
              <div>
                <div class="flex items-start gap-4 mb-4">
                  <Avatar className="size-16">
                    <AvatarImage src={profile?.picture} alt="" />
                    <AvatarFallback className="text-xl">
                      {(profile?.displayName || profile?.name || pubkey.charAt(0)).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div class="min-w-0">
                    <p class="text-lg font-semibold text-foreground truncate">
                      {profile?.displayName || profile?.name || shortenHex(pubkey, 8)}
                    </p>
                    <p class="text-xs text-muted-foreground font-mono truncate mb-1">
                      {npubEncode(pubkey)}
                    </p>
                    {profile?.nip05 && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{profile.nip05}</Badge>
                    )}
                    {profile?.about && (
                      <p class="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.about}</p>
                    )}
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3 mb-4">
                  <div class="text-center p-2 rounded-md bg-background">
                    <p class="text-lg font-semibold text-foreground">{relayCount}</p>
                    <p class="text-xs text-muted-foreground">Relays</p>
                  </div>
                  <div class="text-center p-2 rounded-md bg-background">
                    <p class="text-lg font-semibold text-foreground">{followingCount}</p>
                    <p class="text-xs text-muted-foreground">Following</p>
                  </div>
                  <div class="text-center p-2 rounded-md bg-background">
                    <p class="text-lg font-semibold text-foreground capitalize">{bootstrapPhase}</p>
                    <p class="text-xs text-muted-foreground">Status</p>
                  </div>
                </div>

                <Button variant="destructive" size="sm" onClick={() => logout()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div>
                <p class="text-sm text-muted-foreground mb-3">
                  Connect your Nostr identity to publish NIP-53 live events and manage your stream's social presence.
                </p>
                <Button onClick={() => login()} disabled={authLoading}>
                  {authLoading ? 'Connecting...' : 'Connect with Nostr'}
                </Button>
                {authError && (
                  <p class="text-xs text-destructive mt-2">{authError}</p>
                )}
                <p class="text-xs text-muted-foreground mt-2">
                  Requires a NIP-07 browser extension (nos2x-fox, Alby, etc.) or Amber on Android.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── NIP-53 Live Events Toggle ── */}
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>NIP-53 Live Events</CardTitle>
                <CardDescription>Auto-publish live activity events when you go live.</CardDescription>
              </div>
              <Switch checked={liveEventsEnabled} onChange={(checked: boolean) => setLiveEventsEnabled(checked)} />
            </div>
          </CardHeader>
          <CardContent>
            {liveEventsEnabled && !pubkey && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription>You must connect a Nostr identity above to publish live events.</AlertDescription>
              </Alert>
            )}
            {liveEventPublishing && (
              <p class="text-xs text-primary">Publishing live event...</p>
            )}
            {liveEventError && (
              <p class="text-xs text-destructive mt-1">{liveEventError}</p>
            )}
            {lastPublished && (
              <p class="text-xs text-muted-foreground mt-1">
                Last published: {new Date(lastPublished).toLocaleTimeString()}
              </p>
            )}
            {liveEventsEnabled && pubkey && !liveEventPublishing && !liveEventError && !lastPublished && (
              <p class="text-xs text-muted-foreground">
                Live events will be published to your selected outbox and broadcast relays when you start streaming.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Relay Selection Table ── */}
        <Card>
          <CardHeader>
            <CardTitle>Publish Relays</CardTitle>
            <CardDescription>
              Select which relays receive your NIP-53 live events. Outbox relays are from your NIP-65 list, broadcast relays are discovered via NIP-66 monitors, and custom relays are manually added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab bar with count badges */}
            <div class="flex gap-1 mb-4 border-b border-border">
              {([
                { id: 'outbox' as RelayTab, label: 'Outbox', count: outboxRelays.length, selected: selectedOutbox.size },
                { id: 'broadcast' as RelayTab, label: 'Broadcast', count: broadcast.relays.length, selected: broadcast.selectedUrls.size },
                { id: 'custom' as RelayTab, label: 'Custom', count: customRelayCount, selected: customRelayCount },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  class={cn(
                    'relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                    'hover:text-foreground',
                    relayTab === tab.id
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => this.setState({ relayTab: tab.id })}
                >
                  <span class="flex items-center gap-2">
                    {tab.label}
                    <Badge
                      variant={tab.selected > 0 ? 'default' : 'outline'}
                      className="text-[10px] px-1.5 min-w-[1.5rem] justify-center tabular-nums"
                    >
                      {tab.selected}/{tab.count}
                    </Badge>
                  </span>
                  {relayTab === tab.id && (
                    <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Select all / Deselect all toolbar */}
            {relayTab === 'outbox' && outboxRelays.length > 0 && (
              <div class="flex items-center justify-between mb-3">
                <p class="text-[11px] text-muted-foreground">
                  {selectedOutbox.size} of {outboxRelays.length} selected
                </p>
                <div class="flex gap-1.5">
                  <Button size="xs" variant="ghost" className="text-xs h-6 px-2" onClick={this.selectAllOutbox}>Select All</Button>
                  <Button size="xs" variant="ghost" className="text-xs h-6 px-2" onClick={this.deselectAllOutbox}>Deselect All</Button>
                </div>
              </div>
            )}
            {relayTab === 'broadcast' && broadcast.relays.length > 0 && (
              <div class="flex items-center justify-between mb-3">
                <p class="text-[11px] text-muted-foreground">
                  {broadcast.selectedUrls.size} of {broadcast.relays.length} selected
                  {broadcast.source !== 'none' && <span class="ml-1">· via {broadcast.source}</span>}
                </p>
                <div class="flex gap-1.5">
                  <Button size="xs" variant="ghost" className="text-xs h-6 px-2" onClick={() => selectAllBroadcast()}>Select All</Button>
                  <Button size="xs" variant="ghost" className="text-xs h-6 px-2" onClick={() => deselectAllBroadcast()}>Deselect All</Button>
                </div>
              </div>
            )}

            {/* ── Outbox tab content ── */}
            {relayTab === 'outbox' && (
              <div>
                {!pubkey ? (
                  <p class="text-xs text-muted-foreground italic py-4">Connect your Nostr identity to see your outbox relays.</p>
                ) : bootstrapPhase !== 'ready' && outboxRelays.length === 0 ? (
                  <div class="space-y-2 py-2">
                    <Skeleton className="h-8 rounded-md" />
                    <Skeleton className="h-8 rounded-md" />
                    <Skeleton className="h-8 rounded-md" />
                  </div>
                ) : outboxRelays.length === 0 ? (
                  <p class="text-xs text-muted-foreground italic py-4">No outbox relays found in your NIP-65 relay list.</p>
                ) : (
                  <div class="divide-y divide-border/50">
                    {outboxRelays.map((relay) => (
                      <label
                        key={relay.url}
                        class="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOutbox.has(relay.url)}
                          onChange={() => this.toggleOutboxRelay(relay.url)}
                          class="size-4 rounded border-input accent-primary cursor-pointer"
                        />
                        <span class="text-xs text-foreground truncate flex-1 font-mono">{relay.url}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">write</Badge>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Broadcast tab content ── */}
            {relayTab === 'broadcast' && (
              <div>
                {broadcast.isLoading ? (
                  <div class="flex items-center gap-2 py-6 justify-center">
                    <Spinner size="sm" />
                    <span class="text-xs text-muted-foreground">Discovering broadcast relays...</span>
                  </div>
                ) : broadcast.relays.length === 0 ? (
                  <div class="py-4 text-center">
                    <p class="text-xs text-muted-foreground italic mb-2">No broadcast relays discovered yet.</p>
                    <Button size="sm" variant="secondary" onClick={() => discoverBroadcastRelays(20)}>
                      Retry Discovery
                    </Button>
                  </div>
                ) : (
                  <div class="divide-y divide-border/50">
                    {broadcast.relays.map((relay: BroadcastRelay) => (
                      <label
                        key={relay.url}
                        class="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={broadcast.selectedUrls.has(relay.url)}
                          onChange={() => toggleBroadcastRelay(relay.url)}
                          class="size-4 rounded border-input accent-primary cursor-pointer"
                        />
                        <span class="text-xs text-foreground truncate flex-1 font-mono">{relay.url}</span>
                        <div class="flex items-center gap-1.5 shrink-0">
                          {relay.nips.includes(53) && (
                            <Badge variant="default" className="text-[10px] px-1.5">NIP-53</Badge>
                          )}
                          {relay.rtt < 500 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 tabular-nums">{relay.rtt}ms</Badge>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Custom tab content ── */}
            {relayTab === 'custom' && (
              <div>
                {/* Existing custom profiles */}
                {manager.profiles
                  .filter((p) => !p.builtin)
                  .map((profile) => (
                    <div key={profile.id} class="mb-4">
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-semibold text-foreground">{profile.name}</span>
                          <Badge variant="outline" className="text-[10px]">{profile.relays.length} relays</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteProfile(profile.id)}
                        >
                          Delete
                        </Button>
                      </div>
                      {profile.relays.length === 0 ? (
                        <p class="text-xs text-muted-foreground italic px-1 mb-2">No relays in this profile</p>
                      ) : (
                        <div class="divide-y divide-border/50 mb-2">
                          {profile.relays.map((url) => (
                            <div key={url} class="flex items-center justify-between group px-3 py-1.5">
                              <span class="text-xs text-foreground font-mono truncate">{url}</span>
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => removeRelayFromProfile(profile.id, url)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div class="flex gap-2">
                        <Input
                          className="flex-1 h-8 text-xs"
                          placeholder="wss://relay.example.com"
                          value={newCustomRelayUrl}
                          onInput={(e: Event) => this.setState({ newCustomRelayUrl: (e.target as HTMLInputElement).value })}
                          onKeyDown={(e: KeyboardEvent) => {
                            if (e.key === 'Enter') this.handleAddCustomRelay(profile.id);
                          }}
                        />
                        <Button size="sm" className="h-8" onClick={() => this.handleAddCustomRelay(profile.id)}>
                          Add
                        </Button>
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}

                {manager.profiles.filter((p) => !p.builtin).length === 0 && (
                  <p class="text-xs text-muted-foreground italic mb-3 py-2">
                    No custom relay profiles yet. Create one to manually specify additional relays.
                  </p>
                )}

                <div class="flex gap-2 mt-2">
                  <Input
                    className="flex-1 h-8 text-xs"
                    placeholder="New profile name..."
                    value={newProfileName}
                    onInput={(e: Event) => this.setState({ newProfileName: (e.target as HTMLInputElement).value })}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter') this.handleCreateProfile();
                    }}
                  />
                  <Button size="sm" variant="secondary" className="h-8" onClick={this.handleCreateProfile}>
                    Create Profile
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── How it works ── */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="text-sm text-muted-foreground space-y-1.5">
              <li>• Your Nostr identity is bootstrapped by querying indexer relays for your profile (kind 0) and relay list (NIP-65 kind 10002).</li>
              <li>• <strong>Outbox relays</strong> are your NIP-65 write relays — where your followers expect to find your events.</li>
              <li>• <strong>Broadcast relays</strong> are well-connected relays discovered via NIP-66 monitors for maximum network reach.</li>
              <li>• <strong>Custom profiles</strong> let you manually add relays for specific broadcasting scenarios.</li>
              <li>• When you go live, NIP-53 events are published to all selected outbox + broadcast relays.</li>
              <li>• Relay selections are shared across the Mycelium ecosystem via localStorage.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }
}
