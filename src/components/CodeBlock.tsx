import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  maxHeight?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  fileName,
  maxHeight = '400px',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block overflow-hidden">
      {fileName && (
        <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border">
          <span className="text-text-secondary text-sm font-mono">{fileName}</span>
          <button
            onClick={handleCopy}
            className={cn(
              'p-1.5 rounded hover:bg-bg-tertiary transition-colors',
              copied ? 'text-accent-green' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      <div style={{ maxHeight }} className="overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#6e7681',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {!fileName && (
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded hover:bg-bg-elevated transition-colors',
            copied ? 'text-accent-green' : 'text-text-muted hover:text-text-primary'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
