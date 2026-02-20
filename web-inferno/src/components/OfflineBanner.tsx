import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Avatar, AvatarImage, AvatarFallback, Badge } from 'blazecn';
import { formatRelativeTime } from '../utils';

interface OfflineBannerProps {
  name: string;
  customText?: string;
  lastDisconnectTime?: string;
  logo?: string;
}

export class OfflineBanner extends Component<OfflineBannerProps> {
  render() {
    const { name, customText, lastDisconnectTime, logo } = this.props;

    return (
      <div class="relative flex flex-col items-center justify-center w-full aspect-video overflow-hidden">
        {/* Animated gradient background */}
        <div class="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-background to-background" />
        <div class="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        {/* Dot grid pattern */}
        <div class="absolute inset-0 opacity-[0.025]" style={{
          'background-image': 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          'background-size': '24px 24px',
        }} />

        <div class="relative z-10 flex flex-col items-center px-6 py-12 text-center max-w-md animate-slide-up">
          <div class="relative mb-8">
            <div class="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
            <Avatar className="size-24 rounded-2xl ring-1 ring-white/[0.08] relative">
              <AvatarImage src={logo} alt={name} className="rounded-2xl" />
              <AvatarFallback className="rounded-2xl text-3xl bg-card text-muted-foreground/30">
                <svg class="size-10 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </AvatarFallback>
            </Avatar>
            <div class="absolute -bottom-1 -right-1 size-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span class="size-2 rounded-full bg-muted-foreground/40" />
            </div>
          </div>

          <h2 class="text-2xl font-bold text-foreground tracking-tight mb-2">{name}</h2>

          <p class="text-sm text-muted-foreground/60 leading-relaxed mb-5 max-w-xs">
            {customText || 'This stream is currently offline. Check back later!'}
          </p>

          {lastDisconnectTime && (
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-muted-foreground/50">
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last live {formatRelativeTime(lastDisconnectTime)}
            </span>
          )}
        </div>
      </div>
    );
  }
}
