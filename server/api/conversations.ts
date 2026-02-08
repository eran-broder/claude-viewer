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
