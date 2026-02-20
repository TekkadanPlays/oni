import { Component, Fragment } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Alert, AlertDescription, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Progress, Separator, Skeleton } from 'blazecn';
import { cn } from 'blazecn';
import { api } from '../../api';
import { formatRelativeTime } from '../../utils';

// Inline SVG icons — small, consistent size-4
const IconClock = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconUsers = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconTrendingUp = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconCpu = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);
const IconMemory = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="6" x2="6" y2="2" /><line x1="10" y1="6" x2="10" y2="2" /><line x1="14" y1="6" x2="14" y2="2" /><line x1="18" y1="6" x2="18" y2="2" />
  </svg>
);
const IconHardDrive = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="12" x2="2" y2="12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" y1="16" x2="6.01" y2="16" /><line x1="10" y1="16" x2="10.01" y2="16" />
  </svg>
);
const IconPlay = () => (
  <svg class="size-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

interface OverviewState {
  status: any;
  hardware: any;
  loading: boolean;
  error: string | null;
}

export class OverviewTab extends Component<{ token: string }, OverviewState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  state: OverviewState = {
    status: null,
    hardware: null,
    loading: true,
    error: null,
  };

  componentDidMount() {
    this.loadData();
    this.pollTimer = setInterval(() => this.loadData(), 5000);
  }

  componentWillUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async loadData() {
    try {
      const [status, hardware] = await Promise.all([
        api.admin.getStatus(this.props.token),
        api.admin.getHardware(this.props.token).catch(() => null),
      ]);
      this.setState({ status, hardware, loading: false, error: null });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load',
        loading: false,
      });
    }
  }

  private renderOnlineState(s: any) {
    const viewerCount = s?.viewerCount || 0;
    const sessionPeak = s?.sessionPeakViewerCount || 0;
    const lastConnect = s?.lastConnectTime;
    const broadcaster = s?.broadcaster;
    const sd = broadcaster?.streamDetails;

    return (
      <div class="space-y-6">
        {/* Stat cards — proper blazecn Card with CardHeader */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <IconClock />
                Stream started
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {lastConnect ? formatRelativeTime(lastConnect) : 'Just now'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <IconUsers />
                Current viewers
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{viewerCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <IconTrendingUp />
                Session peak
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{sessionPeak}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Stream details + Hardware — 2 column */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Inbound stream */}
          <Card>
            <CardHeader>
              <CardTitle>Inbound Stream</CardTitle>
              <CardDescription>Details from the broadcasting source</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                {broadcaster?.remoteAddr && (
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Source</span>
                    <span class="font-mono text-foreground">{broadcaster.remoteAddr}</span>
                  </div>
                )}
                {sd && (
                  <>
                    <Separator />
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">Video</span>
                      <span class="text-foreground">{sd.videoCodec} · {sd.videoBitrate} kbps</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">Resolution</span>
                      <span class="text-foreground">{sd.width}×{sd.height} @ {sd.framerate}fps</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">Audio</span>
                      <span class="text-foreground">{sd.audioCodec} · {sd.audioBitrate} kbps</span>
                    </div>
                  </>
                )}
                {!sd && !broadcaster?.remoteAddr && (
                  <p class="text-sm text-muted-foreground italic">No stream details available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hardware */}
          {this.renderHardwareCard()}
        </div>
      </div>
    );
  }

  private renderOfflineState(s: any) {
    const lastDisconnect = s?.lastDisconnectTime;

    return (
      <div class="space-y-6">
        {/* Offline empty state — using blazecn Empty pattern */}
        <Card>
          <CardContent className="py-12">
            <div class="flex flex-col items-center text-center">
              <div class="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
                <IconPlay />
              </div>
              <h3 class="text-lg font-semibold">No active stream</h3>
              <p class="text-sm text-muted-foreground mt-1 mb-2 max-w-sm">
                Start streaming to see your dashboard come alive with real-time stats.
              </p>
              {lastDisconnect && (
                <Badge variant="outline" className="mt-1">
                  Last stream ended {formatRelativeTime(lastDisconnect)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick start tips */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcasting Software</CardTitle>
              <CardDescription>Get started with OBS or Streamlabs</CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Point your streaming software to your server's RTMP endpoint to begin broadcasting.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stream Key</CardTitle>
              <CardDescription>Found in Video configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Your stream key is in the Video tab. Keep it secret — anyone with the key can stream to your server.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Hardware even when offline */}
        {this.renderHardwareCard()}
      </div>
    );
  }

  private renderHardwareCard() {
    const { hardware } = this.state;
    if (!hardware) return null;

    const hw = hardware as any;
    const cpuPercent = hw.cpu?.[0]?.percent != null ? Math.round(hw.cpu[0].percent) : (hw.memory ? Math.round(hw.memory.percent) : 0);
    const memPercent = hw.memory ? Math.round(hw.memory.percent) : 0;
    const diskPercent = hw.disk ? Math.round(hw.disk.percent) : 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Hardware</CardTitle>
          <CardDescription>Server resource utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            {hw.cpu?.[0] && (
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-muted-foreground flex items-center gap-2"><IconCpu /> {hw.cpu[0].modelName || 'CPU'}</span>
                  <span class={cn('text-sm font-medium tabular-nums', cpuPercent > 90 ? 'text-destructive' : '')}>{cpuPercent}%</span>
                </div>
                <Progress value={cpuPercent} />
              </div>
            )}
            {hw.memory && (
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-muted-foreground flex items-center gap-2"><IconMemory /> Memory</span>
                  <span class={cn('text-sm font-medium tabular-nums', memPercent > 90 ? 'text-destructive' : '')}>{memPercent}%</span>
                </div>
                <Progress value={memPercent} />
              </div>
            )}
            {hw.disk && (
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-muted-foreground flex items-center gap-2"><IconHardDrive /> Disk</span>
                  <span class={cn('text-sm font-medium tabular-nums', diskPercent > 90 ? 'text-destructive' : '')}>{diskPercent}%</span>
                </div>
                <Progress value={diskPercent} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  render() {
    const { status, loading, error } = this.state;

    if (loading) {
      return (
        <div class="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    const s = status as any;
    const online = s?.online || false;

    return (
      <div>
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p class="text-sm text-muted-foreground mt-1">
            {online ? 'Your stream is live.' : 'Server overview and quick actions.'}
          </p>
        </div>
        {online ? this.renderOnlineState(s) : this.renderOfflineState(s)}
      </div>
    );
  }
}
