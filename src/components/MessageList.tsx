import { useRef, useEffect, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useConversationStore } from '../store/conversation-store';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

export function MessageList() {
  const { conversation, searchResults, selectedMessageId, setSelectedMessage, messageFilter, expandedThinking, expandedTools } =
    useConversationStore();

  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  const allMessages = conversation?.messages || [];

  // Apply message filter
  const messages = allMessages.filter((msg) => {
    if (messageFilter === 'all') return true;
    if (messageFilter === 'user') return msg.type === 'user';
    if (messageFilter === 'assistant') return msg.type === 'assistant';
    if (messageFilter === 'tools') {
      return msg.content.blocks?.some((b) => b.type === 'tool_use') ?? false;
    }
    return true;
  });

  // Track scroll position to show/hide scroll buttons
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowScrollButtons(el.scrollTop > 200);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Create a stable key that changes when expanded state changes
  const expandedKey = `${expandedThinking.size}-${expandedTools.size}`;

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 200, []),
    overscan: 5,
  });

  // Remeasure all items when blocks expand/collapse
  useEffect(() => {
    virtualizer.measure();
  }, [expandedKey, virtualizer]);

  // Scroll to selected message
  useEffect(() => {
    if (selectedMessageId) {
      const index = messages.findIndex((m) => m.id === selectedMessageId);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: 'center' });
      }
    }
  }, [selectedMessageId, messages, virtualizer]);

  if (!conversation || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        No messages to display
      </div>
    );
  }

  const scrollToTop = () => virtualizer.scrollToIndex(0, { align: 'start' });
  const scrollToBottom = () => virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });

  return (
    <div className="relative h-full">
      <div ref={parentRef} className="h-full overflow-auto px-4 py-6">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            const isHighlighted = searchResults.includes(message.id);

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="pb-6"
                onClick={() => setSelectedMessage(message.id)}
              >
                {message.type === 'user' ? (
                  <UserMessage message={message} isHighlighted={isHighlighted} />
                ) : message.type === 'assistant' ? (
                  <AssistantMessage message={message} isHighlighted={isHighlighted} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll buttons */}
      {messages.length > 10 && (
        <div className="absolute right-6 bottom-6 flex flex-col gap-2">
          {showScrollButtons && (
            <button
              onClick={scrollToTop}
              className="p-2 rounded-full bg-bg-elevated border border-border shadow-lg hover:bg-bg-tertiary transition-colors"
              title="Scroll to top"
            >
              <ChevronUp className="w-5 h-5 text-text-muted" />
            </button>
          )}
          <button
            onClick={scrollToBottom}
            className="p-2 rounded-full bg-bg-elevated border border-border shadow-lg hover:bg-bg-tertiary transition-colors"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5 text-text-muted" />
          </button>
        </div>
      )}
    </div>
  );
}
