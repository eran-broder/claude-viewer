import { z } from 'zod';

// Project schema
export const ProjectInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  conversationCount: z.number().int().nonnegative(),
  lastModified: z.string().datetime(),
});

export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;

// API Response schemas
export const ProjectsResponseSchema = z.object({
  projects: z.array(ProjectInfoSchema),
});

export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;

export const ProjectResponseSchema = ProjectInfoSchema;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

// Continue conversation request/response
export const ContinueRequestSchema = z.object({
  conversationId: z.string().optional(),
});

export type ContinueRequest = z.infer<typeof ContinueRequestSchema>;

export const ContinueResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type ContinueResponse = z.infer<typeof ContinueResponseSchema>;
