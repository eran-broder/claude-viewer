import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TextContentProps {
  content: string;
}

export function TextContent({ content }: TextContentProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          // Code blocks
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const isInline = !match;

            if (!isInline && language) {
              return (
                <SyntaxHighlighter
                  style={oneDark as Record<string, React.CSSProperties>}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: '1em 0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }

            // Inline code
            return (
              <code
                className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-blue font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-text-primary mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-text-primary mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-text-primary mt-3 mb-1">{children}</h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-text-primary mb-2 last:mb-0">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="text-text-primary">{children}</li>,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent-purple pl-4 my-2 text-text-secondary italic">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border border-border">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-bg-elevated px-3 py-2 text-left text-text-primary font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-text-secondary">
              {children}
            </td>
          ),

          // Horizontal rule
          hr: () => <hr className="border-border my-4" />,

          // Strong/emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
