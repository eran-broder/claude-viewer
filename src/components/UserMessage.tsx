import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { formatTimestamp } from '../lib/utils';
import { HighlightText } from './HighlightText';
import type { ConversationMessage } from '../types/conversation';

interface UserMessageProps {
  message: ConversationMessage;
  isHighlighted?: boolean;
}

export function UserMessage({ message, isHighlighted }: UserMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-3 ${isHighlighted ? 'bg-accent-blue/5 -mx-4 px-4 py-2 rounded-lg' : ''}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
        <User className="w-4 h-4 text-accent-blue" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-accent-blue">You</span>
          <span className="text-text-muted text-xs">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        <div className="message-bubble message-user">
          <p className="text-text-primary whitespace-pre-wrap break-words">
            <HighlightText text={message.content.text || ''} />
          </p>
        </div>
      </div>
    </motion.div>
  );
}
