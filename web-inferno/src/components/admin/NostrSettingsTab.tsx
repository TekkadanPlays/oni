import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Button, Badge, Avatar, AvatarImage, AvatarFallback, Switch, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, AlertDescription } from 'blazecn';
import { getAuthState, subscribeAuth, login, logout } from '../../nostr/stores/auth';
import { getBootstrapState, subscribeBootstrap, type BootstrapProfile, type BootstrapPhase } from '../../nostr/stores/bootstrap';
import { getLiveEventState, subscribeLiveEvents, setLiveEventsEnabled } from '../../nostr/stores/liveevents';
import { shortenHex, npubEncode } from '../../nostr/utils';

interface NostrSettingsTabState {
  pubkey: string | null;
  authLoading: boolean;
  authError: string | null;
  profile: BootstrapProfile | null;
  bootstrapPhase: BootstrapPhase;
  relayCount: number;
  followingCount: number;
  liveEventsEnabled: boolean;
  liveEventPublishing: boolean;
  liveEventError: string | null;
  lastPublished: string | null;
}

export class NostrSettingsTab extends Component<{}, NostrSettingsTabState> {
  private unsubAuth: (() => void) | null = null;
  private unsubBootstrap: (() => void) | null = null;
  private unsubLive: (() => void) | null = null;

  state: NostrSettingsTabState = {
    pubkey: getAuthState().pubkey,
    authLoading: getAuthState().isLoading,
    authError: getAuthState().error,
    profile: getBootstrapState().profile,
    bootstrapPhase: getBootstrapState().phase,
    relayCount: getBootstrapState().relayList.length,
    followingCount: getBootstrapState().followingCount,
    liveEventsEnabled: getLiveEventState().enabled,
    liveEventPublishing: getLiveEventState().isPublishing,
    liveEventError: getLiveEventState().error,
    lastPublished: getLiveEventState().lastPublished,
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
        relayCount: bs.relayList.length,
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
  }

  componentWillUnmount() {
    this.unsubAuth?.();
    this.unsubBootstrap?.();
    this.unsubLive?.();
  }

  render() {
    const {
      pubkey, authLoading, authError, profile, bootstrapPhase,
      relayCount, followingCount, liveEventsEnabled, liveEventPublishing,
      liveEventError, lastPublished,
    } = this.state;

    return (
      <div>
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-foreground tracking-tight">Nostr Identity</h1>
          <p class="text-sm text-muted-foreground mt-1">Connect your Nostr account and manage live event publishing.</p>
        </div>

        {/* Auth Section */}
        <Card className="mb-4 overflow-hidden">
          <div class="px-6 py-4 border-b border-border">
            <p class="text-sm font-semibold text-foreground">Account</p>
          </div>
          <CardContent className="p-6">
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
                    <p class="text-[10px] text-muted-foreground">Relays</p>
                  </div>
                  <div class="text-center p-2 rounded-md bg-background">
                    <p class="text-lg font-semibold text-foreground">{followingCount}</p>
                    <p class="text-[10px] text-muted-foreground">Following</p>
                  </div>
                  <div class="text-center p-2 rounded-md bg-background">
                    <p class="text-lg font-semibold text-foreground capitalize">{bootstrapPhase}</p>
                    <p class="text-[10px] text-muted-foreground">Status</p>
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

        {/* NIP-53 Live Events Section */}
        <Card className="mb-4 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <p class="text-sm font-semibold text-foreground">NIP-53 Live Events</p>
              <p class="text-xs text-muted-foreground mt-0.5">Auto-publish live activity events to your outbox relays.</p>
            </div>
            <Switch checked={liveEventsEnabled} onChange={(checked: boolean) => setLiveEventsEnabled(checked)} />
          </div>
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="overflow-hidden">
          <div class="px-6 py-4 border-b border-border">
            <p class="text-sm font-semibold text-foreground">How it works</p>
          </div>
          <CardContent className="p-6">
            <ul class="text-xs text-muted-foreground space-y-1.5">
              <li>• Your Nostr identity is bootstrapped by querying indexer relays for your profile (kind 0) and relay list (NIP-65 kind 10002).</li>
              <li>• Outbox and inbox relays from your NIP-65 list are automatically populated in the Relay Manager.</li>
              <li>• NIP-53 live events are published to your outbox relays so followers can discover your stream.</li>
              <li>• Indexer relays are discovered via rstate API or NIP-66 monitor relays as a fallback.</li>
              <li>• This is the same identity system used by Mycelium (app.mycelium.social).</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }
}
