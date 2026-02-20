import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Separator, Alert, AlertDescription } from 'blazecn';
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
import { getLocalStorage, setLocalStorage } from '../../utils';

const ADMIN_TOKEN_KEY = 'oni-admin-token';

interface AdminPageState {
  activeTab: AdminTab;
  token: string;
  tokenInput: string;
  authenticated: boolean;
  authError: string | null;
}

export class AdminPage extends Component<{}, AdminPageState> {
  state: AdminPageState = {
    activeTab: 'overview',
    token: getLocalStorage(ADMIN_TOKEN_KEY) || '',
    tokenInput: '',
    authenticated: !!getLocalStorage(ADMIN_TOKEN_KEY),
    authError: null,
  };

  componentDidMount() {
    if (this.state.token) {
      this.verifyToken(this.state.token);
    }
  }

  private async verifyToken(token: string) {
    try {
      await fetch('/api/admin/serverconfig', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      });
      this.setState({ authenticated: true, token, authError: null });
      setLocalStorage(ADMIN_TOKEN_KEY, token);
    } catch {
      this.setState({ authenticated: false, authError: 'Invalid admin access token' });
    }
  }

  private handleLogin = async (e: Event) => {
    e.preventDefault();
    const token = this.state.tokenInput.trim();
    if (!token) return;
    await this.verifyToken(token);
  };

  private handleTabChange = (tab: AdminTab) => {
    this.setState({ activeTab: tab });
  };

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
    const { authenticated, authError, tokenInput } = this.state;

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
              <CardDescription>Enter your access token to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={this.handleLogin} class="space-y-3">
                <div class="space-y-1.5">
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    value={tokenInput}
                    onInput={(e: Event) => this.setState({ tokenInput: (e.target as HTMLInputElement).value })}
                    placeholder="Enter your admin token"
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
