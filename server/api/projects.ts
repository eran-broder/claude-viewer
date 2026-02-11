import { Router } from 'express';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
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

// POST /api/projects/:projectId/continue - Open Claude CLI to continue conversation
projectsRouter.post('/:projectId/continue', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { conversationId } = req.body;

    // Get the actual project path from the project ID
    const projectPath = folderNameToPath(projectId);

    // Build the claude command
    // --resume <sessionId> resumes a specific conversation
    // --continue resumes the most recent in the directory
    const args = ['--permission-mode', 'bypassPermissions'];
    if (conversationId) {
      args.push('--resume', conversationId);
    } else {
      args.push('--continue');
    }

    // Spawn in a new terminal window
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // On Windows, open a new cmd window
      spawn('cmd', ['/c', 'start', 'cmd', '/k', 'claude', ...args], {
        cwd: projectPath,
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else {
      // On macOS/Linux, try to open a terminal
      const terminal = process.platform === 'darwin'
        ? ['open', '-a', 'Terminal', projectPath]
        : ['x-terminal-emulator', '-e'];

      spawn(terminal[0], [...terminal.slice(1), 'claude', ...args], {
        cwd: projectPath,
        detached: true,
        stdio: 'ignore',
      }).unref();
    }

    res.json({ success: true, message: 'Claude CLI opened' });
  } catch (err) {
    console.error('Error opening Claude CLI:', err);
    res.status(500).json({ error: 'Failed to open Claude CLI' });
  }
});
