import type {
  JsonlEntry,
  UserEntry,
  AssistantEntry,
  ContentBlock,
  ToolResultBlock,
  TextBlock,
} from '../types/jsonl';
import type {
  ParsedConversation,
  ConversationMessage,
  ConversationStats,
  ProcessedBlock,
  ProcessedToolResult,
  ParseError,
} from '../types/conversation';
import {
  isUserEntry,
  isAssistantEntry,
  isToolUseBlock,
  isToolResultBlock,
  isThinkingBlock,
  isTextBlock,
} from '../types/jsonl';

export function parseJsonlFile(content: string): ParsedConversation {
  const lines = content.split('\n').filter((line) => line.trim());
  const entries: JsonlEntry[] = [];
  const errors: ParseError[] = [];
  const entryTypes: Record<string, number> = {};

  // Parse each line
  lines.forEach((line, index) => {
    try {
      const entry = JSON.parse(line) as JsonlEntry;
      entries.push(entry);
      const type = entry.type || 'unknown';
      entryTypes[type] = (entryTypes[type] || 0) + 1;
    } catch (e) {
      errors.push({
        line: index + 1,
        message: e instanceof Error ? e.message : 'Unknown parse error',
        content: line.slice(0, 100),
      });
    }
  });

  // Build conversation from entries
  const { messages, stats } = buildConversation(entries);

  // Extract session ID
  const entryWithSession = entries.find((e) => 'sessionId' in e && (e as unknown as { sessionId?: string }).sessionId);
  const sessionId = entryWithSession ? (entryWithSession as unknown as { sessionId: string }).sessionId : 'unknown';

  return {
    sessionId,
    messages,
    stats,
    errors,
    raw: {
      totalEntries: entries.length,
      entryTypes,
    },
  };
}

function buildConversation(entries: JsonlEntry[]): {
  messages: ConversationMessage[];
  stats: ConversationStats;
} {
  const messages: ConversationMessage[] = [];
  const toolResults = new Map<string, ProcessedToolResult>();
  const stats: ConversationStats = {
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    totalToolUses: 0,
    toolUseCounts: {},
    totalDuration: 0,
  };

  // First pass: collect tool results
  for (const entry of entries) {
    if (isUserEntry(entry) && entry.toolUseResult) {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (isToolResultBlock(block as ContentBlock)) {
            const resultBlock = block as ToolResultBlock;
            toolResults.set(resultBlock.tool_use_id, processToolResult(resultBlock, entry));
          }
        }
      }
    }
  }

  // Second pass: build messages
  for (const entry of entries) {
    if (isUserEntry(entry)) {
      // Skip tool result entries (they get attached to tool uses)
      if (Array.isArray(entry.message.content)) {
        const hasOnlyToolResults = entry.message.content.every(
          (b) => (b as ContentBlock).type === 'tool_result'
        );
        if (hasOnlyToolResults) continue;
      }

      const message = processUserEntry(entry);
      if (message) {
        messages.push(message);
        stats.userMessages++;
        stats.totalMessages++;
      }
    } else if (isAssistantEntry(entry)) {
      const message = processAssistantEntry(entry, toolResults);
      if (message) {
        messages.push(message);
        stats.assistantMessages++;
        stats.totalMessages++;

        // Update stats from usage
        const usage = entry.message.usage;
        if (usage) {
          stats.totalInputTokens += usage.input_tokens || 0;
          stats.totalOutputTokens += usage.output_tokens || 0;
          stats.cacheHits += usage.cache_read_input_tokens || 0;
          stats.cacheMisses += usage.cache_creation_input_tokens || 0;
        }

        // Count tool uses
        for (const block of entry.message.content) {
          if (isToolUseBlock(block)) {
            stats.totalToolUses++;
            stats.toolUseCounts[block.name] = (stats.toolUseCounts[block.name] || 0) + 1;
          }
        }

        // Track model and version
        if (!stats.model) stats.model = entry.message.model;
        if (!stats.version && entry.version) stats.version = entry.version;
      }
    }
  }

  // Calculate cache hit rate
  const totalCacheTokens = stats.cacheHits + stats.cacheMisses;
  stats.cacheHitRate = totalCacheTokens > 0 ? stats.cacheHits / totalCacheTokens : 0;

  // Sort messages by timestamp
  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate duration
  if (messages.length >= 2) {
    stats.startTime = messages[0].timestamp;
    stats.endTime = messages[messages.length - 1].timestamp;
    stats.totalDuration = stats.endTime.getTime() - stats.startTime.getTime();
  }

  return { messages, stats };
}

