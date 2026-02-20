import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Input, Button } from 'blazecn';
import { store } from '../store';

interface ChatInputProps {
  onSend: (message: string) => void;
}

interface ChatInputState {
  value: string;
}

export class ChatInput extends Component<ChatInputProps, ChatInputState> {
  state: ChatInputState = { value: '' };

  private handleSubmit = (e: Event) => {
    e.preventDefault();
    const msg = this.state.value.trim();
    if (!msg) return;
    this.props.onSend(msg);
    this.setState({ value: '' });
  };

  private handleInput = (e: Event) => {
    this.setState({ value: (e.target as HTMLInputElement).value });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSubmit(e);
    }
  };

  render() {
    const hasValue = this.state.value.trim().length > 0;

    return (
      <form
        class="flex items-center gap-2 p-3 border-t border-border bg-card/60"
        onSubmit={this.handleSubmit}
      >
        <Input
          className="flex-1 h-9 text-sm"
          placeholder="Send a message..."
          value={this.state.value}
          onInput={this.handleInput}
          onKeyDown={this.handleKeyDown}
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!hasValue}
        >
          <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </Button>
      </form>
    );
  }
}
