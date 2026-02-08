import type { TokenUsage, StructuredPatchHunk } from './jsonl';

// Processed message types for display
export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  parentId?: string | null;
  content: ProcessedContent;
  metadata?: MessageMetadata;
}

export interface ProcessedContent {
  // For user messages
  text?: string;
  // For assistant messages
  blocks?: ProcessedBlock[];
  // For tool results attached to user messages
  toolResult?: ProcessedToolResult;
}

export interface ProcessedBlock {
  id: string;
  type: 'thinking' | 'text' | 'tool_use';
  content: string;
  // For tool_use blocks
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolId?: string;
  // Linked result (if available)
  result?: ProcessedToolResult;
}

export interface ProcessedToolResult {
  toolUseId: string;
  type?: string;
  content: string;
  isError?: boolean;
  // File operation specific
  filePath?: string;
  fileContent?: string;
  diff?: ProcessedDiff;
  // Bash specific
  exitCode?: number;
  output?: string;
}

export interface ProcessedDiff {
  filePath: string;
  hunks: StructuredPatchHunk[];
  additions: number;
  deletions: number;
  originalContent?: string;
  newContent?: string;
}

export interface MessageMetadata {
  model?: string;
  requestId?: string;
  usage?: TokenUsage;
  duration?: number;
  cwd?: string;
  version?: string;
  gitBranch?: string;
}

// Conversation statistics
export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  totalToolUses: number;
  toolUseCounts: Record<string, number>;
  totalDuration: number;
  startTime?: Date;
  endTime?: Date;
  model?: string;
  version?: string;
}

// Parsed conversation result
export interface ParsedConversation {
  sessionId: string;
  messages: ConversationMessage[];
  stats: ConversationStats;
  errors: ParseError[];
  raw: {
    totalEntries: number;
    entryTypes: Record<string, number>;
  };
}

export interface ParseError {
  line: number;
  message: string;
  content?: string;
}

// UI State types
export interface ViewerState {
  conversation: ParsedConversation | null;
  isLoading: boolean;
  error: string | null;
  selectedMessageId: string | null;
  searchQuery: string;
  searchResults: string[];
  expandedThinking: Set<string>;
  expandedTools: Set<string>;
  showTimeline: boolean;
  showStats: boolean;
}

// Export options
export interface ExportOptions {
  includeThinking: boolean;
  includeToolDetails: boolean;
  includeDiffs: boolean;
  includeStats: boolean;
  format: 'html' | 'markdown' | 'json';
}
