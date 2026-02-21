import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Alert, AlertDescription, Spinner } from 'blazecn';
import { AdminShell, AdminTab } from './AdminShell';
import { OverviewTab } from './OverviewTab';
import { GeneralConfigTab } from './GeneralConfigTab';
import { VideoConfigTab } from './VideoConfigTab';
import { ChatConfigTab } from './ChatConfigTab';
import { ViewersTab } from './ViewersTab';
import { LogsTab } from './LogsTab';
import { AccessTokensTab } from './AccessTokensTab';
import { RelayManagerTab } from './RelayManagerTab';
import { NostrSettingsTab } from './NostrSettingsTab';
import { getAuthState, subscribeAuth, login, restoreSession, resetAllStores } from '../../nostr/stores/auth';
import { loadRelayManager, syncPoolToActiveProfile } from '../../nostr/stores/relaymanager';
import { discoverIndexers } from '../../nostr/stores/indexers';
import { connectRelays, getPool } from '../../nostr/stores/relay';
import { bootstrapUser } from '../../nostr/stores/bootstrap';
import { signWithExtension } from '../../nostr/nip07';
import { loadLiveEventsEnabled } from '../../nostr/stores/liveevents';
import { discoverBroadcastRelays } from '../../nostr/stores/broadcast';
import { initTheme } from '../../stores/theme';

interface AdminPageState {
  activeTab: AdminTab;
  token: string;
  authenticated: boolean;
  authChecking: boolean;
  authError: string | null;
  streamKeyInput: string;
}

export class AdminPage extends Component<{}, AdminPageState> {
  private unsubAuth: (() => void) | null = null;
  private lastPubkey: string | null = null;

  state: AdminPageState = {
    activeTab: 'overview',
    token: '',
    authenticated: false,
    authChecking: true,
    authError: null,
    streamKeyInput: '',
  };

  componentDidMount() {
    initTheme();

    // Initialize Nostr identity system (same as main App)
    loadRelayManager();
    syncPoolToActiveProfile();
    loadLiveEventsEnabled();

    // Start indexer discovery early
    discoverIndexers(10).catch((err) =>
      console.warn('[oni-admin] Indexer discovery error:', err)
    );

    // Start broadcast relay discovery
    discoverBroadcastRelays(20);

    // Restore session and connect relays
    restoreSession();
    this.updateAuthSigner();
    this.unsubAuth = subscribeAuth(() => this.onAuthChange());
    connectRelays().then(() => {
      this.onAuthChange();
    }).catch((err) => console.warn('[oni-admin] Relay connect error:', err));
  }

  componentWillUnmount() {
    this.unsubAuth?.();
  }

  private updateAuthSigner() {
    const auth = getAuthState();
    const pool = getPool();
    if (auth.pubkey) {
      pool.setAuthSigner((unsigned) => signWithExtension(unsigned));
    } else {
      pool.setAuthSigner(null);
    }
  }

  private async onAuthChange() {
    const auth = getAuthState();
    this.updateAuthSigner();

    // Detect account switch
    if (auth.pubkey && this.lastPubkey && auth.pubkey !== this.lastPubkey) {
      resetAllStores();
    }
    this.lastPubkey = auth.pubkey;

    if (auth.pubkey) {
      // Bootstrap the Nostr identity (fetches kind 10002, profile, contacts)
      bootstrapUser(auth.pubkey).catch((err) =>
        console.warn('[oni-admin] Bootstrap error:', err)
      );
      await this.verifyBearerToken(auth.pubkey);
    } else if (!auth.isLoading) {
      this.setState({ authChecking: false });
    }
  }

  private async verifyBearerToken(pubkey: string) {
    this.setState({ authChecking: true, authError: null });
    try {
      const res = await fetch('/api/admin/serverconfig', {
        headers: { Authorization: `Bearer ${pubkey}` },
      });
      if (!res.ok) throw new Error('Not authorized');
      this.setState({ authenticated: true, token: pubkey, authChecking: false, authError: null });
    } catch {
      this.setState({ authenticated: false, authChecking: false, authError: 'Your Nostr identity is not authorized as admin.' });
    }
  }

