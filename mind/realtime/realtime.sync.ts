/**
 * @keywords    WebSocket, real-time sync, presence, live updates, channel, pub-sub, broadcast
 * @domain      Realtime Sync
 * @use-when    Building real-time collaboration, live feeds, or presence systems over WebSocket
 * @not-when    Simple polling is sufficient — WebSocket adds complexity only worth it for sub-second updates
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageType =
  | "subscribe" | "unsubscribe"
  | "publish"   | "broadcast"
  | "presence"  | "ping" | "pong"
  | "error"     | "ack";

export interface SyncMessage<T = unknown> {
  id: string;
  type: MessageType;
  channel?: string;
  payload?: T;
  senderId?: string;
  timestamp: number;
}

export interface PresenceInfo {
  userId: string;
  status: "online" | "away" | "offline";
  metadata?: Record<string, unknown>;
  lastSeenAt: number;
}

export interface SyncClientConfig {
  url: string;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Event) => void;
}

type MessageHandler<T = unknown> = (message: SyncMessage<T>) => void;
type PresenceHandler = (presence: PresenceInfo[]) => void;

// ─── SyncClient ───────────────────────────────────────────────────────────────

export class SyncClient {
  private ws: WebSocket | null = null;
  private config: Required<SyncClientConfig>;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private presenceHandlers: Map<string, PresenceHandler> = new Map();
  private pendingAcks: Map<string, { resolve: () => void; reject: (e: Error) => void }> = new Map();
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalClose = false;
  private messageQueue: SyncMessage[] = []; // Buffer messages while reconnecting

  constructor(config: SyncClientConfig) {
    this.config = {
      reconnectDelayMs: config.reconnectDelayMs ?? 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30_000,
      onConnect: config.onConnect ?? (() => {}),
      onDisconnect: config.onDisconnect ?? (() => {}),
      onError: config.onError ?? (() => {}),
      ...config,
    };
  }

  connect(): void {
    this.isIntentionalClose = false;
    this.createConnection();
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.clearTimers();
    this.ws?.close(1000, "Client disconnect");
    this.ws = null;
  }

  subscribe<T>(channel: string, handler: MessageHandler<T>): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.send({ type: "subscribe", channel });
    }
    this.subscriptions.get(channel)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(channel)?.delete(handler as MessageHandler);
      if (this.subscriptions.get(channel)?.size === 0) {
        this.subscriptions.delete(channel);
        this.send({ type: "unsubscribe", channel });
      }
    };
  }

  publish<T>(channel: string, payload: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const msg = this.buildMessage<T>("publish", { channel, payload });
      this.pendingAcks.set(msg.id, { resolve, reject });
      setTimeout(() => {
        if (this.pendingAcks.has(msg.id)) {
          this.pendingAcks.delete(msg.id);
          reject(new Error(`Publish ack timeout for message ${msg.id}`));
        }
      }, 5000);
      this.send(msg);
    });
  }

  watchPresence(channel: string, handler: PresenceHandler): () => void {
    this.presenceHandlers.set(channel, handler);
    this.send({ type: "presence", channel });
    return () => this.presenceHandlers.delete(channel);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private createConnection(): void {
    this.ws = new WebSocket(this.config.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.resubscribeAll();
      this.drainQueue();
      this.config.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch { /* ignore malformed messages */ }
    };

    this.ws.onerror = (event) => {
      this.config.onError(event);
    };

    this.ws.onclose = (event) => {
      this.clearTimers();
      this.config.onDisconnect(event.reason);
      if (!this.isIntentionalClose) this.scheduleReconnect();
    };
  }

  private handleMessage(msg: SyncMessage): void {
    if (msg.type === "pong") return;

    if (msg.type === "ack" && msg.id) {
      this.pendingAcks.get(msg.id)?.resolve();
      this.pendingAcks.delete(msg.id);
      return;
    }

    if (msg.type === "presence" && msg.channel) {
      const handler = this.presenceHandlers.get(msg.channel);
      if (handler) handler(msg.payload as PresenceInfo[]);
      return;
    }

    if (msg.channel) {
      this.subscriptions.get(msg.channel)?.forEach((h) => h(msg));
    }
  }

  private send(partial: Partial<SyncMessage>): void {
    const msg = this.buildMessage(partial.type ?? "publish", partial);
    if (!this.isConnected) { this.messageQueue.push(msg); return; }
    this.ws!.send(JSON.stringify(msg));
  }

  private buildMessage<T>(type: MessageType, partial: Partial<SyncMessage<T>> = {}): SyncMessage<T> {
    return {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      ...partial,
    } as SyncMessage<T>;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) this.ws!.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
    }, this.config.heartbeatIntervalMs);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) return;
    const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.createConnection();
    }, Math.min(delay, 30_000));
  }

  private resubscribeAll(): void {
    for (const channel of this.subscriptions.keys()) {
      this.ws!.send(JSON.stringify(this.buildMessage("subscribe", { channel })));
    }
  }

  private drainQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    queue.forEach((msg) => this.ws!.send(JSON.stringify(msg)));
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSyncClient(config: SyncClientConfig): SyncClient {
  return new SyncClient(config);
}

/*
 * Usage Example:
 *
 * const client = createSyncClient({
 *   url: "wss://api.example.com/sync",
 *   reconnectDelayMs: 1000,
 *   maxReconnectAttempts: 5,
 *   onConnect: () => console.log("Connected"),
 *   onDisconnect: (reason) => console.warn("Disconnected:", reason),
 * });
 *
 * client.connect();
 *
 * // Subscribe to a channel
 * const unsubscribe = client.subscribe<{ text: string }>("room:123", (msg) => {
 *   console.log("New message:", msg.payload?.text);
 * });
 *
 * // Publish with delivery acknowledgement
 * await client.publish("room:123", { text: "Hello!" });
 *
 * // Track presence
 * client.watchPresence("room:123", (users) => {
 *   console.log("Online:", users.filter((u) => u.status === "online").length);
 * });
 *
 * // Cleanup
 * unsubscribe();
 * client.disconnect();
 */
