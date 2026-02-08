import { useState, useRef, useEffect } from 'react';
import { Download, Check, Loader, ChevronDown } from 'lucide-react';
import { useConversationStore } from '../store/conversation-store';
import { cn, formatDate, formatTimestamp, formatTokens, formatDuration } from '../lib/utils';

type ExportFormat = 'html' | 'markdown';

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { conversation, fileName } = useConversationStore();

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!conversation) return null;

  const handleExport = async (format: ExportFormat) => {
    setShowMenu(false);
    setIsExporting(true);

    try {
      const baseName = fileName?.replace('.jsonl', '') || 'conversation';
      const { content, ext, type } = format === 'html'
        ? { content: generateStandaloneHtml(conversation, baseName), ext: 'html', type: 'text/html' }
        : { content: generateMarkdown(conversation, baseName), ext: 'md', type: 'text/markdown' };

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
          exported
            ? 'bg-accent-green/20 text-accent-green'
            : 'bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30'
        )}
      >
        {isExporting ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : exported ? (
          <Check className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="text-sm">{exported ? 'Exported!' : 'Export'}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <button
            onClick={() => handleExport('html')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-bg-elevated text-text-primary"
          >
            Export as HTML
          </button>
          <button
            onClick={() => handleExport('markdown')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-bg-elevated text-text-primary"
          >
            Export as Markdown
          </button>
        </div>
      )}
    </div>
  );
}

