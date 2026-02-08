import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listPagesSchema = z.object({
  page: z.number().optional().describe('Page number of the collection'),
  per_page: z.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
  after: z.string().optional().describe('Limit results to pages published after a given ISO8601 date'),
  author: z.union([z.number(), z.array(z.number())]).optional().describe('Limit results to pages assigned to specific authors'),
  parent: z.number().optional().describe('Limit results to pages with a specific parent ID'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional().describe('Limit results to pages with specific status'),
  menu_order: z.number().optional().describe('Limit results to pages with a specific menu_order'),
  orderby: z.enum(['date', 'id', 'include', 'title', 'slug', 'modified', 'menu_order']).optional().describe('Sort collection by page attribute'),
  order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending'),
});

const getPageSchema = z.object({
  id: z.number().describe('Unique identifier for the page'),
}).strict();

const createPageSchema = z.object({
  title: z.string().describe('The title for the page'),
  content: z.string().describe('The content for the page'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional().default('draft').describe('Page status'),
  excerpt: z.string().optional().describe('The excerpt for the page'),
  author: z.number().optional().describe('The ID for the author of the page'),
  featured_media: z.number().optional().describe('The ID of the featured media for the page'),
  parent: z.number().optional().describe('The ID for the parent of the page'),
  menu_order: z.number().optional().describe('The order of the page in relation to other pages'),
  template: z.string().optional().describe('The theme file to use to display the page'),
  slug: z.string().optional().describe('An alphanumeric identifier for the page unique to its type'),
}).strict();

const updatePageSchema = z.object({
  id: z.number().describe('Unique identifier for the page'),
  title: z.string().optional().describe('The title for the page'),
  content: z.string().optional().describe('The content for the page'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional().describe('Page status'),
  excerpt: z.string().optional().describe('The excerpt for the page'),
  author: z.number().optional().describe('The ID for the author of the page'),
  featured_media: z.number().optional().describe('The ID of the featured media for the page'),
  parent: z.number().optional().describe('The ID for the parent of the page'),
  menu_order: z.number().optional().describe('The order of the page in relation to other pages'),
  template: z.string().optional().describe('The theme file to use to display the page'),
  slug: z.string().optional().describe('An alphanumeric identifier for the page unique to its type'),
}).strict();

const deletePageSchema = z.object({
  id: z.number().describe('Unique identifier for the page'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
}).strict();

// Tool definitions
export const pagesTools = [
  {
    name: "list_pages",
    description: "List all pages with optional filtering, searching, and pagination",
    inputSchema: { type: "object" as const, properties: listPagesSchema.shape }
  },
  {
    name: "get_page",
    description: "Retrieve a single page by ID",
    inputSchema: { type: "object" as const, properties: getPageSchema.shape, required: ['id'] }
  },
  {
    name: "create_page",
    description: "Create a new page",
    inputSchema: { type: "object" as const, properties: createPageSchema.shape, required: ['title', 'content'] }
  },
  {
    name: "update_page",
    description: "Update an existing page",
    inputSchema: { type: "object" as const, properties: updatePageSchema.shape, required: ['id'] }
  },
  {
    name: "delete_page",
    description: "Delete a page",
    inputSchema: { type: "object" as const, properties: deletePageSchema.shape, required: ['id'] }
  },
];

// Handlers
export const pagesHandlers: Record<string, (params: any) => Promise<any>> = {
  list_pages: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'pages', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing pages: ${msg}` }] } };
    }
  },
  get_page: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', `pages/${params.id}`);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting page: ${msg}` }] } };
    }
  },
  create_page: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'pages', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating page: ${msg}` }] } };
    }
  },
  update_page: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `pages/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error updating page: ${msg}` }] } };
    }
  },
  delete_page: async (params) => {
    try {
      const response = await makeWordPressRequest('DELETE', `pages/${params.id}`, { force: params.force });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting page: ${msg}` }] } };
    }
  },
};
