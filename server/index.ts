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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
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

// Create HTTP server
const server = createServer(app);

// Setup WebSocket
const wss = setupWebSocket(server);

// Setup file watcher
setupWatcher(wss);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Claude Viewer running at http://localhost:${PORT}`);
  console.log(`📁 Watching ~/.claude/projects/ for changes`);
  if (isDev) {
    console.log(`🔧 Development mode - CORS enabled`);
  }
});
