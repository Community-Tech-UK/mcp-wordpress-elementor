import { z } from 'zod';
import { fetchElementorData, saveElementorData } from '../utils/elementor-data-ops.js';
import { toolSuccess, toolError } from '../types/elementor-types.js';
import { makeWordPressRequest } from '../wordpress.js';

// Zod schemas
const getElementorDataSchema = z.object({
  post_id: z.number(),
});

const updateElementorDataSchema = z.object({
  post_id: z.number(),
  elementor_data: z.string(),
});

const getElementorDataChunkedSchema = z.object({
  post_id: z.number(),
  chunk_size: z.number().optional(),
  chunk_index: z.number().optional(),
});

const backupElementorDataSchema = z.object({
  post_id: z.number(),
  backup_name: z.string().optional(),
});

const getElementorTemplatesSchema = z.object({
  per_page: z.number().optional(),
  type: z.string().optional(),
});

// Tool definitions
export const elementorDataTools = [
  {
    name: 'get_elementor_data',
    description: 'Fetch _elementor_data for a post/page. Returns the full element tree.',
    inputSchema: {
      type: 'object' as const,
      properties: getElementorDataSchema.shape,
    },
  },
  {
    name: 'update_elementor_data',
    description: 'Save _elementor_data back (full replacement). Requires JSON string of element array.',
    inputSchema: {
      type: 'object' as const,
      properties: updateElementorDataSchema.shape,
    },
  },
  {
    name: 'get_elementor_data_chunked',
    description: 'Split large responses into chunks. Returns a chunk of top-level elements with metadata.',
    inputSchema: {
      type: 'object' as const,
      properties: getElementorDataChunkedSchema.shape,
    },
  },
  {
    name: 'backup_elementor_data',
    description: 'Snapshot _elementor_data before changes. Stores as post meta with timestamp.',
    inputSchema: {
      type: 'object' as const,
      properties: backupElementorDataSchema.shape,
    },
  },
  {
    name: 'get_elementor_templates',
    description: 'List elementor_library items with optional type filter.',
    inputSchema: {
      type: 'object' as const,
      properties: getElementorTemplatesSchema.shape,
    },
  },
];

// Handlers
export const elementorDataHandlers: Record<string, (params: any) => Promise<any>> = {
  get_elementor_data: async (params) => {
    try {
      const { post_id } = getElementorDataSchema.parse(params);
      const data = await fetchElementorData(post_id);
      return toolSuccess(data);
    } catch (error: any) {
      return toolError(`Error fetching Elementor data: ${error.message}`);
    }
  },

  update_elementor_data: async (params) => {
    try {
      const { post_id, elementor_data } = updateElementorDataSchema.parse(params);
      const parsed = JSON.parse(elementor_data);
      await saveElementorData(post_id, parsed);
      return toolSuccess({ success: true, message: `Successfully updated Elementor data for post ${post_id}` });
    } catch (error: any) {
      return toolError(`Error updating Elementor data: ${error.message}`);
    }
  },

  get_elementor_data_chunked: async (params) => {
    try {
      const { post_id, chunk_size = 5, chunk_index = 0 } = getElementorDataChunkedSchema.parse(params);
      const data = await fetchElementorData(post_id);

      const total_elements = data.length;
      const total_chunks = Math.ceil(total_elements / chunk_size);
      const start = chunk_index * chunk_size;
      const end = start + chunk_size;
      const chunk = data.slice(start, end);

      return toolSuccess({
        post_id,
        chunk_index,
        chunk_size,
        total_chunks,
        total_elements,
        elements_in_chunk: chunk.length,
        elements: chunk,
      });
    } catch (error: any) {
      return toolError(`Error fetching chunked Elementor data: ${error.message}`);
    }
  },

  backup_elementor_data: async (params) => {
    try {
      const { post_id, backup_name } = backupElementorDataSchema.parse(params);
      const data = await fetchElementorData(post_id);

      const timestamp = Date.now();
      const backupKey = `_elementor_data_backup_${timestamp}`;
      const backupData = {
        backup_name: backup_name || `Backup ${new Date(timestamp).toISOString()}`,
        timestamp,
        post_id,
        elementor_data: data,
      };

      // Save backup as post meta
      const payload = {
        meta: {
          [backupKey]: JSON.stringify(backupData),
        },
      };

      // Try as post first, fall back to page
      try {
        await makeWordPressRequest('POST', `posts/${post_id}`, payload);
      } catch {
        await makeWordPressRequest('POST', `pages/${post_id}`, payload);
      }

      return toolSuccess({
        success: true,
        message: `Backup created successfully`,
        backup_key: backupKey,
        timestamp,
      });
    } catch (error: any) {
      return toolError(`Error creating backup: ${error.message}`);
    }
  },

  get_elementor_templates: async (params) => {
    try {
      const { per_page = 10, type } = getElementorTemplatesSchema.parse(params);

      const queryParams: any = {
        per_page,
        meta_key: '_elementor_template_type',
      };

      if (type) {
        queryParams.meta_value = type;
      }

      const templates = await makeWordPressRequest('GET', 'elementor_library', queryParams);
      return toolSuccess({
        total: templates.length,
        templates,
      });
    } catch (error: any) {
      return toolError(`Error fetching Elementor templates: ${error.message}`);
    }
  },
};
