import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
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
      <footer id="footer" class="px-6 py-8">
        <div class="max-w-2xl mx-auto">
          {/* About section */}
          {hasSummary && (
            <div class="mb-6">
              <h3 class="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.15em] mb-2.5">About</h3>
              <p class="text-sm text-muted-foreground/60 leading-relaxed">{config!.summary}</p>
            </div>
          )}

          {/* Social links */}
          {hasSocial && (
            <div class="flex flex-wrap gap-2 mb-6">
              {config!.socialHandles.map((handle) => (
                <a
                  key={handle.platform}
                  href={handle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="no-underline inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-muted-foreground/50 hover:text-foreground/70 hover:bg-white/[0.06] transition-all"
                >
                  <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {handle.platform}
                </a>
              ))}
            </div>
          )}

          {/* Tags */}
          {hasTags && (
            <div class="flex flex-wrap gap-1.5 mb-6">
              {config!.tags.map((tag) => (
                <span key={tag} class="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground/30 border border-white/[0.04]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Custom page content */}
          {hasExtra && (
            <div
              class="prose prose-sm prose-invert max-w-none text-muted-foreground/50 mb-6 [&_a]:text-primary/70 [&_a]:no-underline [&_a:hover]:underline [&_a:hover]:text-primary"
              innerHTML={config!.extraPageContent}
            />
          )}

          {/* Bottom bar */}
          <div class="h-px w-full bg-white/[0.04] mb-4" />
          <div class="flex items-center justify-between text-[10px] text-muted-foreground/20">
            <span>
              Powered by{' '}
              <a href="https://github.com/TekkadanPlays/oni" target="_blank" rel="noopener noreferrer" class="hover:text-muted-foreground/40 transition-colors">
                Oni
              </a>
              {' · '}
              <a href="https://mycelium.social" target="_blank" rel="noopener noreferrer" class="hover:text-muted-foreground/40 transition-colors">
                Mycelium
              </a>
            </span>
            <a href="/admin" class="hover:text-muted-foreground/40 transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    );
  }
}
