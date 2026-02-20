import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Badge, Separator, Tooltip, ScrollArea, Toaster } from 'blazecn';
import { cn } from 'blazecn';
import { store } from '../../store';

export type AdminTab = 'overview' | 'general' | 'video' | 'chat' | 'logs' | 'viewers' | 'tokens' | 'nostr' | 'relays';

interface AdminShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: any;
}

interface AdminShellState {
  online: boolean;
  name: string;
  streamTitle: string;
  viewerCount: number;
}

// Compact SVG icon components
const I = (d: string) => () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d={d} />
  </svg>
);

const IconHome = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconSettings = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconVideo = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const IconChat = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconUsers = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconFileText = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconKey = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const IconZap = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconRadio = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);
const IconArrowLeft = () => (
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconExternalLink = () => (
  <svg class="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

type MenuSection = {
  section: string;
  items: { id: AdminTab; label: string; icon: () => any }[];
};

const MENU: MenuSection[] = [
  {
    section: '',
    items: [
      { id: 'overview', label: 'Home', icon: IconHome },
      { id: 'viewers', label: 'Viewers', icon: IconUsers },
    ],
  },
  {
    section: 'Configuration',
    items: [
      { id: 'general', label: 'General', icon: IconSettings },
      { id: 'video', label: 'Video', icon: IconVideo },
      { id: 'chat', label: 'Chat', icon: IconChat },
    ],
  },
  {
    section: 'Nostr',
    items: [
      { id: 'nostr', label: 'Identity', icon: IconZap },
      { id: 'relays', label: 'Relay Manager', icon: IconRadio },
    ],
  },
  {
    section: 'Advanced',
    items: [
      { id: 'logs', label: 'Logs', icon: IconFileText },
      { id: 'tokens', label: 'Access Tokens', icon: IconKey },
    ],
  },
];

export class AdminShell extends Component<AdminShellProps, AdminShellState> {
  private unsub: (() => void) | null = null;

  state: AdminShellState = {
    online: false,
    name: '',
    streamTitle: '',
    viewerCount: 0,
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      this.setState({
        online: s.status?.online || false,
        name: s.config?.name || '',
        streamTitle: s.status?.streamTitle || '',
        viewerCount: s.status?.viewerCount || 0,
      });
    });
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  render() {
    const { activeTab, onTabChange, children } = this.props;
    const { online, name, streamTitle, viewerCount } = this.state;

    return (
      <div class="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <aside class="w-56 shrink-0 border-r border-border/60 bg-card/80 backdrop-blur-sm flex flex-col">
          {/* Brand */}
          <div class="px-4 py-4 border-b border-border/40">
            <div class="flex items-center gap-3">
              <div class="size-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                <svg class="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-[13px] font-bold text-foreground leading-none tracking-tight">Oni</p>
                <p class="text-[10px] text-muted-foreground/70 truncate mt-0.5">{name || 'Streaming Server'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2 px-2">
            {MENU.map((group, gi) => (
              <div key={group.section}>
                {gi > 0 && <div class="my-2" />}
                {group.section && (
                  <p class="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold px-3 mb-1 mt-1">
                    {group.section}
                  </p>
                )}
                <div class="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        class={cn(
                          'w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150',
                          isActive
                            ? 'bg-primary/15 text-primary font-medium shadow-sm shadow-primary/5'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                        )}
                        onClick={() => onTabChange(item.id)}
                      >
                        <span class={cn(isActive ? 'text-primary' : 'text-muted-foreground/60')}>
                          <Icon />
                        </span>
                        {item.label}
                        {isActive && <span class="ml-auto w-1 h-4 rounded-full bg-primary/60" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Sidebar footer */}
          <div class="px-2 py-2 border-t border-border/30">
            <button
              class="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] text-muted-foreground/60 hover:text-foreground hover:bg-accent/60 transition-all duration-150"
              onClick={() => { window.location.href = '/'; }}
            >
              <IconArrowLeft />
              Back to stream
              <span class="ml-auto"><IconExternalLink /></span>
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <div class="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header class="h-12 shrink-0 border-b border-border/40 bg-card/40 backdrop-blur-sm flex items-center justify-between px-6 gap-4">
            <p class="text-[13px] text-muted-foreground/70 truncate min-w-0">
              {streamTitle || name || 'Oni Streaming Server'}
            </p>
            <div class="flex items-center gap-2.5 shrink-0">
              {online && viewerCount > 0 && (
                <span class="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                  <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  {viewerCount}
                </span>
              )}
              <div class={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                online
                  ? 'bg-success/10 text-success ring-1 ring-success/20'
                  : 'bg-muted text-muted-foreground ring-1 ring-border/50'
              )}>
                <span class={cn(
                  'size-1.5 rounded-full',
                  online ? 'bg-success animate-pulse' : 'bg-muted-foreground/50'
                )} />
                {online ? 'Live' : 'Offline'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main class="flex-1 overflow-y-auto">
            <div class="max-w-5xl mx-auto px-6 py-6">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </div>
    );
  }
}
