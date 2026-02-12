import { Router } from 'express';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import {
  ConversationInfoSchema,
  ConversationsResponseSchema,
  SearchResultSchema,
  SearchResponseSchema,
  ConversationContentResponseSchema,
  type ConversationInfo,
} from '../../shared/schemas';
import {
  getProjectsDir,
  isConversationFile,
  getFirstUserMessage,
  getConversationMetadata,
  formatFileSize,
} from '../utils';
import { getSearchIndex } from '../services/search-index';

export const conversationsRouter = Router();

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

        const conversation: ConversationInfo = {
          id,
          projectId,
          firstMessage,
          messageCount: metadata.messageCount,
          timestamp: metadata.firstTimestamp,
          lastModified: fileStats.mtime.toISOString(),
          size: formatFileSize(fileStats.size),
          sizeBytes: fileStats.size,
          model: metadata.model,
        };

        // Validate with Zod
        const validated = ConversationInfoSchema.parse(conversation);
        conversations.push(validated);
      } catch (err) {
        console.error(`Error reading conversation ${file}:`, err);
      }
    }

    // Sort by last modified (newest first)
    conversations.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    // Validate response
    const response = ConversationsResponseSchema.parse({ conversations });
    res.json(response);
  } catch (err) {
    console.error('Error listing conversations:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// GET /api/conversations/search?q=xxx - Search across all conversations (indexed)
conversationsRouter.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json(SearchResponseSchema.parse({ results: [] }));
    }

    const searchIndex = getSearchIndex();

    // Ensure index is up to date (checks last_modified dates)
    await searchIndex.ensureIndexed();

    // Use indexed search
    const rawResults = await searchIndex.search(q, 50);

    // Validate each result with Zod
    const results = rawResults.map(r => SearchResultSchema.parse(r));

    // Validate response
    const response = SearchResponseSchema.parse({ results });
    res.json(response);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/conversations/search/index/status - Get index status
conversationsRouter.get('/search/index/status', async (_req, res) => {
  try {
    const searchIndex = getSearchIndex();
    const stats = await searchIndex.getStats();
    res.json({
      indexed: true,
      ...stats,
    });
  } catch (err) {
    console.error('Index status error:', err);
    res.status(500).json({ error: 'Failed to get index status' });
  }
});

// POST /api/conversations/search/index/rebuild - Force rebuild index
conversationsRouter.post('/search/index/rebuild', async (_req, res) => {
  try {
    const searchIndex = getSearchIndex();
    await searchIndex.ensureIndexed();
    const stats = searchIndex.getStats();
    res.json({
      success: true,
      message: 'Index rebuilt',
      ...stats,
    });
  } catch (err) {
    console.error('Index rebuild error:', err);
    res.status(500).json({ error: 'Failed to rebuild index' });
  }
});

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

    // Validate response
    const response = ConversationContentResponseSchema.parse({ content });
    res.json(response);
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

    const conversation: ConversationInfo = {
      id,
      projectId,
      firstMessage,
      messageCount: metadata.messageCount,
      timestamp: metadata.firstTimestamp,
      lastModified: fileStats.mtime.toISOString(),
      size: formatFileSize(fileStats.size),
      sizeBytes: fileStats.size,
      model: metadata.model,
    };

    // Validate with Zod
    const response = ConversationInfoSchema.parse(conversation);
    res.json(response);
  } catch (err) {
    console.error('Error reading conversation metadata:', err);
    res.status(404).json({ error: 'Conversation not found' });
  }
});
