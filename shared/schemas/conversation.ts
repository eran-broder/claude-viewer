import { z } from 'zod';

// Conversation info schema
export const ConversationInfoSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  firstMessage: z.string().nullable(),
  messageCount: z.number().int().nonnegative(),
  timestamp: z.string().nullable(),
  lastModified: z.string(),
  size: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  model: z.string().nullable(),
});

export type ConversationInfo = z.infer<typeof ConversationInfoSchema>;

// Search result schema
export const SearchResultSchema = z.object({
  projectId: z.string(),
  conversationId: z.string(),
  snippet: z.string(),
  matchIndex: z.number().int().nonnegative(),
  type: z.string(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// API Response schemas
export const ConversationsResponseSchema = z.object({
  conversations: z.array(ConversationInfoSchema),
});

export type ConversationsResponse = z.infer<typeof ConversationsResponseSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const ConversationContentResponseSchema = z.object({
  content: z.string(),
});

export type ConversationContentResponse = z.infer<typeof ConversationContentResponseSchema>;

// Query parameter schemas
export const ConversationsQuerySchema = z.object({
  projectId: z.string(),
});

export type ConversationsQuery = z.infer<typeof ConversationsQuerySchema>;

export const SearchQuerySchema = z.object({
  q: z.string().min(2),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const ConversationParamsSchema = z.object({
  id: z.string(),
});

export type ConversationParams = z.infer<typeof ConversationParamsSchema>;
