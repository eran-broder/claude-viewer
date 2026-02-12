import { z } from 'zod';
import {
  ProjectsResponseSchema,
  ProjectResponseSchema,
  ContinueRequestSchema,
  ContinueResponseSchema,
  ConversationsResponseSchema,
  SearchResponseSchema,
  ConversationContentResponseSchema,
  ApiErrorSchema,
  type ProjectInfo,
  type ConversationInfo,
  type SearchResult,
  type ContinueRequest,
  type ContinueResponse,
} from './schemas';

// API base URL - uses relative URLs for same-origin requests
const API_BASE = '/api';

// Custom error class for API errors
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Generic fetch helper with Zod validation
async function fetchWithValidation<T>(
  url: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    try {
      const errorBody = await response.json();
      const parsed = ApiErrorSchema.safeParse(errorBody);
      if (parsed.success) {
        errorMessage = parsed.data.error;
        code = parsed.data.code;
        details = parsed.data.details;
      }
    } catch {
      // Ignore JSON parse errors
    }

    throw new ApiClientError(errorMessage, response.status, code, details);
  }

  const data = await response.json();
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error('API response validation failed:', result.error.errors);
    throw new ApiClientError(
      'Invalid API response format',
      response.status,
      'VALIDATION_ERROR',
      { zodErrors: result.error.errors }
    );
  }

  return result.data;
}

// ============= Projects API =============

export async function fetchProjects(): Promise<ProjectInfo[]> {
  const response = await fetchWithValidation(
    `${API_BASE}/projects`,
    ProjectsResponseSchema
  );
  return response.projects;
}

export async function fetchProject(projectId: string): Promise<ProjectInfo> {
  return fetchWithValidation(
    `${API_BASE}/projects/${encodeURIComponent(projectId)}`,
    ProjectResponseSchema
  );
}

export async function continueInClaude(
  projectId: string,
  conversationId?: string
): Promise<ContinueResponse> {
  const body: ContinueRequest = { conversationId };
  ContinueRequestSchema.parse(body); // Validate request

  return fetchWithValidation(
    `${API_BASE}/projects/${encodeURIComponent(projectId)}/continue`,
    ContinueResponseSchema,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

// ============= Conversations API =============

export async function fetchConversations(projectId: string): Promise<ConversationInfo[]> {
  const response = await fetchWithValidation(
    `${API_BASE}/conversations?projectId=${encodeURIComponent(projectId)}`,
    ConversationsResponseSchema
  );
  return response.conversations;
}

export async function searchConversations(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  const response = await fetchWithValidation(
    `${API_BASE}/conversations/search?q=${encodeURIComponent(query)}`,
    SearchResponseSchema
  );
  return response.results;
}

export async function fetchConversationContent(
  projectId: string,
  conversationId: string
): Promise<string> {
  const response = await fetchWithValidation(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}?projectId=${encodeURIComponent(projectId)}`,
    ConversationContentResponseSchema
  );
  return response.content;
}

// ============= Re-export types for convenience =============

export type {
  ProjectInfo,
  ConversationInfo,
  SearchResult,
  ContinueRequest,
  ContinueResponse,
} from './schemas';
