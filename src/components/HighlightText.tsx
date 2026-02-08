import { splitForHighlight } from '../lib/utils';
import { useConversationStore } from '../store/conversation-store';

interface HighlightTextProps {
  text: string;
  className?: string;
}

export function HighlightText({ text, className }: HighlightTextProps) {
  const searchQuery = useConversationStore((s) => s.searchQuery);
  const parts = splitForHighlight(text, searchQuery);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-accent-yellow/40 text-inherit rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
