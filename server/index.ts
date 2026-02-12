import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { projectsRouter } from './api/projects';
import { conversationsRouter } from './api/conversations';
import { setupWebSocket } from './ws';
import { setupWatcher } from './watcher';
import { getSearchIndex } from './services/search-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Middleware
if (isDev) {
  app.use(cors()); // Only needed in dev when frontend runs on different port
}
app.use(express.json());

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/conversations', conversationsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from dist in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for any non-API routes
  // Express 5 requires named wildcard parameter
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Start server with port fallback
function startServer(port: number, maxAttempts = 10): void {
  const server = createServer(app);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 1) {
      console.log(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1, maxAttempts - 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    // Setup WebSocket and watcher only after successful port binding
    const wss = setupWebSocket(server);
    setupWatcher(wss);

    console.log(`🚀 Claude Viewer running at http://localhost:${port}`);
    console.log(`📁 Watching ~/.claude/projects/ for changes`);
    if (isDev) {
      console.log(`🔧 Development mode - CORS enabled`);
    }

    // Initialize search index in background
    console.log(`🔍 Building search index...`);
    getSearchIndex().ensureIndexed().then(async () => {
      const stats = await getSearchIndex().getStats();
      console.log(`✅ Search index ready: ${stats.conversationCount} conversations, ${stats.entryCount} entries`);
    }).catch(err => {
      console.error(`⚠️ Search index error:`, err);
    });
  });
}

startServer(DEFAULT_PORT);
