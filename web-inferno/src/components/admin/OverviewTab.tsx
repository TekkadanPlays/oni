import { Component, Fragment } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Alert, AlertDescription, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Separator, Skeleton } from 'blazecn';
import { cn } from 'blazecn';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, DoughnutController, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { api } from '../../api';
import { formatRelativeTime } from '../../utils';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, DoughnutController, ArcElement, ChartTooltip, Legend);

const MAX_HISTORY = 60;

// ── Helpers ──
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function themeColor(opacity = 1): string {
  const raw = getCSSVar('--color-primary');
  if (!raw) return `rgba(139,92,246,${opacity})`;
  return `oklch(${raw} / ${opacity})`;
}

function mutedColor(opacity = 1): string {
  const raw = getCSSVar('--color-muted');
  if (!raw) return `rgba(100,100,100,${opacity})`;
  return `oklch(${raw} / ${opacity})`;
}

function destructiveColor(opacity = 1): string {
  const raw = getCSSVar('--color-destructive');
  if (!raw) return `rgba(239,68,68,${opacity})`;
  return `oklch(${raw} / ${opacity})`;
}

function warningColor(opacity = 1): string {
  const raw = getCSSVar('--color-warning');
  if (!raw) return `rgba(234,179,8,${opacity})`;
  return `oklch(${raw} / ${opacity})`;
}

function successColor(opacity = 1): string {
  const raw = getCSSVar('--color-success');
  if (!raw) return `rgba(34,197,94,${opacity})`;
  return `oklch(${raw} / ${opacity})`;
}

function gaugeColor(percent: number, opacity = 1): string {
  if (percent > 90) return destructiveColor(opacity);
  if (percent > 70) return warningColor(opacity);
  return successColor(opacity);
}

// ── Icons ──
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
  viewerHistory: number[];
  cpuHistory: number[];
  memHistory: number[];
  diskHistory: number[];
  labels: string[];
}

