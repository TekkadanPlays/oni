import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { store, AppState } from '../store';
import { formatViewerCount, formatRelativeTime } from '../utils';

interface StatusbarState {
  status: AppState['status'];
  config: AppState['config'];
}

export class Statusbar extends Component<{}, StatusbarState> {
  private unsub: (() => void) | null = null;

  state: StatusbarState = {
    status: store.getState().status,
    config: store.getState().config,
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      this.setState({ status: s.status, config: s.config });
    });
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  render() {
    const { status, config } = this.state;
    if (!status?.online) return null;

    const title = status.streamTitle || config?.name || '';
    const tags = config?.tags || [];

    return (
      <div class="px-5 py-3 border-b border-white/[0.04]">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            {title && (
              <h2 class="text-sm font-medium text-foreground/90 tracking-tight truncate">{title}</h2>
            )}
            {tags.length > 0 && (
              <div class="flex flex-wrap gap-1.5 mt-2">
                {tags.slice(0, 6).map((tag) => (
                  <span key={tag} class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-muted-foreground/50 border border-white/[0.04]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div class="flex items-center gap-3 text-[11px] text-muted-foreground/40 shrink-0 tabular-nums">
            <span class="inline-flex items-center gap-1">
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {formatViewerCount(status.viewerCount)}
            </span>
            {status.lastConnectTime && (
              <span class="inline-flex items-center gap-1">
                <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatRelativeTime(status.lastConnectTime)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
}
