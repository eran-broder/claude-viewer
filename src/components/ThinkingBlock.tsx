import { Brain, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { HighlightText } from './HighlightText';
import { useConversationStore } from '../store/conversation-store';
import type { ProcessedBlock } from '../types/conversation';

interface ThinkingBlockProps {
  block: ProcessedBlock;
}

export function ThinkingBlock({ block }: ThinkingBlockProps) {
  const { expandedThinking, toggleThinking } = useConversationStore();
  const isExpanded = expandedThinking.has(block.id);

  const charCount = block.content.length;
  const preview = block.content.slice(0, 100).replace(/\n/g, ' ');

  return (
    <div className="thinking-block">
      <button
        onClick={() => toggleThinking(block.id)}
        className="w-full flex items-center gap-2 text-left group"
      >
        <ChevronRight className={`w-4 h-4 text-accent-orange transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        <Brain className="w-4 h-4 text-accent-orange" />
        <span className="text-accent-orange font-medium">Thinking</span>
        <span className="text-text-muted text-xs">
          ({charCount.toLocaleString()} chars)
        </span>

        {!isExpanded && (
          <span className="text-text-muted text-sm truncate flex-1 ml-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <HighlightText text={preview + '...'} />
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-accent-orange/20">
          <pre className={cn(
            'text-sm text-text-secondary whitespace-pre-wrap font-mono',
            'max-h-96 overflow-y-auto'
          )}>
            <HighlightText text={block.content} />
          </pre>
        </div>
      )}
    </div>
  );
}
