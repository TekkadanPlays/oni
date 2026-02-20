import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Input, Button, Label, Spinner } from 'blazecn';
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
      <div class="p-3 border-t border-border bg-card/60">
        <form onSubmit={this.handleSubmit}>
          <Label className="text-muted-foreground mb-2">Pick a name to join the chat</Label>
          <div class="flex items-center gap-2">
            <Input
              className="flex-1 h-9 text-sm"
              placeholder="Your name..."
              value={name}
              onInput={this.handleInput}
              disabled={loading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || loading}
              className="h-9 px-5"
            >
              {loading ? <Spinner size="sm" /> : 'Join'}
            </Button>
          </div>
          {error && (
            <p class="text-xs text-destructive mt-2">{error}</p>
          )}
        </form>
      </div>
    );
  }
}
