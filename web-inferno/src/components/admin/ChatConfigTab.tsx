import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import {
  Button, Input, Label, Switch, Card, CardHeader, CardTitle, CardDescription, CardContent,
  Alert, AlertDescription, Badge, Skeleton, Separator, Textarea, toast,
} from 'blazecn';
import { api } from '../../api';

const IconChat = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconShield = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconUsers = () => (
  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconSend = () => (
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

interface ChatConfigState {
  loading: boolean;
  error: string | null;
  chatDisabled: boolean;
  chatJoinMessagesEnabled: boolean;
  chatEstablishedUserMode: boolean;
  chatSpamProtectionEnabled: boolean;
  chatSlurFilterEnabled: boolean;
  forbiddenUsernames: string;
  suggestedUsernames: string;
  hideViewerCount: boolean;
  systemMessage: string;
  sendingMessage: boolean;
}

export class ChatConfigTab extends Component<{ token: string }, ChatConfigState> {
  state: ChatConfigState = {
    loading: true,
    error: null,
    chatDisabled: false,
    chatJoinMessagesEnabled: true,
    chatEstablishedUserMode: false,
    chatSpamProtectionEnabled: true,
    chatSlurFilterEnabled: true,
    forbiddenUsernames: '',
    suggestedUsernames: '',
    hideViewerCount: false,
    systemMessage: '',
    sendingMessage: false,
  };

  componentDidMount() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const config = await api.admin.getConfig(this.props.token) as any;
      this.setState({
        loading: false,
        chatDisabled: config?.chatDisabled || false,
        chatJoinMessagesEnabled: config?.chatJoinMessagesEnabled ?? true,
        chatEstablishedUserMode: config?.chatEstablishedUserMode || false,
        chatSpamProtectionEnabled: config?.chatSpamProtectionEnabled ?? true,
        chatSlurFilterEnabled: config?.chatSlurFilterEnabled ?? true,
        forbiddenUsernames: (config?.forbiddenUsernames || []).join('\n'),
        suggestedUsernames: (config?.suggestedUsernames || []).join('\n'),
        hideViewerCount: config?.hideViewerCount || false,
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load config',
        loading: false,
      });
    }
  }

  private async toggleSetting(
    apiCall: (token: string, value: boolean) => Promise<unknown>,
    stateKey: keyof ChatConfigState,
    newValue: boolean,
  ) {
    try {
      await apiCall(this.props.token, newValue);
      this.setState({ [stateKey]: newValue } as any);
      toast.success('Setting updated');
    } catch (err) {
      toast.error('Failed to update setting');
    }
  }

  private handleSaveForbiddenUsernames = async () => {
    try {
      const usernames = this.state.forbiddenUsernames
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);
      await api.admin.updateForbiddenUsernames(this.props.token, usernames);
      toast.success('Forbidden usernames updated');
    } catch {
      toast.error('Failed to save');
    }
  };

  private handleSaveSuggestedUsernames = async () => {
    try {
      const usernames = this.state.suggestedUsernames
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);
      await api.admin.updateSuggestedUsernames(this.props.token, usernames);
      toast.success('Suggested usernames updated');
    } catch {
      toast.error('Failed to save');
    }
  };

  private handleSendSystemMessage = async () => {
    const msg = this.state.systemMessage.trim();
    if (!msg) return;
    this.setState({ sendingMessage: true });
    try {
      await api.admin.sendSystemMessage(this.props.token, msg);
      this.setState({ systemMessage: '', sendingMessage: false });
      toast.success('System message sent');
    } catch {
      this.setState({ sendingMessage: false });
      toast.error('Failed to send message');
    }
  };

  private renderToggle(
    label: string,
    description: string,
    checked: boolean,
    stateKey: keyof ChatConfigState,
    apiCall: (token: string, value: boolean) => Promise<unknown>,
  ) {
    return (
      <div class="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
        <div class="pr-4">
          <p class="text-sm font-medium text-foreground">{label}</p>
          <p class="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
        <Switch
          checked={checked}
          onChange={(val: boolean) => this.toggleSetting(apiCall, stateKey, val)}
        />
      </div>
    );
  }

  render() {
    const {
      loading, error, chatDisabled, chatJoinMessagesEnabled, chatEstablishedUserMode,
      chatSpamProtectionEnabled, chatSlurFilterEnabled, forbiddenUsernames,
      suggestedUsernames, hideViewerCount, systemMessage, sendingMessage,
    } = this.state;

    if (loading) {
      return (
        <div class="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      );
    }

    return (
      <div class="max-w-3xl space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight">Chat Configuration</h1>
          <p class="text-sm text-muted-foreground mt-1">Configure chat settings, moderation, and spam protection.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* System Message */}
        <Card>
          <CardHeader>
            <CardTitle>Send System Message</CardTitle>
            <CardDescription>Broadcast to all connected chat users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex gap-2">
              <Input
                className="flex-1 text-xs"
                placeholder="Type a system message..."
                value={systemMessage}
                onInput={(e: Event) => this.setState({ systemMessage: (e.target as HTMLInputElement).value })}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') this.handleSendSystemMessage();
                }}
              />
              <Button
                size="sm"
                onClick={this.handleSendSystemMessage}
                disabled={!systemMessage.trim() || sendingMessage}
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* General Chat Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              {this.renderToggle(
                'Disable Chat',
                'Completely hide the chat from your stream page.',
                chatDisabled,
                'chatDisabled',
                api.admin.updateChatDisabled,
              )}
              {this.renderToggle(
                'Show Join Messages',
                'Display a message when users join or leave the chat.',
                chatJoinMessagesEnabled,
                'chatJoinMessagesEnabled',
                api.admin.updateChatJoinMessages,
              )}
              {this.renderToggle(
                'Hide Viewer Count',
                'Hide the number of current viewers from the public page.',
                hideViewerCount,
                'hideViewerCount',
                api.admin.updateHideViewerCount,
              )}
            </div>
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card>
          <CardHeader>
            <CardTitle>Moderation</CardTitle>
            <CardDescription>Protect your chat from spam and unwanted content.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              {this.renderToggle(
                'Established User Mode',
                'Only allow users who have been registered for a while to chat. New users will need to wait before they can send messages.',
                chatEstablishedUserMode,
                'chatEstablishedUserMode',
                api.admin.updateChatEstablishedMode,
              )}
              {this.renderToggle(
                'Spam Protection',
                'Automatically detect and block spam messages, including repeated messages and excessive links.',
                chatSpamProtectionEnabled,
                'chatSpamProtectionEnabled',
                api.admin.updateChatSpamProtection,
              )}
              {this.renderToggle(
                'Slur Filter',
                'Automatically filter messages containing known slurs and offensive language.',
                chatSlurFilterEnabled,
                'chatSlurFilterEnabled',
                api.admin.updateChatSlurFilter,
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usernames */}
        <Card>
          <CardHeader>
            <CardTitle>Usernames</CardTitle>
            <CardDescription>Manage forbidden and suggested usernames for chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-5">
              <div class="space-y-2">
                <Label>Forbidden Usernames</Label>
                <p class="text-sm text-muted-foreground">
                  Users will not be able to register with these names. One per line.
                </p>
                <Textarea
                  className="min-h-[80px] text-xs font-mono"
                  placeholder={"admin\nmoderator\nsystem"}
                  value={forbiddenUsernames}
                  onInput={(e: Event) => this.setState({ forbiddenUsernames: (e.target as HTMLTextAreaElement).value })}
                />
                <Button size="sm" variant="secondary" onClick={this.handleSaveForbiddenUsernames}>
                  Save Forbidden List
                </Button>
              </div>

              <Separator />

              <div class="space-y-2">
                <Label>Suggested Usernames</Label>
                <p class="text-sm text-muted-foreground">
                  Suggested names shown to new users when registering. One per line.
                </p>
                <Textarea
                  className="min-h-[80px] text-xs font-mono"
                  placeholder={"Viewer\nChatter\nLurker"}
                  value={suggestedUsernames}
                  onInput={(e: Event) => this.setState({ suggestedUsernames: (e.target as HTMLTextAreaElement).value })}
                />
                <Button size="sm" variant="secondary" onClick={this.handleSaveSuggestedUsernames}>
                  Save Suggested List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
