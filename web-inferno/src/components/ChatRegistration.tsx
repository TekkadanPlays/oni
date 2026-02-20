import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Input, Button, Spinner } from 'blazecn';
import { store } from '../store';

interface ChatRegistrationState {
  name: string;
  loading: boolean;
  error: string | null;
}

export class ChatRegistration extends Component<{}, ChatRegistrationState> {
  state: ChatRegistrationState = {
    name: '',
    loading: false,
    error: null,
  };

  private handleSubmit = async (e: Event) => {
    e.preventDefault();
    const name = this.state.name.trim();
    if (!name) return;

    this.setState({ loading: true, error: null });
    try {
      await store.registerUser(name);
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Registration failed',
        loading: false,
      });
    }
  };

  private handleInput = (e: Event) => {
    this.setState({ name: (e.target as HTMLInputElement).value });
  };

  render() {
    const { name, loading, error } = this.state;

    return (
      <div class="p-3 border-t border-white/[0.06] glass">
        <form onSubmit={this.handleSubmit}>
          <p class="text-[11px] text-muted-foreground/50 mb-2">
            Pick a name to join the chat
          </p>
          <div class="flex items-center gap-2">
            <Input
              className="flex-1 h-8 text-xs bg-white/[0.03] border-white/[0.06] focus-visible:border-primary/40"
              placeholder="Your name..."
              value={name}
              onInput={this.handleInput}
              disabled={loading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || loading}
              className="h-8 glow-primary"
            >
              {loading ? <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" /> : 'Join'}
            </Button>
          </div>
          {error && (
            <p class="text-[10px] text-destructive/80 mt-1.5">{error}</p>
          )}
        </form>
      </div>
    );
  }
}
