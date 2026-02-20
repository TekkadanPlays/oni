import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Button, Badge, Separator } from 'blazecn';
import { store, AppState } from '../store';
import { ChatMessageItem } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatRegistration } from './ChatRegistration';
import type { ChatMessage } from '../types';

interface ChatContainerState {
  messages: ChatMessage[];
  currentUser: AppState['currentUser'];
  chatDisabled: boolean;
  showScrollBtn: boolean;
}

export class ChatContainer extends Component<{}, ChatContainerState> {
  private unsub: (() => void) | null = null;
  private messagesEndRef: HTMLDivElement | null = null;
  private scrollContainerRef: HTMLDivElement | null = null;
  private shouldAutoScroll = true;

  state: ChatContainerState = {
    messages: store.getState().messages,
    currentUser: store.getState().currentUser,
    chatDisabled: store.getState().config?.chatDisabled || false,
    showScrollBtn: false,
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      const s = store.getState();
      this.setState({
        messages: s.messages,
        currentUser: s.currentUser,
        chatDisabled: s.config?.chatDisabled || false,
      });
    });
  }

  componentDidUpdate(_prevProps: {}, prevState: ChatContainerState) {
    if (prevState.messages.length !== this.state.messages.length && this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  private scrollToBottom() {
    if (this.messagesEndRef) {
      this.messagesEndRef.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private handleScroll = (e: Event) => {
    const el = e.target as HTMLDivElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    this.shouldAutoScroll = atBottom;
    this.setState({ showScrollBtn: !atBottom });
  };

  private handleSend = (body: string) => {
    store.sendChat(body);
  };

  render() {
    const { messages, currentUser, chatDisabled, showScrollBtn } = this.state;

    if (chatDisabled) return null;

    return (
      <div class="flex flex-col h-full">
        {/* Chat header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60">
          <div class="flex items-center gap-2.5">
            <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 class="text-[13px] font-semibold text-foreground">Chat</h2>
          </div>
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-[10px] tabular-nums">{messages.length}</Badge>
          )}
        </div>

        {/* Messages */}
        <div
          ref={(el: HTMLDivElement | null) => { this.scrollContainerRef = el; }}
          class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
          onScroll={this.handleScroll}
        >
          {messages.length === 0 && (
            <div class="flex flex-col items-center justify-center h-full px-6 text-center">
              <svg class="size-10 text-muted-foreground/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p class="text-sm font-medium text-muted-foreground/50">No messages yet</p>
              <p class="text-xs text-muted-foreground/30 mt-1">Be the first to say something</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              isModerator={currentUser?.isModerator}
            />
          ))}
          <div ref={(el: HTMLDivElement | null) => { this.messagesEndRef = el; }} />
        </div>

        {/* Scroll to bottom pill */}
        {showScrollBtn && (
          <div class="relative">
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <Button
                size="sm"
                onClick={() => {
                  this.shouldAutoScroll = true;
                  this.scrollToBottom();
                }}
                className="rounded-full shadow-lg px-4"
              >
                New messages ↓
              </Button>
            </div>
          </div>
        )}

        {/* Input area */}
        {currentUser ? (
          <ChatInput onSend={this.handleSend} />
        ) : (
          <ChatRegistration />
        )}
      </div>
    );
  }
}
