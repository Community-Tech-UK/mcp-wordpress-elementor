import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listCategoriesSchema = z.object({
  page: z.coerce.number().optional().describe('Page number of the collection'),
  per_page: z.coerce.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
  parent: z.coerce.number().optional().describe('Limit results to categories with a specific parent ID'),
  orderby: z.enum(['id', 'include', 'name', 'slug', 'count']).optional().describe('Sort collection by category attribute'),
  order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending'),
  hide_empty: z.boolean().optional().describe('Whether to hide categories not assigned to any posts'),
});

const getCategorySchema = z.object({
  id: z.coerce.number().describe('Unique identifier for the category'),
}).strict();

const createCategorySchema = z.object({
  name: z.string().describe('HTML title for the category'),
  slug: z.string().optional().describe('An alphanumeric identifier for the category unique to its type'),
  description: z.string().optional().describe('HTML description of the category'),
  parent: z.coerce.number().optional().describe('The ID for the parent of the category'),
}).strict();

const updateCategorySchema = z.object({
  id: z.coerce.number().describe('Unique identifier for the category'),
  name: z.string().optional().describe('HTML title for the category'),
  slug: z.string().optional().describe('An alphanumeric identifier for the category unique to its type'),
  description: z.string().optional().describe('HTML description of the category'),
  parent: z.coerce.number().optional().describe('The ID for the parent of the category'),
}).strict();

const deleteCategorySchema = z.object({
  id: z.coerce.number().describe('Unique identifier for the category'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
}).strict();

// Tool definitions
export const categoriesTools = [
  {
    name: "list_categories",
    description: "List all categories with optional filtering, searching, and pagination",
    inputSchema: { type: "object" as const, properties: listCategoriesSchema.shape }
  },
  {
    name: "get_category",
    description: "Retrieve a single category by ID",
    inputSchema: { type: "object" as const, properties: getCategorySchema.shape, required: ['id'] }
  },
  {
    name: "create_category",
    description: "Create a new category",
    inputSchema: { type: "object" as const, properties: createCategorySchema.shape, required: ['name'] }
  },
  {
    name: "update_category",
    description: "Update an existing category",
    inputSchema: { type: "object" as const, properties: updateCategorySchema.shape, required: ['id'] }
  },
  {
    name: "delete_category",
    description: "Delete a category",
    inputSchema: { type: "object" as const, properties: deleteCategorySchema.shape, required: ['id'] }
  },
];

// Handlers
export const categoriesHandlers: Record<string, (params: any) => Promise<any>> = {
  list_categories: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'categories', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing categories: ${msg}` }] } };
    }
  },
  get_category: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', `categories/${params.id}`);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting category: ${msg}` }] } };
    }
  },
  create_category: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'categories', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating category: ${msg}` }] } };
    }
  },
  update_category: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `categories/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error updating category: ${msg}` }] } };
    }
  },
  delete_category: async (params) => {
    try {
      const response = await makeWordPressRequest('DELETE', `categories/${params.id}`, { force: params.force });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting category: ${msg}` }] } };
    }
  },
};