function generateStandaloneHtml(
  conversation: NonNullable<ReturnType<typeof useConversationStore.getState>['conversation']>,
  fileName: string
): string {
  const { messages, stats } = conversation;

  const messagesHtml = messages
    .map((msg) => {
      if (msg.type === 'user') {
        return `
          <div class="message user-message">
            <div class="message-header">
              <span class="role user">You</span>
              <span class="timestamp">${formatTimestamp(msg.timestamp)}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content.text || '')}</div>
          </div>
        `;
      }

      if (msg.type === 'assistant') {
        const blocksHtml = (msg.content.blocks || [])
          .map((block) => {
            if (block.type === 'thinking') {
              return `
                <details class="thinking-block">
                  <summary>
                    <span class="thinking-icon">🧠</span>
                    Thinking (${block.content.length.toLocaleString()} chars)
                  </summary>
                  <pre class="thinking-content">${escapeHtml(block.content)}</pre>
                </details>
              `;
            }

            if (block.type === 'tool_use') {
              const resultHtml = block.result
                ? `<div class="tool-result ${block.result.isError ? 'error' : ''}">
                     <div class="result-label">Result:</div>
                     <pre>${escapeHtml(block.result.content.slice(0, 2000))}${block.result.content.length > 2000 ? '...' : ''}</pre>
                   </div>`
                : '';

              return `
                <details class="tool-block">
                  <summary>
                    <span class="tool-icon">${getToolEmoji(block.toolName || '')}</span>
                    ${escapeHtml(block.toolName || 'Tool')}
                  </summary>
                  <pre class="tool-input">${escapeHtml(block.content)}</pre>
                  ${resultHtml}
                </details>
              `;
            }

            if (block.type === 'text') {
              return `<div class="text-content">${escapeHtml(block.content)}</div>`;
            }

            return '';
          })
          .join('\n');

        return `
          <div class="message assistant-message">
            <div class="message-header">
              <span class="role assistant">Claude</span>
              <span class="timestamp">${formatTimestamp(msg.timestamp)}</span>
              ${msg.metadata?.usage ? `<span class="tokens">${formatTokens(msg.metadata.usage.output_tokens)} tokens</span>` : ''}
            </div>
            <div class="message-blocks">${blocksHtml}</div>
          </div>
        `;
      }

      return '';
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Conversation - ${escapeHtml(fileName)}</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent-blue: #58a6ff;
      --accent-purple: #a371f7;
      --accent-green: #3fb950;
      --accent-orange: #d29922;
      --accent-red: #f85149;
      --border: #30363d;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      padding: 20px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }

    h1 {
      font-size: 1.5rem;
      background: linear-gradient(to right, var(--accent-blue), var(--accent-purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stats {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .stat-value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .message {
      margin-bottom: 20px;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .user-message {
      background: rgba(88, 166, 255, 0.1);
      border-color: rgba(88, 166, 255, 0.3);
    }

    .assistant-message {
      background: rgba(163, 113, 247, 0.1);
      border-color: rgba(163, 113, 247, 0.3);
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .role {
      font-weight: 600;
    }

    .role.user { color: var(--accent-blue); }
    .role.assistant { color: var(--accent-purple); }

    .timestamp, .tokens {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .message-content, .text-content {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .message-blocks {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    details {
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    summary {
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    summary:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .thinking-block {
      background: rgba(210, 153, 34, 0.1);
      border-color: rgba(210, 153, 34, 0.3);
    }

    .thinking-block summary {
      color: var(--accent-orange);
    }

    .thinking-content {
      padding: 12px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      max-height: 400px;
      overflow: auto;
      white-space: pre-wrap;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      border-top: 1px solid var(--border);
    }

    .tool-block {
      background: rgba(63, 185, 80, 0.1);
      border-color: rgba(63, 185, 80, 0.3);
    }

    .tool-block summary {
      color: var(--accent-green);
    }

    .tool-input, .tool-result pre {
      padding: 12px;
      font-size: 0.875rem;
      overflow: auto;
      white-space: pre-wrap;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: var(--bg-tertiary);
      max-height: 300px;
    }

    .tool-result {
      border-top: 1px solid var(--border);
    }

    .tool-result.error pre {
      color: var(--accent-red);
    }

    .result-label {
      padding: 8px 12px;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    footer {
      margin-top: 40px;
      padding: 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Claude Conversation</h1>
      <div class="stats">
        <span>Messages: <span class="stat-value">${stats.totalMessages}</span></span>
        <span>Tokens: <span class="stat-value">${formatTokens(stats.totalInputTokens + stats.totalOutputTokens)}</span></span>
        <span>Duration: <span class="stat-value">${formatDuration(stats.totalDuration)}</span></span>
        ${stats.startTime ? `<span>Date: <span class="stat-value">${formatDate(stats.startTime)}</span></span>` : ''}
      </div>
    </div>
  </header>

  <main class="container">
    ${messagesHtml}
  </main>

  <footer>
    <div class="container">
      Exported from Claude Conversation Viewer
    </div>
  </footer>
</body>
</html>`;
}

function generateMarkdown(
  conversation: NonNullable<ReturnType<typeof useConversationStore.getState>['conversation']>,
  fileName: string
): string {
  const { messages, stats } = conversation;

  const lines: string[] = [
    `# Claude Conversation: ${fileName}`,
    '',
    '## Stats',
    `- **Messages:** ${stats.totalMessages}`,
    `- **Tokens:** ${formatTokens(stats.totalInputTokens + stats.totalOutputTokens)} (${formatTokens(stats.totalInputTokens)} in / ${formatTokens(stats.totalOutputTokens)} out)`,
    `- **Duration:** ${formatDuration(stats.totalDuration)}`,
    stats.startTime ? `- **Date:** ${formatDate(stats.startTime)}` : '',
    stats.model ? `- **Model:** ${stats.model}` : '',
    '',
    '---',
    '',
  ];

  for (const msg of messages) {
    if (msg.type === 'user') {
      lines.push(`## 👤 User`, '');
      lines.push(`*${formatTimestamp(msg.timestamp)}*`, '');
      lines.push(msg.content.text || '', '');
    } else if (msg.type === 'assistant') {
      const tokens = msg.metadata?.usage?.output_tokens;
      lines.push(`## 🤖 Claude${tokens ? ` (${formatTokens(tokens)} tokens)` : ''}`, '');
      lines.push(`*${formatTimestamp(msg.timestamp)}*`, '');

      for (const block of msg.content.blocks || []) {
        if (block.type === 'thinking') {
          lines.push(
            '<details>',
            `<summary>🧠 Thinking (${block.content.length.toLocaleString()} chars)</summary>`,
            '',
            '```',
            block.content,
            '```',
            '</details>',
            ''
          );
        } else if (block.type === 'tool_use') {
          lines.push(
            `### ${getToolEmoji(block.toolName || '')} ${block.toolName || 'Tool'}`,
            '',
            '```',
            block.content,
            '```',
            ''
          );
          if (block.result) {
            const truncated = block.result.content.slice(0, 2000);
            const suffix = block.result.content.length > 2000 ? '\n... (truncated)' : '';
            lines.push(
              block.result.isError ? '**Error:**' : '**Result:**',
              '```',
              truncated + suffix,
              '```',
              ''
            );
          }
        } else if (block.type === 'text') {
          lines.push(block.content, '');
        }
      }
    }
    lines.push('---', '');
  }

  lines.push('', '*Exported from Claude Conversation Viewer*');
  return lines.filter(Boolean).join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getToolEmoji(toolName: string): string {
  const emojis: Record<string, string> = {
    Bash: '⌨️',
    Read: '📄',
    Write: '✏️',
    Edit: '📝',
    Glob: '🔍',
    Grep: '🔎',
    WebSearch: '🌐',
    WebFetch: '🌍',
    Task: '🤖',
  };
  return emojis[toolName] || '🔧';
}
