import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Button, Input, Badge, Card, CardHeader, CardTitle, CardContent } from 'blazecn';
import { cn } from 'blazecn';
import {
  getRelayManagerState,
  subscribeRelayManager,
  addRelayToProfile,
  removeRelayFromProfile,
  setActiveProfile,
  createProfile,
  deleteProfile,
  type RelayProfile,
  type RelayManagerState,
} from '../../nostr/stores/relaymanager';
import { getRelayState, subscribeRelay, type RelayState } from '../../nostr/stores/relay';

interface RelayManagerTabState {
  manager: RelayManagerState;
  relayState: RelayState;
  newRelayUrl: string;
  newProfileName: string;
  showAddProfile: boolean;
}

export class RelayManagerTab extends Component<{}, RelayManagerTabState> {
  private unsubManager: (() => void) | null = null;
  private unsubRelay: (() => void) | null = null;

  state: RelayManagerTabState = {
    manager: getRelayManagerState(),
    relayState: getRelayState(),
    newRelayUrl: '',
    newProfileName: '',
    showAddProfile: false,
  };

  componentDidMount() {
    this.unsubManager = subscribeRelayManager(() => {
      this.setState({ manager: getRelayManagerState() });
    });
    this.unsubRelay = subscribeRelay(() => {
      this.setState({ relayState: getRelayState() });
    });
  }

  componentWillUnmount() {
    this.unsubManager?.();
    this.unsubRelay?.();
  }

  private handleAddRelay = (profileId: string) => {
    const url = this.state.newRelayUrl.trim();
    if (!url) return;
    addRelayToProfile(profileId, url);
    this.setState({ newRelayUrl: '' });
  };

  private handleCreateProfile = () => {
    const name = this.state.newProfileName.trim();
    if (!name) return;
    createProfile(name);
    this.setState({ newProfileName: '', showAddProfile: false });
  };

  private getStatusColor(url: string): string {
    const status = this.state.relayState.statuses.get(url);
    switch (status) {
      case 'connected': return 'bg-success';
      case 'connecting': return 'bg-warning';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted-foreground/30';
    }
  }

  private getStatusLabel(url: string): string {
    return this.state.relayState.statuses.get(url) || 'disconnected';
  }

  private renderProfile(profile: RelayProfile, isActive: boolean) {
    return (
      <Card
        key={profile.id}
        className={cn(isActive && 'border-primary/40')}
      >
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                class={cn('text-sm font-semibold cursor-pointer bg-transparent border-none', isActive ? 'text-primary' : 'text-foreground hover:text-primary')}
                onClick={() => setActiveProfile(profile.id)}
              >
                {profile.name}
              </button>
              {isActive && (
                <Badge variant="default">Active</Badge>
              )}
              {profile.builtin && (
                <Badge variant="secondary">Built-in</Badge>
              )}
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline">{profile.relays.length} relays</Badge>
              {!profile.builtin && (
                <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={() => deleteProfile(profile.id)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-1.5 mb-3">
            {profile.relays.length === 0 ? (
              <p class="text-xs text-muted-foreground italic">No relays configured</p>
            ) : (
              profile.relays.map((url) => (
                <div key={url} class="flex items-center justify-between group px-2 py-1.5 rounded-md bg-background">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class={cn('size-2 rounded-full shrink-0', this.getStatusColor(url))} />
                    <span class="text-xs text-foreground truncate">{url}</span>
                    <Badge variant="ghost" className="text-[10px] px-0">{this.getStatusLabel(url)}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => removeRelayFromProfile(profile.id, url)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>

          <div class="flex gap-2">
            <Input
              className="flex-1 h-8 text-xs"
              placeholder="wss://relay.example.com"
              value={this.state.newRelayUrl}
              onInput={(e: Event) => this.setState({ newRelayUrl: (e.target as HTMLInputElement).value })}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') this.handleAddRelay(profile.id);
              }}
            />
            <Button size="sm" className="h-8" onClick={() => this.handleAddRelay(profile.id)}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  render() {
    const { manager, showAddProfile, newProfileName } = this.state;

    return (
      <div>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-foreground tracking-tight">Relay Manager</h1>
            <p class="text-sm text-muted-foreground mt-1">Manage relay profiles and connections.</p>
          </div>
          <Button
            variant={showAddProfile ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => this.setState({ showAddProfile: !showAddProfile })}
          >
            {showAddProfile ? 'Cancel' : '+ New Profile'}
          </Button>
        </div>

        <p class="text-sm text-muted-foreground mb-4">
          Manage relay profiles for your Nostr identity. Outbox relays are where you publish events.
          Inbox relays are where others can find your posts. Indexers are used for bootstrapping.
        </p>

        {showAddProfile && (
          <div class="flex gap-2 mb-4">
            <Input
              className="flex-1"
              placeholder="Profile name"
              value={newProfileName}
              onInput={(e: Event) => this.setState({ newProfileName: (e.target as HTMLInputElement).value })}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') this.handleCreateProfile();
              }}
            />
            <Button onClick={this.handleCreateProfile}>
              Create
            </Button>
          </div>
        )}

        <div class="space-y-4">
          {manager.profiles.map((profile) =>
            this.renderProfile(profile, profile.id === manager.activeProfileId)
          )}
        </div>
      </div>
    );
  }
}
