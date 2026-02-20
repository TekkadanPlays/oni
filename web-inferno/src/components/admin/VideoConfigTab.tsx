import { Component, Fragment } from 'inferno';
import { createElement } from 'inferno-create-element';
import {
  Button, Input, Label, Switch, Card, CardHeader, CardTitle, CardDescription, CardContent,
  Alert, AlertDescription, Badge, Skeleton, Separator, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Slider, toast,
} from 'blazecn';
import { cn } from 'blazecn';
import { api } from '../../api';

const LATENCY_LEVELS = [
  { value: 1, label: 'Low Latency', description: '~4s delay. Best for interactive streams.' },
  { value: 2, label: 'Medium', description: '~8s delay. Good balance of quality and latency.' },
  { value: 3, label: 'High Quality', description: '~15s delay. Best video quality, higher latency.' },
  { value: 4, label: 'Offline', description: 'Optimized for VOD-style playback.' },
];

const CPU_USAGE_LEVELS = [
  { value: 1, label: 'Fastest', description: 'Lowest quality, minimal CPU' },
  { value: 2, label: 'Faster', description: 'Low quality, low CPU' },
  { value: 3, label: 'Medium', description: 'Balanced quality and CPU' },
  { value: 4, label: 'Slower', description: 'High quality, more CPU' },
  { value: 5, label: 'Slowest', description: 'Best quality, maximum CPU' },
];

const COMMON_RESOLUTIONS = [
  { label: 'Source (passthrough)', width: 0, height: 0 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '720p', width: 1280, height: 720 },
  { label: '480p', width: 854, height: 480 },
  { label: '360p', width: 640, height: 360 },
];

interface VideoVariant {
  videoPassthrough: boolean;
  audioPassthrough: boolean;
  videoBitrate: number;
  audioBitrate: number;
  scaledWidth: number;
  scaledHeight: number;
  framerate: number;
  cpuUsageLevel: number;
}

interface VideoConfigState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  latencyLevel: number;
  variants: VideoVariant[];
  streamKey: string;
  showStreamKey: boolean;
  newStreamKey: string;
  rtmpPort: number;
  webPort: number;
}

const IconVideo = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
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
const IconKey = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const IconCopy = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

function defaultVariant(): VideoVariant {
  return {
    videoPassthrough: false,
    audioPassthrough: false,
    videoBitrate: 1200,
    audioBitrate: 128,
    scaledWidth: 1280,
    scaledHeight: 720,
    framerate: 24,
    cpuUsageLevel: 3,
  };
}

export class VideoConfigTab extends Component<{ token: string }, VideoConfigState> {
  state: VideoConfigState = {
    loading: true,
    saving: false,
    error: null,
    latencyLevel: 2,
    variants: [],
    streamKey: '',
    showStreamKey: false,
    newStreamKey: '',
    rtmpPort: 1935,
    webPort: 8080,
  };

