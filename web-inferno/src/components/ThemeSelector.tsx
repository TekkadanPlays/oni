import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { cn } from 'blazecn';
import { getBaseTheme, setBaseTheme, isDarkMode, toggleDarkMode, subscribeTheme, type BaseTheme } from '../stores/theme';

// ---------------------------------------------------------------------------
// ThemeSelector — header dropdown for choosing a base color theme + dark mode
// Compact swatch grid popover. Shared localStorage keys with mycelium.social.
// ---------------------------------------------------------------------------

interface ThemeEntry { id: BaseTheme; label: string; swatch: string }

const NEUTRALS: ThemeEntry[] = [
  { id: 'neutral', label: 'Neutral', swatch: 'bg-[oklch(0.205_0_0)] dark:bg-[oklch(0.922_0_0)]' },
  { id: 'stone', label: 'Stone', swatch: 'bg-[oklch(0.216_0.006_56)] dark:bg-[oklch(0.923_0.003_49)]' },
  { id: 'zinc', label: 'Zinc', swatch: 'bg-[oklch(0.21_0.006_286)] dark:bg-[oklch(0.92_0.004_286)]' },
  { id: 'gray', label: 'Gray', swatch: 'bg-[oklch(0.21_0.034_265)] dark:bg-[oklch(0.928_0.006_265)]' },
];

const COLORS: ThemeEntry[] = [
  { id: 'amber', label: 'Amber', swatch: 'bg-[oklch(0.67_0.16_58)] dark:bg-[oklch(0.77_0.16_70)]' },
  { id: 'blue', label: 'Blue', swatch: 'bg-[oklch(0.488_0.243_264)] dark:bg-[oklch(0.42_0.18_266)]' },
  { id: 'cyan', label: 'Cyan', swatch: 'bg-[oklch(0.61_0.11_222)] dark:bg-[oklch(0.71_0.13_215)]' },
  { id: 'emerald', label: 'Emerald', swatch: 'bg-[oklch(0.60_0.13_163)] dark:bg-[oklch(0.70_0.15_162)]' },
  { id: 'fuchsia', label: 'Fuchsia', swatch: 'bg-[oklch(0.59_0.26_323)] dark:bg-[oklch(0.67_0.26_322)]' },
  { id: 'green', label: 'Green', swatch: 'bg-[oklch(0.648_0.2_132)] dark:bg-[oklch(0.648_0.2_132)]' },
  { id: 'indigo', label: 'Indigo', swatch: 'bg-[oklch(0.51_0.23_277)] dark:bg-[oklch(0.59_0.20_277)]' },
  { id: 'lime', label: 'Lime', swatch: 'bg-[oklch(0.65_0.18_132)] dark:bg-[oklch(0.77_0.20_131)]' },
  { id: 'orange', label: 'Orange', swatch: 'bg-[oklch(0.646_0.222_41)] dark:bg-[oklch(0.705_0.213_48)]' },
  { id: 'pink', label: 'Pink', swatch: 'bg-[oklch(0.59_0.22_1)] dark:bg-[oklch(0.66_0.21_354)]' },
  { id: 'purple', label: 'Purple', swatch: 'bg-[oklch(0.56_0.25_302)] dark:bg-[oklch(0.63_0.23_304)]' },
  { id: 'red', label: 'Red', swatch: 'bg-[oklch(0.577_0.245_27)] dark:bg-[oklch(0.637_0.237_25)]' },
  { id: 'rose', label: 'Rose', swatch: 'bg-[oklch(0.586_0.253_18)] dark:bg-[oklch(0.645_0.246_16)]' },
  { id: 'sky', label: 'Sky', swatch: 'bg-[oklch(0.59_0.14_242)] dark:bg-[oklch(0.68_0.15_237)]' },
  { id: 'teal', label: 'Teal', swatch: 'bg-[oklch(0.60_0.10_185)] dark:bg-[oklch(0.70_0.12_183)]' },
  { id: 'violet', label: 'Violet', swatch: 'bg-[oklch(0.541_0.281_293)] dark:bg-[oklch(0.606_0.25_293)]' },
];

interface ThemeSelectorProps {
  className?: string;
}

interface ThemeSelectorState {
  active: BaseTheme;
  dark: boolean;
  open: boolean;
}

