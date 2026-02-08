import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listUsersSchema = z.object({
  page: z.number().optional().describe('Page number of the collection'),
  per_page: z.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
  context: z.enum(['view', 'embed', 'edit']).optional().describe('Scope under which the request is made; determines fields present in response'),
  orderby: z.enum(['id', 'include', 'name', 'registered_date', 'slug', 'email', 'url']).optional().describe('Sort collection by user attribute'),
  order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending'),
  roles: z.array(z.string()).optional().describe('Limit results to users matching at least one specific role'),
});

const getUserSchema = z.object({
  id: z.number().describe('Unique identifier for the user'),
  context: z.enum(['view', 'embed', 'edit']).optional().describe('Scope under which the request is made; determines fields present in response'),
}).strict();

const createUserSchema = z.object({
  username: z.string().describe('Login name for the user'),
  name: z.string().optional().describe('Display name for the user'),
  first_name: z.string().optional().describe('First name for the user'),
  last_name: z.string().optional().describe('Last name for the user'),
  email: z.string().email().describe('The email address for the user'),
  url: z.string().url().optional().describe('URL of the user'),
  description: z.string().optional().describe('Description of the user'),
  locale: z.string().optional().describe('Locale for the user'),
  nickname: z.string().optional().describe('The nickname for the user'),
  slug: z.string().optional().describe('An alphanumeric identifier for the user'),
  roles: z.array(z.string()).optional().describe('Roles assigned to the user'),
  password: z.string().describe('Password for the user'),
}).strict();

const updateUserSchema = z.object({
  id: z.number().describe('Unique identifier for the user'),
  username: z.string().optional().describe('Login name for the user'),
  name: z.string().optional().describe('Display name for the user'),
  first_name: z.string().optional().describe('First name for the user'),
  last_name: z.string().optional().describe('Last name for the user'),
  email: z.string().email().optional().describe('The email address for the user'),
  url: z.string().url().optional().describe('URL of the user'),
  description: z.string().optional().describe('Description of the user'),
  locale: z.string().optional().describe('Locale for the user'),
  nickname: z.string().optional().describe('The nickname for the user'),
  slug: z.string().optional().describe('An alphanumeric identifier for the user'),
  roles: z.array(z.string()).optional().describe('Roles assigned to the user'),
  password: z.string().optional().describe('Password for the user'),
}).strict();

const deleteUserSchema = z.object({
  id: z.number().describe('Unique identifier for the user'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
  reassign: z.number().optional().describe('Reassign the deleted user\'s posts and links to this user ID'),
}).strict();

// Tool definitions
export const usersTools = [
  {
    name: "list_users",
    description: "List all users with optional filtering, searching, and pagination",
    inputSchema: { type: "object" as const, properties: listUsersSchema.shape }
  },
  {
    name: "get_user",
    description: "Retrieve a single user by ID",
    inputSchema: { type: "object" as const, properties: getUserSchema.shape, required: ['id'] }
  },
  {
    name: "create_user",
    description: "Create a new user",
    inputSchema: { type: "object" as const, properties: createUserSchema.shape, required: ['username', 'email', 'password'] }
  },
  {
    name: "update_user",
    description: "Update an existing user",
    inputSchema: { type: "object" as const, properties: updateUserSchema.shape, required: ['id'] }
  },
  {
    name: "delete_user",
    description: "Delete a user",
    inputSchema: { type: "object" as const, properties: deleteUserSchema.shape, required: ['id'] }
  },
];

// Handlers
export const usersHandlers: Record<string, (params: any) => Promise<any>> = {
  list_users: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'users', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing users: ${msg}` }] } };
    }
  },
  get_user: async (params) => {
    try {
      const { id, context } = params;
      const queryParams = context ? { context } : {};
      const response = await makeWordPressRequest('GET', `users/${id}`, queryParams);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting user: ${msg}` }] } };
    }
  },
  create_user: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'users', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating user: ${msg}` }] } };
    }
  },
  update_user: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `users/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error updating user: ${msg}` }] } };
    }
  },
  delete_user: async (params) => {
    try {
      const { id, force, reassign } = params;
      const deleteData: any = {};
      if (force !== undefined) deleteData.force = force;
      if (reassign !== undefined) deleteData.reassign = reassign;
      const response = await makeWordPressRequest('DELETE', `users/${id}`, deleteData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting user: ${msg}` }] } };
    }
  },
};
