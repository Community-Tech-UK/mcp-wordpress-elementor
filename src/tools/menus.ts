import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listMenusSchema = z.object({
  page: z.coerce.number().optional().describe('Page number of the collection'),
  per_page: z.coerce.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
});

const listMenuItemsSchema = z.object({
  menus: z.coerce.number().describe('Limit results to items in a specific menu (menu ID)'),
  page: z.coerce.number().optional().describe('Page number of the collection'),
  per_page: z.coerce.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
  order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending'),
  orderby: z.enum(['id', 'include', 'menu_order', 'title']).optional().describe('Sort collection by menu item attribute'),
});

const createMenuItemSchema = z.object({
  title: z.string().describe('The title for the menu item'),
  menus: z.coerce.number().describe('The ID of the menu to add the item to'),
  parent: z.coerce.number().optional().describe('The ID of the parent menu item (0 for top-level)'),
  type: z.enum(['taxonomy', 'post_type', 'post_type_archive', 'custom']).optional().describe('The type of menu item (default: custom)'),
  object: z.string().optional().describe('The object type (e.g. page, post, category). Required for post_type/taxonomy types'),
  object_id: z.coerce.number().optional().describe('The database ID of the linked object. Required for post_type/taxonomy types'),
  url: z.string().optional().describe('The URL of the menu item. Used for custom type items'),
  menu_order: z.coerce.number().optional().describe('The position of the menu item in the menu'),
  status: z.enum(['publish', 'draft']).optional().describe('Publication status of the menu item'),
  target: z.string().optional().describe('The target attribute of the link (e.g. _blank)'),
  attr_title: z.string().optional().describe('Text for the title attribute of the link element'),
  classes: z.array(z.string()).optional().describe('Array of CSS class names for the menu item'),
  description: z.string().optional().describe('Description of the menu item'),
}).strict();

const updateMenuItemSchema = z.object({
  id: z.coerce.number().describe('Unique identifier for the menu item'),
  title: z.string().optional().describe('The title for the menu item'),
  menus: z.coerce.number().optional().describe('The ID of the menu to move the item to'),
  parent: z.coerce.number().optional().describe('The ID of the parent menu item (0 for top-level)'),
  type: z.enum(['taxonomy', 'post_type', 'post_type_archive', 'custom']).optional().describe('The type of menu item'),
  object: z.string().optional().describe('The object type (e.g. page, post, category)'),
  object_id: z.coerce.number().optional().describe('The database ID of the linked object'),
  url: z.string().optional().describe('The URL of the menu item'),
  menu_order: z.coerce.number().optional().describe('The position of the menu item in the menu'),
  status: z.enum(['publish', 'draft']).optional().describe('Publication status of the menu item'),
  target: z.string().optional().describe('The target attribute of the link (e.g. _blank)'),
  attr_title: z.string().optional().describe('Text for the title attribute of the link element'),
  classes: z.array(z.string()).optional().describe('Array of CSS class names for the menu item'),
  description: z.string().optional().describe('Description of the menu item'),
}).strict();

const deleteMenuItemSchema = z.object({
  id: z.coerce.number().describe('Unique identifier for the menu item'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
}).strict();

// Tool definitions
export const menusTools = [
  {
    name: "list_menus",
    description: "List all navigation menus with optional filtering and pagination",
    inputSchema: { type: "object" as const, properties: listMenusSchema.shape }
  },
  {
    name: "list_menu_items",
    description: "List all items in a navigation menu. Requires the menu ID",
    inputSchema: { type: "object" as const, properties: listMenuItemsSchema.shape, required: ['menus'] }
  },
  {
    name: "create_menu_item",
    description: "Create a new navigation menu item. Use type 'post_type' with object/object_id for pages/posts, or type 'custom' with url for external links",
    inputSchema: { type: "object" as const, properties: createMenuItemSchema.shape, required: ['title', 'menus'] }
  },
  {
    name: "update_menu_item",
    description: "Update an existing navigation menu item (title, parent, order, URL, etc.)",
    inputSchema: { type: "object" as const, properties: updateMenuItemSchema.shape, required: ['id'] }
  },
  {
    name: "delete_menu_item",
    description: "Delete a navigation menu item",
    inputSchema: { type: "object" as const, properties: deleteMenuItemSchema.shape, required: ['id'] }
  },
];

// Handlers
export const menusHandlers: Record<string, (params: any) => Promise<any>> = {
  list_menus: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'menus', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing menus: ${msg}` }] } };
    }
  },
  list_menu_items: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'menu-items', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing menu items: ${msg}` }] } };
    }
  },
  create_menu_item: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'menu-items', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating menu item: ${msg}` }] } };
    }
  },
  update_menu_item: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `menu-items/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error updating menu item: ${msg}` }] } };
    }
  },
  delete_menu_item: async (params) => {
    try {
      const response = await makeWordPressRequest('DELETE', `menu-items/${params.id}`, { force: params.force });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting menu item: ${msg}` }] } };
    }
  },
};
