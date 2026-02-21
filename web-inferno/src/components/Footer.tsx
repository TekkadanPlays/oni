import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Badge, Separator, Button } from 'blazecn';
import { store, AppState } from '../store';

interface FooterState {
  config: AppState['config'];
}

export class Footer extends Component<{}, FooterState> {
  private unsub: (() => void) | null = null;

  state: FooterState = {
    config: store.getState().config,
  };

  componentDidMount() {
    this.unsub = store.subscribe(() => {
      this.setState({ config: store.getState().config });
    });
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  render() {
    const { config } = this.state;
    const hasSummary = !!config?.summary;
    const hasTags = config?.tags && config.tags.length > 0;
    const hasSocial = config?.socialHandles && config.socialHandles.length > 0;
    const hasExtra = !!config?.extraPageContent;

    return (
      <footer id="footer" class="border-t border-border/30 mt-auto">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          {/* About + Social + Tags */}
          {(hasSummary || hasSocial || hasTags || hasExtra) && (
            <div class="mb-6 max-w-2xl">
              {hasSummary && (
                <p class="text-sm text-muted-foreground leading-relaxed mb-4">{config!.summary}</p>
              )}
              {hasSocial && (
                <div class="flex flex-wrap gap-2 mb-4">
                  {config!.socialHandles.map((handle) => (
                    <a key={handle.platform} href={handle.url} target="_blank" rel="noopener noreferrer" class="no-underline">
                      <Button variant="outline" size="sm" className="gap-2">
                        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {handle.platform}
                      </Button>
                    </a>
                  ))}
                </div>
              )}
              {hasTags && (
                <div class="flex flex-wrap gap-1.5 mb-4">
                  {config!.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                  ))}
                </div>
              )}
              {hasExtra && (
                <div class="text-sm text-muted-foreground mb-4 [&_a]:text-foreground [&_a]:underline" innerHTML={config!.extraPageContent} />
              )}
            </div>
          )}

          {/* Bottom bar — matches mycelium.social footer */}
          <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between text-sm text-muted-foreground">
            <div class="flex items-center gap-2">
              <span class="text-xl">🔥</span>
              <span class="font-medium text-foreground/80">oni</span>
              <span class="text-border">·</span>
              <span class="text-xs">Part of{' '}
                <a href="https://mycelium.social" target="_blank" rel="noopener noreferrer" class="hover:text-foreground transition-colors">mycelium.social</a>
              </span>
            </div>
            <div class="flex items-center gap-4">
              <a href="/admin" class="text-xs hover:text-foreground transition-colors">Admin</a>
              <a href="https://github.com/TekkadanPlays/oni" target="_blank" rel="noopener noreferrer" class="text-xs hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    );
  }
}
