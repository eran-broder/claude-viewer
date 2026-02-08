import { motion, AnimatePresence } from 'framer-motion';
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
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-accent-orange" />
        </motion.div>
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

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-accent-orange/20">
              <pre className={cn(
                'text-sm text-text-secondary whitespace-pre-wrap font-mono',
                'max-h-96 overflow-y-auto'
              )}>
                <HighlightText text={block.content} />
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
