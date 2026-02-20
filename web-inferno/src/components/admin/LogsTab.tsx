import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import {
  Button, Badge, Card, CardHeader, CardTitle, CardContent,
  Alert, AlertDescription, Skeleton, Separator,
} from 'blazecn';
import { cn } from 'blazecn';
import { api } from '../../api';

const IconFileText = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconRefresh = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconAlertTriangle = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconChevronDown = () => (
  <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  message: string;
  level: string;
  time: string;
  [key: string]: any;
}

interface LogsTabState {
  loading: boolean;
  error: string | null;
  logs: LogEntry[];
  warnings: LogEntry[];
  activeView: 'logs' | 'warnings';
  filterLevel: LogLevel;
  autoScroll: boolean;
  search: string;
}

export class LogsTab extends Component<{ token: string }, LogsTabState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private scrollRef: HTMLDivElement | null = null;

  state: LogsTabState = {
    loading: true,
    error: null,
    logs: [],
    warnings: [],
    activeView: 'logs',
    filterLevel: 'all',
    autoScroll: true,
    search: '',
  };

  componentDidMount() {
    this.loadData();
    this.pollTimer = setInterval(() => this.loadData(), 5000);
  }

  componentWillUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  componentDidUpdate(_prevProps: any, prevState: LogsTabState) {
    if (this.state.autoScroll && this.scrollRef && prevState.logs.length !== this.state.logs.length) {
      this.scrollRef.scrollTop = this.scrollRef.scrollHeight;
    }
  }

  private async loadData() {
    try {
      const [logs, warnings] = await Promise.all([
        api.admin.getLogEntries(this.props.token).catch(() => []),
        api.admin.getWarnings(this.props.token).catch(() => []),
      ]);
      this.setState({
        loading: false,
        error: null,
        logs: Array.isArray(logs) ? logs : [],
        warnings: Array.isArray(warnings) ? warnings : [],
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load logs',
        loading: false,
      });
    }
  }

  private handleRefresh = () => {
    this.loadData();
  };

  private getFilteredLogs(): LogEntry[] {
    const { logs, warnings, activeView, filterLevel, search } = this.state;
    let entries = activeView === 'warnings' ? warnings : logs;

    if (filterLevel !== 'all') {
      entries = entries.filter((e) => e.level === filterLevel);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.message?.toLowerCase().includes(q));
    }

    return entries;
  }

  private getLevelColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'error': return 'text-destructive';
      case 'warn': case 'warning': return 'text-warning';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-muted-foreground/50';
      default: return 'text-foreground';
    }
  }

  private getLevelBadge(level: string) {
    const colors: Record<string, string> = {
      error: 'bg-destructive/10 text-destructive border-destructive/20',
      warn: 'bg-warning/10 text-warning border-warning/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      debug: 'bg-muted text-muted-foreground border-border/50',
    };
    const cls = colors[level?.toLowerCase()] || 'bg-muted text-muted-foreground border-border/50';
    return (
      <span class={cn('inline-flex items-center px-1.5 py-0 rounded text-[9px] font-mono uppercase border', cls)}>
        {(level || 'log').slice(0, 4)}
      </span>
    );
  }

  private formatLogTime(time: string): string {
    try {
      const d = new Date(time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return time || '';
    }
  }

  render() {
    const { loading, error, activeView, filterLevel, autoScroll, search, warnings } = this.state;
    const filtered = this.getFilteredLogs();

    if (loading && this.state.logs.length === 0) {
      return (
        <div class="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      );
    }

    return (
      <div>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-xl font-bold text-foreground tracking-tight">Logs</h1>
            <p class="text-[13px] text-muted-foreground/60 mt-0.5">Server logs and warnings.</p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={this.handleRefresh}>
              <IconRefresh />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tab switcher */}
        <div class="flex items-center gap-1 mb-4 p-1 bg-muted/30 rounded-lg w-fit">
          <button
            class={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeView === 'logs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => this.setState({ activeView: 'logs' })}
          >
            All Logs
          </button>
          <button
            class={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              activeView === 'warnings' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => this.setState({ activeView: 'warnings' })}
          >
            <IconAlertTriangle />
            Warnings
            {warnings.length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">{warnings.length}</Badge>
            )}
          </button>
        </div>

        {/* Filters */}
        <div class="flex items-center gap-3 mb-3">
          <div class="flex items-center gap-1">
            {(['all', 'error', 'warn', 'info', 'debug'] as LogLevel[]).map((level) => (
              <button
                key={level}
                class={cn(
                  'px-2 py-1 rounded text-[10px] font-medium transition-colors uppercase',
                  filterLevel === level
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30'
                )}
                onClick={() => this.setState({ filterLevel: level })}
              >
                {level}
              </button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-5" />
          <input
            type="text"
            class="h-7 px-2 text-xs bg-background border border-border/40 rounded-md text-foreground placeholder:text-muted-foreground/40 flex-1 max-w-xs outline-none focus:border-primary/50"
            placeholder="Search logs..."
            value={search}
            onInput={(e: Event) => this.setState({ search: (e.target as HTMLInputElement).value })}
          />
          <label class="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              class="accent-primary"
              onChange={(e: Event) => this.setState({ autoScroll: (e.target as HTMLInputElement).checked })}
            />
            Auto-scroll
          </label>
        </div>

        {/* Log entries */}
        <div
          ref={(el: HTMLDivElement | null) => { this.scrollRef = el; }}
          class="rounded-xl border border-border/40 bg-card/30 overflow-hidden"
        >
          <div
            class="overflow-y-auto font-mono text-[11px] leading-relaxed"
            style={{ 'max-height': '600px' }}
          >
            {filtered.length === 0 ? (
              <div class="text-center py-12">
                <div class="size-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <IconFileText />
                </div>
                <p class="text-sm text-muted-foreground">No log entries</p>
                <p class="text-[11px] text-muted-foreground/50 mt-1">
                  {search ? 'Try a different search term.' : 'Logs will appear here as the server runs.'}
                </p>
              </div>
            ) : (
              filtered.map((entry, i) => (
                <div
                  key={i}
                  class={cn(
                    'flex items-start gap-2 px-3 py-1.5 hover:bg-muted/20 transition-colors border-b border-border/10',
                    entry.level === 'error' && 'bg-destructive/5',
                    entry.level === 'warn' || entry.level === 'warning' ? 'bg-warning/5' : '',
                  )}
                >
                  <span class="text-muted-foreground/40 shrink-0 w-16 text-right tabular-nums">
                    {this.formatLogTime(entry.time)}
                  </span>
                  <span class="shrink-0 mt-0.5">
                    {this.getLevelBadge(entry.level)}
                  </span>
                  <span class={cn('flex-1 break-all', this.getLevelColor(entry.level))}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <p class="text-[10px] text-muted-foreground/30 mt-3 text-center">
          Showing {filtered.length} entries · Auto-refreshes every 5 seconds
        </p>
      </div>
    );
  }
}
