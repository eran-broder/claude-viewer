import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface WsMessage {
  type: 'project_updated' | 'conversation_added' | 'conversation_updated' | 'conversation_deleted';
  projectId: string;
  conversationId?: string;
  timestamp: string;
}

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('📡 WebSocket client connected');

    ws.on('close', () => {
      console.log('📡 WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
    }));
  });

  return wss;
}

export function broadcast(message: WsMessage): void {
  if (!wss) return;

  const data = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
