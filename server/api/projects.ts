import { Router } from 'express';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import {
  ProjectInfoSchema,
  ProjectsResponseSchema,
  ContinueRequestSchema,
  ContinueResponseSchema,
  type ProjectInfo,
} from '../../shared/schemas';
import {
  getProjectsDir,
  folderNameToPath,
  getProjectDisplayName,
  isConversationFile,
} from '../utils';

export const projectsRouter = Router();

// GET /api/projects - List all projects
projectsRouter.get('/', async (_req, res) => {
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

        const project: ProjectInfo = {
          id: entry.name,
          name: getProjectDisplayName(entry.name),
          path: folderNameToPath(entry.name),
          conversationCount: conversationFiles.length,
          lastModified: stats.mtime.toISOString(),
        };

        // Validate with Zod
        const validated = ProjectInfoSchema.parse(project);
        projects.push(validated);
      } catch (err) {
        // Skip projects we can't read
        console.error(`Error reading project ${entry.name}:`, err);
      }
    }

    // Sort by last modified (newest first)
    projects.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    // Validate response
    const response = ProjectsResponseSchema.parse({ projects });
    res.json(response);
  } catch (err) {
    console.error('Error listing projects:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// POST /api/projects/:projectId/continue - Open Claude CLI to continue conversation
projectsRouter.post('/:projectId/continue', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Validate request body
    const body = ContinueRequestSchema.parse(req.body);
    const { conversationId } = body;

    // Get the actual project path from the project ID
    const projectPath = folderNameToPath(projectId);

    // Build the claude command
    const args = ['--permission-mode', 'bypassPermissions'];
    if (conversationId) {
      args.push('--resume', conversationId);
    } else {
      args.push('--continue');
    }

    // Spawn in a new terminal window
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const cmdPath = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
      spawn(cmdPath, ['/c', 'start', 'cmd', '/k', 'claude', ...args], {
        cwd: projectPath,
        detached: true,
        stdio: 'ignore',
        shell: true,
      }).unref();
    } else {
      const terminal = process.platform === 'darwin'
        ? ['open', '-a', 'Terminal', projectPath]
        : ['x-terminal-emulator', '-e'];

      spawn(terminal[0], [...terminal.slice(1), 'claude', ...args], {
        cwd: projectPath,
        detached: true,
        stdio: 'ignore',
      }).unref();
    }

    // Validate and send response
    const response = ContinueResponseSchema.parse({
      success: true,
      message: 'Claude CLI opened'
    });
    res.json(response);
  } catch (err) {
    console.error('Error opening Claude CLI:', err);
    res.status(500).json({ error: 'Failed to open Claude CLI' });
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

    const project: ProjectInfo = {
      id: projectId,
      name: getProjectDisplayName(projectId),
      path: folderNameToPath(projectId),
      conversationCount: conversationFiles.length,
      lastModified: stats.mtime.toISOString(),
    };

    // Validate with Zod
    const response = ProjectInfoSchema.parse(project);
    res.json(response);
  } catch (err) {
    console.error('Error getting project:', err);
    res.status(404).json({ error: 'Project not found' });
  }
});
