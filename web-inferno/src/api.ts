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
    getConfig: (token: string) => adminGet<unknown>('/admin/serverconfig', token),
    getStatus: (token: string) => adminGet<unknown>('/admin/status', token),
    getLogs: (token: string) => adminGet<unknown>('/admin/logs', token),
    getViewers: (token: string) => adminGet<unknown>('/admin/viewers', token),
    getHardware: (token: string) => adminGet<unknown>('/admin/hardwareinfo', token),
    getChatMessages: (token: string) => adminGet<unknown>('/admin/chat/messages', token),
    getWebhooks: (token: string) => adminGet<unknown>('/admin/webhooks', token),
    getAccessTokens: (token: string) => adminGet<unknown>('/admin/accesstokens', token),
    getFederationFollowers: (token: string) => adminGet<unknown>('/admin/followers', token),
    updateConfig: (token: string, config: unknown) =>
      adminPost<unknown>('/admin/config', token, config),
    sendSystemMessage: (token: string, body: string) =>
      adminPost<unknown>('/admin/chat/send', token, { body }),
  },
};
