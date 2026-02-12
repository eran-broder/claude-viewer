import { WsMessageSchema, type WsMessage } from './schemas';

// Construct WebSocket URL based on current location
function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

// WebSocket connection manager with reconnect logic
class WebSocketManager {
  private ws: WebSocket | null = null;
  private onMessage: ((msg: WsMessage) => void) | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private shouldReconnect = true;

  connect(onMessage: (msg: WsMessage) => void): void {
    this.onMessage = onMessage;
    this.shouldReconnect = true;
    this.doConnect();
  }

  private doConnect(): void {
    if (!this.shouldReconnect) return;

    try {
      this.ws = new WebSocket(getWsUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // Reset on successful connect
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const result = WsMessageSchema.safeParse(data);

        if (result.success) {
          this.onMessage?.(result.data);
        } else {
          console.warn('Invalid WebSocket message:', result.error.errors);
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onerror = () => {
      // Errors also trigger onclose
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    setTimeout(() => this.doConnect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }

  close(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }
}

let wsManager: WebSocketManager | null = null;

export function connectWebSocket(onMessage: (msg: WsMessage) => void): () => void {
  wsManager = new WebSocketManager();
  wsManager.connect(onMessage);
  return () => wsManager?.close();
}

export type { WsMessage } from './schemas';