export class ThemeSelector extends Component<ThemeSelectorProps, ThemeSelectorState> {
  declare state: ThemeSelectorState;
  private unsub: (() => void) | null = null;
  private ref: HTMLDivElement | null = null;

  constructor(props: ThemeSelectorProps) {
    super(props);
    this.state = { active: getBaseTheme(), dark: isDarkMode(), open: false };
  }

  componentDidMount() {
    this.unsub = subscribeTheme(() => this.setState({ active: getBaseTheme(), dark: isDarkMode() }));
    document.addEventListener('mousedown', this.handleOutside);
    document.addEventListener('keydown', this.handleKey);
  }

  componentWillUnmount() {
    this.unsub?.();
    document.removeEventListener('mousedown', this.handleOutside);
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleOutside = (e: MouseEvent) => {
    if (this.state.open && this.ref && !this.ref.contains(e.target as Node)) {
      this.setState({ open: false });
    }
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.setState({ open: false });
  };

  private toggleOpen = (e: Event) => {
    e.stopPropagation();
    this.setState({ open: !this.state.open });
  };

  private select = (id: BaseTheme) => {
    setBaseTheme(id);
    this.setState({ open: false });
  };

  private renderSwatch(t: ThemeEntry, active: BaseTheme) {
    const isActive = active === t.id;
    return createElement('button', {
      key: t.id,
      type: 'button',
      title: t.label,
      onClick: (e: Event) => { e.stopPropagation(); this.select(t.id); },
      className: cn(
        'relative size-7 rounded-full border-2 cursor-pointer transition-all',
        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'hover:scale-110',
        isActive ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30',
        t.swatch,
      ),
    },
      isActive
        ? createElement('svg', {
            className: 'absolute inset-0 m-auto size-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '3',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }, createElement('path', { d: 'M20 6L9 17l-5-5' }))
        : null,
    );
  }

  render() {
    const { className } = this.props;
    const { active, dark, open } = this.state;

    return createElement('div', {
      ref: (el: HTMLDivElement | null) => { this.ref = el; },
      className: 'relative',
    },
      // Trigger button — palette icon
      createElement('button', {
        type: 'button',
        onClick: this.toggleOpen,
        className: cn(
          'inline-flex items-center justify-center size-8 rounded-md border border-input bg-background text-foreground shadow-xs cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          className,
        ),
      },
        createElement('svg', {
          className: 'size-4',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
          createElement('circle', { cx: '13.5', cy: '6.5', r: '.5', fill: 'currentColor' }),
          createElement('circle', { cx: '17.5', cy: '10.5', r: '.5', fill: 'currentColor' }),
          createElement('circle', { cx: '8.5', cy: '7.5', r: '.5', fill: 'currentColor' }),
          createElement('circle', { cx: '6.5', cy: '12.5', r: '.5', fill: 'currentColor' }),
          createElement('path', { d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z' }),
        ),
      ),

      // Popover panel
      open
        ? createElement('div', {
            className: 'absolute right-0 top-full z-50 mt-1.5 w-60 rounded-lg border bg-popover p-3 shadow-lg',
          },
            // Dark mode toggle
            createElement('div', {
              className: 'flex items-center justify-between mb-3 pb-2 border-b border-border',
            },
              createElement('span', { className: 'text-xs font-medium text-muted-foreground' }, 'Dark mode'),
              createElement('button', {
                type: 'button',
                onClick: (e: Event) => { e.stopPropagation(); toggleDarkMode(); },
                className: cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  dark ? 'bg-primary' : 'bg-input',
                ),
              },
                createElement('span', {
                  className: cn(
                    'pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                    dark ? 'translate-x-4' : 'translate-x-0',
                  ),
                }),
              ),
            ),
            // Neutrals
            createElement('p', { className: 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5' }, 'Neutrals'),
            createElement('div', { className: 'flex gap-1.5 mb-3' },
              ...NEUTRALS.map((t) => this.renderSwatch(t, active)),
            ),
            // Colors
            createElement('p', { className: 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5' }, 'Colors'),
            createElement('div', { className: 'flex flex-wrap gap-1.5' },
              ...COLORS.map((t) => this.renderSwatch(t, active)),
            ),
          )
        : null,
    );
  }
}
