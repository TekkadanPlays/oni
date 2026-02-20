import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Spinner, Button } from 'blazecn';

interface VideoPlayerProps {
  source: string;
  online: boolean;
  title: string;
}

interface VideoPlayerState {
  isLoading: boolean;
  hasError: boolean;
}

export class VideoPlayer extends Component<VideoPlayerProps, VideoPlayerState> {
  private videoRef: HTMLVideoElement | null = null;
  private hlsInstance: any = null;

  state: VideoPlayerState = {
    isLoading: true,
    hasError: false,
  };

  componentDidMount() {
    if (this.props.online) {
      this.initPlayer();
    }
  }

  componentDidUpdate(prevProps: VideoPlayerProps) {
    if (this.props.online && !prevProps.online) {
      this.setState({ isLoading: true, hasError: false });
      this.initPlayer();
    } else if (!this.props.online && prevProps.online) {
      this.destroyPlayer();
    }
  }

  componentWillUnmount() {
    this.destroyPlayer();
  }

  private async initPlayer() {
    const video = this.videoRef;
    if (!video) return;

    const src = this.props.source;

    video.addEventListener('playing', () => {
      this.setState({ isLoading: false });
    }, { once: true });

    // Try native HLS (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
      return;
    }

    // Use hls.js for other browsers
    try {
      const Hls = (await import('hls.js')).default;
      if (Hls.isSupported()) {
        this.hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        this.hlsInstance.loadSource(src);
        this.hlsInstance.attachMedia(video);
        this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        this.hlsInstance.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                this.hlsInstance?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                this.hlsInstance?.recoverMediaError();
                break;
              default:
                this.setState({ hasError: true, isLoading: false });
                this.destroyPlayer();
                break;
            }
          }
        });
      }
    } catch {
      video.src = src;
    }
  }

  private destroyPlayer() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.videoRef) {
      this.videoRef.removeAttribute('src');
      this.videoRef.load();
    }
  }

  render() {
    const { online, title } = this.props;
    const { isLoading, hasError } = this.state;

    if (!online) return null;

    return (
      <div class="relative w-full bg-black aspect-video group">
        <video
          ref={(el: HTMLVideoElement | null) => { this.videoRef = el; }}
          class="w-full h-full object-contain"
          controls
          playsinline
          title={title}
        />
        {/* Loading overlay */}
        {isLoading && !hasError && (
          <div class="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <div class="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p class="text-sm text-muted-foreground">Connecting to stream...</p>
            </div>
          </div>
        )}
        {/* Error overlay */}
        {hasError && (
          <div class="absolute inset-0 flex items-center justify-center bg-black/80">
            <div class="flex flex-col items-center gap-3 text-center px-6">
              <svg class="size-10 text-destructive/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p class="text-sm text-muted-foreground">Unable to load stream</p>
              <Button
                size="sm"
                onClick={() => {
                  this.setState({ isLoading: true, hasError: false });
                  this.initPlayer();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
