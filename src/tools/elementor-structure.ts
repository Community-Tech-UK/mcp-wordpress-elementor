import { z } from 'zod';
import { fetchElementorData } from '../utils/elementor-data-ops.js';
import { flattenElements } from '../utils/element-traversal.js';
import { toolSuccess, toolError, ElementorElement } from '../types/elementor-types.js';

// Zod schemas
const getPageStructureSchema = z.object({
  post_id: z.number(),
  include_settings: z.boolean().optional(),
});

const getElementorElementsSchema = z.object({
  post_id: z.number(),
  include_content: z.boolean().optional(),
});

// Tool definitions
export const elementorStructureTools = [
  {
    name: 'get_page_structure',
    description: 'Get tree view with IDs and types. Recursively builds structure with id, type, widgetType, level, and optional settings/children.',
    inputSchema: {
      type: 'object' as const,
      properties: getPageStructureSchema.shape,
    },
  },
  {
    name: 'get_elementor_elements',
    description: 'Get flat list of elements with optional content preview. Returns all elements with id, type, level, widgetType, and contentPreview.',
    inputSchema: {
      type: 'object' as const,
      properties: getElementorElementsSchema.shape,
    },
  },
];

// Handlers
export const elementorStructureHandlers: Record<string, (params: any) => Promise<any>> = {
  get_page_structure: async (params) => {
    try {
      const { post_id, include_settings = false } = getPageStructureSchema.parse(params);
      const data = await fetchElementorData(post_id);

      const extractStructure = (elements: ElementorElement[], level = 0): any[] => {
        return elements.map((element) => {
          const node: any = {
            id: element.id,
            type: element.elType,
            widgetType: element.widgetType || null,
            level,
          };

          if (include_settings && element.settings) {
            node.settings = element.settings;
          }

          if (element.elements?.length > 0) {
            node.children = extractStructure(element.elements, level + 1);
          }

          return node;
        });
      };

      const structure = extractStructure(data);

      return toolSuccess({
        post_id,
        structure,
      });
    } catch (error: any) {
      return toolError(`Error getting page structure: ${error.message}`);
    }
  },

  get_elementor_elements: async (params) => {
    try {
      const { post_id, include_content = false } = getElementorElementsSchema.parse(params);
      const data = await fetchElementorData(post_id);
      const flattened = flattenElements(data);

      const elements = flattened.map(({ element, depth }) => {
        const result: any = {
          id: element.id,
          type: element.elType,
          level: depth,
        };

        if (element.widgetType) {
          result.widgetType = element.widgetType;
        }

        if (include_content && element.widgetType) {
          const settings = element.settings || {};
          let contentPreview: string | undefined;

          switch (element.widgetType) {
            case 'heading':
              contentPreview = settings.title
                ? String(settings.title).substring(0, 100)
                : undefined;
              break;
            case 'text-editor':
              contentPreview = settings.editor
                ? String(settings.editor).substring(0, 100)
                : undefined;
              break;
            case 'html':
              contentPreview = settings.html
                ? String(settings.html).substring(0, 100)
                : undefined;
              break;
            case 'image':
              contentPreview = settings.image?.url;
              break;
            case 'button':
              contentPreview = settings.text;
              break;
          }

          if (contentPreview !== undefined) {
            result.contentPreview = contentPreview;
          }
        }

        return result;
      });

      return toolSuccess({
        post_id,
        total_elements: elements.length,
        elements,
      });
    } catch (error: any) {
      return toolError(`Error getting Elementor elements: ${error.message}`);
    }
  },
};
