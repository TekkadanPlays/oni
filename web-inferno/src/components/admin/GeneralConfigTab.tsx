import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Input, Textarea, Label, Switch, Button, Alert, AlertDescription, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator, Badge, Skeleton, toast } from 'blazecn';
import { api } from '../../api';

interface SocialHandle {
  platform: string;
  url: string;
}

interface GeneralConfigState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  name: string;
  streamTitle: string;
  summary: string;
  tags: string;
  serverURL: string;
  offlineMessage: string;
  welcomeMessage: string;
  extraPageContent: string;
  nsfw: boolean;
  socialHandles: SocialHandle[];
  newSocialPlatform: string;
  newSocialURL: string;
}

export class GeneralConfigTab extends Component<{ token: string }, GeneralConfigState> {
  state: GeneralConfigState = {
    loading: true,
    saving: false,
    error: null,
    name: '',
    streamTitle: '',
    summary: '',
    tags: '',
    serverURL: '',
    offlineMessage: '',
    welcomeMessage: '',
    extraPageContent: '',
    nsfw: false,
    socialHandles: [],
    newSocialPlatform: '',
    newSocialURL: '',
  };

  componentDidMount() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const config = await api.admin.getConfig(this.props.token) as any;
      const details = config?.instanceDetails || {};
      this.setState({
        loading: false,
        name: details.name || '',
        streamTitle: details.streamTitle || '',
        summary: details.summary || '',
        tags: (details.tags || []).join(', '),
        serverURL: config?.yp?.instanceUrl || '',
        offlineMessage: details.offlineMessage || '',
        welcomeMessage: details.welcomeMessage || '',
        extraPageContent: details.extraPageContent || '',
        nsfw: details.nsfw || false,
        socialHandles: details.socialHandles || [],
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load config',
        loading: false,
      });
    }
  }

  private handleSave = async () => {
    this.setState({ saving: true, error: null });
    try {
      const tagsArray = this.state.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);

      await Promise.all([
        api.admin.setServerName(this.props.token, this.state.name),
        api.admin.setStreamTitle(this.props.token, this.state.streamTitle),
        api.admin.setServerSummary(this.props.token, this.state.summary),
        api.admin.setTags(this.props.token, tagsArray),
        api.admin.setOfflineMessage(this.props.token, this.state.offlineMessage),
        api.admin.setWelcomeMessage(this.props.token, this.state.welcomeMessage),
        api.admin.setNSFW(this.props.token, this.state.nsfw),
        api.admin.setSocialHandles(this.props.token, this.state.socialHandles),
        this.state.serverURL ? api.admin.setServerURL(this.props.token, this.state.serverURL) : Promise.resolve(),
        this.state.extraPageContent ? api.admin.setExtraPageContent(this.props.token, this.state.extraPageContent) : Promise.resolve(),
      ]);
      this.setState({ saving: false });
      toast.success('Configuration saved', { description: 'Your changes have been applied.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      this.setState({ saving: false, error: msg });
      toast.error('Save failed', { description: msg });
    }
  };

  private handleInput = (field: string) => (e: Event) => {
    this.setState({ [field]: (e.target as HTMLInputElement).value } as any);
  };

  private addSocialHandle = () => {
    const platform = this.state.newSocialPlatform.trim();
    const url = this.state.newSocialURL.trim();
    if (!platform || !url) return;
    this.setState({
      socialHandles: [...this.state.socialHandles, { platform, url }],
      newSocialPlatform: '',
      newSocialURL: '',
    });
  };

  private removeSocialHandle = (index: number) => {
    this.setState({
      socialHandles: this.state.socialHandles.filter((_, i) => i !== index),
    });
  };

  render() {
    const { loading, saving, error, name, streamTitle, summary, tags, serverURL, offlineMessage, welcomeMessage, extraPageContent, nsfw, socialHandles, newSocialPlatform, newSocialURL } = this.state;

    if (loading) {
      return (
        <div class="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      );
    }

    return (
      <div class="max-w-3xl space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight">General Configuration</h1>
          <p class="text-sm text-muted-foreground mt-1">Configure your server's public-facing information.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Instance Details */}
        <Card>
          <CardHeader>
            <CardTitle>Instance Details</CardTitle>
            <CardDescription>Basic information about your streaming server.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <Label>Server Name</Label>
                  <Input
                    type="text"
                    value={name}
                    onInput={this.handleInput('name')}
                    placeholder="My Stream"
                  />
                  <p class="text-xs text-muted-foreground">The public name of your server.</p>
                </div>
                <div class="space-y-1.5">
                  <Label>Stream Title</Label>
                  <Input
                    type="text"
                    value={streamTitle}
                    onInput={this.handleInput('streamTitle')}
                    placeholder="What are you streaming?"
                  />
                  <p class="text-xs text-muted-foreground">Shown when your stream is live. Can be changed while streaming.</p>
                </div>
              </div>

              <div class="space-y-1.5">
                <Label>Server URL</Label>
                <Input
                  type="text"
                  value={serverURL}
                  onInput={this.handleInput('serverURL')}
                  placeholder="https://live.mycelium.social"
                />
                <p class="text-xs text-muted-foreground">The public URL of your Oni server. Used for federation and directory listing.</p>
              </div>

              <div class="space-y-1.5">
                <Label>Summary</Label>
                <Textarea
                  className="min-h-[100px]"
                  value={summary}
                  onInput={this.handleInput('summary')}
                  placeholder="Tell viewers about your stream..."
                />
                <p class="text-xs text-muted-foreground">A brief description shown on your stream page.</p>
              </div>

              <div class="space-y-1.5">
                <Label>Tags</Label>
                <Input
                  type="text"
                  value={tags}
                  onInput={this.handleInput('tags')}
                  placeholder="gaming, music, art"
                />
                <p class="text-xs text-muted-foreground">Comma-separated tags to help people discover your stream.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Customize messages shown to viewers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="space-y-1.5">
                <Label>Offline Message</Label>
                <Textarea
                  className="min-h-[80px]"
                  value={offlineMessage}
                  onInput={this.handleInput('offlineMessage')}
                  placeholder="Custom message shown when stream is offline"
                />
                <p class="text-xs text-muted-foreground">Displayed to visitors when you're not streaming.</p>
              </div>

              <Separator />

              <div class="space-y-1.5">
                <Label>Welcome Message</Label>
                <Textarea
                  className="min-h-[80px]"
                  value={welcomeMessage}
                  onInput={this.handleInput('welcomeMessage')}
                  placeholder="Welcome to the stream!"
                />
                <p class="text-xs text-muted-foreground">Shown to viewers when they first join the chat.</p>
              </div>

              <Separator />

              <div class="space-y-1.5">
                <Label>Extra Page Content</Label>
                <Textarea
                  className="min-h-[100px] font-mono text-xs"
                  value={extraPageContent}
                  onInput={this.handleInput('extraPageContent')}
                  placeholder="Markdown or HTML content..."
                />
                <p class="text-xs text-muted-foreground">Additional content displayed below the video player. Supports Markdown.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Handles */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>Links to your social profiles shown on the stream page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {socialHandles.map((handle, i) => (
              <div key={i} class="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0 capitalize">{handle.platform}</Badge>
                <span class="text-sm text-muted-foreground truncate flex-1">{handle.url}</span>
                <Button variant="ghost" size="icon-sm" className="size-7 shrink-0 text-destructive/60 hover:text-destructive" onClick={() => this.removeSocialHandle(i)}>
                  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </Button>
              </div>
            ))}
            <Separator />
            <div class="flex gap-2">
              <Input
                type="text"
                className="w-32 text-xs"
                placeholder="Platform"
                value={newSocialPlatform}
                onInput={(e: Event) => this.setState({ newSocialPlatform: (e.target as HTMLInputElement).value })}
              />
              <Input
                type="text"
                className="flex-1 text-xs"
                placeholder="https://..."
                value={newSocialURL}
                onInput={(e: Event) => this.setState({ newSocialURL: (e.target as HTMLInputElement).value })}
              />
              <Button size="sm" onClick={this.addSocialHandle} disabled={!newSocialPlatform.trim() || !newSocialURL.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Content Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p class="text-sm font-medium">NSFW Content</p>
                <p class="text-sm text-muted-foreground">Mark your stream as containing adult content.</p>
              </div>
              <Switch
                checked={nsfw}
                onChange={(checked: boolean) => this.setState({ nsfw: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div class="flex items-center gap-4 pt-2 pb-8">
          <Button
            onClick={this.handleSave}
            disabled={saving}
            className="px-8"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    );
  }
}
