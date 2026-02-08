import { create } from 'zustand';
import type { ParsedConversation } from '../types/conversation';
import { parseJsonlFile, extractSearchableText } from '../lib/parser';

interface ConversationStore {
  // State
  conversation: ParsedConversation | null;
  isLoading: boolean;
  error: string | null;
  fileName: string | null;

  // UI State
  selectedMessageId: string | null;
  searchQuery: string;
  searchResults: string[];
  searchIndex: number;
  expandedThinking: Set<string>;
  expandedTools: Set<string>;
  showTimeline: boolean;
  showStats: boolean;
  sidebarCollapsed: boolean;
  isDarkTheme: boolean;
  messageFilter: 'all' | 'user' | 'assistant' | 'tools';

  // Actions
  loadFile: (file: File) => Promise<void>;
  loadContent: (content: string, fileName?: string) => void;
  clearConversation: () => void;
  setSelectedMessage: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  navigateSearch: (direction: 'next' | 'prev') => void;
  toggleThinking: (id: string) => void;
  toggleTool: (id: string) => void;
  expandAllThinking: () => void;
  collapseAllThinking: () => void;
  toggleTimeline: () => void;
  toggleStats: () => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setMessageFilter: (filter: 'all' | 'user' | 'assistant' | 'tools') => void;
}

// Initialize theme from localStorage
const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('claude-viewer-theme');
  return saved ? saved === 'dark' : true;
};

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // Initial state
  conversation: null,
  isLoading: false,
  error: null,
  fileName: null,
  selectedMessageId: null,
  searchQuery: '',
  searchResults: [],
  searchIndex: 0,
  expandedThinking: new Set(),
  expandedTools: new Set(),
  showTimeline: true,
  showStats: true,
  sidebarCollapsed: false,
  isDarkTheme: getInitialTheme(),
  messageFilter: 'all',

  // Actions
  loadFile: async (file: File) => {
    set({ isLoading: true, error: null });

    try {
      const content = await file.text();
      const conversation = parseJsonlFile(content);

      if (conversation.errors.length > 0 && conversation.messages.length === 0) {
        throw new Error(`Failed to parse file: ${conversation.errors[0].message}`);
      }

      set({
        conversation,
        fileName: file.name,
        isLoading: false,
        error: null,
        expandedThinking: new Set(),
        expandedTools: new Set(),
        selectedMessageId: null,
        searchQuery: '',
        searchResults: [],
        searchIndex: 0,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load file',
      });
    }
  },

  loadContent: (content: string, fileName?: string) => {
    try {
      const conversation = parseJsonlFile(content);
      set({
        conversation,
        fileName: fileName || 'conversation.jsonl',
        isLoading: false,
        error: null,
        expandedThinking: new Set(),
        expandedTools: new Set(),
        selectedMessageId: null,
        searchQuery: '',
        searchResults: [],
        searchIndex: 0,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to parse content',
      });
    }
  },

  clearConversation: () => {
    set({
      conversation: null,
      fileName: null,
      error: null,
      selectedMessageId: null,
      searchQuery: '',
      searchResults: [],
      searchIndex: 0,
      expandedThinking: new Set(),
      expandedTools: new Set(),
    });
  },

  setSelectedMessage: (id: string | null) => {
    set({ selectedMessageId: id });
  },

  setSearchQuery: (query: string) => {
    const { conversation } = get();
    const results: string[] = [];

    if (query && conversation) {
      const lowerQuery = query.toLowerCase();
      for (const message of conversation.messages) {
        const text = extractSearchableText(message);
        if (text.includes(lowerQuery)) {
          results.push(message.id);
        }
      }
    }

    set({ searchQuery: query, searchResults: results, searchIndex: 0 });
    // Auto-select first result
    if (results.length > 0) {
      set({ selectedMessageId: results[0] });
    }
  },

  navigateSearch: (direction: 'next' | 'prev') => {
    const { searchResults, searchIndex } = get();
    if (searchResults.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (searchIndex + 1) % searchResults.length;
    } else {
      newIndex = (searchIndex - 1 + searchResults.length) % searchResults.length;
    }

    set({ searchIndex: newIndex, selectedMessageId: searchResults[newIndex] });
  },

  toggleThinking: (id: string) => {
    const { expandedThinking } = get();
    const newSet = new Set(expandedThinking);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    set({ expandedThinking: newSet });
  },

  toggleTool: (id: string) => {
    const { expandedTools } = get();
    const newSet = new Set(expandedTools);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    set({ expandedTools: newSet });
  },

  expandAllThinking: () => {
    const { conversation } = get();
    if (!conversation) return;

    const allIds = new Set<string>();
    for (const message of conversation.messages) {
      if (message.content.blocks) {
        for (const block of message.content.blocks) {
          if (block.type === 'thinking') {
            allIds.add(block.id);
          }
        }
      }
    }
    set({ expandedThinking: allIds });
  },

  collapseAllThinking: () => {
    set({ expandedThinking: new Set() });
  },

  toggleTimeline: () => {
    set((state) => ({ showTimeline: !state.showTimeline }));
  },

  toggleStats: () => {
    set((state) => ({ showStats: !state.showStats }));
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  toggleTheme: () => {
    set((state) => {
      const isDark = !state.isDarkTheme;
      localStorage.setItem('claude-viewer-theme', isDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('light', !isDark);
      return { isDarkTheme: isDark };
    });
  },

  setMessageFilter: (filter) => {
    set({ messageFilter: filter });
  },
}));
