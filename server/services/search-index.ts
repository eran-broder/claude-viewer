import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readdir, stat, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getProjectsDir, isConversationFile } from '../utils';

class SearchIndex {
  private db: SqlJsDatabase | null = null;
  private indexPath: string;
  private indexDir: string;
  private initPromise: Promise<void>;

  constructor() {
    // Store index in user's home directory under .claude-viewer
    const homeDir = process.env.USERPROFILE || process.env.HOME || '.';
    this.indexDir = join(homeDir, '.claude-viewer');
    this.indexPath = join(this.indexDir, 'search-index.db');

    // Initialize async
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    // Ensure directory exists
    if (!existsSync(this.indexDir)) {
      mkdirSync(this.indexDir, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Load existing database or create new
    if (existsSync(this.indexPath)) {
      try {
        const fileBuffer = readFileSync(this.indexPath);
        this.db = new SQL.Database(fileBuffer);
      } catch {
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }

    this.initSchema();
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY,
        project_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        indexed_at TEXT NOT NULL,
        UNIQUE(project_id, conversation_id)
      );

      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY,
        conversation_rowid INTEGER NOT NULL,
        content TEXT NOT NULL,
        entry_type TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        FOREIGN KEY (conversation_rowid) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON conversations(project_id, conversation_id);
    `);
  }

  private saveDb(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(this.indexPath, buffer);
  }

  private async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  async isConversationStale(projectId: string, conversationId: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.db) return true;

    const filePath = join(getProjectsDir(), projectId, `${conversationId}.jsonl`);

    try {
      const fileStats = await stat(filePath);
      const lastModified = fileStats.mtime.toISOString();

      const result = this.db.exec(`
        SELECT last_modified FROM conversations
        WHERE project_id = ? AND conversation_id = ?
      `, [projectId, conversationId]);

      if (!result.length || !result[0].values.length) return true; // Not indexed yet
      return result[0].values[0][0] !== lastModified; // Stale if modified
    } catch {
      return true; // File doesn't exist or error
    }
  }

  async indexConversation(projectId: string, conversationId: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;

    const filePath = join(getProjectsDir(), projectId, `${conversationId}.jsonl`);

    try {
      const [fileStats, content] = await Promise.all([
        stat(filePath),
        readFile(filePath, 'utf-8'),
      ]);

      const lastModified = fileStats.mtime.toISOString();
      const indexedAt = new Date().toISOString();

      // Delete existing entries for this conversation
      const existingResult = this.db.exec(`
        SELECT id FROM conversations WHERE project_id = ? AND conversation_id = ?
      `, [projectId, conversationId]);

      if (existingResult.length && existingResult[0].values.length) {
        const existingId = existingResult[0].values[0][0];
        this.db.run('DELETE FROM entries WHERE conversation_rowid = ?', [existingId]);
        this.db.run('DELETE FROM conversations WHERE id = ?', [existingId]);
      }

      // Insert conversation record
      this.db.run(`
        INSERT INTO conversations (project_id, conversation_id, last_modified, indexed_at)
        VALUES (?, ?, ?, ?)
      `, [projectId, conversationId, lastModified, indexedAt]);

      // Get the last inserted rowid
      const rowIdResult = this.db.exec('SELECT last_insert_rowid()');
      const conversationRowid = rowIdResult[0].values[0][0] as number;

      // Parse and index each line
      const lines = content.split('\n').filter(Boolean);

      for (let i = 0; i < lines.length; i++) {
        try {
          const entry = JSON.parse(lines[i]);
          const text = this.extractText(entry);
          if (text.trim()) {
            this.db.run(`
              INSERT INTO entries (conversation_rowid, content, entry_type, line_number)
              VALUES (?, ?, ?, ?)
            `, [conversationRowid, text, entry.type || 'unknown', i + 1]);
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      // Save to disk
      this.saveDb();
    } catch (err) {
      console.error(`Error indexing conversation ${projectId}/${conversationId}:`, err);
    }
  }

  private extractText(entry: Record<string, unknown>): string {
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

  async ensureIndexed(projectId?: string): Promise<void> {
    await this.ensureReady();

    const projectsDir = getProjectsDir();
    const projects = projectId ? [projectId] : await readdir(projectsDir);

    for (const proj of projects) {
      const projectPath = join(projectsDir, proj);
      try {
        const projectStat = await stat(projectPath);
        if (!projectStat.isDirectory()) continue;

        const files = await readdir(projectPath);
        const conversationFiles = files.filter(isConversationFile);

        for (const file of conversationFiles) {
          const convId = file.replace('.jsonl', '');
          if (await this.isConversationStale(proj, convId)) {
            console.log(`Indexing ${proj}/${convId}...`);
            await this.indexConversation(proj, convId);
          }
        }
      } catch {
        continue;
      }
    }
  }

  async search(query: string, limit = 50): Promise<Array<{
    projectId: string;
    conversationId: string;
    snippet: string;
    matchIndex: number;
    type: string;
  }>> {
    await this.ensureReady();
    if (!this.db || !query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();

    // Use LIKE for searching (sql.js doesn't have FTS5)
    const results = this.db.exec(`
      SELECT
        c.project_id,
        c.conversation_id,
        e.content,
        e.entry_type
      FROM entries e
      JOIN conversations c ON e.conversation_rowid = c.id
      WHERE LOWER(e.content) LIKE ?
      LIMIT ?
    `, [`%${lowerQuery}%`, limit]);

    if (!results.length) return [];

    return results[0].values.map(row => {
      const content = row[2] as string;
      const lowerContent = content.toLowerCase();
      const idx = lowerContent.indexOf(lowerQuery);

      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + query.length + 40);
      const snippet = (start > 0 ? '...' : '') +
        content.slice(start, end) +
        (end < content.length ? '...' : '');

      return {
        projectId: row[0] as string,
        conversationId: row[1] as string,
        snippet,
        matchIndex: idx >= 0 ? idx : 0,
        type: row[3] as string,
      };
    });
  }

  async getStats(): Promise<{ conversationCount: number; entryCount: number }> {
    await this.ensureReady();
    if (!this.db) return { conversationCount: 0, entryCount: 0 };

    const convResult = this.db.exec('SELECT COUNT(*) as count FROM conversations');
    const entryResult = this.db.exec('SELECT COUNT(*) as count FROM entries');

    return {
      conversationCount: convResult[0]?.values[0]?.[0] as number || 0,
      entryCount: entryResult[0]?.values[0]?.[0] as number || 0,
    };
  }

  close(): void {
    if (this.db) {
      this.saveDb();
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let indexInstance: SearchIndex | null = null;

export function getSearchIndex(): SearchIndex {
  if (!indexInstance) {
    indexInstance = new SearchIndex();
  }
  return indexInstance;
}

export { SearchIndex };
