import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listCommentsSchema = z.object({
  page: z.number().optional().describe('Page number of the collection'),
  per_page: z.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
  after: z.string().optional().describe('Limit results to comments published after a given ISO8601 date'),
  author: z.union([z.number(), z.array(z.number())]).optional().describe('Limit results to comments assigned to specific authors'),
  author_email: z.string().email().optional().describe('Limit results to comments assigned to a specific author email'),
  author_exclude: z.array(z.number()).optional().describe('Ensure results exclude comments assigned to specific authors'),
  post: z.number().optional().describe('Limit results to comments of a specific post ID'),
  status: z.enum(['approve', 'hold', 'spam', 'trash']).optional().describe('Limit results to comments with specific status'),
  type: z.string().optional().describe('Limit results to comments of a specific type'),
  orderby: z.enum(['date', 'date_gmt', 'id', 'include', 'post', 'parent', 'type']).optional().describe('Sort collection by comment attribute'),
  order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending'),
});

const getCommentSchema = z.object({
  id: z.number().describe('Unique identifier for the comment'),
}).strict();

const createCommentSchema = z.object({
  post: z.number().describe('The ID of the associated post'),
  author: z.number().optional().describe('The ID of the user object, if author was a user'),
  author_name: z.string().optional().describe('Display name for the comment author'),
  author_email: z.string().email().optional().describe('Email address for the comment author'),
  author_url: z.string().url().optional().describe('URL for the comment author'),
  content: z.string().describe('The content for the comment'),
  parent: z.number().optional().describe('The ID for the parent of the comment'),
  status: z.enum(['approve', 'hold']).optional().describe('State of the comment'),
}).strict();

const updateCommentSchema = z.object({
  id: z.number().describe('Unique identifier for the comment'),
  post: z.number().optional().describe('The ID of the associated post'),
  author: z.number().optional().describe('The ID of the user object, if author was a user'),
  author_name: z.string().optional().describe('Display name for the comment author'),
  author_email: z.string().email().optional().describe('Email address for the comment author'),
  author_url: z.string().url().optional().describe('URL for the comment author'),
  content: z.string().optional().describe('The content for the comment'),
  parent: z.number().optional().describe('The ID for the parent of the comment'),
  status: z.enum(['approve', 'hold', 'spam', 'trash']).optional().describe('State of the comment'),
}).strict();

const deleteCommentSchema = z.object({
  id: z.number().describe('Unique identifier for the comment'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
}).strict();

// Tool definitions
export const commentsTools = [
  {
    name: "list_comments",
    description: "List all comments with optional filtering, searching, and pagination",
    inputSchema: { type: "object" as const, properties: listCommentsSchema.shape }
  },
  {
    name: "get_comment",
    description: "Retrieve a single comment by ID",
    inputSchema: { type: "object" as const, properties: getCommentSchema.shape, required: ['id'] }
  },
  {
    name: "create_comment",
    description: "Create a new comment",
    inputSchema: { type: "object" as const, properties: createCommentSchema.shape, required: ['post', 'content'] }
  },
  {
    name: "update_comment",
    description: "Update an existing comment",
    inputSchema: { type: "object" as const, properties: updateCommentSchema.shape, required: ['id'] }
  },
  {
    name: "delete_comment",
    description: "Delete a comment",
    inputSchema: { type: "object" as const, properties: deleteCommentSchema.shape, required: ['id'] }
  },
];

// Handlers
export const commentsHandlers: Record<string, (params: any) => Promise<any>> = {
  list_comments: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'comments', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing comments: ${msg}` }] } };
    }
  },
  get_comment: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', `comments/${params.id}`);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting comment: ${msg}` }] } };
    }
  },
  create_comment: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'comments', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating comment: ${msg}` }] } };
    }
  },
  update_comment: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `comments/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error updating comment: ${msg}` }] } };
    }
  },
  delete_comment: async (params) => {
    try {
      const response = await makeWordPressRequest('DELETE', `comments/${params.id}`, { force: params.force });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting comment: ${msg}` }] } };
    }
  },
};
