import { Component, Fragment } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Spinner, Alert, AlertDescription, Card, CardHeader, CardTitle, CardContent, Badge } from 'blazecn';
import { api } from '../../api';
import { formatViewerCount, formatRelativeTime } from '../../utils';

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

  render() {
    const { status, hardware, loading, error } = this.state;

    if (loading) {
      return (
        <div class="flex items-center justify-center py-12">
          <Spinner />
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
    const viewerCount = s?.viewerCount || 0;
    const sessionPeak = s?.sessionPeakViewerCount || 0;
    const lastConnect = s?.lastConnectTime;
    const lastDisconnect = s?.lastDisconnectTime;
    const broadcaster = s?.broadcaster;

    return (
      <div>
        <h1 class="text-2xl font-semibold text-foreground mb-6">Overview</h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p class="text-sm text-muted-foreground mb-1">Status</p>
              <Badge variant={online ? 'default' : 'secondary'} className={online ? 'bg-success text-success-foreground' : ''}>
                {online ? 'Online' : 'Offline'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p class="text-sm text-muted-foreground mb-1">Current Viewers</p>
              <p class="text-lg font-semibold text-foreground">{viewerCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p class="text-sm text-muted-foreground mb-1">Peak Viewers</p>
              <p class="text-lg font-semibold text-foreground">{sessionPeak}</p>
            </CardContent>
          </Card>
        </div>

        {online && broadcaster && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Stream Details</CardTitle>
            </CardHeader>
            <CardContent>
            <div class="grid grid-cols-2 gap-3 text-sm">
              {broadcaster.remoteAddr && (
                <div>
                  <span class="text-muted-foreground">Source: </span>
                  <span class="text-foreground">{broadcaster.remoteAddr}</span>
                </div>
              )}
              {broadcaster.streamDetails && (
                <>
                  <div>
                    <span class="text-muted-foreground">Video: </span>
                    <span class="text-foreground">
                      {broadcaster.streamDetails.videoCodec} @ {broadcaster.streamDetails.videoBitrate} kbps
                    </span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Resolution: </span>
                    <span class="text-foreground">
                      {broadcaster.streamDetails.width}x{broadcaster.streamDetails.height} @ {broadcaster.streamDetails.framerate}fps
                    </span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Audio: </span>
                    <span class="text-foreground">
                      {broadcaster.streamDetails.audioCodec} @ {broadcaster.streamDetails.audioBitrate} kbps
                    </span>
                  </div>
                </>
              )}
              {lastConnect && (
                <div>
                  <span class="text-muted-foreground">Started: </span>
                  <span class="text-foreground">{formatRelativeTime(lastConnect)}</span>
                </div>
              )}
            </div>
            </CardContent>
          </Card>
        )}

        {!online && lastDisconnect && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <p class="text-sm text-muted-foreground">
                Last stream ended {formatRelativeTime(lastDisconnect)}
              </p>
            </CardContent>
          </Card>
        )}

        {hardware && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Hardware</CardTitle>
            </CardHeader>
            <CardContent>
            <div class="grid grid-cols-2 gap-3 text-sm">
              {(hardware as any).cpu?.[0] && (
                <div>
                  <span class="text-muted-foreground">CPU: </span>
                  <span class="text-foreground">{(hardware as any).cpu[0].modelName}</span>
                </div>
              )}
              {(hardware as any).memory && (
                <div>
                  <span class="text-muted-foreground">Memory: </span>
                  <span class="text-foreground">
                    {Math.round((hardware as any).memory.percent)}% used
                  </span>
                </div>
              )}
              {(hardware as any).disk && (
                <div>
                  <span class="text-muted-foreground">Disk: </span>
                  <span class="text-foreground">
                    {Math.round((hardware as any).disk.percent)}% used
                  </span>
                </div>
              )}
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
}
