import path from "path";
import fs from "fs";

const root = import.meta.dir;
const staticDir = path.join(root, "../static/web");
const PORT = 8080;

// Mock data matching Go backend's template injection
const mockConfig = {
  name: "Oni Dev Stream",
  title: "Test Stream",
  summary: "A local development stream for testing the Oni frontend.",
  logo: "/img/logo.svg",
  tags: ["dev", "test", "owncast"],
  socialHandles: [
    { platform: "github", url: "https://github.com/owncast" },
  ],
  extraPageContent: "<p>Welcome to the dev stream!</p>",
  chatDisabled: false,
  maxSocketPayloadSize: 2048,
  nsfw: false,
  federation: { enabled: false },
  notifications: { browser: { enabled: false }, discord: {} },
  externalActions: [],
  customStyles: "",
  appearanceVariables: {},
  version: "0.2.0-dev",
};

const mockStatus = {
  online: false,
  viewerCount: 0,
  overallMaxViewerCount: 42,
  sessionMaxViewerCount: 0,
  lastConnectTime: null,
  lastDisconnectTime: new Date(Date.now() - 3600000).toISOString(),
  versionNumber: "0.2.0-dev",
  streamTitle: "Test Stream",
};

// Build the index.html with mock data injected (simulating Go template rendering)
function renderIndex(): string {
  const raw = fs.readFileSync(path.join(staticDir, "index.html"), "utf-8");
  const nonce = Math.random().toString(36).substring(2, 15);
  return raw
    .replace(/\{\{\.Name\}\}/g, mockConfig.name)
    .replace(/\{\{\.Nonce\}\}/g, nonce)
    .replace(/\{\{\.ServerConfigJSON\}\}/g, JSON.stringify(mockConfig))
    .replace(/\{\{\.StatusJSON\}\}/g, JSON.stringify(mockStatus));
}

// Simple MIME type lookup
function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json",
  };
  return types[ext] || "application/octet-stream";
}

// Mock admin token for dev
const DEV_ADMIN_TOKEN = "dev-admin-token-12345";

