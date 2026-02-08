// Use relative URLs - works in both dev and production
const API_BASE = '/api';

// Construct WebSocket URL based on current location
function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  conversationCount: number;
  lastModified: string;
}

export interface ConversationInfo {
  id: string;
  projectId: string;
  firstMessage: string | null;
  messageCount: number;
  timestamp: string | null;
  lastModified: string;
  size: string;
  sizeBytes: number;
  model: string | null;
}

export interface WsMessage {
  type: 'connected' | 'project_updated' | 'conversation_added' | 'conversation_updated' | 'conversation_deleted';
  projectId?: string;
  conversationId?: string;
  timestamp: string;
}

// Fetch all projects
export async function fetchProjects(): Promise<ProjectInfo[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  const data = await response.json();
  return data.projects;
}

// Fetch conversations for a project
export async function fetchConversations(projectId: string): Promise<ConversationInfo[]> {
  const response = await fetch(`${API_BASE}/conversations?projectId=${encodeURIComponent(projectId)}`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  const data = await response.json();
  return data.conversations;
}

// Fetch conversation content
export async function fetchConversationContent(projectId: string, conversationId: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}?projectId=${encodeURIComponent(projectId)}`
  );
  if (!response.ok) throw new Error('Failed to fetch conversation');
  const data = await response.json();
  return data.content;
}

// WebSocket connection manager
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
        const message = JSON.parse(event.data) as WsMessage;
        this.onMessage?.(message);
      } catch { /* ignore parse errors */ }
    };

    this.ws.onerror = () => {}; // Errors also trigger onclose

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
