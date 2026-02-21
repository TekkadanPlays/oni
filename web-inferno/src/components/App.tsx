import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Spinner, Button, Card, CardContent, Alert, AlertDescription, Drawer, DrawerContent, DrawerHeader, DrawerTitle, Toaster } from 'blazecn';
import { store, AppState } from '../store';
import { Header } from './Header';
import { VideoPlayer } from './VideoPlayer';
import { OfflineBanner } from './OfflineBanner';
import { Statusbar } from './Statusbar';
import { ChatContainer } from './ChatContainer';
import { Footer } from './Footer';
import { getAuthState, subscribeAuth, restoreSession, resetAllStores } from '../nostr/stores/auth';
import { signWithExtension } from '../nostr/nip07';
import { bootstrapUser } from '../nostr/stores/bootstrap';
import { loadRelayManager, syncPoolToActiveProfile } from '../nostr/stores/relaymanager';
import { discoverIndexers } from '../nostr/stores/indexers';
import { connectRelays, getPool } from '../nostr/stores/relay';
import { loadLiveEventsEnabled, onStreamStart, onStreamEnd, getLiveEventState } from '../nostr/stores/liveevents';

interface AppComponentState {
  loading: boolean;
  error: string | null;
  online: boolean;
  chatVisible: boolean;
  chatDisabled: boolean;
  isMobile: boolean;
  name: string;
  streamTitle: string;
  offlineMessage: string;
  lastDisconnectTime: string;
  logo: string;
}

export class App extends Component<{}, AppComponentState> {
  private unsub: (() => void) | null = null;
  private unsubAuth: (() => void) | null = null;
  private lastPubkey: string | null = null;
  private wasOnline: boolean = false;

  state: AppComponentState = {
    loading: true,
    error: null,
    online: false,
    chatVisible: true,
    chatDisabled: false,
    isMobile: window.innerWidth <= 768,
    name: '',
    streamTitle: '',
    offlineMessage: '',
    lastDisconnectTime: '',
    logo: '',
  };

  private updateAuthSigner() {
    const auth = getAuthState();
    const pool = getPool();
    if (auth.pubkey) {
      pool.setAuthSigner((unsigned) => signWithExtension(unsigned));
    } else {
      pool.setAuthSigner(null);
    }
  }

  private onAuthChange() {
    const auth = getAuthState();
    this.updateAuthSigner();

    // Detect account switch
    if (auth.pubkey && this.lastPubkey && auth.pubkey !== this.lastPubkey) {
      resetAllStores();
    }
    this.lastPubkey = auth.pubkey;

    if (auth.pubkey) {
      bootstrapUser(auth.pubkey).catch((err) =>
        console.warn('[oni] Bootstrap error:', err)
      );
    }
  }

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      const newOnline = s.status?.online || false;
      const wasOnline = this.wasOnline;

      this.setState({
        loading: s.loading,
        error: s.error,
        online: newOnline,
        chatVisible: s.chatVisible,
        chatDisabled: s.config?.chatDisabled || false,
        isMobile: s.isMobile,
        name: s.config?.name || '',
        streamTitle: s.status?.streamTitle || '',
        offlineMessage: s.config?.offlineMessage || '',
        lastDisconnectTime: s.status?.lastDisconnectTime || '',
        logo: s.config?.logo || '',
      });

      // NIP-53: auto-publish live events on stream state change
      if (newOnline && !wasOnline) {
        this.wasOnline = true;
        onStreamStart(
          s.status?.streamTitle || s.config?.name || 'Live Stream',
          s.status?.viewerCount || 0,
        );
      } else if (!newOnline && wasOnline) {
        this.wasOnline = false;
        onStreamEnd();
      }
    });

    // Initialize Nostr identity system
    this.unsubAuth = subscribeAuth(() => this.onAuthChange());
    loadRelayManager();
    syncPoolToActiveProfile();
    loadLiveEventsEnabled();

    // Start indexer discovery early
    discoverIndexers(10).catch((err) =>
      console.warn('[oni] Indexer discovery error:', err)
    );

    // Restore session and connect relays
    restoreSession();
    this.updateAuthSigner();
    connectRelays().then(() => {
      this.onAuthChange();
    }).catch((err) => console.warn('[oni] Relay connect error:', err));

    window.addEventListener('resize', this.handleResize);
    store.init();
  }

  componentWillUnmount() {
    this.unsub?.();
    this.unsubAuth?.();
    window.removeEventListener('resize', this.handleResize);
    store.cleanup();
  }

  private handleResize = () => {
    store.setMobile(window.innerWidth <= 768);
  };

  render() {
    const {
      loading, error, online, chatVisible, chatDisabled,
      isMobile, name, streamTitle, offlineMessage, lastDisconnectTime, logo,
    } = this.state;

    if (error) {
      return (
        <div class="flex items-center justify-center min-h-screen bg-background">
          <Card className="max-w-sm w-full mx-4 text-center">
            <CardContent className="pt-6">
              <div class="size-12 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <svg class="size-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 class="text-lg font-semibold mb-2">Unable to connect</h2>
              <p class="text-sm text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (loading) {
      return (
        <div class="flex items-center justify-center min-h-screen bg-background">
          <div class="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p class="text-sm text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      );
    }

    const showChat = chatVisible && !chatDisabled && !isMobile;

    return (
      <div class="flex flex-col h-screen bg-background">
        <Header />
        <div class="flex flex-1 min-h-0">
          {/* Main content column */}
          <div class="flex flex-col flex-1 overflow-y-auto">
            {online ? (
              <VideoPlayer
                source="/hls/stream.m3u8"
                online={online}
                title={streamTitle || name}
              />
            ) : (
              <OfflineBanner
                name={name}
                customText={offlineMessage}
                lastDisconnectTime={lastDisconnectTime}
                logo={logo ? '/logo' : undefined}
              />
            )}
            {online && <Statusbar />}
            <div class="flex-1" />
            <Footer />
          </div>
          {/* Chat sidebar */}
          {showChat && (
            <div class="w-[340px] shrink-0 border-l border-border bg-card">
              <ChatContainer />
            </div>
          )}
        </div>
        {/* Mobile chat drawer */}
        <Drawer open={isMobile && !chatDisabled && chatVisible} onOpenChange={(open: boolean) => { if (!open) store.toggleChat(); }}>
          <DrawerHeader>
            <DrawerTitle>Chat</DrawerTitle>
          </DrawerHeader>
          <DrawerContent className="h-[70vh]">
            <ChatContainer />
          </DrawerContent>
        </Drawer>
        <Toaster />
      </div>
    );
  }
}