// Mock API handlers
function handleApi(url: URL): Response | null {
  const p = url.pathname;

  if (p === "/api/status") {
    return Response.json(mockStatus);
  }
  if (p === "/api/config") {
    return Response.json(mockConfig);
  }
  if (p === "/api/emoji") {
    return Response.json([]);
  }
  if (p === "/api/video/variants") {
    return Response.json([{ name: "default" }]);
  }
  if (p === "/api/chat/register") {
    return Response.json({
      id: "dev-user-" + Date.now(),
      accessToken: "dev-chat-token",
      displayName: "DevUser",
    });
  }
  if (p === "/api/chat") {
    return Response.json([
      {
        id: "msg-1",
        timestamp: new Date().toISOString(),
        user: { id: "system", displayName: "System", displayColor: 100, createdAt: new Date().toISOString() },
        body: "Welcome to the dev stream chat!",
        type: "SYSTEM",
      },
    ]);
  }

  // Admin endpoints
  if (p.startsWith("/api/admin/")) {
    // Simple token check
    const auth = url.searchParams.get("accessToken");
    // For admin endpoints, check Authorization header isn't possible here,
    // so we just return mock data for dev
    if (p === "/api/admin/serverconfig") {
      return Response.json({
        instanceDetails: {
          name: mockConfig.name,
          title: mockConfig.title,
          summary: mockConfig.summary,
          logo: mockConfig.logo,
          tags: mockConfig.tags,
          offlineMessage: "",
          nsfw: false,
          socialHandles: mockConfig.socialHandles,
          extraPageContent: mockConfig.extraPageContent,
        },
        ffmpegPath: "/usr/bin/ffmpeg",
        webServerPort: 8080,
        rtmpServerPort: 1935,
        s3: {},
        videoSettings: {
          videoQualityVariants: [
            { isVideoPassthrough: true, isAudioPassthrough: true, framerate: 0, encoderPreset: "veryfast", scaledWidth: 0, scaledHeight: 0 },
          ],
          latencyLevel: 4,
          cpuUsageLevel: 3,
        },
        yp: { enabled: false },
        chatDisabled: false,
        chatJoinMessagesEnabled: true,
        chatEstablishedUserMode: false,
        hideViewerCount: false,
        disableSearchIndexing: false,
        federation: { enabled: false },
        notifications: {},
        externalActions: [],
        supportedCodecs: ["libx264", "h264_vaapi"],
        videoCodec: "libx264",
        forbiddenUsernames: ["admin", "system"],
        suggestedUsernames: [],
        streamKeys: [{ key: "dev-stream-key", comment: "Dev key" }],
      });
    }
    if (p === "/api/admin/status") {
      return Response.json({
        ...mockStatus,
        broadcaster: mockStatus.online ? {
          remoteAddr: "127.0.0.1:1935",
          time: new Date(Date.now() - 600000).toISOString(),
          streamDetails: {
            width: 1920, height: 1080, framerate: 30,
            videoBitrate: 4500, videoCodec: "H.264",
            audioBitrate: 128, audioCodec: "AAC",
            encoder: "OBS 30.0",
          },
        } : null,
        currentBroadcast: null,
        sessionPeakViewerCount: 0,
      });
    }
    if (p === "/api/admin/hardwareinfo") {
      return Response.json({
        cpu: [{ modelName: "Dev CPU", cores: 4 }],
        memory: { total: 8589934592, used: 4294967296, percent: 50 },
        disk: { total: 107374182400, used: 53687091200, percent: 50 },
      });
    }
    if (p === "/api/admin/logs") {
      return Response.json([
        { message: "Dev server started", level: "info", time: new Date().toISOString() },
      ]);
    }
    if (p === "/api/admin/viewers") {
      return Response.json([]);
    }
    if (p === "/api/admin/chat/messages") {
      return Response.json([]);
    }
    if (p === "/api/admin/webhooks") {
      return Response.json([]);
    }
    if (p === "/api/admin/accesstokens") {
      return Response.json([
        { token: DEV_ADMIN_TOKEN, displayName: "Dev Admin", scopes: ["admin"], createdAt: new Date().toISOString() },
      ]);
    }
    if (p === "/api/admin/followers") {
      return Response.json([]);
    }
    if (p === "/api/admin/config") {
      // POST - config update
      return Response.json({ success: true });
    }
    if (p === "/api/admin/chat/send") {
      return Response.json({ success: true });
    }
    // Fallback for unknown admin endpoints
    return Response.json({});
  }

  return null;
}

console.log(`\n  🔥 Oni Dev Server starting on http://localhost:${PORT}`);
console.log(`  📁 Serving from: ${staticDir}`);
console.log(`  🔑 Dev admin token: ${DEV_ADMIN_TOKEN}\n`);

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    // Handle API requests
    const apiResponse = handleApi(url);
    if (apiResponse) {
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: {
          ...Object.fromEntries(apiResponse.headers.entries()),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // WebSocket upgrade for chat
    if (url.pathname === "/ws") {
      const upgraded = Bun.upgrade(req, { data: {} } as any);
      if (upgraded) return undefined as any;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Serve index.html for root and /admin paths (SPA routing)
    if (url.pathname === "/" || url.pathname.startsWith("/admin")) {
      try {
        const html = renderIndex();
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch (e) {
        return new Response("index.html not found. Run `bun run build` first.", { status: 500 });
      }
    }

    // Serve static files
    const filePath = path.join(staticDir, url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      return new Response(content, {
        headers: { "Content-Type": mimeType(filePath) },
      });
    }

    // Fallback to index.html for SPA routes
    try {
      const html = renderIndex();
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
  websocket: {
    open(ws: any) {
      console.log("  WS: client connected");
      ws.send(JSON.stringify({
        type: "CONNECTED",
        id: "ws-dev",
      }));
    },
    message(ws: any, message: any) {
      const data = JSON.parse(String(message));
      if (data.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
      } else {
        console.log("  WS:", data);
      }
    },
    close() {
      console.log("  WS: client disconnected");
    },
  },
});
