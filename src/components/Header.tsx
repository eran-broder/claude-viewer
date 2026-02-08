import { motion } from 'framer-motion';
import {
  FileJson,
  X,
  Search,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Cpu,
  Zap,
  DollarSign,
  Sun,
  Moon,
  Filter,
  User,
  Bot,
  Wrench,
} from 'lucide-react';
import { cn, formatTokens, formatDuration, estimateCost } from '../lib/utils';
import { useConversationStore } from '../store/conversation-store';
import { ExportButton } from './ExportButton';

export function Header() {
  const {
    conversation,
    fileName,
    clearConversation,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchIndex,
    navigateSearch,
    showStats,
    toggleStats,
    expandAllThinking,
    collapseAllThinking,
    isDarkTheme,
    toggleTheme,
    messageFilter,
    setMessageFilter,
  } = useConversationStore();

  if (!conversation) return null;

  const { stats } = conversation;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur-sm border-b border-border"
    >
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <FileJson className="w-5 h-5 text-accent-blue" />
          <span className="font-medium text-text-primary">{fileName}</span>
          <button
            onClick={clearConversation}
            className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="Close file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversation..."
                className={cn(
                  'pl-9 pr-4 py-1.5 rounded-lg text-sm',
                  'bg-bg-secondary border border-border',
                  'text-text-primary placeholder:text-text-muted',
                  'focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30',
                  'w-48 focus:w-64 transition-all duration-300'
                )}
              />
            </div>
            {searchQuery && searchResults.length > 0 && (
              <>
                <span className="text-xs text-accent-blue whitespace-nowrap">
                  {searchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearch('prev')}
                  className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
                  title="Previous (Shift+Enter)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
                  title="Next (Enter)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Message filter */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <FilterButton
              active={messageFilter === 'all'}
              onClick={() => setMessageFilter('all')}
              title="Show all messages"
            >
              <Filter className="w-3.5 h-3.5" />
            </FilterButton>
            <FilterButton
              active={messageFilter === 'user'}
              onClick={() => setMessageFilter('user')}
              title="User messages only"
            >
              <User className="w-3.5 h-3.5" />
            </FilterButton>
            <FilterButton
              active={messageFilter === 'assistant'}
              onClick={() => setMessageFilter('assistant')}
              title="Assistant messages only"
            >
              <Bot className="w-3.5 h-3.5" />
            </FilterButton>
            <FilterButton
              active={messageFilter === 'tools'}
              onClick={() => setMessageFilter('tools')}
              title="Messages with tools"
            >
              <Wrench className="w-3.5 h-3.5" />
            </FilterButton>
          </div>

          {/* Thinking expand/collapse */}
          <button
            onClick={expandAllThinking}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-accent-orange transition-colors"
            title="Expand all thinking"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={collapseAllThinking}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-accent-orange transition-colors"
            title="Collapse all thinking"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-accent-orange transition-colors"
            title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Stats toggle */}
          <button
            onClick={toggleStats}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showStats
                ? 'bg-accent-purple/20 text-accent-purple'
                : 'hover:bg-bg-elevated text-text-muted hover:text-text-primary'
            )}
            title="Toggle stats"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Export button */}
          <ExportButton />
        </div>
      </div>

      {/* Stats row */}
      {showStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-2 border-t border-border bg-bg-secondary/50 flex items-center gap-6 text-sm overflow-x-auto"
        >
          <StatItem
            icon={<MessageSquare className="w-4 h-4" />}
            label="Messages"
            value={stats.totalMessages.toString()}
            detail={`${stats.userMessages} user / ${stats.assistantMessages} assistant`}
          />
          <StatItem
            icon={<Cpu className="w-4 h-4" />}
            label="Tokens"
            value={formatTokens(stats.totalInputTokens + stats.totalOutputTokens)}
            detail={`${formatTokens(stats.totalInputTokens)} in / ${formatTokens(stats.totalOutputTokens)} out`}
          />
          <StatItem
            icon={<Zap className="w-4 h-4" />}
            label="Cache Hit"
            value={`${(stats.cacheHitRate * 100).toFixed(1)}%`}
            detail={`${formatTokens(stats.cacheHits)} hits`}
            color={stats.cacheHitRate > 0.5 ? 'green' : stats.cacheHitRate > 0.2 ? 'orange' : 'red'}
          />
          <StatItem
            icon={<Clock className="w-4 h-4" />}
            label="Duration"
            value={formatDuration(stats.totalDuration)}
          />
          <StatItem
            icon={<DollarSign className="w-4 h-4" />}
            label="Est. Cost"
            value={estimateCost(stats.totalInputTokens, stats.totalOutputTokens, stats.cacheHits)}
          />
          {stats.model && (
            <div className="text-text-muted">
              <span className="text-text-secondary">Model:</span>{' '}
              <span className="text-accent-purple">{stats.model.split('-').slice(-1)[0]}</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.header>
  );
}

function StatItem({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  color?: 'green' | 'orange' | 'red';
}) {
  const colorClass = color
    ? {
        green: 'text-accent-green',
        orange: 'text-accent-orange',
        red: 'text-accent-red',
      }[color]
    : 'text-text-primary';

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-text-muted">{icon}</span>
      <span className="text-text-secondary">{label}:</span>
      <span className={cn('font-medium', colorClass)}>{value}</span>
      {detail && <span className="text-text-muted text-xs">({detail})</span>}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'px-2 py-1.5 transition-colors',
        active
          ? 'bg-accent-blue/20 text-accent-blue'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
      )}
    >
      {children}
    </button>
  );
}
