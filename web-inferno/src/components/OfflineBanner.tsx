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
        {/* Layered atmospheric background */}
        <div class="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background" />
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.02] to-transparent" />
        <div class="ambient-glow" />
        <div class="noise-overlay" />

        <div class="relative z-10 flex flex-col items-center px-6 py-16 text-center max-w-lg animate-slide-up">
          {/* Logo with gradient ring */}
          <div class="relative mb-10">
            <div class="absolute -inset-6 rounded-full bg-primary/[0.06] blur-3xl" />
            <div class="rounded-2xl p-[2px] bg-gradient-to-br from-primary/30 via-primary/10 to-transparent relative">
              <Avatar className="size-28 rounded-[14px] ring-1 ring-black/20">
                <AvatarImage src={logo} alt={name} className="rounded-[14px]" />
                <AvatarFallback className="rounded-[14px] text-4xl bg-card text-muted-foreground/20">
                  <svg class="size-12 text-muted-foreground/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </AvatarFallback>
              </Avatar>
            </div>
            {/* Offline indicator */}
            <div class="absolute -bottom-1.5 -right-1.5 size-6 rounded-full bg-muted border-[3px] border-background flex items-center justify-center">
              <span class="size-2 rounded-full bg-muted-foreground/40" />
            </div>
          </div>

          <h2 class="text-3xl font-bold text-foreground tracking-tight mb-3">{name}</h2>

          <Badge className="bg-muted/80 text-muted-foreground border-border/50 mb-5 px-3 py-1 text-xs font-medium">
            <span class="size-1.5 rounded-full bg-muted-foreground/40 mr-1.5" />
            Offline
          </Badge>

          <p class="text-[15px] text-muted-foreground/70 leading-relaxed mb-6 max-w-sm">
            {customText || 'This stream is currently offline. Check back later!'}
          </p>

          {lastDisconnectTime && (
            <Badge variant="outline" className="gap-2 px-4 py-2 text-xs">
              <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
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
