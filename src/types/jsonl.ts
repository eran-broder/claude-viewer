// JSONL Entry Types for Claude Code Conversations

// Base fields common to most entries
export interface BaseEntry {
  uuid: string;
  timestamp: string;
  parentUuid?: string | null;
  sessionId?: string;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  isSidechain?: boolean;
  userType?: string;
  slug?: string;
}

// Content block types within assistant messages
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

export type ContentBlock = ThinkingBlock | TextBlock | ToolUseBlock | ToolResultBlock;

// Usage statistics
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  server_tool_use?: {
    web_search_requests?: number;
    web_fetch_requests?: number;
  };
  service_tier?: string;
}

// User message entry
export interface UserEntry extends BaseEntry {
  type: 'user';
  message: {
    role: 'user';
    content: string | ContentBlock[];
  };
  thinkingMetadata?: {
    maxThinkingTokens: number;
  };
  todos?: unknown[];
  permissionMode?: string;
  toolUseResult?: ToolUseResultData;
  sourceToolAssistantUUID?: string;
}

// Assistant message entry
export interface AssistantEntry extends BaseEntry {
  type: 'assistant';
  message: {
    model: string;
    id: string;
    type: 'message';
    role: 'assistant';
    content: ContentBlock[];
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: TokenUsage;
  };
  requestId: string;
}

// Tool use result data for file operations
export interface StructuredPatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface ToolUseResultData {
  type?: 'create' | 'update' | 'bash' | 'read' | 'glob' | 'grep';
  filePath?: string;
  content?: string;
  structuredPatch?: StructuredPatchHunk[];
  originalFile?: string | null;
  output?: string;
  exitCode?: number;
  query?: string;
  results?: unknown[];
}

// Progress event types
export interface ProgressData {
  type: 'query_update' | 'search_results_received' | 'bash_progress' | 'hook_progress' | 'agent_progress' | 'thinking' | 'text' | 'tool_use';
  query?: string;
  resultCount?: number;
  output?: string;
  fullOutput?: string;
  elapsedTimeSeconds?: number;
  totalLines?: number;
  hookEvent?: string;
  hookName?: string;
  command?: string;
  message?: unknown;
  normalizedMessages?: unknown[];
  prompt?: string;
  agentId?: string;
}

export interface ProgressEntry extends BaseEntry {
  type: 'progress';
  data: ProgressData;
  toolUseID?: string;
  parentToolUseID?: string;
}

// System event entry
export interface SystemEntry extends BaseEntry {
  type: 'system';
  subtype?: 'turn_duration' | string;
  durationMs?: number;
  isMeta?: boolean;
}

// File history snapshot
export interface FileHistoryEntry {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

// Union of all entry types
export type JsonlEntry =
  | UserEntry
  | AssistantEntry
  | ProgressEntry
  | SystemEntry
  | FileHistoryEntry;

// Type guards
export function isUserEntry(entry: JsonlEntry): entry is UserEntry {
  return entry.type === 'user';
}

export function isAssistantEntry(entry: JsonlEntry): entry is AssistantEntry {
  return entry.type === 'assistant';
}

export function isProgressEntry(entry: JsonlEntry): entry is ProgressEntry {
  return entry.type === 'progress';
}

export function isSystemEntry(entry: JsonlEntry): entry is SystemEntry {
  return entry.type === 'system';
}

export function isFileHistoryEntry(entry: JsonlEntry): entry is FileHistoryEntry {
  return entry.type === 'file-history-snapshot';
}

export function isThinkingBlock(block: ContentBlock): block is ThinkingBlock {
  return block.type === 'thinking';
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === 'text';
}

export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === 'tool_use';
}

export function isToolResultBlock(block: ContentBlock): block is ToolResultBlock {
  return block.type === 'tool_result';
}
