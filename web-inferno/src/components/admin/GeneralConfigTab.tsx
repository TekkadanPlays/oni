import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Input, Textarea, Label, Switch, Button, Spinner, Alert, AlertDescription } from 'blazecn';
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
      setTimeout(() => this.setState({ success: null }), 3000);
    } catch (err) {
      this.setState({
        saving: false,
        error: err instanceof Error ? err.message : 'Failed to save',
      });
    }
  };

  private handleInput = (field: string) => (e: Event) => {
    this.setState({ [field]: (e.target as HTMLInputElement).value } as any);
  };

  render() {
    const { loading, saving, error, success, name, title, summary, tags, offlineMessage, nsfw } = this.state;

    if (loading) {
      return (
        <div class="flex items-center justify-center py-12">
          <Spinner />
        </div>
      );
    }

    return (
      <div>
        <h1 class="text-2xl font-semibold text-foreground mb-6">General Configuration</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4">
            <AlertDescription className="text-success">{success}</AlertDescription>
          </Alert>
        )}

        <div class="space-y-4 max-w-2xl">
          <div class="space-y-1.5">
            <Label>Server Name</Label>
            <Input
              type="text"
              value={name}
              onInput={this.handleInput('name')}
            />
          </div>

          <div class="space-y-1.5">
            <Label>Stream Title</Label>
            <Input
              type="text"
              value={title}
              onInput={this.handleInput('title')}
            />
          </div>

          <div class="space-y-1.5">
            <Label>Summary</Label>
            <Textarea
              className="min-h-[100px]"
              value={summary}
              onInput={this.handleInput('summary')}
            />
          </div>

          <div class="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input
              type="text"
              value={tags}
              onInput={this.handleInput('tags')}
              placeholder="gaming, music, art"
            />
          </div>

          <div class="space-y-1.5">
            <Label>Offline Message</Label>
            <Textarea
              className="min-h-[80px]"
              value={offlineMessage}
              onInput={this.handleInput('offlineMessage')}
              placeholder="Custom message shown when stream is offline"
            />
          </div>

          <div class="flex items-center gap-3">
            <Switch
              checked={nsfw}
              onChange={(checked: boolean) => this.setState({ nsfw: checked })}
            />
            <Label>Mark as NSFW</Label>
          </div>

          <Button
            onClick={this.handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    );
  }
}
