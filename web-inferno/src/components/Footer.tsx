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
      <footer id="footer" class="px-6 py-10 border-t border-border">
        <div class="max-w-2xl mx-auto">
          {/* About section */}
          {hasSummary && (
            <div class="mb-8">
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">About</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">{config!.summary}</p>
            </div>
          )}

          {/* Social links */}
          {hasSocial && (
            <div class="flex flex-wrap gap-2 mb-8">
              {config!.socialHandles.map((handle) => (
                <a
                  key={handle.platform}
                  href={handle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="no-underline"
                >
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

          {/* Tags */}
          {hasTags && (
            <div class="flex flex-wrap gap-1.5 mb-8">
              {config!.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[11px]">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Custom page content */}
          {hasExtra && (
            <div
              class="prose prose-sm prose-invert max-w-none text-muted-foreground mb-8 [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline"
              innerHTML={config!.extraPageContent}
            />
          )}

          {/* Bottom bar */}
          <Separator className="mb-5" />
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Powered by{' '}
              <a href="https://github.com/TekkadanPlays/oni" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 transition-colors">
                Oni
              </a>
              {' · '}
              <a href="https://mycelium.social" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 transition-colors">
                Mycelium
              </a>
            </span>
            <a href="/admin" class="text-muted-foreground hover:text-foreground transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    );
  }
}
