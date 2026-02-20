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
      <div class="group px-3.5 py-1.5 hover:bg-white/[0.02] transition-colors animate-msg-in">
        <div class="flex items-baseline gap-1.5 flex-wrap">
          <span
            class="text-[11px] font-semibold leading-tight"
            style={{ color: userColor }}
          >
            {isMod && (
              <Tooltip content="Moderator" side="top">
                <span class="inline-flex items-center px-1 py-px rounded text-[7px] font-bold bg-primary/20 text-primary mr-1 align-middle uppercase tracking-wider">Mod</span>
              </Tooltip>
            )}
            {isBot && (
              <Tooltip content="Bot" side="top">
                <span class="inline-flex items-center px-1 py-px rounded text-[7px] font-bold bg-muted text-muted-foreground mr-1 align-middle uppercase tracking-wider">Bot</span>
              </Tooltip>
            )}
            {isAuth && (
              <Tooltip content="Verified" side="top">
                <span class="inline-flex items-center justify-center size-3 text-success text-[8px] mr-0.5 align-middle">✓</span>
              </Tooltip>
            )}
            {message.user?.displayName}
          </span>
          <span class="text-[9px] text-muted-foreground/25 leading-tight tabular-nums">{time}</span>
        </div>
        <p class="text-[12.5px] text-foreground/80 leading-relaxed break-words mt-0.5">
          {message.body}
        </p>
      </div>
    );
  }
}
