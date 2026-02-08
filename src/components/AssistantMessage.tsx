import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { formatTimestamp, formatTokens } from '../lib/utils';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { TextContent } from './TextContent';
import type { ConversationMessage } from '../types/conversation';

interface AssistantMessageProps {
  message: ConversationMessage;
  isHighlighted?: boolean;
}

export function AssistantMessage({ message, isHighlighted }: AssistantMessageProps) {
  const blocks = message.content.blocks || [];
  const usage = message.metadata?.usage;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-3 ${isHighlighted ? 'bg-accent-purple/5 -mx-4 px-4 py-2 rounded-lg' : ''}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
        <Bot className="w-4 h-4 text-accent-purple" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-accent-purple">Claude</span>
          <span className="text-text-muted text-xs">
            {formatTimestamp(message.timestamp)}
          </span>
          {usage && (
            <span className="text-text-muted text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {formatTokens(usage.output_tokens)} tokens
            </span>
          )}
        </div>

        <div className="space-y-3">
          {blocks.map((block) => {
            switch (block.type) {
              case 'thinking':
                return <ThinkingBlock key={block.id} block={block} />;
              case 'tool_use':
                return <ToolUseBlock key={block.id} block={block} />;
              case 'text':
                return (
                  <div key={block.id} className="message-bubble message-assistant">
                    <TextContent content={block.content} />
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </motion.div>
  );
}