export class OverviewTab extends Component<{ token: string }, OverviewState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private viewerChart: Chart | null = null;
  private cpuGauge: Chart | null = null;
  private memGauge: Chart | null = null;
  private diskGauge: Chart | null = null;
  private resourceChart: Chart | null = null;
  private viewerCanvasRef: HTMLCanvasElement | null = null;
  private cpuCanvasRef: HTMLCanvasElement | null = null;
  private memCanvasRef: HTMLCanvasElement | null = null;
  private diskCanvasRef: HTMLCanvasElement | null = null;
  private resourceCanvasRef: HTMLCanvasElement | null = null;

  state: OverviewState = {
    status: null,
    hardware: null,
    loading: true,
    error: null,
    viewerHistory: [],
    cpuHistory: [],
    memHistory: [],
    diskHistory: [],
    labels: [],
  };

  componentDidMount() {
    this.loadData();
    this.pollTimer = setInterval(() => this.loadData(), 5000);
  }

  componentWillUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.destroyCharts();
  }

  private destroyCharts() {
    this.viewerChart?.destroy(); this.viewerChart = null;
    this.cpuGauge?.destroy(); this.cpuGauge = null;
    this.memGauge?.destroy(); this.memGauge = null;
    this.diskGauge?.destroy(); this.diskGauge = null;
    this.resourceChart?.destroy(); this.resourceChart = null;
  }

  private async loadData() {
    try {
      const [status, hardware] = await Promise.all([
        api.admin.getStatus(this.props.token),
        api.admin.getHardware(this.props.token).catch(() => null),
      ]);

      const s = status as any;
      const hw = hardware as any;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const viewerHistory = [...this.state.viewerHistory, s?.viewerCount || 0].slice(-MAX_HISTORY);
      const cpuPercent = hw?.cpu?.[0]?.percent != null ? Math.round(hw.cpu[0].percent) : 0;
      const memPercent = hw?.memory ? Math.round(hw.memory.percent) : 0;
      const diskPercent = hw?.disk ? Math.round(hw.disk.percent) : 0;
      const cpuHistory = [...this.state.cpuHistory, cpuPercent].slice(-MAX_HISTORY);
      const memHistory = [...this.state.memHistory, memPercent].slice(-MAX_HISTORY);
      const diskHistory = [...this.state.diskHistory, diskPercent].slice(-MAX_HISTORY);
      const labels = [...this.state.labels, now].slice(-MAX_HISTORY);

      this.setState({
        status, hardware, loading: false, error: null,
        viewerHistory, cpuHistory, memHistory, diskHistory, labels,
      }, () => {
        this.updateCharts();
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load',
        loading: false,
      });
    }
  }

  private updateCharts() {
    const { viewerHistory, cpuHistory, memHistory, diskHistory, labels, status, hardware } = this.state;
    const s = status as any;
    const online = s?.online || false;

    // ── Viewer count line chart ──
    if (online && this.viewerCanvasRef) {
      if (!this.viewerChart) {
        this.viewerChart = new Chart(this.viewerCanvasRef, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Viewers',
              data: viewerHistory,
              borderColor: themeColor(1),
              backgroundColor: themeColor(0.1),
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: themeColor(1),
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { size: 11 },
                bodyFont: { size: 11 },
                padding: 8,
                cornerRadius: 6,
              },
            },
            scales: {
              x: {
                display: true,
                grid: { color: mutedColor(0.1) },
                ticks: { color: mutedColor(0.5), font: { size: 9 }, maxTicksLimit: 8 },
              },
              y: {
                display: true,
                beginAtZero: true,
                grid: { color: mutedColor(0.1) },
                ticks: {
                  color: mutedColor(0.5),
                  font: { size: 10 },
                  stepSize: 1,
                  callback: (v: any) => Number.isInteger(v) ? v : '',
                },
              },
            },
          },
        });
      } else {
        this.viewerChart.data.labels = labels;
        this.viewerChart.data.datasets[0].data = viewerHistory;
        this.viewerChart.update('none');
      }
    }

    // ── Resource history line chart ──
    if (hardware && this.resourceCanvasRef) {
      if (!this.resourceChart) {
        this.resourceChart = new Chart(this.resourceCanvasRef, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'CPU',
                data: cpuHistory,
                borderColor: themeColor(0.9),
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                tension: 0.3,
                pointRadius: 0,
              },
              {
                label: 'Memory',
                data: memHistory,
                borderColor: warningColor(0.9),
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                tension: 0.3,
                pointRadius: 0,
              },
              {
                label: 'Disk',
                data: diskHistory,
                borderColor: successColor(0.9),
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                tension: 0.3,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  color: mutedColor(0.7),
                  font: { size: 10 },
                  boxWidth: 12,
                  boxHeight: 2,
                  padding: 12,
                },
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { size: 11 },
                bodyFont: { size: 11 },
                padding: 8,
                cornerRadius: 6,
                callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}%` },
              },
            },
            scales: {
              x: {
                display: true,
                grid: { color: mutedColor(0.1) },
                ticks: { color: mutedColor(0.5), font: { size: 9 }, maxTicksLimit: 8 },
              },
              y: {
                display: true,
                min: 0,
                max: 100,
                grid: { color: mutedColor(0.1) },
                ticks: {
                  color: mutedColor(0.5),
                  font: { size: 10 },
                  stepSize: 25,
                  callback: (v: any) => `${v}%`,
                },
              },
            },
          },
        });
      } else {
        this.resourceChart.data.labels = labels;
        this.resourceChart.data.datasets[0].data = cpuHistory;
        this.resourceChart.data.datasets[1].data = memHistory;
        this.resourceChart.data.datasets[2].data = diskHistory;
        this.resourceChart.update('none');
      }
    }

    // ── Doughnut gauges ──
    const hw = hardware as any;
    if (hw) {
      const cpuPct = hw.cpu?.[0]?.percent != null ? Math.round(hw.cpu[0].percent) : 0;
      const memPct = hw.memory ? Math.round(hw.memory.percent) : 0;
      const diskPct = hw.disk ? Math.round(hw.disk.percent) : 0;
      this.updateGauge('cpu', this.cpuCanvasRef, cpuPct);
      this.updateGauge('mem', this.memCanvasRef, memPct);
      this.updateGauge('disk', this.diskCanvasRef, diskPct);
    }
  }

  private updateGauge(type: 'cpu' | 'mem' | 'disk', canvas: HTMLCanvasElement | null, percent: number) {
    if (!canvas) return;
    const chartRef = type === 'cpu' ? 'cpuGauge' : type === 'mem' ? 'memGauge' : 'diskGauge';
    const existing = this[chartRef];

    if (!existing) {
      (this as any)[chartRef] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [percent, 100 - percent],
            backgroundColor: [gaugeColor(percent, 0.8), mutedColor(0.15)],
            borderWidth: 0,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '75%',
          rotation: -90,
          circumference: 180,
          animation: { duration: 400, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    } else {
      existing.data.datasets[0].data = [percent, 100 - percent];
      existing.data.datasets[0].backgroundColor = [gaugeColor(percent, 0.8), mutedColor(0.15)];
      existing.update('none');
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
        {/* Stat cards */}
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

        {/* Viewer chart */}
        <Card>
          <CardHeader>
            <CardTitle>Viewers Over Time</CardTitle>
            <CardDescription>Real-time viewer count · updates every 5s</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '220px' }}>
              <canvas ref={(el: HTMLCanvasElement | null) => { this.viewerCanvasRef = el; }} />
            </div>
          </CardContent>
        </Card>

        {/* Stream details + Gauges */}
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

          {/* Hardware gauges */}
          {this.renderHardwareGauges()}
        </div>

        {/* Resource history chart */}
        {this.state.hardware && (
          <Card>
            <CardHeader>
              <CardTitle>Resource History</CardTitle>
              <CardDescription>CPU, memory, and disk usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: '200px' }}>
                <canvas ref={(el: HTMLCanvasElement | null) => { this.resourceCanvasRef = el; }} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  private renderOfflineState(s: any) {
    const lastDisconnect = s?.lastDisconnectTime;

    return (
      <div class="space-y-6">
        {/* Offline empty state */}
        <Card>
          <CardContent className="py-12">
            <div class="flex flex-col items-center text-center">
              <div class="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
                <IconPlay />
              </div>
              <h3 class="text-lg font-semibold">No active stream</h3>
              <p class="text-sm text-muted-foreground mt-1 mb-2 max-w-sm">
                Start streaming to see your dashboard come alive with real-time charts and stats.
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

        {/* Hardware gauges even when offline */}
        {this.renderHardwareGauges()}

        {/* Resource history chart even when offline */}
        {this.state.hardware && (
          <Card>
            <CardHeader>
              <CardTitle>Resource History</CardTitle>
              <CardDescription>CPU, memory, and disk usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: '200px' }}>
                <canvas ref={(el: HTMLCanvasElement | null) => { this.resourceCanvasRef = el; }} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  private renderHardwareGauges() {
    const { hardware } = this.state;
    if (!hardware) return null;

    const hw = hardware as any;
    const cpuPercent = hw.cpu?.[0]?.percent != null ? Math.round(hw.cpu[0].percent) : 0;
    const memPercent = hw.memory ? Math.round(hw.memory.percent) : 0;
    const diskPercent = hw.disk ? Math.round(hw.disk.percent) : 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>System Resources</CardTitle>
          <CardDescription>
            {hw.cpu?.[0]?.modelName || 'Server hardware'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-3 gap-4">
            {/* CPU gauge */}
            <div class="flex flex-col items-center">
              <div class="relative" style={{ width: '100px', height: '60px' }}>
                <canvas ref={(el: HTMLCanvasElement | null) => { this.cpuCanvasRef = el; }} />
                <div class="absolute inset-x-0 bottom-0 text-center">
                  <span class={cn('text-lg font-bold tabular-nums', cpuPercent > 90 ? 'text-destructive' : '')}>{cpuPercent}%</span>
                </div>
              </div>
              <span class="text-xs text-muted-foreground mt-1">CPU</span>
            </div>
            {/* Memory gauge */}
            <div class="flex flex-col items-center">
              <div class="relative" style={{ width: '100px', height: '60px' }}>
                <canvas ref={(el: HTMLCanvasElement | null) => { this.memCanvasRef = el; }} />
                <div class="absolute inset-x-0 bottom-0 text-center">
                  <span class={cn('text-lg font-bold tabular-nums', memPercent > 90 ? 'text-destructive' : '')}>{memPercent}%</span>
                </div>
              </div>
              <span class="text-xs text-muted-foreground mt-1">Memory</span>
            </div>
            {/* Disk gauge */}
            <div class="flex flex-col items-center">
              <div class="relative" style={{ width: '100px', height: '60px' }}>
                <canvas ref={(el: HTMLCanvasElement | null) => { this.diskCanvasRef = el; }} />
                <div class="absolute inset-x-0 bottom-0 text-center">
                  <span class={cn('text-lg font-bold tabular-nums', diskPercent > 90 ? 'text-destructive' : '')}>{diskPercent}%</span>
                </div>
              </div>
              <span class="text-xs text-muted-foreground mt-1">Disk</span>
            </div>
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
          <Skeleton className="h-64 rounded-xl" />
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
