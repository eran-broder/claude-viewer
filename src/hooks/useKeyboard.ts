import { useEffect, useCallback } from 'react';
import { useConversationStore } from '../store/conversation-store';

export function useKeyboard() {
  const { searchQuery, searchResults, navigateSearch, setSearchQuery } = useConversationStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+F or / to focus search
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && !isInputFocused())) {
      e.preventDefault();
      document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
      return;
    }

    // Escape to clear search or blur input
    if (e.key === 'Escape') {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
      if (document.activeElement === input) {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          input?.blur();
        }
      }
      return;
    }

    // Enter/Shift+Enter for search navigation (when search input is focused)
    if (e.key === 'Enter' && isSearchFocused() && searchResults.length > 0) {
      e.preventDefault();
      navigateSearch(e.shiftKey ? 'prev' : 'next');
      return;
    }
  }, [searchQuery, searchResults, navigateSearch, setSearchQuery]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

function isSearchFocused(): boolean {
  const el = document.activeElement as HTMLInputElement;
  return el?.placeholder?.includes('Search') ?? false;
}
