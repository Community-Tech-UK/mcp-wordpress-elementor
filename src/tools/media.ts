import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';
import axios from 'axios';
import * as path from 'path';

// Zod schemas
const listMediaSchema = z.object({
  page: z.number().optional().describe('Page number of the collection'),
  per_page: z.number().min(1).max(100).optional().describe('Maximum number of items to return (1-100)'),
  search: z.string().optional().describe('Limit results to those matching a string'),
}).strict();

const createMediaSchema = z.object({
  title: z.string().describe('The title for the media'),
  alt_text: z.string().optional().describe('Alternative text to display when media is not displayed'),
  caption: z.string().optional().describe('The caption for the media'),
  description: z.string().optional().describe('The description for the media'),
  source_url: z.string().url().describe('URL to download the media file from'),
}).strict();

const editMediaSchema = z.object({
  id: z.number().describe('Unique identifier for the media'),
  title: z.string().optional().describe('The title for the media'),
  alt_text: z.string().optional().describe('Alternative text to display when media is not displayed'),
  caption: z.string().optional().describe('The caption for the media'),
  description: z.string().optional().describe('The description for the media'),
}).strict();

const deleteMediaSchema = z.object({
  id: z.number().describe('Unique identifier for the media'),
  force: z.boolean().optional().describe('Whether to bypass Trash and force deletion'),
}).strict();

// Tool definitions
export const mediaTools = [
  {
    name: "list_media",
    description: "List all media items with optional searching and pagination",
    inputSchema: { type: "object" as const, properties: listMediaSchema.shape }
  },
  {
    name: "create_media",
    description: "Upload a new media file from a URL",
    inputSchema: { type: "object" as const, properties: createMediaSchema.shape, required: ['title', 'source_url'] }
  },
  {
    name: "edit_media",
    description: "Edit media metadata (title, alt text, caption, description)",
    inputSchema: { type: "object" as const, properties: editMediaSchema.shape, required: ['id'] }
  },
  {
    name: "delete_media",
    description: "Delete a media item",
    inputSchema: { type: "object" as const, properties: deleteMediaSchema.shape, required: ['id'] }
  },
];

// Handlers
export const mediaHandlers: Record<string, (params: any) => Promise<any>> = {
  list_media: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'media', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing media: ${msg}` }] } };
    }
  },
  create_media: async (params) => {
    try {
      // Download the file from source_url
      const fileResponse = await axios.get(params.source_url, { responseType: 'arraybuffer' });
      const fileBuffer = Buffer.from(fileResponse.data);

      // Create form data
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      const filename = params.title.toLowerCase().replace(/\s+/g, '-') +
        (path.extname(params.source_url.split('?')[0]) || '.jpg');
      formData.append('file', fileBuffer, { filename });
      if (params.title) formData.append('title', params.title);
      if (params.alt_text) formData.append('alt_text', params.alt_text);
      if (params.caption) formData.append('caption', params.caption);
      if (params.description) formData.append('description', params.description);

      const response = await makeWordPressRequest('POST', 'media', formData, {
        isFormData: true,
        headers: formData.getHeaders(),
      });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error creating media: ${msg}` }] } };
    }
  },
  edit_media: async (params) => {
    try {
      const { id, ...updateData } = params;
      const response = await makeWordPressRequest('POST', `media/${id}`, updateData);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error editing media: ${msg}` }] } };
    }
  },
  delete_media: async (params) => {
    try {
      const response = await makeWordPressRequest('DELETE', `media/${params.id}`, { force: params.force });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deleting media: ${msg}` }] } };
    }
  },
};
