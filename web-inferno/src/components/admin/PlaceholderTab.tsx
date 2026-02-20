import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Card, CardContent, Badge } from 'blazecn';

interface PlaceholderTabProps {
  title: string;
  description: string;
}

const IconConstruction = () => (
  <svg class="size-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="20" height="8" rx="1" /><path d="M17 14v7" /><path d="M7 14v7" /><path d="M17 3v3" /><path d="M7 3v3" /><path d="M10 14 2.3 6.3" /><path d="M14 6l7.7 7.7" /><path d="M8 6l8 8" />
  </svg>
);

export class PlaceholderTab extends Component<PlaceholderTabProps> {
  render() {
    const { title, description } = this.props;
    return (
      <div>
        <div class="mb-6">
          <h1 class="text-xl font-bold text-foreground tracking-tight">{title}</h1>
          <p class="text-[13px] text-muted-foreground/60 mt-0.5">{description}</p>
        </div>

        <Card className="py-8 gap-0">
          <CardContent>
            <div class="flex flex-col items-center text-center">
              <div class="size-14 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                <IconConstruction />
              </div>
              <p class="text-sm font-medium text-foreground mb-1">Coming Soon</p>
              <p class="text-xs text-muted-foreground max-w-sm">
                This section is under development and will be available in a future update.
              </p>
              <Badge variant="secondary" className="mt-3 text-[10px]">Planned</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
