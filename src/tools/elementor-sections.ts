import { z } from 'zod';
import { withElementorData, fetchElementorData, saveElementorData } from '../utils/elementor-data-ops.js';
import { findElementById, findElementParent } from '../utils/element-traversal.js';
import { generateElementId, reassignElementIds } from '../utils/id-generator.js';
import { toolSuccess, toolError } from '../types/elementor-types.js';

const createSectionSchema = z.object({
  post_id: z.coerce.number(),
  position: z.coerce.number().optional(),
  columns: z.coerce.number().default(1),
  section_settings: z.record(z.any()).optional(),
});

const createContainerSchema = z.object({
  post_id: z.coerce.number(),
  position: z.coerce.number().optional(),
  container_settings: z.record(z.any()).optional(),
});

const addColumnSchema = z.object({
  post_id: z.coerce.number(),
  section_id: z.string(),
  columns_to_add: z.coerce.number().default(1),
});

const duplicateSectionSchema = z.object({
  post_id: z.coerce.number(),
  section_id: z.string(),
  position: z.coerce.number().optional(),
});

const reorderSectionsSchema = z.object({
  post_id: z.coerce.number(),
  section_ids: z.array(z.string()),
});

export const elementorSectionsTools = [
  {
    name: "create_elementor_section",
    description: "Add a new section with N columns to an Elementor page. Sections are top-level layout containers.",
    inputSchema: {
      type: "object" as const,
      properties: createSectionSchema.shape,
    },
  },
  {
    name: "create_elementor_container",
    description: "Add a new flexbox container to an Elementor page. Containers use modern flex layout.",
    inputSchema: {
      type: "object" as const,
      properties: createContainerSchema.shape,
    },
  },
  {
    name: "add_column_to_section",
    description: "Add one or more columns to an existing section by section ID.",
    inputSchema: {
      type: "object" as const,
      properties: addColumnSchema.shape,
    },
  },
  {
    name: "duplicate_section",
    description: "Deep clone a section with all its contents, generating new IDs for all elements.",
    inputSchema: {
      type: "object" as const,
      properties: duplicateSectionSchema.shape,
    },
  },
  {
    name: "reorder_top_level_sections",
    description: "Change the order of top-level sections/containers on the page.",
    inputSchema: {
      type: "object" as const,
      properties: reorderSectionsSchema.shape,
    },
  },
];

export const elementorSectionsHandlers: Record<string, (params: any) => Promise<any>> = {
  create_elementor_section: async (params) => {
    try {
      const elements = await fetchElementorData(params.post_id);
      const sectionId = generateElementId();
      const cols = params.columns || 1;

      const columnElements = Array.from({ length: cols }, () => ({
        id: generateElementId(),
        elType: 'column' as const,
        isInner: false,
        settings: {
          _column_size: Math.floor(100 / cols),
          _inline_size: null,
        },
        elements: [],
        widgetType: undefined,
      }));

      const newSection = {
        id: sectionId,
        elType: 'section' as const,
        isInner: false,
        settings: params.section_settings || {},
        elements: columnElements,
        widgetType: undefined,
      };

      if (params.position !== undefined && params.position >= 0 && params.position < elements.length) {
        elements.splice(params.position, 0, newSection);
      } else {
        elements.push(newSection);
      }

      await saveElementorData(params.post_id, elements);

      return toolSuccess({
        section_id: sectionId,
        columns: cols,
        position: params.position ?? 'end',
      });
    } catch (error: any) {
      return toolError(`Error creating section: ${error.message}`);
    }
  },

  create_elementor_container: async (params) => {
    try {
      const elements = await fetchElementorData(params.post_id);
      const containerId = generateElementId();

      const newContainer = {
        id: containerId,
        elType: 'container' as const,
        isInner: false,
        settings: {
          content_width: 'boxed',
          flex_direction: 'column',
          ...(params.container_settings || {}),
        },
        elements: [],
        widgetType: undefined,
      };

      if (params.position !== undefined && params.position >= 0 && params.position < elements.length) {
        elements.splice(params.position, 0, newContainer);
      } else {
        elements.push(newContainer);
      }

      await saveElementorData(params.post_id, elements);

      return toolSuccess({
        container_id: containerId,
        position: params.position ?? 'end',
      });
    } catch (error: any) {
      return toolError(`Error creating container: ${error.message}`);
    }
  },

  add_column_to_section: async (params) => {
    try {
      const result = await withElementorData(params.post_id, (elements) => {
        const section = findElementById(elements, params.section_id);

        if (!section) {
          throw new Error(`Section with ID ${params.section_id} not found`);
        }

        if (section.elType !== 'section') {
          throw new Error(`Element ${params.section_id} is not a section (type: ${section.elType})`);
        }

        const columnsToAdd = params.columns_to_add || 1;

        for (let i = 0; i < columnsToAdd; i++) {
          const newColumn = {
            id: generateElementId(),
            elType: 'column' as const,
            isInner: false,
            settings: {
              _column_size: 50,
              _inline_size: null,
            },
            elements: [],
            widgetType: undefined,
          };
          section.elements.push(newColumn);
        }

        return {
          section_id: params.section_id,
          columns_added: columnsToAdd,
          total_columns: section.elements.length,
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error adding column to section: ${error.message}`);
    }
  },

  duplicate_section: async (params) => {
    try {
      const elements = await fetchElementorData(params.post_id);

      const sectionIndex = elements.findIndex((el) => el.id === params.section_id);

      if (sectionIndex === -1) {
        throw new Error(`Section with ID ${params.section_id} not found at top level`);
      }

      const originalSection = elements[sectionIndex];

      // Deep copy
      const duplicatedSection = JSON.parse(JSON.stringify(originalSection));

      // Reassign all IDs
      reassignElementIds(duplicatedSection);

      // Determine insertion position
      const insertPosition = params.position !== undefined ? params.position : sectionIndex + 1;

      elements.splice(insertPosition, 0, duplicatedSection);

      await saveElementorData(params.post_id, elements);

      return toolSuccess({
        original_section_id: params.section_id,
        new_section_id: duplicatedSection.id,
        position: insertPosition,
      });
    } catch (error: any) {
      return toolError(`Error duplicating section: ${error.message}`);
    }
  },

  reorder_top_level_sections: async (params) => {
    try {
      const elements = await fetchElementorData(params.post_id);

      // Validate all provided IDs exist at top level
      const topLevelIds = new Set(elements.map((el) => el.id));
      const missingIds = params.section_ids.filter((id: string) => !topLevelIds.has(id));

      if (missingIds.length > 0) {
        throw new Error(`Section IDs not found: ${missingIds.join(', ')}`);
      }

      // Create map for quick lookup
      const elementMap = new Map(elements.map((el) => [el.id, el]));

      // Build new array: first add in specified order
      const reordered = params.section_ids.map((id: string) => elementMap.get(id)!);

      // Then append any elements not mentioned
      const mentionedIds = new Set(params.section_ids);
      const remaining = elements.filter((el) => !mentionedIds.has(el.id));

      reordered.push(...remaining);

      await saveElementorData(params.post_id, reordered);

      return toolSuccess({
        reordered_count: params.section_ids.length,
        total_elements: reordered.length,
        new_order: reordered.map((el: any) => el.id),
      });
    } catch (error: any) {
      return toolError(`Error reordering sections: ${error.message}`);
    }
  },
};
