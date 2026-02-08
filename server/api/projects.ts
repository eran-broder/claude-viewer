import { Router } from 'express';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import {
  getProjectsDir,
  folderNameToPath,
  getProjectDisplayName,
  isConversationFile,
} from '../utils';

export const projectsRouter = Router();

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  conversationCount: number;
  lastModified: string;
}

// GET /api/projects - List all projects
projectsRouter.get('/', async (req, res) => {
  try {
    const projectsDir = getProjectsDir();
    const entries = await readdir(projectsDir, { withFileTypes: true });

    const projects: ProjectInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = join(projectsDir, entry.name);

      try {
        // Count conversation files
        const files = await readdir(projectPath);
        const conversationFiles = files.filter(isConversationFile);

        // Get last modified time
        const stats = await stat(projectPath);

        projects.push({
          id: entry.name,
          name: getProjectDisplayName(entry.name),
          path: folderNameToPath(entry.name),
          conversationCount: conversationFiles.length,
          lastModified: stats.mtime.toISOString(),
        });
      } catch (err) {
        // Skip projects we can't read
        console.error(`Error reading project ${entry.name}:`, err);
      }
    }

    // Sort by last modified (newest first)
    projects.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    res.json({ projects });
  } catch (err) {
    console.error('Error listing projects:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:projectId - Get single project info
projectsRouter.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectsDir = getProjectsDir();
    const projectPath = join(projectsDir, projectId);

    const stats = await stat(projectPath);
    if (!stats.isDirectory()) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = await readdir(projectPath);
    const conversationFiles = files.filter(isConversationFile);

    res.json({
      id: projectId,
      name: getProjectDisplayName(projectId),
      path: folderNameToPath(projectId),
      conversationCount: conversationFiles.length,
      lastModified: stats.mtime.toISOString(),
    });
  } catch (err) {
    console.error('Error getting project:', err);
    res.status(404).json({ error: 'Project not found' });
  }
});
