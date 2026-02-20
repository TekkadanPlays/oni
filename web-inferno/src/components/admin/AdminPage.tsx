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
import { getAuthState, subscribeAuth, login, restoreSession } from '../../nostr/stores/auth';

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

  state: AdminPageState = {
    activeTab: 'overview',
    token: '',
    authenticated: false,
    authChecking: true,
    authError: null,
    streamKeyInput: '',
  };

  componentDidMount() {
    restoreSession();
    this.unsubAuth = subscribeAuth(() => this.onAuthChange());
    this.onAuthChange();
  }

  componentWillUnmount() {
    this.unsubAuth?.();
  }

  private async onAuthChange() {
    const auth = getAuthState();
    if (auth.pubkey) {
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
          <div class="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p class="text-sm text-muted-foreground">Checking authorization...</p>
          </div>
        </div>
      );
    }

    if (!authenticated) {
      return (
        <div class="flex items-center justify-center min-h-screen bg-background">
          <Card className="w-full max-w-sm py-5 gap-4">
            <CardHeader className="text-center">
              <div class="mx-auto size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <svg class="size-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <CardTitle>Oni Admin</CardTitle>
              <CardDescription>
                {auth.pubkey
                  ? 'Your Nostr identity is not authorized. Use the stream key instead.'
                  : 'Sign in with Nostr or enter your stream key.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!auth.pubkey && (
                <Button onClick={this.handleNostrLogin} className="w-full" variant="outline" disabled={auth.isLoading}>
                  {auth.isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  Sign in with Nostr
                </Button>
              )}
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <span class="w-full border-t border-border/50" />
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-card px-2 text-muted-foreground">or stream key</span>
                </div>
              </div>
              <form onSubmit={this.handleStreamKeyLogin} class="space-y-3">
                <div class="space-y-1.5">
                  <Label>Stream Key</Label>
                  <Input
                    type="password"
                    value={streamKeyInput}
                    onInput={(e: Event) => this.setState({ streamKeyInput: (e.target as HTMLInputElement).value })}
                    placeholder="Enter your stream key"
                  />
                </div>
                {authError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{authError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center">
              <a href="/" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back to stream
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
