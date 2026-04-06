import { WebSocketServer, WebSocket } from "ws";
import { db } from "../config/db.js";
import { ioRedis as redis } from "../config/redis.js";
import { env } from "../config/env.js";

const WS_PORT = env.PORT + 1; // Use next port for WS if not specified

// Store active WebSocket connections per show
const connections = new Map<string, Set<WebSocket>>();

function getShowConnections(showId: string): Set<WebSocket> {
  if (!connections.has(showId)) {
    connections.set(showId, new Set());
  }
  return connections.get(showId)!;
}

function broadcastToShow(showId: string, message: object): void {
  const conns = getShowConnections(showId);
  const data = JSON.stringify(message);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Handle seat lock expiry notifications from Redis keyspace notifications
export async function setupRedisSubscriber() {
  const sub = redis.duplicate();
  // ioredis connect is automatic or handled by sub.subscribe
  
  // Subscribe to key expiration events for seat locks
  await sub.subscribe("__keyevent@0__:expired");
  
  sub.on("message", (channel, message) => {
    if (message.startsWith("booking:lock:")) {
      const lockId = message.replace("booking:lock:", "");
      const parts = lockId.split(":");
      const showId = parts[3]; // booking:lock:{userId}:{showId}:{timestamp}

      if (showId) {
        broadcastToShow(showId, {
          type: "SEAT_LOCK_EXPIRED",
          lockId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  console.log("🔌 Redis subscriber ready for seat lock expirations");
}

export function createWebSocketServer() {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("connection", (ws: WebSocket, req: any) => {
    const url = new URL(req.url || "", `ws://localhost:${WS_PORT}`);
    const showId = url.searchParams.get("showId");

    if (!showId) {
      ws.close(1008, "Missing showId parameter");
      return;
    }

    const room = getShowConnections(showId);
    room.add(ws);
    console.log(`WS: Client connected to show ${showId}`);

    ws.on("close", () => {
      room.delete(ws);
      console.log(`WS: Client disconnected from show ${showId}`);
    });

    ws.on("error", (err: Error) => {
      console.error(`WS error for show ${showId}:`, err);
      room.delete(ws);
    });

    ws.on("message", (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch {
        // ignore
      }
    });
  });

  console.log(`🌐 WebSocket server listening on ws://localhost:${WS_PORT}`);

  return wss;
}

export function notifySeatStatusChange(showId: string, seatId: string, status: string, userId?: string) {
  broadcastToShow(showId, {
    type: "SEAT_STATUS_UPDATE",
    seatId,
    status,
    userId,
    timestamp: new Date().toISOString(),
  });
}
