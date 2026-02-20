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
      <header class="flex items-center justify-between px-4 py-2.5 bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        {/* Left: Logo + Name + Live indicator */}
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative shrink-0">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src="/logo" alt={name} />
              <AvatarFallback className="rounded-lg text-sm">{name.charAt(0)}</AvatarFallback>
            </Avatar>
            {online && (
              <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
            )}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-sm font-semibold text-foreground truncate">{name}</h1>
              {online && (
                <Badge variant="outline" className="border-success/30 text-success bg-success/10 text-[10px] gap-1 px-1.5 py-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            {online && viewerCount > 0 && (
              <p class="text-[11px] text-muted-foreground leading-tight">
                {viewerCount} watching
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
                variant={chatVisible ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => store.toggleChat()}
                className={chatVisible ? 'bg-primary/15 text-primary hover:bg-primary/20' : ''}
              >
                <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </Button>
            </Tooltip>
          )}

          {/* Nostr identity */}
          {nostrPubkey ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e: Event) => {
                  e.stopPropagation();
                  this.setState({ showDropdown: !showDropdown });
                }}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-md hover:bg-accent transition-colors"
              >
                <Avatar className="size-6">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span class="text-xs font-medium text-foreground max-w-[80px] truncate hidden sm:block">
                  {displayName}
                </span>
                <svg class={cn('size-3 text-muted-foreground transition-transform', showDropdown && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent open={showDropdown} onClose={this.handleCloseDropdown} align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <p class="text-xs font-medium text-foreground truncate">{displayName}</p>
                  <p class="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                    {(() => { try { return npubEncode(nostrPubkey); } catch { return nostrPubkey.slice(0, 16) + '...'; } })()}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { window.location.href = '/admin'; }}>
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={this.handleLogout}>
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
            >
              {nostrLoading ? (
                <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {nostrLoading ? 'Connecting...' : 'Sign In'}
            </Button>
          )}
        </div>
      </header>
    );
  }
}
