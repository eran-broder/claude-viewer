import { useState, useCallback, useEffect } from 'react';
import { useConversationStore } from './store/conversation-store';
import { useKeyboard } from './hooks/useKeyboard';
import { ProjectBrowser } from './components/ProjectBrowser';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { MessageList } from './components/MessageList';
import { fetchConversationContent } from './lib/api';

const STORAGE_KEY = 'claude-viewer-last';

function App() {
  useKeyboard();
  const { conversation, loadContent, sidebarCollapsed, toggleSidebar, isDarkTheme } = useConversationStore();

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDarkTheme);
  }, []);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Restore last conversation on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { projectId, conversationId } = JSON.parse(saved);
        if (projectId && conversationId) {
          setSelectedProjectId(projectId);
          setSelectedConversationId(conversationId);
          fetchConversationContent(projectId, conversationId)
            .then((content) => loadContent(content, `${conversationId}.jsonl`))
            .catch(() => localStorage.removeItem(STORAGE_KEY));
        }
      } catch { /* ignore */ }
    }
  }, [loadContent]);

  const handleSelectConversation = useCallback(
    (projectId: string, conversationId: string, content: string) => {
      loadContent(content, `${conversationId}.jsonl`);
      setSelectedConversationId(conversationId);
      setSelectedProjectId(projectId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId, conversationId }));
    },
    [loadContent]
  );

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {conversation && <Header />}
      <div className="flex-1 flex overflow-hidden">
        <ProjectBrowser
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
          selectedProjectId={selectedProjectId}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        {conversation ? (
          <>
            <Timeline />
            <main className="flex-1 overflow-hidden">
              <MessageList />
            </main>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <p className="text-2xl mb-2">Select a conversation</p>
              <p className="text-sm">Choose a project and conversation from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
