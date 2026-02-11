import { Router } from 'express';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import {
  getProjectsDir,
  isConversationFile,
  getFirstUserMessage,
  getConversationMetadata,
  formatFileSize,
} from '../utils';

export const conversationsRouter = Router();

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

// GET /api/conversations?projectId=xxx - List conversations for a project
conversationsRouter.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId query parameter required' });
    }

    const projectPath = join(getProjectsDir(), projectId);
    const files = await readdir(projectPath);
    const conversationFiles = files.filter(isConversationFile);

    const conversations: ConversationInfo[] = [];

    for (const file of conversationFiles) {
      const filePath = join(projectPath, file);
      const id = file.replace('.jsonl', '');

      try {
        const [fileStats, firstMessage, metadata] = await Promise.all([
          stat(filePath),
          getFirstUserMessage(filePath),
          getConversationMetadata(filePath),
        ]);

        conversations.push({
          id,
          projectId,
          firstMessage,
          messageCount: metadata.messageCount,
          timestamp: metadata.firstTimestamp,
          lastModified: fileStats.mtime.toISOString(),
          size: formatFileSize(fileStats.size),
          sizeBytes: fileStats.size,
          model: metadata.model,
        });
      } catch (err) {
        console.error(`Error reading conversation ${file}:`, err);
      }
    }

    // Sort by last modified (newest first)
    conversations.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    res.json({ conversations });
  } catch (err) {
    console.error('Error listing conversations:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// GET /api/conversations/search?q=xxx - Search across all conversations
// NOTE: This must be defined BEFORE /:id to avoid being matched as id="search"
conversationsRouter.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ results: [] });
    }

    const query = q.toLowerCase();
    const projectsDir = getProjectsDir();
    const projects = await readdir(projectsDir);
    const results: SearchResult[] = [];
    const MAX_RESULTS = 50;

    for (const projectId of projects) {
      if (results.length >= MAX_RESULTS) break;

      const projectPath = join(projectsDir, projectId);
      const projectStat = await stat(projectPath).catch(() => null);
      if (!projectStat?.isDirectory()) continue;

      const files = await readdir(projectPath).catch(() => []);
      const conversationFiles = files.filter(isConversationFile);

      for (const file of conversationFiles) {
        if (results.length >= MAX_RESULTS) break;

        const filePath = join(projectPath, file);
        const conversationId = file.replace('.jsonl', '');

        try {
          const content = await readFile(filePath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);

          for (const line of lines) {
            if (results.length >= MAX_RESULTS) break;

            try {
              const entry = JSON.parse(line);
              const text = extractText(entry);
              const lowerText = text.toLowerCase();
              const idx = lowerText.indexOf(query);

              if (idx !== -1) {
                const start = Math.max(0, idx - 40);
                const end = Math.min(text.length, idx + query.length + 40);
                const snippet = (start > 0 ? '...' : '') +
                  text.slice(start, end) +
                  (end < text.length ? '...' : '');

                results.push({
                  projectId,
                  conversationId,
                  snippet,
                  matchIndex: idx,
                  type: entry.type || 'unknown',
                });
                break;
              }
            } catch {
              continue;
            }
          }
        } catch {
          continue;
        }
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

interface SearchResult {
  projectId: string;
  conversationId: string;
  snippet: string;
  matchIndex: number;
  type: string;
}

function extractText(entry: Record<string, unknown>): string {
  const parts: string[] = [];
  if (entry.message && typeof entry.message === 'object') {
    const msg = entry.message as Record<string, unknown>;
    if (typeof msg.content === 'string') {
      parts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block && typeof block === 'object') {
          const b = block as Record<string, unknown>;
          if (b.type === 'text' && typeof b.text === 'string') {
            parts.push(b.text);
          }
          if (b.type === 'thinking' && typeof b.thinking === 'string') {
            parts.push(b.thinking);
          }
        }
      }
    }
  }
  return parts.join(' ');
}

// GET /api/conversations/:id?projectId=xxx - Get full conversation content
conversationsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId query parameter required' });
    }

    const filePath = join(getProjectsDir(), projectId, `${id}.jsonl`);
    const content = await readFile(filePath, 'utf-8');

    res.json({ content });
  } catch (err) {
    console.error('Error reading conversation:', err);
    res.status(404).json({ error: 'Conversation not found' });
  }
});

// GET /api/conversations/:id/metadata?projectId=xxx - Get conversation metadata only
conversationsRouter.get('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId query parameter required' });
    }

    const filePath = join(getProjectsDir(), projectId, `${id}.jsonl`);
    const [fileStats, firstMessage, metadata] = await Promise.all([
      stat(filePath),
      getFirstUserMessage(filePath),
      getConversationMetadata(filePath),
    ]);

    res.json({
      id,
      projectId,
      firstMessage,
      messageCount: metadata.messageCount,
      timestamp: metadata.firstTimestamp,
      lastModified: fileStats.mtime.toISOString(),
      size: formatFileSize(fileStats.size),
      sizeBytes: fileStats.size,
      model: metadata.model,
    });
  } catch (err) {
    console.error('Error reading conversation metadata:', err);
    res.status(404).json({ error: 'Conversation not found' });
  }
});
