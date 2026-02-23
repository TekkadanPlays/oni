import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Badge, Separator, Button } from 'blazecn';
import { cn } from 'blazecn';
import { store, AppState } from '../store';
import { formatViewerCount, formatRelativeTime } from '../utils';
import { getAuthState, subscribeAuth } from '../nostr/stores/auth';
import { getStreamerState, subscribeStreamer, checkStreamer } from '../nostr/stores/streamer';
import { getLiveEventState, subscribeLiveEvents, onStreamStart, onStreamEnd } from '../nostr/stores/liveevents';

interface StatusbarState {
  status: AppState['status'];
  config: AppState['config'];
  isStreamer: boolean;
  isStreamerChecking: boolean;
  pubkey: string | null;
  currentEventId: string | null;
  isPublishing: boolean;
  liveEventsEnabled: boolean;
}

export class Statusbar extends Component<{}, StatusbarState> {
  private unsub: (() => void) | null = null;
  private unsubAuth: (() => void) | null = null;
  private unsubStreamer: (() => void) | null = null;
  private unsubLive: (() => void) | null = null;

  state: StatusbarState = {
    status: store.getState().status,
    config: store.getState().config,
    isStreamer: getStreamerState().isStreamer,
    isStreamerChecking: getStreamerState().isChecking,
    pubkey: getAuthState().pubkey,
    currentEventId: getLiveEventState().currentEvent?.id || null,
    isPublishing: getLiveEventState().isPublishing,
    liveEventsEnabled: getLiveEventState().enabled,
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      this.setState({ status: s.status, config: s.config });
    });

    this.unsubAuth = subscribeAuth(() => {
      const auth = getAuthState();
      this.setState({ pubkey: auth.pubkey });
      checkStreamer(auth.pubkey);
    });

    this.unsubStreamer = subscribeStreamer(() => {
      const ss = getStreamerState();
      this.setState({ isStreamer: ss.isStreamer, isStreamerChecking: ss.isChecking });
    });

    this.unsubLive = subscribeLiveEvents(() => {
      const le = getLiveEventState();
      this.setState({
        currentEventId: le.currentEvent?.id || null,
        isPublishing: le.isPublishing,
        liveEventsEnabled: le.enabled,
      });
    });

    // Check streamer status on mount
    const auth = getAuthState();
    if (auth.pubkey) checkStreamer(auth.pubkey);
  }

  componentWillUnmount() {
    this.unsub?.();
    this.unsubAuth?.();
    this.unsubStreamer?.();
    this.unsubLive?.();
  }

  private handleBroadcast = () => {
    const { status, config, currentEventId } = this.state;
    if (currentEventId) {
      onStreamEnd();
    } else {
      const title = status?.streamTitle || config?.name || 'Live Stream';
      onStreamStart(title, status?.viewerCount || 0);
    }
  };

  private handleOpenSettings = () => {
    window.open('/admin?tab=nostr-live', '_blank');
  };

  render() {
    const { status, config } = this.state;
    if (!status?.online) return null;

    const title = status.streamTitle || config?.name || '';
    const tags = config?.tags || [];

    return (
      <div class="px-5 py-3.5 border-b border-border/50 bg-card">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            {title && (
              <h2 class="text-[15px] font-semibold text-foreground tracking-tight truncate">{title}</h2>
            )}
            {tags.length > 0 && (
              <div class="flex flex-wrap gap-1.5 mt-2.5">
                {tags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            {/* Streamer controls: Broadcast + Settings */}
            {this.state.isStreamer && (
              <div class="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={this.state.currentEventId ? 'destructive' : 'default'}
                  onClick={this.handleBroadcast}
                  disabled={this.state.isPublishing}
                  className={cn('h-7 text-xs gap-1.5 px-2.5', !this.state.currentEventId && 'bg-primary')}
                >
                  {this.state.isPublishing ? (
                    <svg class="size-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                    </svg>
                  ) : this.state.currentEventId ? (
                    <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                  ) : (
                    <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  )}
                  {this.state.currentEventId ? 'End' : 'Broadcast'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={this.handleOpenSettings}
                  className="h-7 w-7 p-0"
                >
                  <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Button>
              </div>
            )}

            {/* Nostr broadcast indicator (non-streamer sees this if active) */}
            {!this.state.isStreamer && this.state.currentEventId && (
              <Badge variant="outline" className="gap-1.5 text-xs border-primary/30 text-primary">
                <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Nostr
              </Badge>
            )}

            <Badge variant="outline" className="tabular-nums gap-1.5">
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {formatViewerCount(status.viewerCount)}
            </Badge>
            {status.lastConnectTime && (
              <Badge variant="outline" className="tabular-nums gap-1.5">
                <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatRelativeTime(status.lastConnectTime)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }
}
