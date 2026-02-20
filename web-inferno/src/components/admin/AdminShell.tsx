import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Badge, Separator, Toaster } from 'blazecn';
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
  sidebarOpen: boolean;
}

// SVG icon components
const IconHome = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconSettings = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconVideo = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const IconChat = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconUsers = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconFileText = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconKey = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const IconZap = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconRadio = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);
const IconArrowLeft = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

type MenuSection = {
  heading: string;
  items: { id: AdminTab; label: string; icon: () => any }[];
};

const MENU: MenuSection[] = [
  {
    heading: '',
    items: [
      { id: 'overview', label: 'Dashboard', icon: IconHome },
      { id: 'viewers', label: 'Viewers', icon: IconUsers },
    ],
  },
  {
    heading: 'Configuration',
    items: [
      { id: 'general', label: 'General', icon: IconSettings },
      { id: 'video', label: 'Video', icon: IconVideo },
      { id: 'chat', label: 'Chat', icon: IconChat },
    ],
  },
  {
    heading: 'Nostr',
    items: [
      { id: 'nostr', label: 'Identity', icon: IconZap },
      { id: 'relays', label: 'Relays', icon: IconRadio },
    ],
  },
  {
    heading: 'Advanced',
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
    sidebarOpen: false,
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
    const { online, name, viewerCount } = this.state;

    return (
      <div class="min-h-screen bg-background">
        {/* ── Top Header — matches mycelium.social ── */}
        <nav class="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
          <div class="flex h-14 items-center justify-between px-5">
            {/* Left: Logo + Nav */}
            <div class="flex items-center gap-1">
              <a href="/" class="flex items-center gap-2 shrink-0 mr-4">
                <span class="text-xl">🔥</span>
                <span class="font-extrabold text-base tracking-tight">oni</span>
              </a>
              {/* Desktop nav links */}
              <div class="hidden md:flex items-center gap-0.5">
                <a
                  href="/"
                  class="inline-flex h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Stream
                </a>
                <a
                  href="https://app.mycelium.social"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Mycelium
                </a>
              </div>
            </div>

            {/* Right: Status badges */}
            <div class="flex items-center gap-2">
              {online && viewerCount > 0 && (
                <Badge variant="outline" className="tabular-nums gap-1.5">
                  <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  {viewerCount}
                </Badge>
              )}
              <Badge variant={online ? 'default' : 'secondary'} className={cn(
                'gap-1.5',
                online && 'bg-green-600 text-white'
              )}>
                <span class={cn(
                  'size-1.5 rounded-full',
                  online ? 'bg-white live-dot' : 'bg-muted-foreground/50'
                )} />
                {online ? 'Live' : 'Offline'}
              </Badge>
            </div>
          </div>
        </nav>

        <div class="flex">
          {/* ── Sidebar — matches mycelium.social sidebar pattern ── */}
          <aside class="hidden md:block w-52 shrink-0 border-r border-border">
            <div class="sticky top-[57px] py-4 px-3 space-y-4 h-[calc(100vh-57px)] overflow-y-auto">
              {MENU.map((group) => (
                <div key={group.heading}>
                  {group.heading && (
                    <p class="px-3 mb-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/50">
                      {group.heading}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        class={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer',
                          isActive
                            ? 'bg-accent text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
                        )}
                        onClick={() => onTabChange(item.id)}
                      >
                        <span class={cn('text-sm', isActive ? 'text-foreground' : 'text-muted-foreground/60')}>
                          <Icon />
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Back to stream */}
              <Separator />
              <button
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
                onClick={() => { window.location.href = '/'; }}
              >
                <IconArrowLeft />
                Back to stream
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main class="flex-1 min-w-0">
            <div class="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </div>
    );
  }
}
