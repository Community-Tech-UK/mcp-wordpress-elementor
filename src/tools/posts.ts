import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listPostsSchema = z.object({
  page: z.number().optional().describe('Page number of the collection'),
  per_page: z.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
  after: z.string().optional().describe('Limit results to posts published after a given ISO8601 date'),
  author: z.union([z.number(), z.array(z.number())]).optional().describe('Limit results to posts assigned to specific authors'),
  categories: z.union([z.number(), z.array(z.number())]).optional().describe('Limit results to posts assigned to specific categories'),
  tags: z.union([z.number(), z.array(z.number())]).optional().describe('Limit results to posts assigned to specific tags'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional().describe('Limit results to posts with specific status'),
  orderby: z.enum(['date', 'id', 'include', 'title', 'slug', 'modified']).optional().describe('Sort collection by post attribute'),
  order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending'),
});

const getPostSchema = z.object({
  id: z.number().describe('Unique identifier for the post'),
}).strict();

const createPostSchema = z.object({
  title: z.string().describe('The title for the post'),
  content: z.string().describe('The content for the post'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional().default('draft').describe('Post status'),
  excerpt: z.string().optional().describe('The excerpt for the post'),
  author: z.number().optional().describe('The ID for the author of the post'),
  categories: z.array(z.number()).optional().describe('The terms assigned to the post in the category taxonomy'),
  tags: z.array(z.number()).optional().describe('The terms assigned to the post in the post_tag taxonomy'),
  featured_media: z.number().optional().describe('The ID of the featured media for the post'),
  format: z.enum(['standard', 'aside', 'chat', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio']).optional().describe('The format for the post'),
  slug: z.string().optional().describe('An alphanumeric identifier for the post unique to its type'),
}).strict();

const updatePostSchema = z.object({
  id: z.number().describe('Unique identifier for the post'),
  title: z.string().optional().describe('The title for the post'),
  content: z.string().optional().describe('The content for the post'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional().describe('Post status'),
  excerpt: z.string().optional().describe('The excerpt for the post'),
  author: z.number().optional().describe('The ID for the author of the post'),
  categories: z.array(z.number()).optional().describe('The terms assigned to the post in the category taxonomy'),
  tags: z.array(z.number()).optional().describe('The terms assigned to the post in the post_tag taxonomy'),
  featured_media: z.number().optional().describe('The ID of the featured media for the post'),
  format: z.enum(['standard', 'aside', 'chat', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio']).optional().describe('The format for the post'),
  slug: z.string().optional().describe('An alphanumeric identifier for the post unique to its type'),
}).strict();

const deletePostSchema = z.object({
  id: z.number().describe('Unique identifier for the post'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
}).strict();

// Tool definitions
export const postsTools = [
  {
    name: "list_posts",
    description: "List all posts with optional filtering, searching, and pagination",
    inputSchema: { type: "object" as const, properties: listPostsSchema.shape }
  },
  {
    name: "get_post",
    description: "Retrieve a single post by ID",
    inputSchema: { type: "object" as const, properties: getPostSchema.shape, required: ['id'] }
  },
  {
    name: "create_post",
    description: "Create a new post",
    inputSchema: { type: "object" as const, properties: createPostSchema.shape, required: ['title', 'content'] }
  },
  {
    name: "update_post",
    description: "Update an existing post",
    inputSchema: { type: "object" as const, properties: updatePostSchema.shape, required: ['id'] }
  },
  {
    name: "delete_post",
    description: "Delete a post",
    inputSchema: { type: "object" as const, properties: deletePostSchema.shape, required: ['id'] }
  },
];

// Handlers
export const postsHandlers: Record<string, (params: any) => Promise<any>> = {
  list_posts: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'posts', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing posts: ${msg}` }] } };
    }
  },
  get_post: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', `posts/${params.id}`);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting post: ${msg}` }] } };
    }
  },
  create_post: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'posts', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating post: ${msg}` }] } };
    }
  },
  update_post: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `posts/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error updating post: ${msg}` }] } };
    }
  },
  delete_post: async (params) => {
    try {
      const response = await makeWordPressRequest('DELETE', `posts/${params.id}`, { force: params.force });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting post: ${msg}` }] } };
    }
  },
};
