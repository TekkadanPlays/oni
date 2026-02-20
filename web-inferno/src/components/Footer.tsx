import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Badge, Separator } from 'blazecn';
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
      <footer id="footer" class="px-6 py-8 bg-card/20">
        <div class="max-w-2xl mx-auto">
          {/* About section */}
          {hasSummary && (
            <div class="mb-5">
              <h3 class="text-[11px] font-semibold text-foreground/50 uppercase tracking-widest mb-2">About this stream</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">{config!.summary}</p>
            </div>
          )}

          {/* Social links */}
          {hasSocial && (
            <div class="flex flex-wrap gap-2 mb-5">
              {config!.socialHandles.map((handle) => (
                <a
                  key={handle.platform}
                  href={handle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="no-underline"
                >
                  <Badge variant="secondary" className="gap-1.5 cursor-pointer hover:bg-accent transition-colors text-xs">
                    <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {handle.platform}
                  </Badge>
                </a>
              ))}
            </div>
          )}

          {/* Tags */}
          {hasTags && (
            <div class="flex flex-wrap gap-1.5 mb-5">
              {config!.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0 border-border/50 text-muted-foreground/60">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Custom page content */}
          {hasExtra && (
            <div
              class="prose prose-sm prose-invert max-w-none text-muted-foreground mb-5 [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline"
              innerHTML={config!.extraPageContent}
            />
          )}

          {/* Bottom bar */}
          <Separator className="mb-4 bg-border/15" />
          <div class="flex items-center justify-between text-[10px] text-muted-foreground/25">
            <span>
              Powered by{' '}
              <a href="https://github.com/TekkadanPlays/oni" target="_blank" rel="noopener noreferrer" class="hover:text-muted-foreground/50 transition-colors">
                Oni
              </a>
              {' · '}
              <a href="https://mycelium.social" target="_blank" rel="noopener noreferrer" class="hover:text-muted-foreground/50 transition-colors">
                Mycelium
              </a>
            </span>
            <span>
              <a href="/admin" class="hover:text-muted-foreground/50 transition-colors">Admin</a>
            </span>
          </div>
        </div>
      </footer>
    );
  }
}
