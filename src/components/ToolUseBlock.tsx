import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Terminal,
  FileText,
  FileEdit,
  Search,
  Globe,
  Bot,
  FolderSearch,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn, getLanguageFromFilePath, truncateText } from '../lib/utils';
import { useConversationStore } from '../store/conversation-store';
import { CodeBlock } from './CodeBlock';
import { DiffViewer } from './DiffViewer';
import type { ProcessedBlock } from '../types/conversation';

interface ToolUseBlockProps {
  block: ProcessedBlock;
}

const toolIcons: Record<string, React.ReactNode> = {
  Bash: <Terminal className="w-4 h-4" />,
  Read: <FileText className="w-4 h-4" />,
  Write: <FileEdit className="w-4 h-4" />,
  Edit: <FileEdit className="w-4 h-4" />,
  Glob: <FolderSearch className="w-4 h-4" />,
  Grep: <Search className="w-4 h-4" />,
  WebSearch: <Globe className="w-4 h-4" />,
  WebFetch: <Globe className="w-4 h-4" />,
  Task: <Bot className="w-4 h-4" />,
};

export function ToolUseBlock({ block }: ToolUseBlockProps) {
  const { expandedTools, toggleTool } = useConversationStore();
  const isExpanded = expandedTools.has(block.id);

  const toolName = block.toolName || 'Unknown';
  const icon = toolIcons[toolName] || <Terminal className="w-4 h-4" />;
  const hasResult = !!block.result;
  const isError = block.result?.isError;

  // Get a preview of the tool input
  const inputPreview = getInputPreview(toolName, block.toolInput);

  return (
    <div className="tool-block overflow-hidden">
      {/* Header */}
      <button
        onClick={() => toggleTool(block.id)}
        className="w-full flex items-center gap-2 p-3 text-left group hover:bg-accent-green/5 transition-colors"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-accent-green" />
        </motion.div>

        <span className="text-accent-green">{icon}</span>
        <span className="text-accent-green font-medium">{toolName}</span>

        {/* Status indicator */}
        {hasResult && (
          <span className={cn('ml-1', isError ? 'text-accent-red' : 'text-accent-green')}>
            {isError ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </span>
        )}

        {/* Preview */}
        {inputPreview && !isExpanded && (
          <span className="text-text-muted text-sm truncate flex-1 ml-2 font-mono">
            {inputPreview}
          </span>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Tool input */}
              <div>
                <div className="text-text-muted text-xs mb-1 uppercase tracking-wide">
                  Input
                </div>
                <ToolInput toolName={toolName} input={block.toolInput} />
              </div>

              {/* Tool result */}
              {block.result && (
                <div>
                  <div className="text-text-muted text-xs mb-1 uppercase tracking-wide flex items-center gap-2">
                    Result
                    {block.result.isError && (
                      <span className="text-accent-red flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <ToolResult result={block.result} toolName={toolName} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getInputPreview(toolName: string, input?: Record<string, unknown>): string {
  if (!input) return '';

  switch (toolName) {
    case 'Bash':
      return truncateText(String(input.command || ''), 60);
    case 'Read':
    case 'Write':
    case 'Edit':
      return truncateText(String(input.file_path || ''), 60);
    case 'Glob':
      return truncateText(String(input.pattern || ''), 60);
    case 'Grep':
      return truncateText(String(input.pattern || ''), 60);
    case 'WebSearch':
      return truncateText(String(input.query || ''), 60);
    case 'WebFetch':
      return truncateText(String(input.url || ''), 60);
    default:
      return '';
  }
}

function ToolInput({ toolName, input }: { toolName: string; input?: Record<string, unknown> }) {
  if (!input) return null;

  switch (toolName) {
    case 'Bash':
      return (
        <CodeBlock
          code={String(input.command || '')}
          language="bash"
          maxHeight="200px"
        />
      );
    case 'Read':
    case 'Write':
      return (
        <div className="bg-bg-tertiary rounded p-2 font-mono text-sm text-text-secondary">
          {String(input.file_path || '')}
        </div>
      );
    case 'Edit':
      return <EditInput input={input} />;
    default:
      return (
        <CodeBlock
          code={JSON.stringify(input, null, 2)}
          language="json"
          maxHeight="200px"
        />
      );
  }
}

function EditInput({ input }: { input: Record<string, unknown> }) {
  const filePath = String(input.file_path || '');
  const oldString = String(input.old_string || '');
  const newString = String(input.new_string || '');
  const language = getLanguageFromFilePath(filePath);

  return (
    <div className="space-y-2">
      <div className="bg-bg-tertiary rounded p-2 font-mono text-sm text-text-secondary">
        {filePath}
      </div>
      {oldString && (
        <div>
          <div className="text-xs text-accent-red mb-1">- Remove:</div>
          <CodeBlock code={oldString} language={language} maxHeight="150px" />
        </div>
      )}
      {newString && (
        <div>
          <div className="text-xs text-accent-green mb-1">+ Replace with:</div>
          <CodeBlock code={newString} language={language} maxHeight="150px" />
        </div>
      )}
    </div>
  );
}

function ToolResult({
  result,
  toolName,
}: {
  result: NonNullable<ProcessedBlock['result']>;
  toolName: string;
}) {
  // Show diff for file edits
  if (result.diff) {
    return <DiffViewer diff={result.diff} maxHeight="300px" />;
  }

  // Show file content for writes
  if (result.fileContent && result.filePath) {
    const language = getLanguageFromFilePath(result.filePath);
    return (
      <CodeBlock
        code={result.fileContent}
        language={language}
        fileName={result.filePath}
        maxHeight="300px"
      />
    );
  }

  // Show output for bash
  if (toolName === 'Bash' && result.content) {
    return (
      <div className="relative">
        <CodeBlock code={result.content} language="text" maxHeight="300px" />
        {result.exitCode !== undefined && result.exitCode !== 0 && (
          <div className="absolute top-2 right-12 text-xs text-accent-red">
            Exit code: {result.exitCode}
          </div>
        )}
      </div>
    );
  }

  // Default: show content as text
  return (
    <div
      className={cn(
        'bg-bg-tertiary rounded p-3 text-sm max-h-[300px] overflow-auto',
        result.isError ? 'text-accent-red' : 'text-text-secondary'
      )}
    >
      <pre className="whitespace-pre-wrap break-words font-mono">
        {truncateText(result.content, 5000)}
      </pre>
    </div>
  );
}
