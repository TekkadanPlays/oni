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
      <div class="relative flex flex-col items-center justify-center w-full aspect-video bg-gradient-to-b from-card via-card to-background overflow-hidden">
        {/* Subtle background pattern */}
        <div class="absolute inset-0 opacity-[0.03]" style={{
          'background-image': 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          'background-size': '32px 32px',
        }} />

        <div class="relative z-10 flex flex-col items-center px-6 py-12 text-center max-w-lg">
          <div class="relative mb-6">
            <Avatar className="size-20 rounded-2xl opacity-60">
              <AvatarImage src={logo} alt={name} className="rounded-2xl" />
              <AvatarFallback className="rounded-2xl text-2xl">
                <svg class="size-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </AvatarFallback>
            </Avatar>
            <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted-foreground/30 border-2 border-card flex items-center justify-center">
              <span class="w-2 h-2 rounded-full bg-muted-foreground/50" />
            </div>
          </div>

          <h2 class="text-xl font-semibold text-foreground mb-2">{name}</h2>

          <p class="text-sm text-muted-foreground leading-relaxed mb-4">
            {customText || 'This stream is currently offline. Check back later!'}
          </p>

          {lastDisconnectTime && (
            <Badge variant="secondary" className="gap-1.5">
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last live {formatRelativeTime(lastDisconnectTime)}
            </Badge>
          )}
        </div>
      </div>
    );
  }
}
