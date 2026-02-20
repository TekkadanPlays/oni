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
      <Card key={index} className="py-4 gap-3">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CardTitle className="text-sm">
                Output #{index + 1}
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{resLabel}</Badge>
              {isPassthrough && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Passthrough</Badge>
              )}
            </div>
            {this.state.variants.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => this.removeVariant(index)}
              >
                <IconTrash />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-5">
            {/* Video passthrough toggle */}
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">Video Passthrough</p>
                <p class="text-[11px] text-muted-foreground">Re-use the inbound video stream without re-encoding. Lowest CPU usage.</p>
              </div>
              <Switch
                checked={variant.videoPassthrough}
                onChange={(checked: boolean) => this.updateVariant(index, { videoPassthrough: checked })}
              />
            </div>

            {!variant.videoPassthrough && (
              <>
                <Separator />

                {/* Resolution */}
                <div class="space-y-2">
                  <Label>Resolution</Label>
                  <div class="flex flex-wrap gap-2">
                    {COMMON_RESOLUTIONS.map((res) => {
                      const isActive = variant.scaledWidth === res.width && variant.scaledHeight === res.height;
                      return (
                        <button
                          key={res.label}
                          class={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                            isActive
                              ? 'bg-primary/15 text-primary border-primary/30'
                              : 'bg-background text-muted-foreground border-border/50 hover:bg-accent hover:text-foreground'
                          )}
                          onClick={() => this.updateVariant(index, { scaledWidth: res.width, scaledHeight: res.height })}
                        >
                          {res.label}
                        </button>
                      );
                    })}
                  </div>
                  {variant.scaledWidth > 0 && (
                    <div class="flex gap-3 mt-2">
                      <div class="space-y-1">
                        <Label className="text-[11px]">Width</Label>
                        <Input
                          type="number"
                          className="h-8 w-24 text-xs"
                          value={String(variant.scaledWidth)}
                          onInput={(e: Event) => this.updateVariant(index, { scaledWidth: parseInt((e.target as HTMLInputElement).value) || 0 })}
                        />
                      </div>
                      <div class="space-y-1">
                        <Label className="text-[11px]">Height</Label>
                        <Input
                          type="number"
                          className="h-8 w-24 text-xs"
                          value={String(variant.scaledHeight)}
                          onInput={(e: Event) => this.updateVariant(index, { scaledHeight: parseInt((e.target as HTMLInputElement).value) || 0 })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Bitrate */}
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Video Bitrate</Label>
                    <span class="text-xs font-mono text-muted-foreground">{variant.videoBitrate} kbps</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="6000"
                    step="100"
                    value={String(variant.videoBitrate)}
                    class="w-full accent-primary"
                    onInput={(e: Event) => this.updateVariant(index, { videoBitrate: parseInt((e.target as HTMLInputElement).value) })}
                  />
                  <div class="flex justify-between text-[10px] text-muted-foreground/50">
                    <span>200 kbps</span>
                    <span>6000 kbps</span>
                  </div>
                </div>

                {/* Framerate */}
                <div class="space-y-2">
                  <Label>Framerate</Label>
                  <div class="flex flex-wrap gap-2">
                    {[24, 30, 60].map((fps) => {
                      const isActive = variant.framerate === fps;
                      return (
                        <button
                          key={fps}
                          class={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                            isActive
                              ? 'bg-primary/15 text-primary border-primary/30'
                              : 'bg-background text-muted-foreground border-border/50 hover:bg-accent hover:text-foreground'
                          )}
                          onClick={() => this.updateVariant(index, { framerate: fps })}
                        >
                          {fps} fps
                        </button>
                      );
                    })}
                    <Input
                      type="number"
                      className="h-8 w-20 text-xs"
                      placeholder="Custom"
                      value={[24, 30, 60].includes(variant.framerate) ? '' : String(variant.framerate)}
                      onInput={(e: Event) => {
                        const v = parseInt((e.target as HTMLInputElement).value);
                        if (v > 0) this.updateVariant(index, { framerate: v });
                      }}
                    />
                  </div>
                </div>

                {/* CPU Usage Level */}
                <div class="space-y-2">
                  <Label>Encoding Speed</Label>
                  <div class="space-y-1">
                    {CPU_USAGE_LEVELS.map((level) => {
                      const isActive = variant.cpuUsageLevel === level.value;
                      return (
                        <button
                          key={level.value}
                          class={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors border',
                            isActive
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-background text-muted-foreground border-border/30 hover:bg-accent hover:text-foreground'
                          )}
                          onClick={() => this.updateVariant(index, { cpuUsageLevel: level.value })}
                        >
                          <span class="font-medium">{level.label}</span>
                          <span class="text-[10px] text-muted-foreground">{level.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Audio passthrough toggle */}
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">Audio Passthrough</p>
                <p class="text-[11px] text-muted-foreground">Re-use the inbound audio stream without re-encoding.</p>
              </div>
              <Switch
                checked={variant.audioPassthrough}
                onChange={(checked: boolean) => this.updateVariant(index, { audioPassthrough: checked })}
              />
            </div>

            {!variant.audioPassthrough && (
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label>Audio Bitrate</Label>
                  <span class="text-xs font-mono text-muted-foreground">{variant.audioBitrate} kbps</span>
                </div>
                <input
                  type="range"
                  min="64"
                  max="320"
                  step="16"
                  value={String(variant.audioBitrate)}
                  class="w-full accent-primary"
                  onInput={(e: Event) => this.updateVariant(index, { audioBitrate: parseInt((e.target as HTMLInputElement).value) })}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground/50">
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
      <div class="max-w-3xl">
        <div class="mb-6">
          <h1 class="text-xl font-bold text-foreground tracking-tight">Video Configuration</h1>
          <p class="text-[13px] text-muted-foreground/60 mt-0.5">Configure video output quality, latency, and stream key.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stream Key */}
        <Card className="mb-4 py-4 gap-3">
          <CardHeader>
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground/60"><IconKey /></span>
              <CardTitle className="text-sm">Stream Key</CardTitle>
            </div>
            <CardDescription>Your stream key is used to authenticate with your broadcasting software.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
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

              <div class="rounded-lg border border-border/40 bg-muted/20 p-3">
                <p class="text-[11px] text-muted-foreground mb-2 font-medium">RTMP URL for your streaming software:</p>
                <div class="flex items-center gap-2">
                  <code class="text-xs text-foreground font-mono bg-background px-2 py-1 rounded flex-1 truncate">
                    rtmp://your-server:{rtmpPort}/live
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 shrink-0"
                    onClick={() => this.copyToClipboard(`rtmp://your-server:${rtmpPort}/live`)}
                  >
                    <IconCopy />
                  </Button>
                </div>
              </div>

              <Separator />

              <div class="space-y-1.5">
                <Label className="text-[11px]">Change Stream Key</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* Latency */}
        <Card className="mb-4 py-4 gap-3">
          <CardHeader>
            <CardTitle className="text-sm">Latency</CardTitle>
            <CardDescription>
              Lower latency is better for interactive streams. Higher latency produces better video quality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-1">
              {LATENCY_LEVELS.map((level) => {
                const isActive = latencyLevel === level.value;
                return (
                  <button
                    key={level.value}
                    class={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors border',
                      isActive
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-background text-foreground border-border/30 hover:bg-accent'
                    )}
                    onClick={() => this.setState({ latencyLevel: level.value })}
                  >
                    <div class="text-left">
                      <p class="text-sm font-medium">{level.label}</p>
                      <p class="text-[11px] text-muted-foreground">{level.description}</p>
                    </div>
                    {isActive && (
                      <span class="size-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Output Variants */}
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-semibold text-foreground">Output Variants</h2>
            <p class="text-[11px] text-muted-foreground/60">Each variant creates a separate quality option for viewers.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={this.addVariant}>
            <IconPlus />
            Add Variant
          </Button>
        </div>

        <div class="space-y-4 mb-6">
          {variants.map((variant, i) => this.renderVariantCard(variant, i))}
        </div>

        {/* Save */}
        <div class="flex items-center gap-3 pb-8">
          <Button onClick={this.handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Video Configuration'}
          </Button>
          <p class="text-[11px] text-muted-foreground">Changes take effect on next stream start.</p>
        </div>
      </div>
    );
  }
}
