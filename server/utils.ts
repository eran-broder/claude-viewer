import { homedir } from 'os';
import { join } from 'path';
import { readdir, stat, readFile } from 'fs/promises';

// Get the Claude config directory
export function getClaudeDir(): string {
  return join(homedir(), '.claude');
}

// Get the projects directory
export function getProjectsDir(): string {
  return join(getClaudeDir(), 'projects');
}

// Convert project folder name to readable path
// e.g., "C--Users-john-projects-myapp" -> "C:/Users/john/projects/myapp"
export function folderNameToPath(folderName: string): string {
  return folderName
    .replace(/^([A-Za-z])--/, '$1:/')
    .replace(/--/g, '/')
    .replace(/-/g, '/');
}

// Convert path to folder name
export function pathToFolderName(path: string): string {
  return path
    .replace(/[/\\]/g, '-')
    .replace(/:/g, '-');
}

// Get project display name from folder name
export function getProjectDisplayName(folderName: string): string {
  const path = folderNameToPath(folderName);
  const parts = path.split('/');
  return parts[parts.length - 1] || folderName;
}

// Check if a file is a JSONL conversation file
export function isConversationFile(filename: string): boolean {
  return filename.endsWith('.jsonl') && !filename.startsWith('.');
}

// Get first user message from JSONL content (for preview)
export async function getFirstUserMessage(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines.slice(0, 50)) { // Check first 50 lines
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'user' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : '';
          return text.slice(0, 100);
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Get conversation metadata by scanning the file
export async function getConversationMetadata(filePath: string): Promise<{
  messageCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  model: string | null;
}> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    let messageCount = 0;
    let firstTimestamp: string | null = null;
    let lastTimestamp: string | null = null;
    let model: string | null = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        if (entry.type === 'user' || entry.type === 'assistant') {
          messageCount++;

          if (entry.timestamp) {
            if (!firstTimestamp) firstTimestamp = entry.timestamp;
            lastTimestamp = entry.timestamp;
          }

          if (entry.type === 'assistant' && entry.message?.model && !model) {
            model = entry.message.model;
          }
        }
      } catch {
        continue;
      }
    }

    return { messageCount, firstTimestamp, lastTimestamp, model };
  } catch {
    return { messageCount: 0, firstTimestamp: null, lastTimestamp: null, model: null };
  }
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