  private handleStreamKeyLogin = async (e: Event) => {
    e.preventDefault();
    const key = this.state.streamKeyInput.trim();
    if (!key) return;
    this.setState({ authChecking: true, authError: null });
    try {
      const res = await fetch('/api/admin/serverconfig', {
        headers: { Authorization: 'Basic ' + btoa('admin:' + key) },
      });
      if (!res.ok) throw new Error('Invalid stream key');
      this.setState({ authenticated: true, token: key, authChecking: false, authError: null });
    } catch {
      this.setState({ authenticated: false, authChecking: false, authError: 'Invalid stream key.' });
    }
  };

  private handleNostrLogin = () => {
    login();
  };

  private handleTabChange = (tab: AdminTab) => {
    this.setState({ activeTab: tab });
  };

  private getAuthHeaders(): Record<string, string> {
    const { token } = this.state;
    if (token.length === 64) {
      return { Authorization: `Bearer ${token}` };
    }
    return { Authorization: 'Basic ' + btoa('admin:' + token) };
  }

  private renderTab() {
    const { activeTab, token } = this.state;

    switch (activeTab) {
      case 'overview':
        return <OverviewTab token={token} />;
      case 'general':
        return <GeneralConfigTab token={token} />;
      case 'video':
        return <VideoConfigTab token={token} />;
      case 'chat':
        return <ChatConfigTab token={token} />;
      case 'viewers':
        return <ViewersTab token={token} />;
      case 'logs':
        return <LogsTab token={token} />;
      case 'tokens':
        return <AccessTokensTab token={token} />;
      case 'nostr':
        return <NostrSettingsTab />;
      case 'relays':
        return <RelayManagerTab />;
      default:
        return null;
    }
  }

  render() {
    const { authenticated, authChecking, authError, streamKeyInput } = this.state;
    const auth = getAuthState();

    if (authChecking) {
      return (
        <div class="flex items-center justify-center min-h-screen bg-background">
          <div class="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p class="text-sm text-muted-foreground">Checking authorization...</p>
          </div>
        </div>
      );
    }

    if (!authenticated) {
      return (
        <div class="flex items-center justify-center min-h-screen bg-background">
          <Card className="w-full max-w-sm py-6 gap-5 mx-4">
            <CardHeader className="text-center">
              <div class="mx-auto size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 ring-1 ring-primary/10">
                <svg class="size-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <CardTitle className="text-xl font-bold">Oni Admin</CardTitle>
              <CardDescription className="text-sm mt-1">
                {auth.pubkey
                  ? 'Your Nostr identity is not authorized. Use the stream key instead.'
                  : 'Sign in with Nostr or enter your stream key.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!auth.pubkey && (
                <Button onClick={this.handleNostrLogin} className="w-full h-10 gap-2 font-semibold" variant="outline" disabled={auth.isLoading}>
                  {auth.isLoading ? <Spinner size="sm" className="mr-1" /> : (
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  )}
                  Sign in with Nostr
                </Button>
              )}
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <span class="w-full border-t border-border" />
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-card px-3 text-muted-foreground/50 font-medium tracking-wider">or stream key</span>
                </div>
              </div>
              <form onSubmit={this.handleStreamKeyLogin} class="space-y-3">
                <div class="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground/70">Stream Key</Label>
                  <Input
                    type="password"
                    value={streamKeyInput}
                    onInput={(e: Event) => this.setState({ streamKeyInput: (e.target as HTMLInputElement).value })}
                    placeholder="Enter your stream key"
                    className="h-10"
                  />
                </div>
                {authError && (
                  <Alert variant="destructive" className="py-2.5 border-destructive/20 bg-destructive/5">
                    <AlertDescription className="text-xs">{authError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full h-10 font-semibold">
                  Sign In
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center pt-2">
              <a href="/" class="text-xs font-medium text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1.5">
                <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to stream
              </a>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return (
      <AdminShell activeTab={this.state.activeTab} onTabChange={this.handleTabChange}>
        {this.renderTab()}
      </AdminShell>
    );
  }
}
