import { z } from 'zod';

// WebSocket message types
export const WsMessageTypeSchema = z.enum([
  'connected',
  'project_updated',
  'conversation_added',
  'conversation_updated',
  'conversation_deleted',
]);

export type WsMessageType = z.infer<typeof WsMessageTypeSchema>;

// WebSocket message schema
export const WsMessageSchema = z.object({
  type: WsMessageTypeSchema,
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  timestamp: z.string(),
});

export type WsMessage = z.infer<typeof WsMessageSchema>;
