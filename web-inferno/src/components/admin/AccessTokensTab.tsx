import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import {
  Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent,
  Alert, AlertDescription, Badge, Skeleton, Separator, toast,
} from 'blazecn';
import { cn } from 'blazecn';
import { api } from '../../api';
import { formatRelativeTime } from '../../utils';

const IconKey = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const IconPlus = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconTrash = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const IconCopy = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconEye = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

interface AccessToken {
  accessToken: string;
  displayName: string;
  scopes: string[];
  createdAt: string;
  lastUsed?: string;
}

interface AccessTokensTabState {
  loading: boolean;
  error: string | null;
  tokens: AccessToken[];
  showCreate: boolean;
  newTokenName: string;
  creating: boolean;
  newlyCreatedToken: string | null;
  revealedTokens: Set<string>;
  confirmDelete: string | null;
}

const AVAILABLE_SCOPES = [
  { id: 'can_send_system_messages', label: 'Send System Messages', description: 'Send chat messages as the system' },
  { id: 'can_send_messages', label: 'Send Chat Messages', description: 'Send messages in chat' },
  { id: 'has_admin_access', label: 'Admin Access', description: 'Full admin API access' },
];

export class AccessTokensTab extends Component<{ token: string }, AccessTokensTabState> {
  state: AccessTokensTabState = {
    loading: true,
    error: null,
    tokens: [],
    showCreate: false,
    newTokenName: '',
    creating: false,
    newlyCreatedToken: null,
    revealedTokens: new Set(),
    confirmDelete: null,
  };

  componentDidMount() {
    this.loadTokens();
  }

  private async loadTokens() {
    try {
      const tokens = await api.admin.getAccessTokens(this.props.token) as any;
      this.setState({
        loading: false,
        tokens: Array.isArray(tokens) ? tokens : [],
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load tokens',
        loading: false,
      });
    }
  }

  private handleCreate = async () => {
    const name = this.state.newTokenName.trim();
    if (!name) return;

    this.setState({ creating: true });
    try {
      const result = await api.admin.createAccessToken(this.props.token, {
        name,
        scopes: [],
      }) as any;

      this.setState({
        creating: false,
        showCreate: false,
        newTokenName: '',
        newlyCreatedToken: result?.accessToken || null,
      });
      this.loadTokens();
      toast({ title: 'Access token created' });
    } catch (err) {
      this.setState({ creating: false });
      toast({ title: 'Failed to create token', variant: 'destructive' });
    }
  };

  private handleDelete = async (tokenValue: string) => {
    try {
      await api.admin.deleteAccessToken(this.props.token, tokenValue);
      this.setState({ confirmDelete: null });
      this.loadTokens();
      toast({ title: 'Token deleted' });
    } catch {
      toast({ title: 'Failed to delete token', variant: 'destructive' });
    }
  };

  private toggleReveal(tokenValue: string) {
    const revealed = new Set(this.state.revealedTokens);
    if (revealed.has(tokenValue)) {
      revealed.delete(tokenValue);
    } else {
      revealed.add(tokenValue);
    }
    this.setState({ revealedTokens: revealed });
  }

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied to clipboard' });
    }).catch(() => {});
  }

  private maskToken(token: string): string {
    if (token.length <= 8) return '••••••••';
    return token.slice(0, 4) + '••••••••' + token.slice(-4);
  }

  render() {
    const { loading, error, tokens, showCreate, newTokenName, creating, newlyCreatedToken, revealedTokens, confirmDelete } = this.state;

    if (loading) {
      return (
        <div class="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      );
    }

    return (
      <div class="max-w-3xl">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-foreground tracking-tight">Access Tokens</h1>
            <p class="text-sm text-muted-foreground mt-1">Manage API access tokens for integrations and external tools.</p>
          </div>
          <Button
            variant={showCreate ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => this.setState({ showCreate: !showCreate, newlyCreatedToken: null })}
          >
            {showCreate ? 'Cancel' : (
              <span class="flex items-center gap-1.5"><IconPlus /> New Token</span>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Newly created token banner */}
        {newlyCreatedToken && (
          <Alert className="mb-4 border-success/30 bg-success/5">
            <AlertDescription>
              <div class="space-y-2">
                <p class="text-sm font-medium text-success">Token created successfully!</p>
                <p class="text-sm text-muted-foreground">
                  Copy this token now — you won't be able to see it again.
                </p>
                <div class="flex items-center gap-2">
                  <code class="text-xs font-mono bg-background px-2 py-1 rounded border border-border/40 flex-1 truncate text-foreground">
                    {newlyCreatedToken}
                  </code>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => this.copyToClipboard(newlyCreatedToken)}
                  >
                    <IconCopy />
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Create form */}
        {showCreate && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Create Access Token</CardTitle>
              <CardDescription>Create a new token for API access or integrations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <div class="space-y-1.5">
                  <Label>Token Name</Label>
                  <Input
                    type="text"
                    placeholder="e.g. OBS Integration, Bot Access"
                    value={newTokenName}
                    onInput={(e: Event) => this.setState({ newTokenName: (e.target as HTMLInputElement).value })}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter') this.handleCreate();
                    }}
                  />
                  <p class="text-xs text-muted-foreground">A descriptive name to identify this token.</p>
                </div>
                <Button onClick={this.handleCreate} disabled={!newTokenName.trim() || creating}>
                  {creating ? 'Creating...' : 'Create Token'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token list */}
        {tokens.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div class="flex flex-col items-center text-center">
                <div class="size-14 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                  <IconKey />
                </div>
                <p class="text-sm font-medium text-foreground mb-1">No access tokens</p>
                <p class="text-xs text-muted-foreground max-w-sm">
                  Create an access token to allow external tools and integrations to interact with your server.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div class="space-y-3">
            {tokens.map((token) => {
              const isRevealed = revealedTokens.has(token.accessToken);
              const isConfirmingDelete = confirmDelete === token.accessToken;

              return (
                <Card key={token.accessToken}>
                  <CardContent className="p-5">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <p class="text-sm font-medium text-foreground">{token.displayName || 'Unnamed Token'}</p>
                          {token.scopes && token.scopes.length > 0 && token.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-[9px] px-1.5 py-0">
                              {scope.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>

                        <div class="flex items-center gap-2 mb-2">
                          <code class="text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                            {isRevealed ? token.accessToken : this.maskToken(token.accessToken)}
                          </code>
                          <button
                            class="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                            onClick={() => this.toggleReveal(token.accessToken)}
                          >
                            {isRevealed ? <IconEyeOff /> : <IconEye />}
                          </button>
                          <button
                            class="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                            onClick={() => this.copyToClipboard(token.accessToken)}
                          >
                            <IconCopy />
                          </button>
                        </div>

                        <div class="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                          {token.createdAt && (
                            <span>Created {formatRelativeTime(token.createdAt)}</span>
                          )}
                          {token.lastUsed && (
                            <span>Last used {formatRelativeTime(token.lastUsed)}</span>
                          )}
                        </div>
                      </div>

                      <div class="shrink-0">
                        {isConfirmingDelete ? (
                          <div class="flex items-center gap-1.5">
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => this.handleDelete(token.accessToken)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => this.setState({ confirmDelete: null })}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => this.setState({ confirmDelete: token.accessToken })}
                          >
                            <IconTrash />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div class="mt-6">
          <p class="text-sm text-muted-foreground leading-relaxed">
            Access tokens allow external applications to interact with your Oni server's API.
            Tokens with admin access can modify server configuration. Keep your tokens secure and
            revoke any that are no longer needed.
          </p>
        </div>
      </div>
    );
  }
}
