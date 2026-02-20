import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { Badge, Tooltip } from 'blazecn';
import { cn } from 'blazecn';
import type { ChatMessage as ChatMessageType } from '../types';
import { MessageType } from '../types';
import { formatTimestamp } from '../utils';

const USER_COLORS = [
  '#c084fc', '#f472b6', '#fb923c', '#facc15', '#4ade80',
  '#22d3ee', '#60a5fa', '#a78bfa', '#f87171', '#34d399',
  '#e879f9', '#38bdf8', '#fbbf24', '#a3e635', '#fb7185',
  '#2dd4bf', '#818cf8', '#f97316', '#14b8a6', '#d946ef',
];

function getUserColor(colorIndex: number): string {
  return USER_COLORS[colorIndex % USER_COLORS.length] || USER_COLORS[0];
}

interface Props {
  message: ChatMessageType;
  isModerator?: boolean;
}

export class ChatMessageItem extends Component<Props> {
  render() {
    const { message, isModerator } = this.props;
    const { type, timestamp } = message;
    const time = formatTimestamp(timestamp);

    // System messages
    if (type === MessageType.SYSTEM) {
      return (
        <div class="px-3 py-1.5 flex items-center gap-1.5">
          <svg class="w-3 h-3 text-primary/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-[11px] text-muted-foreground italic">{message.body}</span>
        </div>
      );
    }

    // Join/part messages
    if (type === MessageType.USER_JOINED || type === MessageType.USER_PARTED) {
      const joined = type === MessageType.USER_JOINED;
      return (
        <div class="px-3 py-0.5 flex items-center gap-1">
          <span class={cn('text-[10px]', joined ? 'text-success/50' : 'text-muted-foreground/40')}>
            {joined ? '→' : '←'}
          </span>
          <span class="text-[10px] text-muted-foreground/60">
            <span style={{ color: getUserColor(message.user?.displayColor || 0) }} class="opacity-60">
              {message.user?.displayName}
            </span>
            {' '}{joined ? 'joined' : 'left'}
          </span>
        </div>
      );
    }

    // Name change
    if (type === MessageType.NAME_CHANGE) {
      return (
        <div class="px-3 py-0.5 text-[10px] text-muted-foreground/60">
          <span style={{ color: getUserColor(message.user?.displayColor || 0) }} class="opacity-60">
            {message.oldName}
          </span>
          {' → '}
          <span style={{ color: getUserColor(message.user?.displayColor || 0) }} class="opacity-80">
            {message.user?.displayName}
          </span>
        </div>
      );
    }

    // Fediverse engagement
    if (
      type === MessageType.FEDIVERSE_ENGAGEMENT_FOLLOW ||
      type === MessageType.FEDIVERSE_ENGAGEMENT_LIKE ||
      type === MessageType.FEDIVERSE_ENGAGEMENT_REPOST
    ) {
      const action =
        type === MessageType.FEDIVERSE_ENGAGEMENT_FOLLOW ? 'followed' :
        type === MessageType.FEDIVERSE_ENGAGEMENT_LIKE ? 'liked' : 'shared';
      return (
        <div class="px-3 py-1.5 flex items-center gap-1.5 bg-primary/5 mx-2 my-1 rounded-md">
          <svg class="w-3 h-3 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span class="text-[11px] text-primary/80">{message.user?.displayName} {action} on the fediverse</span>
        </div>
      );
    }

    // Regular chat message
    const userColor = getUserColor(message.user?.displayColor || 0);
    const isMod = message.user?.isModerator;
    const isBot = message.user?.isBot;
    const isAuth = message.user?.authenticated;

    return (
      <div class="group px-4 py-2 hover:bg-accent/50 transition-colors duration-150 animate-msg-in">
        <div class="flex items-baseline gap-1.5 flex-wrap">
          <span
            class="text-[12px] font-bold leading-tight"
            style={{ color: userColor }}
          >
            {isMod && (
              <Tooltip content="Moderator" side="top">
                <Badge className="mr-1 align-middle text-[8px] py-0 px-1.5 uppercase tracking-wider">Mod</Badge>
              </Tooltip>
            )}
            {isBot && (
              <Tooltip content="Bot" side="top">
                <Badge variant="secondary" className="mr-1 align-middle text-[8px] py-0 px-1.5 uppercase tracking-wider">Bot</Badge>
              </Tooltip>
            )}
            {isAuth && (
              <Tooltip content="Verified" side="top">
                <span class="inline-flex items-center justify-center size-3.5 text-success mr-0.5 align-middle">
                  <svg class="size-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </span>
              </Tooltip>
            )}
            {message.user?.displayName}
          </span>
          <span class="text-[10px] text-muted-foreground/40 leading-tight tabular-nums">{time}</span>
        </div>
        <p class="text-[13px] text-foreground/90 leading-relaxed break-words mt-0.5">
          {message.body}
        </p>
      </div>
    );
  }
}