function processUserEntry(entry: UserEntry): ConversationMessage | null {
  const content = entry.message.content;
  let text = '';

  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    // Extract text from content blocks (skip tool results)
    text = content
      .filter((b) => (b as ContentBlock).type !== 'tool_result')
      .map((b) => {
        if ((b as TextBlock).type === 'text') return (b as TextBlock).text;
        return '';
      })
      .join('\n');
  }

  if (!text.trim()) return null;

  // Skip system notifications (task notifications, etc.)
  const trimmed = text.trim();
  if (trimmed.startsWith('<task-notification>') ||
      trimmed.startsWith('<system-reminder>') ||
      trimmed.startsWith('<user-prompt-submit-hook>')) {
    return null;
  }

  return {
    id: entry.uuid,
    type: 'user',
    timestamp: new Date(entry.timestamp),
    parentId: entry.parentUuid,
    content: { text },
    metadata: {
      cwd: entry.cwd,
      version: entry.version,
      gitBranch: entry.gitBranch,
    },
  };
}

function processAssistantEntry(
  entry: AssistantEntry,
  toolResults: Map<string, ProcessedToolResult>
): ConversationMessage {
  const blocks: ProcessedBlock[] = [];

  for (const block of entry.message.content) {
    if (isThinkingBlock(block)) {
      blocks.push({
        id: `${entry.uuid}-thinking-${blocks.length}`,
        type: 'thinking',
        content: block.thinking,
      });
    } else if (isTextBlock(block)) {
      blocks.push({
        id: `${entry.uuid}-text-${blocks.length}`,
        type: 'text',
        content: block.text,
      });
    } else if (isToolUseBlock(block)) {
      const result = toolResults.get(block.id);
      blocks.push({
        id: `${entry.uuid}-tool-${block.id}`,
        type: 'tool_use',
        content: JSON.stringify(block.input, null, 2),
        toolName: block.name,
        toolInput: block.input,
        toolId: block.id,
        result,
      });
    }
  }

  return {
    id: entry.uuid,
    type: 'assistant',
    timestamp: new Date(entry.timestamp),
    parentId: entry.parentUuid,
    content: { blocks },
    metadata: {
      model: entry.message.model,
      requestId: entry.requestId,
      usage: entry.message.usage,
      cwd: entry.cwd,
      version: entry.version,
      gitBranch: entry.gitBranch,
    },
  };
}

function processToolResult(block: ToolResultBlock, entry: UserEntry): ProcessedToolResult {
  const result: ProcessedToolResult = {
    toolUseId: block.tool_use_id,
    content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
    isError: block.is_error,
  };

  // Process tool-specific result data
  if (entry.toolUseResult) {
    const data = entry.toolUseResult;
    result.type = data.type;
    result.filePath = data.filePath;
    result.exitCode = data.exitCode;
    result.output = data.output;

    // Process file diffs
    if (data.structuredPatch && data.structuredPatch.length > 0 && data.filePath) {
      let additions = 0;
      let deletions = 0;

      for (const hunk of data.structuredPatch) {
        for (const line of hunk.lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) additions++;
          if (line.startsWith('-') && !line.startsWith('---')) deletions++;
        }
      }

      result.diff = {
        filePath: data.filePath,
        hunks: data.structuredPatch,
        additions,
        deletions,
        originalContent: data.originalFile || undefined,
        newContent: data.content,
      };
    }

    if (data.content && !result.diff) {
      result.fileContent = data.content;
    }
  }

  return result;
}

// Helper to extract plain text from a conversation for search
export function extractSearchableText(message: ConversationMessage): string {
  const parts: string[] = [];

  if (message.content.text) {
    parts.push(message.content.text);
  }

  if (message.content.blocks) {
    for (const block of message.content.blocks) {
      parts.push(block.content);
      if (block.result?.content) {
        parts.push(block.result.content);
      }
    }
  }

  return parts.join(' ').toLowerCase();
}
