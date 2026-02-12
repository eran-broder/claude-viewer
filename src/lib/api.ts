// Re-export API client and types from shared module
// This maintains backward compatibility with existing imports

export {
  // API functions
  fetchProjects,
  fetchProject,
  continueInClaude,
  fetchConversations,
  searchConversations,
  fetchConversationContent,
  ApiClientError,
  // Types
  type ProjectInfo,
  type ConversationInfo,
  type SearchResult,
  type ContinueRequest,
  type ContinueResponse,
} from '../../shared/api-client';

export {
  connectWebSocket,
  type WsMessage,
} from '../../shared/ws-client';
