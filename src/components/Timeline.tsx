import { motion } from 'framer-motion';
import { User, Bot, Wrench } from 'lucide-react';
import { cn, formatTimestamp } from '../lib/utils';
import { useConversationStore } from '../store/conversation-store';

export function Timeline() {
  const { conversation, selectedMessageId, setSelectedMessage, showTimeline } =
    useConversationStore();

  if (!showTimeline || !conversation) return null;

  const messages = conversation.messages;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-16 border-r border-border bg-bg-secondary flex-shrink-0 overflow-y-auto"
    >
      <div className="py-4">
        {messages.map((message, index) => {
          const isSelected = selectedMessageId === message.id;
          const isUser = message.type === 'user';
          const hasTools = message.content.blocks?.some((b) => b.type === 'tool_use');

          return (
            <button
              key={message.id}
              onClick={() => setSelectedMessage(message.id)}
              className={cn(
                'w-full flex flex-col items-center py-2 px-1 transition-colors',
                'hover:bg-bg-elevated',
                isSelected && 'bg-bg-tertiary'
              )}
              title={`${isUser ? 'User' : 'Assistant'} - ${formatTimestamp(message.timestamp)}`}
            >
              {/* Connector line */}
              {index > 0 && (
                <div className="w-0.5 h-2 bg-border -mt-2 mb-1" />
              )}

              {/* Node */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  'transition-transform',
                  isSelected && 'scale-125',
                  isUser
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'bg-accent-purple/20 text-accent-purple'
                )}
              >
                {isUser ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
              </div>

              {/* Tool indicator */}
              {hasTools && (
                <div className="w-4 h-4 -mt-1 rounded-full bg-accent-green/20 flex items-center justify-center">
                  <Wrench className="w-2 h-2 text-accent-green" />
                </div>
              )}

              {/* Time */}
              <span className="text-[10px] text-text-muted mt-1">
                {message.timestamp.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
