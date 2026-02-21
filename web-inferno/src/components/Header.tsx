import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { store, AppState } from '../store';
import {
  Button, Badge, Avatar, AvatarImage, AvatarFallback, Spinner,
  ThemeToggle,
} from 'blazecn';
import { cn } from 'blazecn';
import { getAuthState, subscribeAuth, login, logout } from '../nostr/stores/auth';
import { getBootstrapState, subscribeBootstrap } from '../nostr/stores/bootstrap';
import { getDisplayName, getAvatar, fetchProfile, subscribeProfiles } from '../nostr/stores/profiles';
import { npubEncode } from '../nostr/utils';

interface HeaderState {
  config: AppState['config'];
  status: AppState['status'];
  chatVisible: AppState['chatVisible'];
  nostrPubkey: string | null;
  nostrLoading: boolean;
  userMenuOpen: boolean;
  profileVersion: number;
}

export class Header extends Component<{}, HeaderState> {
  private unsub: (() => void) | null = null;
  private unsubAuth: (() => void) | null = null;
  private unsubBootstrap: (() => void) | null = null;
  private unsubProfiles: (() => void) | null = null;
  private menuRef: HTMLDivElement | null = null;

  state: HeaderState = {
    config: store.getState().config,
    status: store.getState().status,
    chatVisible: store.getState().chatVisible,
    nostrPubkey: getAuthState().pubkey,
    nostrLoading: getAuthState().isLoading,
    userMenuOpen: false,
    profileVersion: 0,
  };

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.state.userMenuOpen && this.menuRef && !this.menuRef.contains(e.target as Node)) {
      this.setState({ userMenuOpen: false });
    }
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      this.setState({
        config: s.config,
        status: s.status,
        chatVisible: s.chatVisible,
      });
    });

    this.unsubAuth = subscribeAuth(() => {
      const auth = getAuthState();
      this.setState({
        nostrPubkey: auth.pubkey,
        nostrLoading: auth.isLoading,
      });
      if (auth.pubkey) fetchProfile(auth.pubkey);
    });

    this.unsubBootstrap = subscribeBootstrap(() => {
      this.setState({ profileVersion: this.state.profileVersion + 1 });
    });

    this.unsubProfiles = subscribeProfiles(() => {
      this.setState({ profileVersion: this.state.profileVersion + 1 });
    });

    const auth = getAuthState();
    if (auth.pubkey) fetchProfile(auth.pubkey);

    document.addEventListener('mousedown', this.handleOutsideClick);
  }

  componentWillUnmount() {
    this.unsub?.();
    this.unsubAuth?.();
    this.unsubBootstrap?.();
    this.unsubProfiles?.();
    document.removeEventListener('mousedown', this.handleOutsideClick);
  }

  private handleLogin = () => { login(); };

  private handleLogout = () => {
    logout();
    this.setState({ userMenuOpen: false });
  };

  render() {
    const { config, status, chatVisible, nostrPubkey, nostrLoading, userMenuOpen } = this.state;
    const name = config?.name || '';
    const online = status?.online || false;
    const viewerCount = status?.viewerCount || 0;

    const displayName = nostrPubkey ? getDisplayName(nostrPubkey) : '';
    const avatarUrl = nostrPubkey ? getAvatar(nostrPubkey) : '';

    return (
      <header class="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
        <div class="mx-auto flex h-14 items-center justify-between px-4 sm:px-6">

          {/* Left: Logo + Name + Nav links */}
          <div class="flex items-center gap-4">
            <a href="/" class="flex items-center gap-2.5 shrink-0">
              <span class="text-xl">🔥</span>
              <span class="text-lg font-bold tracking-tight">{name || 'oni'}</span>
            </a>

            {/* Live badge */}
            {online && (
              <Badge variant="default" className="gap-1.5 bg-success text-success-foreground">
                <span class="size-1.5 rounded-full bg-current live-dot" />
                Live
              </Badge>
            )}

            {/* Viewer count */}
            {online && viewerCount > 0 && (
              <span class="hidden sm:inline text-sm text-muted-foreground tabular-nums">
                {viewerCount.toLocaleString()} watching
              </span>
            )}

            {/* Nav links */}
            <nav class="hidden sm:flex items-center gap-0.5">
              <a
                href="https://mycelium.social"
                target="_blank"
                rel="noopener"
                class="inline-flex h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Mycelium
              </a>
            </nav>
          </div>

          {/* Right: Chat toggle + Theme + Auth */}
          <div class="flex items-center gap-1.5">

            {/* Chat toggle */}
            {!config?.chatDisabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => store.toggleChat()}
                className={cn(
                  'gap-1.5 h-8',
                  chatVisible && 'bg-accent text-accent-foreground'
                )}
              >
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span class="hidden sm:inline text-sm">Chat</span>
              </Button>
            )}

            {/* Theme toggle */}
            <ThemeToggle className="hidden sm:inline-flex size-8" />

            {/* Auth section */}
            {nostrPubkey ? (
              <div
                ref={(el: HTMLDivElement | null) => { this.menuRef = el; }}
                class="relative"
              >
                {/* Pill-shaped user button — matches mycelium.social */}
                <button
                  onClick={() => this.setState({ userMenuOpen: !userMenuOpen })}
                  class="flex items-center gap-2 rounded-full border border-border px-1 py-1 pr-3 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[10px]">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span class="text-sm font-medium max-w-[120px] truncate hidden sm:block">
                    {displayName}
                  </span>
                  <span class="text-xs opacity-40">▾</span>
                </button>

                {/* Dropdown menu — matches mycelium.social profile dropdown */}
                {userMenuOpen && (
                  <div class="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50">
                    {/* Profile card with banner + avatar overlay */}
                    <div class="relative">
                      <div class="h-20 bg-gradient-to-br from-primary/30 via-primary/10 to-muted/50" />
                      <div class="absolute -bottom-5 left-4">
                        <Avatar className="size-10 ring-2 ring-popover">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    {/* Name + pubkey */}
                    <div class="pt-7 pb-3 px-4">
                      <p class="text-sm font-semibold truncate">{displayName}</p>
                      <p class="font-mono text-[10px] text-muted-foreground truncate">
                        {(() => { try { return npubEncode(nostrPubkey).slice(0, 24) + '...'; } catch { return nostrPubkey.slice(0, 24) + '...'; } })()}
                      </p>
                    </div>
                    <div class="border-t border-border" />
                    {/* Admin link */}
                    <div class="py-1">
                      <a
                        href="/admin"
                        onClick={() => this.setState({ userMenuOpen: false })}
                        class="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin Dashboard
                      </a>
                    </div>
                    <div class="border-t border-border" />
                    {/* Sign out */}
                    <div class="py-1">
                      <button
                        onClick={this.handleLogout}
                        class="flex items-center gap-2.5 px-4 py-2 w-full text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
                      >
                        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                onClick={this.handleLogin}
                disabled={nostrLoading}
              >
                {nostrLoading ? 'Connecting...' : 'Sign In'}
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }
}
