import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Input, Textarea, Label, Switch, Button, Alert, AlertDescription, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator, Badge, Skeleton, toast } from 'blazecn';
import { api } from '../../api';

interface GeneralConfigState {
  config: any;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  name: string;
  title: string;
  summary: string;
  logo: string;
  tags: string;
  offlineMessage: string;
  nsfw: boolean;
}

export class GeneralConfigTab extends Component<{ token: string }, GeneralConfigState> {
  state: GeneralConfigState = {
    config: null,
    loading: true,
    saving: false,
    error: null,
    success: null,
    name: '',
    title: '',
    summary: '',
    logo: '',
    tags: '',
    offlineMessage: '',
    nsfw: false,
  };

  componentDidMount() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const config = await api.admin.getConfig(this.props.token) as any;
      const details = config?.instanceDetails || {};
      this.setState({
        config,
        loading: false,
        name: details.name || '',
        title: details.title || '',
        summary: details.summary || '',
        logo: details.logo || '',
        tags: (details.tags || []).join(', '),
        offlineMessage: details.offlineMessage || '',
        nsfw: details.nsfw || false,
      });
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load config',
        loading: false,
      });
    }
  }

  private handleSave = async () => {
    this.setState({ saving: true, error: null, success: null });
    try {
      const tagsArray = this.state.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);

      await api.admin.updateConfig(this.props.token, {
        instanceDetails: {
          name: this.state.name,
          title: this.state.title,
          summary: this.state.summary,
          logo: this.state.logo,
          tags: tagsArray,
          offlineMessage: this.state.offlineMessage,
          nsfw: this.state.nsfw,
        },
      });
      this.setState({ saving: false, success: 'Configuration saved.' });
      toast({ title: 'Configuration saved', description: 'Your changes have been applied.' });
      setTimeout(() => this.setState({ success: null }), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      this.setState({ saving: false, error: msg });
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    }
  };

  private handleInput = (field: string) => (e: Event) => {
    this.setState({ [field]: (e.target as HTMLInputElement).value } as any);
  };

  render() {
    const { loading, saving, error, success, name, title, summary, tags, offlineMessage, nsfw } = this.state;

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
        {success && (
          <Alert>
            <AlertDescription className="text-success">{success}</AlertDescription>
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
                    value={title}
                    onInput={this.handleInput('title')}
                    placeholder="What are you streaming?"
                  />
                  <p class="text-xs text-muted-foreground">Shown when your stream is live.</p>
                </div>
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

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize what viewers see when your stream is offline.</CardDescription>
          </CardHeader>
          <CardContent>
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
          {success && (
            <Badge variant="outline" className="text-success border-success/30">Saved</Badge>
          )}
        </div>
      </div>
    );
  }
}