  componentDidMount() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const config = await api.admin.getConfig(this.props.token) as any;
      const vs = config?.videoSettings || {};
      this.setState({
        loading: false,
        latencyLevel: vs.latencyLevel || 2,
        variants: vs.videoQualityVariants || [defaultVariant()],
        streamKey: config?.streamKey || '',
        rtmpPort: config?.rtmpServerPort || 1935,
        webPort: config?.webServerPort || 8080,
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load config',
        loading: false,
      });
    }
  }

  private handleSave = async () => {
    this.setState({ saving: true, error: null });
    try {
      await api.admin.updateConfig(this.props.token, {
        videoSettings: {
          latencyLevel: this.state.latencyLevel,
          videoQualityVariants: this.state.variants,
        },
      });
      this.setState({ saving: false });
      toast({ title: 'Video configuration saved', description: 'Changes will apply on next stream start.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      this.setState({ saving: false, error: msg });
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    }
  };

  private handleStreamKeyChange = async () => {
    const key = this.state.newStreamKey.trim();
    if (!key) return;
    try {
      await api.admin.setStreamKey(this.props.token, key);
      this.setState({ streamKey: key, newStreamKey: '' });
      toast({ title: 'Stream key updated' });
    } catch (err) {
      toast({ title: 'Failed to update stream key', variant: 'destructive' });
    }
  };

  private updateVariant(index: number, updates: Partial<VideoVariant>) {
    const variants = [...this.state.variants];
    variants[index] = { ...variants[index], ...updates };
    this.setState({ variants });
  }

  private addVariant = () => {
    this.setState({ variants: [...this.state.variants, defaultVariant()] });
  };

  private removeVariant = (index: number) => {
    if (this.state.variants.length <= 1) return;
    const variants = this.state.variants.filter((_, i) => i !== index);
    this.setState({ variants });
  };

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied to clipboard' });
    }).catch(() => {});
  }

  private renderVariantCard(variant: VideoVariant, index: number) {
    const isPassthrough = variant.videoPassthrough;
    const resLabel = isPassthrough
      ? 'Source'
      : variant.scaledWidth === 0
        ? 'Source'
        : `${variant.scaledWidth}×${variant.scaledHeight}`;

    return (
      <Card key={index}>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CardTitle>Output #{index + 1}</CardTitle>
              <Badge variant="secondary">{resLabel}</Badge>
              {isPassthrough && (
                <Badge variant="outline">Passthrough</Badge>
              )}
            </div>
            {this.state.variants.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                onClick={() => this.removeVariant(index)}
              >
                <IconTrash />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div class="space-y-6">
            {/* Video passthrough toggle */}
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div class="pr-4">
                <p class="text-sm font-medium">Video Passthrough</p>
                <p class="text-sm text-muted-foreground mt-0.5">Re-use the inbound stream without re-encoding. Lowest CPU.</p>
              </div>
              <Switch
                checked={variant.videoPassthrough}
                onChange={(checked: boolean) => this.updateVariant(index, { videoPassthrough: checked })}
              />
            </div>

            {!variant.videoPassthrough && (
              <>
                {/* Resolution */}
                <div class="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolution</Label>
                  <div class="flex flex-wrap gap-2">
                    {COMMON_RESOLUTIONS.map((res) => {
                      const isActive = variant.scaledWidth === res.width && variant.scaledHeight === res.height;
                      return (
                        <button
                          key={res.label}
                          class={cn('pill-btn px-4 py-2 rounded-lg text-xs font-medium cursor-pointer', isActive && 'active')}
                          onClick={() => this.updateVariant(index, { scaledWidth: res.width, scaledHeight: res.height })}
                        >
                          {res.label}
                        </button>
                      );
                    })}
                  </div>
                  {variant.scaledWidth > 0 && (
                    <div class="flex gap-3 mt-1">
                      <div class="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Width</Label>
                        <Input
                          type="number"
                          className="h-9 w-28 text-xs tabular-nums"
                          value={String(variant.scaledWidth)}
                          onInput={(e: Event) => this.updateVariant(index, { scaledWidth: parseInt((e.target as HTMLInputElement).value) || 0 })}
                        />
                      </div>
                      <div class="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Height</Label>
                        <Input
                          type="number"
                          className="h-9 w-28 text-xs tabular-nums"
                          value={String(variant.scaledHeight)}
                          onInput={(e: Event) => this.updateVariant(index, { scaledHeight: parseInt((e.target as HTMLInputElement).value) || 0 })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div class="section-divider" />

                {/* Video Bitrate */}
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video Bitrate</Label>
                    <Badge variant="outline" className="tabular-nums font-mono text-xs">{variant.videoBitrate} kbps</Badge>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="6000"
                    step="100"
                    value={String(variant.videoBitrate)}
                    onInput={(e: Event) => this.updateVariant(index, { videoBitrate: parseInt((e.target as HTMLInputElement).value) })}
                  />
                  <div class="flex justify-between text-[10px] text-muted-foreground/40 px-1">
                    <span>200 kbps</span>
                    <span>6000 kbps</span>
                  </div>
                </div>

                {/* Framerate */}
                <div class="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Framerate</Label>
                  <div class="flex flex-wrap gap-2">
                    {[24, 30, 60].map((fps) => {
                      const isActive = variant.framerate === fps;
                      return (
                        <button
                          key={fps}
                          class={cn('pill-btn px-4 py-2 rounded-lg text-xs font-medium cursor-pointer', isActive && 'active')}
                          onClick={() => this.updateVariant(index, { framerate: fps })}
                        >
                          {fps} fps
                        </button>
                      );
                    })}
                    <Input
                      type="number"
                      className="h-9 w-24 text-xs"
                      placeholder="Custom"
                      value={[24, 30, 60].includes(variant.framerate) ? '' : String(variant.framerate)}
                      onInput={(e: Event) => {
                        const v = parseInt((e.target as HTMLInputElement).value);
                        if (v > 0) this.updateVariant(index, { framerate: v });
                      }}
                    />
                  </div>
                </div>

                <div class="section-divider" />

                {/* CPU Usage Level */}
                <div class="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Encoding Speed</Label>
                  <div class="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {CPU_USAGE_LEVELS.map((level) => {
                      const isActive = variant.cpuUsageLevel === level.value;
                      return (
                        <button
                          key={level.value}
                          class={cn('radio-card rounded-lg px-3 py-3 text-center cursor-pointer', isActive && 'active')}
                          onClick={() => this.updateVariant(index, { cpuUsageLevel: level.value })}
                        >
                          <p class={cn('text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{level.label}</p>
                          <p class="text-[10px] text-muted-foreground mt-0.5 leading-tight">{level.description.split(',')[0]}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div class="section-divider" />

            {/* Audio passthrough toggle */}
            <div class="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
              <div class="pr-4">
                <p class="text-sm font-medium text-foreground">Audio Passthrough</p>
                <p class="text-xs text-muted-foreground mt-0.5">Re-use the inbound audio stream without re-encoding.</p>
              </div>
              <Switch
                checked={variant.audioPassthrough}
                onChange={(checked: boolean) => this.updateVariant(index, { audioPassthrough: checked })}
              />
            </div>

            {!variant.audioPassthrough && (
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audio Bitrate</Label>
                  <Badge variant="outline" className="tabular-nums font-mono text-xs">{variant.audioBitrate} kbps</Badge>
                </div>
                <input
                  type="range"
                  min="64"
                  max="320"
                  step="16"
                  value={String(variant.audioBitrate)}
                  onInput={(e: Event) => this.updateVariant(index, { audioBitrate: parseInt((e.target as HTMLInputElement).value) })}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground/40 px-1">
                  <span>64 kbps</span>
                  <span>320 kbps</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  render() {
    const { loading, saving, error, latencyLevel, variants, streamKey, showStreamKey, newStreamKey, rtmpPort } = this.state;

    if (loading) {
      return (
        <div class="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      );
    }

    return (
      <div class="max-w-3xl space-y-6">
        {/* Page header */}
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight">Video Configuration</h1>
          <p class="text-sm text-muted-foreground mt-1">Configure video output quality, latency, and stream key.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stream Key */}
        <Card>
          <CardHeader>
            <CardTitle>Stream Key</CardTitle>
            <CardDescription>Authenticate with your broadcasting software.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div class="flex items-center gap-2">
              <div class="flex-1 relative">
                <Input
                  type={showStreamKey ? 'text' : 'password'}
                  value={streamKey}
                  readOnly
                  className="pr-20 font-mono text-xs"
                />
                <div class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    onClick={() => this.setState({ showStreamKey: !showStreamKey })}
                  >
                    {showStreamKey ? <IconEyeOff /> : <IconEye />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    onClick={() => this.copyToClipboard(streamKey)}
                  >
                    <IconCopy />
                  </Button>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-border bg-muted/30 p-4">
              <p class="text-[11px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">RTMP URL</p>
              <div class="flex items-center gap-2">
                <code class="text-xs text-foreground font-mono bg-background px-3 py-1.5 rounded-lg border border-border flex-1 truncate">
                  rtmp://your-server:{rtmpPort}/live
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => this.copyToClipboard(`rtmp://your-server:${rtmpPort}/live`)}
                >
                  <IconCopy />
                </Button>
              </div>
            </div>

            <div class="section-divider" />

            <div class="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Change Stream Key</Label>
              <div class="flex gap-2">
                <Input
                  type="text"
                  className="flex-1 text-xs"
                  placeholder="Enter new stream key"
                  value={newStreamKey}
                  onInput={(e: Event) => this.setState({ newStreamKey: (e.target as HTMLInputElement).value })}
                />
                <Button size="sm" onClick={this.handleStreamKeyChange} disabled={!newStreamKey.trim()}>
                  Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latency */}
        <Card>
          <CardHeader>
            <CardTitle>Latency</CardTitle>
            <CardDescription>
              Lower latency is better for interactive streams. Higher latency produces better video quality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LATENCY_LEVELS.map((level) => {
                const isActive = latencyLevel === level.value;
                return (
                  <button
                    key={level.value}
                    class={cn('radio-card rounded-xl px-4 py-4 text-left cursor-pointer', isActive && 'active')}
                    onClick={() => this.setState({ latencyLevel: level.value })}
                  >
                    <div class="flex items-center justify-between mb-1">
                      <p class={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{level.label}</p>
                      {isActive && (
                        <span class="size-2.5 rounded-full bg-primary ring-2 ring-primary/30 shrink-0" />
                      )}
                    </div>
                    <p class="text-xs text-muted-foreground leading-relaxed">{level.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Output Variants */}
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-foreground">Output Variants</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Each variant creates a separate quality option for viewers.</p>
          </div>
          <Button variant="outline" size="sm" onClick={this.addVariant} className="gap-1.5">
            <IconPlus />
            Add Variant
          </Button>
        </div>

        <div class="space-y-4">
          {variants.map((variant, i) => this.renderVariantCard(variant, i))}
        </div>

        {/* Save */}
        <div class="flex items-center gap-4 pt-2 pb-8">
          <Button onClick={this.handleSave} disabled={saving} className="px-8">
            {saving ? 'Saving...' : 'Save Video Configuration'}
          </Button>
          <p class="text-xs text-muted-foreground">Changes take effect on next stream start.</p>
        </div>
      </div>
    );
  }
}
