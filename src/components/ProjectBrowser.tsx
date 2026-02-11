import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Folder,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Loader,
  PanelLeftClose,
  PanelLeft,
  Search,
  X,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import {
  fetchProjects,
  fetchConversations,
  fetchConversationContent,
  searchConversations,
  connectWebSocket,
  type ProjectInfo,
  type ConversationInfo,
  type WsMessage,
  type SearchResult,
} from '../lib/api';

interface ProjectBrowserProps {
  onSelectConversation: (projectId: string, conversationId: string, content: string) => void;
  selectedConversationId: string | null;
  selectedProjectId: string | null;
  collapsed: boolean;
  onToggle: () => void;
}

export function ProjectBrowser({ onSelectConversation, selectedConversationId, selectedProjectId, collapsed, onToggle }: ProjectBrowserProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
    // Setup WebSocket for live updates
    return connectWebSocket(handleWsMessage);
  }, []);

  // Auto-expand selected project
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== expandedProject) {
      setExpandedProject(selectedProjectId);
      loadConversations(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Global search with debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (globalSearch.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchConversations(globalSearch);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [globalSearch]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to load projects. Is the server running?');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async (projectId: string) => {
    setIsLoadingConversations(true);
    try {
      const data = await fetchConversations(projectId);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleWsMessage = (msg: WsMessage) => {
    if (msg.type === 'project_updated') {
      loadProjects();
    } else if (msg.type === 'conversation_added' || msg.type === 'conversation_updated') {
      if (msg.projectId === expandedProject) {
        loadConversations(msg.projectId);
      }
      // Update project count
      loadProjects();
    } else if (msg.type === 'conversation_deleted') {
      if (msg.projectId === expandedProject) {
        loadConversations(msg.projectId);
      }
      loadProjects();
    }
  };

  const toggleProject = async (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      setConversations([]);
    } else {
      setExpandedProject(projectId);
      await loadConversations(projectId);
    }
  };

  const handleSelectConversation = async (conv: ConversationInfo) => {
    try {
      const content = await fetchConversationContent(conv.projectId, conv.id);
      onSelectConversation(conv.projectId, conv.id, content);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleSelectSearchResult = async (result: SearchResult) => {
    try {
      const content = await fetchConversationContent(result.projectId, result.conversationId);
      onSelectConversation(result.projectId, result.conversationId, content);
      setGlobalSearch(''); // Clear search after selection
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  // Collapsed view
  if (collapsed) {
    return (
      <div className="w-12 border-r border-border bg-bg-secondary flex flex-col items-center py-2">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-bg-elevated rounded text-text-muted hover:text-text-primary transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-72 border-r border-border bg-bg-secondary flex items-center justify-center">
        <Loader className="w-6 h-6 text-text-muted animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-72 border-r border-border bg-bg-secondary p-4">
        <div className="text-accent-red text-sm mb-4">{error}</div>
        <button
          onClick={loadProjects}
          className="flex items-center gap-2 text-sm text-accent-blue hover:underline"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r border-border bg-bg-secondary flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-text-primary">Projects</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={loadProjects}
            className="p-1 hover:bg-bg-elevated rounded text-text-muted hover:text-text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-bg-elevated rounded text-text-muted hover:text-text-primary transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search all conversations..."
            className="w-full pl-8 pr-8 py-1.5 bg-bg-tertiary border border-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results or Project List */}
      <div className="flex-1 overflow-y-auto">
        {globalSearch.length >= 2 ? (
          // Search Results
          <div className="p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-5 h-5 text-text-muted animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-sm text-text-muted text-center py-4">
                No results found
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-text-muted px-2 py-1">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.projectId}-${result.conversationId}-${idx}`}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left p-2 rounded hover:bg-bg-elevated transition-colors"
                  >
                    <div className="text-xs text-accent-purple truncate">
                      {result.projectId.split('-').pop()}
                    </div>
                    <div className="text-sm text-text-primary line-clamp-2">
                      {result.snippet}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Project List
          <>
        {projects.map((project) => (
          <div key={project.id}>
            {/* Project Header */}
            <button
              onClick={() => toggleProject(project.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors text-left',
                expandedProject === project.id && 'bg-bg-tertiary'
              )}
            >
              <motion.div
                animate={{ rotate: expandedProject === project.id ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </motion.div>
              {expandedProject === project.id ? (
                <FolderOpen className="w-4 h-4 text-accent-orange" />
              ) : (
                <Folder className="w-4 h-4 text-accent-orange" />
              )}
              <span className="flex-1 truncate text-sm text-text-primary">
                {project.name}
              </span>
              <span className="text-xs text-text-muted">
                {project.conversationCount}
              </span>
            </button>

            {/* Conversations */}
            <AnimatePresence>
              {expandedProject === project.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {isLoadingConversations ? (
                    <div className="pl-8 py-2">
                      <Loader className="w-4 h-4 text-text-muted animate-spin" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="pl-8 py-2 text-sm text-text-muted">
                      No conversations
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={cn(
                          'w-full flex items-start gap-2 pl-8 pr-3 py-2 hover:bg-bg-elevated transition-colors text-left',
                          selectedConversationId === conv.id && 'bg-accent-purple/10 border-l-2 border-accent-purple'
                        )}
                      >
                        <MessageSquare className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text-primary truncate">
                            {conv.firstMessage || 'Untitled conversation'}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>{conv.messageCount} msgs</span>
                            <span>•</span>
                            <span>{conv.size}</span>
                            {conv.timestamp && (
                              <>
                                <span>•</span>
                                <span>{formatDate(new Date(conv.timestamp))}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
          </>
        )}
      </div>
    </div>
  );
}
