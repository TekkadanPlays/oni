// Server status returned by GET /api/status
export interface ServerStatus {
  online: boolean;
  viewerCount: number;
  lastConnectTime?: string;
  lastDisconnectTime?: string;
  versionNumber?: string;
  streamTitle?: string;
  serverTime: string;
}

// Client config returned by GET /api/config
export interface ClientConfig {
  name: string;
  title?: string;
  summary: string;
  offlineMessage?: string;
  logo: string;
  tags: string[];
  nsfw: boolean;
  extraPageContent: string;
  socialHandles: SocialHandle[];
  chatDisabled: boolean;
  externalActions: ExternalAction[];
  customStyles: string;
  maxSocketPayloadSize: number;
  federation: Federation;
  notifications: NotificationConfig;
  authentication: Authentication;
  socketHostOverride?: string;
}

export interface SocialHandle {
  platform: string;
  url: string;
  icon: string;
}

export interface ExternalAction {
  title: string;
  description?: string;
  url?: string;
  html?: string;
  icon?: string;
  color?: string;
  openExternally?: boolean;
}

interface Authentication {
  indieAuthEnabled: boolean;
}

interface Federation {
  enabled: boolean;
  account: string;
  followerCount: number;
}

interface NotificationConfig {
  browser: { enabled: boolean; publicKey: string };
}

// Chat message types
export enum MessageType {
  CHAT = "CHAT",
  PING = "PING",
  NAME_CHANGE = "NAME_CHANGE",
  COLOR_CHANGE = "COLOR_CHANGE",
  PONG = "PONG",
  SYSTEM = "SYSTEM",
  USER_JOINED = "USER_JOINED",
  USER_PARTED = "USER_PARTED",
  CHAT_ACTION = "CHAT_ACTION",
  FEDIVERSE_ENGAGEMENT_FOLLOW = "FEDIVERSE_ENGAGEMENT_FOLLOW",
  FEDIVERSE_ENGAGEMENT_LIKE = "FEDIVERSE_ENGAGEMENT_LIKE",
  FEDIVERSE_ENGAGEMENT_REPOST = "FEDIVERSE_ENGAGEMENT_REPOST",
  CONNECTED_USER_INFO = "CONNECTED_USER_INFO",
  ERROR_USER_DISABLED = "ERROR_USER_DISABLED",
  ERROR_NEEDS_REGISTRATION = "ERROR_NEEDS_REGISTRATION",
  ERROR_MAX_CONNECTIONS_EXCEEDED = "ERROR_MAX_CONNECTIONS_EXCEEDED",
  VISIBILITY_UPDATE = "VISIBILITY-UPDATE",
}

export interface SocketEvent {
  id: string;
  timestamp: string;
  type: MessageType;
}

export interface ChatMessage extends SocketEvent {
  body?: string;
  user?: ChatUser;
  oldName?: string;
  // Fediverse fields
  title?: string;
  image?: string;
  link?: string;
}

export interface ChatUser {
  id: string;
  displayName: string;
  displayColor: number;
  createdAt: string;
  previousNames?: string[];
  nameChangedAt?: string;
  isBot?: boolean;
  authenticated?: boolean;
  isModerator?: boolean;
}

export interface CurrentUser {
  id: string;
  displayName: string;
  displayColor: number;
  isModerator?: boolean;
}

export interface UserRegistrationResponse {
  id: string;
  accessToken: string;
  displayName: string;
  displayColor: number;
}

// Visibility update event
export interface VisibilityUpdateEvent extends SocketEvent {
  visible: boolean;
  ids: string[];
}

// Admin types
export interface AdminConfig {
  instanceDetails: {
    name: string;
    title: string;
    summary: string;
    logo: string;
    tags: string[];
    nsfw: boolean;
    extraPageContent: string;
    socialHandles: SocialHandle[];
    offlineMessage: string;
    customStyles: string;
  };
  ffmpegPath: string;
  webServerPort: number;
  rtmpServerPort: number;
  streamKey: string;
  chatDisabled: boolean;
  chatJoinMessagesEnabled: boolean;
  chatEstablishedUserMode: boolean;
  chatSpamProtectionEnabled: boolean;
  chatSlurFilterEnabled: boolean;
  forbiddenUsernames: string[];
  suggestedUsernames: string[];
  videoSettings: VideoSettings;
  s3: S3Config;
  federation: AdminFederation;
  notifications: AdminNotifications;
  externalActions: ExternalAction[];
  hideViewerCount: boolean;
  disableSearchIndexing: boolean;
}

export interface VideoSettings {
  videoQualityVariants: VideoVariant[];
  latencyLevel: number;
}

export interface VideoVariant {
  videoPassthrough: boolean;
  audioPassthrough: boolean;
  videoBitrate: number;
  audioBitrate: number;
  scaledWidth: number;
  scaledHeight: number;
  framerate: number;
  cpuUsageLevel: number;
}

interface S3Config {
  enabled: boolean;
  endpoint: string;
  accessKey: string;
  secret: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
}

interface AdminFederation {
  enabled: boolean;
  isPrivate: boolean;
  showEngagement: boolean;
  username: string;
  goLiveMessage: string;
  blockedDomains: string[];
}

interface AdminNotifications {
  discord: { enabled: boolean; webhook: string; goLiveMessage: string };
  browser: { enabled: boolean; goLiveMessage: string };
}

// Hardware stats from GET /api/admin/status
export interface HardwareStats {
  cpu: CpuInfo[];
  memory: MemoryInfo;
  disk: DiskInfo;
}

interface CpuInfo {
  modelName: string;
  cores: number;
  mhz: number;
}

interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  percent: number;
}

interface DiskInfo {
  total: number;
  used: number;
  free: number;
  percent: number;
}
