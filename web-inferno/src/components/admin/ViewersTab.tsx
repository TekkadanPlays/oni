import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import {
  Button, Badge, Card, CardHeader, CardTitle, CardContent,
  Alert, AlertDescription, Skeleton, Separator,
} from 'blazecn';
import { cn } from 'blazecn';
import { api } from '../../api';
import { formatRelativeTime } from '../../utils';

const IconUsers = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconRefresh = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconGlobe = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconClock = () => (
  <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconUser = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

interface Viewer {
  id: string;
  username: string;
  displayName: string;
  displayColor: number;
  createdAt: string;
  connectedAt?: string;
  messageCount?: number;
  userAgent?: string;
  geo?: string;
  clientID?: string;
}

interface ViewersTabState {
  loading: boolean;
  error: string | null;
  viewers: Viewer[];
  chatClients: Viewer[];
  pollTimer: ReturnType<typeof setInterval> | null;
}

export class ViewersTab extends Component<{ token: string }, ViewersTabState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  state: ViewersTabState = {
    loading: true,
    error: null,
    viewers: [],
    chatClients: [],
    pollTimer: null,
  };

  componentDidMount() {
    this.loadData();
    this.pollTimer = setInterval(() => this.loadData(), 10000);
  }

  componentWillUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async loadData() {
    try {
      const [viewers, chatClients] = await Promise.all([
        api.admin.getViewers(this.props.token).catch(() => []),
        api.admin.getConnectedClients(this.props.token).catch(() => []),
      ]);
      this.setState({
        loading: false,
        error: null,
        viewers: Array.isArray(viewers) ? viewers : [],
        chatClients: Array.isArray(chatClients) ? chatClients : [],
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load viewers',
        loading: false,
      });
    }
  }

  private handleRefresh = () => {
    this.setState({ loading: true });
    this.loadData();
  };

  render() {
    const { loading, error, viewers, chatClients } = this.state;
    const totalViewers = viewers.length;
    const totalChatUsers = chatClients.length;

    if (loading && viewers.length === 0) {
      return (
        <div class="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      );
    }

    return (
      <div>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-foreground tracking-tight">Viewers</h1>
            <p class="text-sm text-muted-foreground mt-1">Connected viewers and chat participants.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={this.handleRefresh}>
            <IconRefresh />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div class="rounded-xl border border-border p-5 flex items-center gap-4 bg-card/60 border-glow">
            <div class="size-11 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
              <IconUsers />
            </div>
            <div>
              <p class="text-xs text-muted-foreground font-medium">Stream Viewers</p>
              <p class="text-2xl font-bold text-foreground tabular-nums">{totalViewers}</p>
            </div>
          </div>
          <div class="rounded-xl border border-border p-5 flex items-center gap-4 bg-card/60 border-glow">
            <div class="size-11 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-muted-foreground font-medium">Chat Participants</p>
              <p class="text-2xl font-bold text-foreground tabular-nums">{totalChatUsers}</p>
            </div>
          </div>
        </div>

        {/* Viewer List */}
        <Card className="overflow-hidden mb-4">
          <div class="px-6 py-4 border-b border-border">
            <p class="text-sm font-semibold text-foreground">Connected Viewers</p>
          </div>
          <CardContent className="p-0">
            {totalViewers === 0 ? (
              <div class="text-center py-8">
                <div class="size-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <IconUsers />
                </div>
                <p class="text-sm text-muted-foreground">No viewers connected</p>
                <p class="text-[11px] text-muted-foreground/50 mt-1">Viewers will appear here when someone watches your stream.</p>
              </div>
            ) : (
              <div class="rounded-lg border border-border/40 overflow-hidden">
                {/* Header */}
                <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                  <div class="col-span-4">User</div>
                  <div class="col-span-3">Connected</div>
                  <div class="col-span-3">Location</div>
                  <div class="col-span-2">Client</div>
                </div>
                {viewers.map((viewer: any, i: number) => (
                  <div
                    key={viewer.id || viewer.clientID || i}
                    class={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2.5 items-center',
                      i % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    )}
                  >
                    <div class="col-span-4 flex items-center gap-2 min-w-0">
                      <IconUser />
                      <div class="min-w-0">
                        <p class="text-xs text-foreground truncate">
                          {viewer.displayName || viewer.username || 'Anonymous'}
                        </p>
                        {viewer.messageCount != null && viewer.messageCount > 0 && (
                          <p class="text-[10px] text-muted-foreground">{viewer.messageCount} messages</p>
                        )}
                      </div>
                    </div>
                    <div class="col-span-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <IconClock />
                      {viewer.connectedAt ? formatRelativeTime(viewer.connectedAt) : viewer.createdAt ? formatRelativeTime(viewer.createdAt) : '—'}
                    </div>
                    <div class="col-span-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <IconGlobe />
                      <span class="truncate">{viewer.geo || '—'}</span>
                    </div>
                    <div class="col-span-2">
                      <span class="text-[10px] text-muted-foreground/60 truncate block">
                        {viewer.userAgent ? shortenUA(viewer.userAgent) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Clients */}
        <Card className="overflow-hidden">
          <div class="px-6 py-4 border-b border-border">
            <p class="text-sm font-semibold text-foreground">Chat Participants</p>
          </div>
          <CardContent className="p-5">
            {totalChatUsers === 0 ? (
              <div class="text-center py-6">
                <p class="text-sm text-muted-foreground">No chat participants</p>
              </div>
            ) : (
              <div class="flex flex-wrap gap-2">
                {chatClients.map((client: any, i: number) => (
                  <Badge
                    key={client.id || i}
                    variant="secondary"
                    className="gap-1.5 py-1"
                  >
                    <span class="size-2 rounded-full bg-success" />
                    {client.displayName || client.username || 'Anonymous'}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p class="text-[10px] text-muted-foreground/30 mt-4 text-center">
          Auto-refreshes every 10 seconds
        </p>
      </div>
    );
  }
}

function shortenUA(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('OBS')) return 'OBS';
  if (ua.includes('VLC')) return 'VLC';
  if (ua.length > 20) return ua.slice(0, 20) + '…';
  return ua;
}
