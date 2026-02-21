import type { ServerStatus, ClientConfig, ChatMessage, UserRegistrationResponse } from './types';

const API_BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function authedGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}?accessToken=${token}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function adminGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function adminPost<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function adminDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  // Public endpoints
  getStatus: () => get<ServerStatus>('/status'),
  getConfig: () => get<ClientConfig>('/config'),
  getEmoji: () => get<{ name: string; url: string }[]>('/emoji'),

  // Chat endpoints
  getChatHistory: (token: string) => authedGet<ChatMessage[]>('/chat', token),
  registerChatUser: (displayName: string) =>
    post<UserRegistrationResponse>('/chat/register', { displayName }),

  // Video
  getVideoVariants: () => get<{ name: string }[]>('/video/variants'),

  // Admin endpoints
  admin: {
    // Read
    getConfig: (token: string) => adminGet<unknown>('/admin/serverconfig', token),
    getStatus: (token: string) => adminGet<unknown>('/admin/status', token),
    getLogs: (token: string) => adminGet<unknown>('/admin/logs', token),
    getViewers: (token: string) => adminGet<unknown>('/admin/viewers', token),
    getHardware: (token: string) => adminGet<unknown>('/admin/hardwareinfo', token),
    getChatMessages: (token: string) => adminGet<unknown>('/admin/chat/messages', token),
    getWebhooks: (token: string) => adminGet<unknown>('/admin/webhooks', token),
    getAccessTokens: (token: string) => adminGet<unknown>('/admin/accesstokens', token),
    getFederationFollowers: (token: string) => adminGet<unknown>('/admin/followers', token),
    getFederationActions: (token: string) => adminGet<unknown>('/admin/federation/actions', token),
    getConnectedClients: (token: string) => adminGet<unknown>('/admin/chat/clients', token),
    getLogEntries: (token: string) => adminGet<unknown>('/admin/logs', token),
    getWarnings: (token: string) => adminGet<unknown>('/admin/logs/warnings', token),

    // Chat
    sendSystemMessage: (token: string, body: string) =>
      adminPost<unknown>('/admin/chat/send', token, { body }),
    updateChatDisabled: (token: string, disabled: boolean) =>
      adminPost<unknown>('/admin/config/chat/disable', token, { value: disabled }),
    updateChatJoinMessages: (token: string, enabled: boolean) =>
      adminPost<unknown>('/admin/config/chat/joinmessagesenabled', token, { value: enabled }),
    updateChatEstablishedMode: (token: string, enabled: boolean) =>
      adminPost<unknown>('/admin/config/chat/establishedusermode', token, { value: enabled }),
    updateChatSpamProtection: (token: string, enabled: boolean) =>
      adminPost<unknown>('/admin/config/chat/spamprotectionenabled', token, { value: enabled }),
    updateChatSlurFilter: (token: string, enabled: boolean) =>
      adminPost<unknown>('/admin/config/chat/slurfilterenabled', token, { value: enabled }),
    updateForbiddenUsernames: (token: string, usernames: string[]) =>
      adminPost<unknown>('/admin/config/chat/forbiddenusernames', token, { value: usernames }),
    updateSuggestedUsernames: (token: string, usernames: string[]) =>
      adminPost<unknown>('/admin/config/chat/suggestedusernames', token, { value: usernames }),
    updateHideViewerCount: (token: string, hide: boolean) =>
      adminPost<unknown>('/admin/config/hideviewercount', token, { value: hide }),

    // Stream keys (array of {key, comment})
    setStreamKeys: (token: string, keys: { key: string; comment: string }[]) =>
      adminPost<unknown>('/admin/config/streamkeys', token, { value: keys }),

    // Instance details
    setServerName: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/name', token, { value }),
    setServerSummary: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/serversummary', token, { value }),
    setServerURL: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/serverurl', token, { value }),
    setStreamTitle: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/streamtitle', token, { value }),
    setTags: (token: string, tags: string[]) =>
      adminPost<unknown>('/admin/config/tags', token, tags.map(t => ({ value: t }))),
    setLogo: (token: string, base64: string) =>
      adminPost<unknown>('/admin/config/logo', token, { value: base64 }),
    setOfflineMessage: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/offlinemessage', token, { value }),
    setWelcomeMessage: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/welcomemessage', token, { value }),
    setNSFW: (token: string, value: boolean) =>
      adminPost<unknown>('/admin/config/nsfw', token, { value }),
    setExtraPageContent: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/pagecontent', token, { value }),
    setSocialHandles: (token: string, handles: { platform: string; url: string }[]) =>
      adminPost<unknown>('/admin/config/socialhandles', token, { value: handles }),
    setCustomStyles: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/customstyles', token, { value }),
    setCustomJavascript: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/customjavascript', token, { value }),

    // Video
    setStreamLatencyLevel: (token: string, value: number) =>
      adminPost<unknown>('/admin/config/streamlatencylevel', token, { value }),
    setStreamOutputVariants: (token: string, variants: unknown[]) =>
      adminPost<unknown>('/admin/config/streamoutputvariants', token, { value: variants }),
    setVideoCodec: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/videocodec', token, { value }),
    setFfmpegPath: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/ffmpegpath', token, { value }),
    setRTMPPort: (token: string, value: number) =>
      adminPost<unknown>('/admin/config/rtmpserverport', token, { value }),
    setWebServerPort: (token: string, value: number) =>
      adminPost<unknown>('/admin/config/webserverport', token, { value }),
    setVideoServingEndpoint: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/videoservingendpoint', token, { value }),

    // S3 storage
    setS3Config: (token: string, config: unknown) =>
      adminPost<unknown>('/admin/config/s3', token, { value: config }),

    // Federation
    setFederationEnabled: (token: string, value: boolean) =>
      adminPost<unknown>('/admin/config/federation/enable', token, { value }),
    setFederationPrivate: (token: string, value: boolean) =>
      adminPost<unknown>('/admin/config/federation/private', token, { value }),
    setFederationShowEngagement: (token: string, value: boolean) =>
      adminPost<unknown>('/admin/config/federation/showengagement', token, { value }),
    setFederationUsername: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/federation/username', token, { value }),
    setFederationGoLiveMessage: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/federation/livemessage', token, { value }),
    setFederationBlockDomains: (token: string, domains: string[]) =>
      adminPost<unknown>('/admin/config/federation/blockdomains', token, domains.map(d => ({ value: d }))),
    sendFederatedMessage: (token: string, value: string) =>
      adminPost<unknown>('/admin/federation/send', token, { value }),

    // Notifications
    setDiscordConfig: (token: string, config: unknown) =>
      adminPost<unknown>('/admin/config/notifications/discord', token, { value: config }),
    setBrowserPushConfig: (token: string, config: unknown) =>
      adminPost<unknown>('/admin/config/notifications/browser', token, { value: config }),

    // External actions
    setExternalActions: (token: string, actions: unknown[]) =>
      adminPost<unknown>('/admin/config/externalactions', token, { value: actions }),

    // Webhooks
    createWebhook: (token: string, body: unknown) =>
      adminPost<unknown>('/admin/webhooks/create', token, body),
    deleteWebhook: (token: string, id: string) =>
      adminPost<unknown>('/admin/webhooks/delete', token, { id }),

    // Access tokens
    createAccessToken: (token: string, body: { name: string; scopes: string[] }) =>
      adminPost<unknown>('/admin/accesstokens/create', token, body),
    deleteAccessToken: (token: string, tokenToDelete: string) =>
      adminPost<unknown>('/admin/accesstokens/delete', token, { token: tokenToDelete }),

    // Directory
    setDirectoryEnabled: (token: string, value: boolean) =>
      adminPost<unknown>('/admin/config/directoryenabled', token, { value }),

    // Admin password
    setAdminPassword: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/adminpass', token, { value }),

    // Search indexing
    setDisableSearchIndexing: (token: string, value: boolean) =>
      adminPost<unknown>('/admin/config/disablesearchindexing', token, { value }),

    // Socket host override
    setSocketHostOverride: (token: string, value: string) =>
      adminPost<unknown>('/admin/config/sockethostoverride', token, { value }),

    // Legacy compat (deprecated — use setStreamKeys)
    updateConfig: (token: string, config: unknown) =>
      adminPost<unknown>('/admin/config', token, config),
    setStreamKey: (token: string, key: string) =>
      adminPost<unknown>('/admin/config/key', token, { value: key }),
    updateVideoConfig: (token: string, config: unknown) =>
      adminPost<unknown>('/admin/config/video', token, config),
  },
};
