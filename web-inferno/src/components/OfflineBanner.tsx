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
      <div class="flex flex-col items-center justify-center w-full aspect-video bg-muted/30">
        <div class="flex flex-col items-center px-6 py-16 text-center max-w-lg animate-in">
          {/* Logo */}
          <Avatar className="size-20 mb-6">
            <AvatarImage src={logo} alt={name} />
            <AvatarFallback className="text-3xl bg-card text-muted-foreground/30">
              <svg class="size-10 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </AvatarFallback>
          </Avatar>

          <h2 class="text-2xl font-bold tracking-tight mb-2">{name}</h2>

          <Badge variant="secondary" className="mb-4">
            <span class="size-1.5 rounded-full bg-muted-foreground/40 mr-1.5" />
            Offline
          </Badge>

          <p class="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm">
            {customText || 'This stream is currently offline. Check back later!'}
          </p>

          {lastDisconnectTime && (
            <Badge variant="outline" className="gap-1.5">
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
