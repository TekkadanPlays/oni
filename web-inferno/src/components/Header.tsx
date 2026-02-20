import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { store, AppState } from '../store';
import {
  Button, Badge, Avatar, AvatarImage, AvatarFallback, Spinner, Separator,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
  Tooltip,
} from 'blazecn';
import { cn } from 'blazecn';
import { getAuthState, subscribeAuth, login, logout } from '../nostr/stores/auth';
import { getBootstrapState, subscribeBootstrap } from '../nostr/stores/bootstrap';
import { getDisplayName, getAvatar, fetchProfile, subscribeProfiles } from '../nostr/stores/profiles';
import { npubEncode } from '../nostr/utils';

interface HeaderState {
  config: AppState['config'];
  status: AppState['status'];
  currentUser: AppState['currentUser'];
  chatVisible: AppState['chatVisible'];
  nostrPubkey: string | null;
  nostrLoading: boolean;
  nostrError: string | null;
  showDropdown: boolean;
  profileVersion: number;
}

export class Header extends Component<{}, HeaderState> {
  private unsub: (() => void) | null = null;
  private unsubAuth: (() => void) | null = null;
  private unsubBootstrap: (() => void) | null = null;
  private unsubProfiles: (() => void) | null = null;

  state: HeaderState = {
    config: store.getState().config,
    status: store.getState().status,
    currentUser: store.getState().currentUser,
    chatVisible: store.getState().chatVisible,
    nostrPubkey: getAuthState().pubkey,
    nostrLoading: getAuthState().isLoading,
    nostrError: getAuthState().error,
    showDropdown: false,
    profileVersion: 0,
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      this.setState({
        config: s.config,
        status: s.status,
        currentUser: s.currentUser,
        chatVisible: s.chatVisible,
      });
    });

    this.unsubAuth = subscribeAuth(() => {
      const auth = getAuthState();
      this.setState({
        nostrPubkey: auth.pubkey,
        nostrLoading: auth.isLoading,
        nostrError: auth.error,
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
  }

  componentWillUnmount() {
    this.unsub?.();
    this.unsubAuth?.();
    this.unsubBootstrap?.();
    this.unsubProfiles?.();
  }

  private handleLogin = () => { login(); };

  private handleLogout = () => {
    logout();
    this.setState({ showDropdown: false });
  };

  private handleCloseDropdown = () => {
    this.setState({ showDropdown: false });
  };

  render() {
    const { config, status, chatVisible, nostrPubkey, nostrLoading, showDropdown } = this.state;
    const name = config?.name || '';
    const online = status?.online || false;
    const viewerCount = status?.viewerCount || 0;

    const displayName = nostrPubkey ? getDisplayName(nostrPubkey) : '';
    const avatarUrl = nostrPubkey ? getAvatar(nostrPubkey) : '';

    return (
      <header class="glass-strong border-b border-border sticky top-0 z-40">
        <div class="flex items-center justify-between px-4 h-14">
          {/* Left: Logo + Name + Live badge */}
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative shrink-0">
              <div class={cn(
                'rounded-xl p-[2px]',
                online
                  ? 'bg-gradient-to-br from-success via-primary to-success'
                  : 'bg-gradient-to-br from-primary/40 to-primary/20'
              )}>
                <Avatar className="size-9 rounded-[10px] ring-1 ring-black/20">
                  <AvatarImage src="/logo" alt={name} />
                  <AvatarFallback className="rounded-[10px] text-sm font-bold bg-background text-primary">{name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              {online && (
                <span class="absolute -bottom-0.5 -right-0.5">
                  <span class="absolute inset-0 rounded-full bg-success live-ring" />
                  <span class="relative block size-2.5 rounded-full bg-success ring-2 ring-background" />
                </span>
              )}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2.5">
                <h1 class="text-sm font-bold text-foreground tracking-tight truncate">{name}</h1>
                {online && (
                  <Badge className="bg-success/15 text-success border-success/25 px-2 py-0 text-[10px] font-bold uppercase tracking-wider glow-success">
                    <span class="size-1.5 rounded-full bg-success mr-1 live-dot" />
                    Live
                  </Badge>
                )}
              </div>
              {online && viewerCount > 0 && (
                <p class="text-[11px] text-muted-foreground/70 leading-tight mt-0.5 tabular-nums flex items-center gap-1">
                  <svg class="size-3 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {viewerCount.toLocaleString()} watching
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div class="flex items-center gap-1.5">
            {/* Chat toggle */}
            {!config?.chatDisabled && (
              <Tooltip content={chatVisible ? 'Hide chat' : 'Show chat'} side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => store.toggleChat()}
                  className={cn(
                    'gap-1.5 text-xs h-8 rounded-lg',
                    chatVisible
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
                  )}
                >
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span class="hidden sm:inline">Chat</span>
                </Button>
              </Tooltip>
            )}

            <Separator orientation="vertical" className="h-6 mx-1 bg-white/[0.06]" />

            {/* Nostr identity */}
            {nostrPubkey ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e: Event) => {
                    e.stopPropagation();
                    this.setState({ showDropdown: !showDropdown });
                  }}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-all duration-200 border border-transparent hover:border-white/[0.06]"
                >
                  <Avatar className="size-7 ring-1 ring-primary/20">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span class="text-[13px] font-medium text-foreground/90 max-w-[100px] truncate hidden sm:block">
                    {displayName}
                  </span>
                  <svg class={cn('size-3 text-muted-foreground/50 transition-transform duration-200', showDropdown && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent open={showDropdown} onClose={this.handleCloseDropdown} align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal px-3 py-2.5">
                    <div class="flex items-center gap-2.5">
                      <Avatar className="size-9 ring-1 ring-primary/20">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div class="min-w-0">
                        <p class="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
                        <p class="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">
                          {(() => { try { return npubEncode(nostrPubkey); } catch { return nostrPubkey.slice(0, 16) + '...'; } })()}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { window.location.href = '/admin'; }}>
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={this.handleLogout}>
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={this.handleLogin}
                disabled={nostrLoading}
                className="gap-2 h-8 px-4 rounded-lg font-semibold glow-primary"
              >
                {nostrLoading ? (
                  <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                )}
                <span class="text-[13px]">{nostrLoading ? 'Connecting...' : 'Sign In'}</span>
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }
}
