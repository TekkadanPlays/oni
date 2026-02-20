import { Component, Fragment } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Spinner, Alert, AlertDescription, Card, CardHeader, CardTitle, CardContent, Badge, Progress, Skeleton } from 'blazecn';
import { cn } from 'blazecn';
import { api } from '../../api';
import { formatRelativeTime } from '../../utils';

// Inline SVG icons
const IconClock = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconUsers = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconTrendingUp = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconCpu = () => (
  <svg class="size-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);
const IconMemory = () => (
  <svg class="size-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="6" x2="6" y2="2" /><line x1="10" y1="6" x2="10" y2="2" /><line x1="14" y1="6" x2="14" y2="2" /><line x1="18" y1="6" x2="18" y2="2" />
  </svg>
);
const IconHardDrive = () => (
  <svg class="size-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="12" x2="2" y2="12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" y1="16" x2="6.01" y2="16" /><line x1="10" y1="16" x2="10.01" y2="16" />
  </svg>
);
const IconMonitor = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const IconUpload = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const IconDownload = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const IconPlay = () => (
  <svg class="size-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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

  private renderStatCard(icon: any, label: string, value: string | number, accent?: string) {
    return (
      <div class={cn('rounded-xl border border-border p-5 flex items-center gap-4 bg-card/60 backdrop-blur-sm border-glow')}>
        <div class={cn('size-11 rounded-xl flex items-center justify-center shrink-0', accent || 'bg-primary/10 text-primary')}>
          {icon}
        </div>
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground font-medium">{label}</p>
          <p class="text-2xl font-bold text-foreground truncate leading-tight tabular-nums">{value}</p>
        </div>
      </div>
    );
  }

  private renderHardwareGauge(icon: any, label: string, percent: number, color: string) {
    return (
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            {icon}
            <span class="text-xs text-muted-foreground">{label}</span>
          </div>
          <span class={cn('text-xs font-bold tabular-nums', percent > 90 ? 'text-destructive' : 'text-foreground')}>
            {Math.round(percent)}%
          </span>
        </div>
        <Progress value={percent} className="h-1.5" />
      </div>
    );
  }

  private renderOnlineState(s: any) {
    const viewerCount = s?.viewerCount || 0;
    const sessionPeak = s?.sessionPeakViewerCount || 0;
    const lastConnect = s?.lastConnectTime;
    const broadcaster = s?.broadcaster;
    const sd = broadcaster?.streamDetails;

    return (
      <div>
        {/* Stat cards row */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {this.renderStatCard(<IconClock />, 'Stream started', lastConnect ? formatRelativeTime(lastConnect) : 'Just now', 'bg-primary/10 text-primary')}
          {this.renderStatCard(<IconUsers />, 'Current viewers', viewerCount, 'bg-blue-500/10 text-blue-400')}
          {this.renderStatCard(<IconTrendingUp />, 'Peak viewers', sessionPeak, 'bg-emerald-500/10 text-emerald-400')}
        </div>

        {/* Stream details - 2 column grid */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
          {/* Inbound stream */}
          <Card className="overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-4 border-b border-border">
              <div class="size-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                <IconDownload />
              </div>
              <p class="text-sm font-semibold text-foreground">Inbound Stream</p>
            </div>
            <CardContent className="p-5">
              <div class="rounded-lg border border-border/40 overflow-hidden">
                {broadcaster?.remoteAddr && (
                  <div class="flex justify-between px-3 py-2 bg-muted/20">
                    <span class="text-xs text-muted-foreground">Source</span>
                    <span class="text-xs text-foreground font-mono">{broadcaster.remoteAddr}</span>
                  </div>
                )}
                {sd && (
                  <>
                    <div class="flex justify-between px-3 py-2">
                      <span class="text-xs text-muted-foreground">Video</span>
                      <span class="text-xs text-foreground">{sd.videoCodec} @ {sd.videoBitrate} kbps</span>
                    </div>
                    <div class="flex justify-between px-3 py-2 bg-muted/20">
                      <span class="text-xs text-muted-foreground">Resolution</span>
                      <span class="text-xs text-foreground">{sd.width}x{sd.height} @ {sd.framerate}fps</span>
                    </div>
                    <div class="flex justify-between px-3 py-2">
                      <span class="text-xs text-muted-foreground">Audio</span>
                      <span class="text-xs text-foreground">{sd.audioCodec} @ {sd.audioBitrate} kbps</span>
                    </div>
                  </>
                )}
              </div>
              {!sd && !broadcaster?.remoteAddr && (
                <p class="text-xs text-muted-foreground/60 italic py-2">No stream details available</p>
              )}
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
      <div>
        {/* Offline hero */}
        <div class="rounded-xl border border-border/40 bg-gradient-to-b from-card/80 to-background p-8 mb-5 text-center">
          <div class="size-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <IconPlay />
          </div>
          <h2 class="text-lg font-semibold text-foreground mb-1">No stream is active</h2>
          <p class="text-sm text-muted-foreground/70 mb-2">Start streaming to see your dashboard come alive.</p>
          {lastDisconnect && (
            <p class="text-[11px] text-muted-foreground/50">
              Last stream ended {formatRelativeTime(lastDisconnect)}
            </p>
          )}
        </div>

        {/* Quick start cards */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <Card className="overflow-hidden border-glow">
            <div class="flex items-center gap-3 px-6 py-4 border-b border-border">
              <div class="size-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                <IconMonitor />
              </div>
              <p class="text-sm font-semibold text-foreground">Broadcasting Software</p>
            </div>
            <CardContent className="p-5">
              <p class="text-xs text-muted-foreground/70 leading-relaxed">
                Point your streaming software (OBS, Streamlabs, etc.) to your server's RTMP endpoint to begin broadcasting.
              </p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-glow">
            <div class="flex items-center gap-3 px-6 py-4 border-b border-border">
              <div class="size-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                <IconUpload />
              </div>
              <p class="text-sm font-semibold text-foreground">Stream Key</p>
            </div>
            <CardContent className="p-5">
              <p class="text-xs text-muted-foreground/70 leading-relaxed">
                Your stream key can be found in the server configuration. Keep it secret — anyone with the key can stream to your server.
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
      <Card className="overflow-hidden">
        <div class="px-6 py-4 border-b border-border">
          <p class="text-sm font-semibold text-foreground">Hardware</p>
        </div>
        <CardContent className="p-5">
          <div class="space-y-3">
            {hw.cpu?.[0] && this.renderHardwareGauge(<IconCpu />, hw.cpu[0].modelName || 'CPU', cpuPercent, '#B63FFF')}
            {hw.memory && this.renderHardwareGauge(<IconMemory />, 'Memory', memPercent, '#2087E2')}
            {hw.disk && this.renderHardwareGauge(<IconHardDrive />, 'Disk', diskPercent, '#FF7700')}
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
          <h1 class="text-2xl font-bold text-foreground tracking-tight">
            {online ? 'Dashboard' : 'Home'}
          </h1>
          <p class="text-sm text-muted-foreground mt-1">
            {online ? 'Your stream is live. Here\'s what\'s happening.' : 'Server overview and quick actions.'}
          </p>
        </div>
        {online ? this.renderOnlineState(s) : this.renderOfflineState(s)}
      </div>
    );
  }
}
