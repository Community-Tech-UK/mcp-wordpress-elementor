import { z } from 'zod';
import { withElementorData, fetchElementorData } from '../utils/elementor-data-ops.js';
import { findElementById, findElementParent, filterElements } from '../utils/element-traversal.js';
import { toolSuccess, toolError } from '../types/elementor-types.js';

const deleteElementSchema = z.object({
  post_id: z.number(),
  element_id: z.string(),
});

const reorderElementsSchema = z.object({
  post_id: z.number(),
  container_id: z.string(),
  element_ids: z.array(z.string()),
});

const copySettingsSchema = z.object({
  post_id: z.number(),
  source_element_id: z.string(),
  target_element_id: z.string(),
  settings_to_copy: z.array(z.string()).optional(),
});

const findByTypeSchema = z.object({
  post_id: z.number(),
  widget_type: z.string(),
  include_settings: z.boolean().default(false),
});

export const elementorElementsTools = [
  {
    name: "delete_elementor_element",
    description: "Remove any element by ID (widget, column, section, or container). Recursively searches all nesting levels.",
    inputSchema: {
      type: "object" as const,
      properties: deleteElementSchema.shape,
    },
  },
  {
    name: "reorder_elements",
    description: "Reorder child elements within a container (section, column, or container element).",
    inputSchema: {
      type: "object" as const,
      properties: reorderElementsSchema.shape,
    },
  },
  {
    name: "copy_element_settings",
    description: "Clone settings from one element to another. Optionally specify which settings to copy.",
    inputSchema: {
      type: "object" as const,
      properties: copySettingsSchema.shape,
    },
  },
  {
    name: "find_elements_by_type",
    description: "Search for all elements matching a specific widget type (e.g., 'heading', 'image', 'button').",
    inputSchema: {
      type: "object" as const,
      properties: findByTypeSchema.shape,
    },
  },
];

export const elementorElementsHandlers: Record<string, (params: any) => Promise<any>> = {
  delete_elementor_element: async (params) => {
    try {
      const result = await withElementorData(params.post_id, (elements) => {
        const element = findElementById(elements, params.element_id);
        if (!element) {
          throw new Error(`Element with ID ${params.element_id} not found`);
        }

        const parentInfo = findElementParent(elements, params.element_id);

        if (!parentInfo || parentInfo.parent === null) {
          // Element is at top level
          const index = elements.findIndex((el) => el.id === params.element_id);
          if (index === -1) {
            throw new Error(`Element ${params.element_id} not found at top level`);
          }
          elements.splice(index, 1);
        } else {
          // Element is nested
          const index = parentInfo.parent.elements.findIndex((el) => el.id === params.element_id);
          if (index === -1) {
            throw new Error(`Element ${params.element_id} not found in parent`);
          }
          parentInfo.parent.elements.splice(index, 1);
        }

        return {
          deleted_element_id: params.element_id,
          element_type: element.elType,
          widget_type: element.widgetType || null,
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error deleting element: ${error.message}`);
    }
  },

  reorder_elements: async (params) => {
    try {
      const result = await withElementorData(params.post_id, (elements) => {
        const container = findElementById(elements, params.container_id);

        if (!container) {
          throw new Error(`Container with ID ${params.container_id} not found`);
        }

        if (!container.elements || !Array.isArray(container.elements)) {
          throw new Error(`Element ${params.container_id} does not contain child elements`);
        }

        // Create map for quick lookup
        const elementMap = new Map(container.elements.map((el) => [el.id, el]));

        // Validate all provided IDs exist
        const missingIds = params.element_ids.filter((id: string) => !elementMap.has(id));
        if (missingIds.length > 0) {
          throw new Error(`Element IDs not found in container: ${missingIds.join(', ')}`);
        }

        // Build new array: first add in specified order
        const reordered = params.element_ids.map((id: string) => elementMap.get(id)!);

        // Then append any elements not mentioned
        const mentionedIds = new Set(params.element_ids);
        const remaining = container.elements.filter((el) => !mentionedIds.has(el.id));

        reordered.push(...remaining);

        container.elements = reordered;

        return {
          container_id: params.container_id,
          reordered_count: params.element_ids.length,
          total_elements: reordered.length,
          new_order: reordered.map((el: any) => el.id),
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error reordering elements: ${error.message}`);
    }
  },

  copy_element_settings: async (params) => {
    try {
      const result = await withElementorData(params.post_id, (elements) => {
        const sourceElement = findElementById(elements, params.source_element_id);
        const targetElement = findElementById(elements, params.target_element_id);

        if (!sourceElement) {
          throw new Error(`Source element with ID ${params.source_element_id} not found`);
        }

        if (!targetElement) {
          throw new Error(`Target element with ID ${params.target_element_id} not found`);
        }

        let copiedSettings: string[];

        if (params.settings_to_copy && params.settings_to_copy.length > 0) {
          // Copy only specified settings
          copiedSettings = [];
          for (const key of params.settings_to_copy) {
            if (key in sourceElement.settings) {
              // Deep copy via JSON
              targetElement.settings[key] = JSON.parse(JSON.stringify(sourceElement.settings[key]));
              copiedSettings.push(key);
            }
          }
        } else {
          // Copy all settings
          targetElement.settings = JSON.parse(JSON.stringify(sourceElement.settings));
          copiedSettings = Object.keys(sourceElement.settings);
        }

        return {
          source_element_id: params.source_element_id,
          target_element_id: params.target_element_id,
          copied_settings: copiedSettings,
          total_copied: copiedSettings.length,
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error copying element settings: ${error.message}`);
    }
  },

  find_elements_by_type: async (params) => {
    try {
      const elements = await fetchElementorData(params.post_id);

      const matches = filterElements(
        elements,
        (el) => el.widgetType === params.widget_type
      );

      const results = matches.map((el) => {
        const result: any = {
          id: el.id,
          widgetType: el.widgetType,
        };

        if (params.include_settings) {
          result.settings = el.settings;
        }

        return result;
      });

      return toolSuccess({
        widget_type: params.widget_type,
        found_count: results.length,
        elements: results,
      });
    } catch (error: any) {
      return toolError(`Error finding elements by type: ${error.message}`);
    }
  },
};
