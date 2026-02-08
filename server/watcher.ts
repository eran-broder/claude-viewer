import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import { basename, dirname, relative } from 'path';
import { getProjectsDir, isConversationFile } from './utils';
import { broadcast } from './ws';

export function setupWatcher(wss: WebSocketServer): chokidar.FSWatcher {
  const projectsDir = getProjectsDir();

  const watcher = chokidar.watch(projectsDir, {
    ignored: [
      /(^|[\/\\])\../,  // Ignore dotfiles
      /node_modules/,
      /memory\//,       // Ignore memory subdirs
      /subagents\//,    // Ignore subagent subdirs
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 2,           // Only watch 2 levels deep (projects/projectId/files)
  });

  watcher.on('add', (filePath) => {
    if (!isConversationFile(basename(filePath))) return;

    const projectId = getProjectIdFromPath(filePath, projectsDir);
    const conversationId = basename(filePath, '.jsonl');

    console.log(`📄 New conversation: ${projectId}/${conversationId}`);

    broadcast({
      type: 'conversation_added',
      projectId,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('change', (filePath) => {
    if (!isConversationFile(basename(filePath))) return;

    const projectId = getProjectIdFromPath(filePath, projectsDir);
    const conversationId = basename(filePath, '.jsonl');

    console.log(`📝 Conversation updated: ${projectId}/${conversationId}`);

    broadcast({
      type: 'conversation_updated',
      projectId,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('unlink', (filePath) => {
    if (!isConversationFile(basename(filePath))) return;

    const projectId = getProjectIdFromPath(filePath, projectsDir);
    const conversationId = basename(filePath, '.jsonl');

    console.log(`🗑️ Conversation deleted: ${projectId}/${conversationId}`);

    broadcast({
      type: 'conversation_deleted',
      projectId,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('addDir', (dirPath) => {
    if (dirPath === projectsDir) return;

    const relativePath = relative(projectsDir, dirPath);
    // Only trigger for top-level project directories
    if (!relativePath.includes('/') && !relativePath.includes('\\')) {
      console.log(`📁 New project: ${relativePath}`);

      broadcast({
        type: 'project_updated',
        projectId: relativePath,
        timestamp: new Date().toISOString(),
      });
    }
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });

  console.log(`👀 Watching: ${projectsDir}`);

  return watcher;
}

function getProjectIdFromPath(filePath: string, projectsDir: string): string {
  const relativePath = relative(projectsDir, filePath);
  const parts = relativePath.split(/[\/\\]/);
  return parts[0] || 'unknown';
}
