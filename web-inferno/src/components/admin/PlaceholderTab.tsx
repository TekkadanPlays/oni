import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Empty, EmptyTitle, EmptyDescription } from 'blazecn';

interface PlaceholderTabProps {
  title: string;
  description: string;
}

export class PlaceholderTab extends Component<PlaceholderTabProps> {
  render() {
    const { title, description } = this.props;
    return (
      <div>
        <h1 class="text-2xl font-semibold text-foreground mb-4">{title}</h1>
        <Empty>
          <EmptyTitle>{description}</EmptyTitle>
          <EmptyDescription>This section will be implemented in a future update.</EmptyDescription>
        </Empty>
      </div>
    );
  }
}
