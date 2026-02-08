import { z } from 'zod';
import { withElementorData, fetchElementorData } from '../utils/elementor-data-ops.js';
import { findElementById, findElementParent } from '../utils/element-traversal.js';
import { generateElementId, reassignElementIds } from '../utils/id-generator.js';
import { setWidgetContent, getWidgetContent, getWidgetContentField } from '../utils/widget-content-mapper.js';
import { toolSuccess, toolError } from '../types/elementor-types.js';
import type { ElementorElement } from '../types/elementor-types.js';

// Schema definitions
const addWidgetToSectionSchema = z.object({
  post_id: z.number(),
  section_id: z.string().optional(),
  column_id: z.string().optional(),
  widget_type: z.string(),
  widget_settings: z.record(z.any()).optional(),
  position: z.number().optional(),
});

const insertWidgetAtPositionSchema = z.object({
  post_id: z.number(),
  widget_type: z.string(),
  widget_settings: z.record(z.any()).optional(),
  target_element_id: z.string(),
  insert_position: z.enum(['before', 'after', 'inside']).optional(),
});

const cloneWidgetSchema = z.object({
  post_id: z.number(),
  widget_id: z.string(),
  target_element_id: z.string().optional(),
  insert_position: z.enum(['before', 'after']).optional(),
});

const moveWidgetSchema = z.object({
  post_id: z.number(),
  widget_id: z.string(),
  target_section_id: z.string().optional(),
  target_column_id: z.string().optional(),
  position: z.number().optional(),
});

const updateWidgetSchema = z.object({
  post_id: z.number(),
  widget_id: z.string(),
  widget_settings: z.record(z.any()).optional(),
  widget_content: z.string().optional(),
});

const getWidgetSchema = z.object({
  post_id: z.number(),
  widget_id: z.string(),
});

const updateSectionSchema = z.object({
  post_id: z.number(),
  section_id: z.string(),
  widgets_updates: z.array(z.object({
    widget_id: z.string(),
    widget_settings: z.record(z.any()).optional(),
    widget_content: z.string().optional(),
  })),
});

const getWidgetContentSchema = z.object({
  post_id: z.number(),
  widget_id: z.string(),
});

// Helper functions
function findContainer(elements: ElementorElement[], containerId: string): ElementorElement | null {
  for (const el of elements) {
    if (el.id === containerId) {
      return el;
    }
    if (el.elements && el.elements.length > 0) {
      const found = findContainer(el.elements, containerId);
      if (found) return found;
    }
  }
  return null;
}

function findFirstAvailableColumn(elements: ElementorElement[]): ElementorElement | null {
  for (const el of elements) {
    if (el.elType === 'column') {
      return el;
    }
    if (el.elType === 'section' && el.elements && el.elements.length > 0) {
      const col = el.elements.find((e: ElementorElement) => e.elType === 'column');
      if (col) return col;
    }
    if (el.elType === 'container') {
      return el;
    }
    if (el.elements && el.elements.length > 0) {
      const found = findFirstAvailableColumn(el.elements);
      if (found) return found;
    }
  }
  return null;
}

function deepClone(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

function findElementInSubtree(element: ElementorElement, targetId: string): ElementorElement | null {
  if (element.id === targetId) {
    return element;
  }
  if (element.elements && element.elements.length > 0) {
    for (const child of element.elements) {
      const found = findElementInSubtree(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

function removeElementFromTree(elements: ElementorElement[], elementId: string): ElementorElement | null {
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === elementId) {
      const removed = elements.splice(i, 1)[0];
      return removed;
    }
    if (elements[i].elements && elements[i].elements.length > 0) {
      const removed = removeElementFromTree(elements[i].elements, elementId);
      if (removed) return removed;
    }
  }
  return null;
}

// Tool definitions
export const elementorWidgetsTools = [
  {
    name: 'add_widget_to_section',
    description: 'Insert a widget into a section, container, or column. If column_id is provided, adds to that column. If section_id is provided, adds to container directly or first column of section. If neither provided, adds to first available column or container.',
    inputSchema: {
      type: 'object' as const,
      properties: addWidgetToSectionSchema.shape,
      required: ['post_id', 'widget_type'],
    },
  },
  {
    name: 'insert_widget_at_position',
    description: 'Add a widget before, after, or inside a specific element. Use target_element_id to specify the reference element and insert_position (before/after/inside) to control placement.',
    inputSchema: {
      type: 'object' as const,
      properties: insertWidgetAtPositionSchema.shape,
      required: ['post_id', 'widget_type', 'target_element_id'],
    },
  },
  {
    name: 'clone_widget',
    description: 'Duplicate a widget with new IDs. Optionally specify target_element_id and insert_position (before/after) for placement. If not specified, adds after the original widget.',
    inputSchema: {
      type: 'object' as const,
      properties: cloneWidgetSchema.shape,
      required: ['post_id', 'widget_id'],
    },
  },
  {
    name: 'move_widget',
    description: 'Relocate a widget between containers. Removes widget from current location and inserts into target container (column_id, section_id, or first available).',
    inputSchema: {
      type: 'object' as const,
      properties: moveWidgetSchema.shape,
      required: ['post_id', 'widget_id'],
    },
  },
  {
    name: 'update_elementor_widget',
    description: 'Modify widget settings and/or content. Use widget_settings to update any widget property. Use widget_content to update the main text/html content field.',
    inputSchema: {
      type: 'object' as const,
      properties: updateWidgetSchema.shape,
      required: ['post_id', 'widget_id'],
    },
  },
  {
    name: 'get_elementor_widget',
    description: 'Fetch a single widget by ID and return its full object including settings, type, and nested elements.',
    inputSchema: {
      type: 'object' as const,
      properties: getWidgetSchema.shape,
      required: ['post_id', 'widget_id'],
    },
  },
  {
    name: 'update_elementor_section',
    description: 'Batch update multiple widgets within a section. Provide an array of widget updates with widget_id and settings/content changes.',
    inputSchema: {
      type: 'object' as const,
      properties: updateSectionSchema.shape,
      required: ['post_id', 'section_id', 'widgets_updates'],
    },
  },
  {
    name: 'get_widget_content',
    description: 'Extract the main text/html content from a widget. Returns the content, widget type, and the field name used.',
    inputSchema: {
      type: 'object' as const,
      properties: getWidgetContentSchema.shape,
      required: ['post_id', 'widget_id'],
    },
  },
];

// Handler implementations
export const elementorWidgetsHandlers: Record<string, (params: any) => Promise<any>> = {
  add_widget_to_section: async (params) => {
    try {
      const { post_id, section_id, column_id, widget_type, widget_settings, position } = params;

      const result = await withElementorData(post_id, (elements) => {
        const newWidget: ElementorElement = {
          id: generateElementId(),
          elType: 'widget',
          widgetType: widget_type,
          isInner: false,
          settings: widget_settings || {},
          elements: [],
        };

        let targetContainer: ElementorElement | null = null;

        if (column_id) {
          targetContainer = findContainer(elements, column_id);
          if (!targetContainer) {
            throw new Error(`Column with ID ${column_id} not found`);
          }
        } else if (section_id) {
          targetContainer = findContainer(elements, section_id);
          if (!targetContainer) {
            throw new Error(`Section with ID ${section_id} not found`);
          }

          // If it's a section, add to first column
          if (targetContainer.elType === 'section') {
            const firstColumn = targetContainer.elements?.find((e: ElementorElement) => e.elType === 'column');
            if (!firstColumn) {
              throw new Error(`No column found in section ${section_id}`);
            }
            targetContainer = firstColumn;
          }
        } else {
          targetContainer = findFirstAvailableColumn(elements);
          if (!targetContainer) {
            throw new Error('No suitable container found. Please provide section_id or column_id.');
          }
        }

        if (!targetContainer.elements) {
          targetContainer.elements = [];
        }

        if (position !== undefined && position >= 0 && position <= targetContainer.elements.length) {
          targetContainer.elements.splice(position, 0, newWidget);
        } else {
          targetContainer.elements.push(newWidget);
        }

        return {
          widget_id: newWidget.id,
          widget_type: newWidget.widgetType,
          container_id: targetContainer.id,
          position: targetContainer.elements.indexOf(newWidget),
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error adding widget: ${error.message}`);
    }
  },

  insert_widget_at_position: async (params) => {
    try {
      const { post_id, widget_type, widget_settings, target_element_id, insert_position = 'after' } = params;

      const result = await withElementorData(post_id, (elements) => {
        const newWidget: ElementorElement = {
          id: generateElementId(),
          elType: 'widget',
          widgetType: widget_type,
          isInner: false,
          settings: widget_settings || {},
          elements: [],
        };

        const target = findElementById(elements, target_element_id);
        if (!target) {
          throw new Error(`Target element ${target_element_id} not found`);
        }

        if (insert_position === 'inside') {
          if (!target.elements) {
            target.elements = [];
          }
          target.elements.push(newWidget);
          return {
            widget_id: newWidget.id,
            inserted_position: 'inside',
            parent_id: target.id,
          };
        }

        const parentInfo = findElementParent(elements, target_element_id);
        if (!parentInfo || parentInfo.parent === null) {
          // Target is at root level
          const index = elements.findIndex((e: ElementorElement) => e.id === target_element_id);
          if (index === -1) {
            throw new Error('Could not find target element at root level');
          }
          const insertIndex = insert_position === 'before' ? index : index + 1;
          elements.splice(insertIndex, 0, newWidget);
          return {
            widget_id: newWidget.id,
            inserted_position: insert_position,
            target_id: target_element_id,
          };
        }

        const parent = parentInfo.parent;
        const index = parent.elements.findIndex((e: ElementorElement) => e.id === target_element_id);
        if (index === -1) {
          throw new Error('Target not found in parent elements');
        }
        const insertIndex = insert_position === 'before' ? index : index + 1;
        parent.elements.splice(insertIndex, 0, newWidget);

        return {
          widget_id: newWidget.id,
          inserted_position: insert_position,
          target_id: target_element_id,
          parent_id: parent.id,
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error inserting widget: ${error.message}`);
    }
  },

  clone_widget: async (params) => {
    try {
      const { post_id, widget_id, target_element_id, insert_position = 'after' } = params;

      const result = await withElementorData(post_id, (elements) => {
        const originalWidget = findElementById(elements, widget_id);
        if (!originalWidget) {
          throw new Error(`Widget ${widget_id} not found`);
        }

        const clonedWidget = deepClone(originalWidget);
        reassignElementIds(clonedWidget);

        if (target_element_id) {
          const target = findElementById(elements, target_element_id);
          if (!target) {
            throw new Error(`Target element ${target_element_id} not found`);
          }

          const parentInfo = findElementParent(elements, target_element_id);
          if (!parentInfo || parentInfo.parent === null) {
            const index = elements.findIndex((e: ElementorElement) => e.id === target_element_id);
            const insertIndex = insert_position === 'before' ? index : index + 1;
            elements.splice(insertIndex, 0, clonedWidget);
          } else {
            const index = parentInfo.parent.elements.findIndex((e: ElementorElement) => e.id === target_element_id);
            const insertIndex = insert_position === 'before' ? index : index + 1;
            parentInfo.parent.elements.splice(insertIndex, 0, clonedWidget);
          }
        } else {
          // Add after original
          const parentInfo = findElementParent(elements, widget_id);
          if (!parentInfo || parentInfo.parent === null) {
            const index = elements.findIndex((e: ElementorElement) => e.id === widget_id);
            elements.splice(index + 1, 0, clonedWidget);
          } else {
            const index = parentInfo.parent.elements.findIndex((e: ElementorElement) => e.id === widget_id);
            parentInfo.parent.elements.splice(index + 1, 0, clonedWidget);
          }
        }

        return {
          original_widget_id: widget_id,
          cloned_widget_id: clonedWidget.id,
          widget_type: clonedWidget.widgetType,
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error cloning widget: ${error.message}`);
    }
  },

  move_widget: async (params) => {
    try {
      const { post_id, widget_id, target_section_id, target_column_id, position } = params;

      const result = await withElementorData(post_id, (elements) => {
        // Remove widget from current location
        const widget = removeElementFromTree(elements, widget_id);
        if (!widget) {
          throw new Error(`Widget ${widget_id} not found`);
        }

        // Find target container
        let targetContainer: ElementorElement | null = null;

        if (target_column_id) {
          targetContainer = findContainer(elements, target_column_id);
          if (!targetContainer) {
            throw new Error(`Column with ID ${target_column_id} not found`);
          }
        } else if (target_section_id) {
          targetContainer = findContainer(elements, target_section_id);
          if (!targetContainer) {
            throw new Error(`Section with ID ${target_section_id} not found`);
          }

          if (targetContainer.elType === 'section') {
            const firstColumn = targetContainer.elements?.find((e: ElementorElement) => e.elType === 'column');
            if (!firstColumn) {
              throw new Error(`No column found in section ${target_section_id}`);
            }
            targetContainer = firstColumn;
          }
        } else {
          targetContainer = findFirstAvailableColumn(elements);
          if (!targetContainer) {
            throw new Error('No suitable container found. Please provide target_section_id or target_column_id.');
          }
        }

        if (!targetContainer.elements) {
          targetContainer.elements = [];
        }

        if (position !== undefined && position >= 0 && position <= targetContainer.elements.length) {
          targetContainer.elements.splice(position, 0, widget);
        } else {
          targetContainer.elements.push(widget);
        }

        return {
          widget_id: widget.id,
          moved_to_container: targetContainer.id,
          new_position: targetContainer.elements.indexOf(widget),
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error moving widget: ${error.message}`);
    }
  },

  update_elementor_widget: async (params) => {
    try {
      const { post_id, widget_id, widget_settings, widget_content } = params;

      const result = await withElementorData(post_id, (elements) => {
        const widget = findElementById(elements, widget_id);
        if (!widget) {
          throw new Error(`Widget ${widget_id} not found`);
        }

        if (widget_settings) {
          widget.settings = { ...widget.settings, ...widget_settings };
        }

        if (widget_content !== undefined) {
          const contentSet = setWidgetContent(widget, widget_content);
          if (!contentSet) {
            // Try common fallbacks
            const widgetType = widget.widgetType || '';
            if (widgetType === 'html') {
              widget.settings.html = widget_content;
            } else if (widgetType === 'text-editor') {
              widget.settings.editor = widget_content;
            } else if (widgetType === 'heading') {
              widget.settings.title = widget_content;
            } else {
              throw new Error(`Unable to set content for widget type: ${widgetType}. Use widget_settings instead.`);
            }
          }
        }

        return {
          widget_id: widget.id,
          widget_type: widget.widgetType,
          updated_settings: widget_settings ? Object.keys(widget_settings) : [],
          updated_content: widget_content !== undefined,
        };
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error updating widget: ${error.message}`);
    }
  },

  get_elementor_widget: async (params) => {
    try {
      const { post_id, widget_id } = params;

      const data = await fetchElementorData(post_id);
      const widget = findElementById(data, widget_id);

      if (!widget) {
        throw new Error(`Widget ${widget_id} not found`);
      }

      return toolSuccess(widget);
    } catch (error: any) {
      return toolError(`Error fetching widget: ${error.message}`);
    }
  },

  update_elementor_section: async (params) => {
    try {
      const { post_id, section_id, widgets_updates } = params;

      const result = await withElementorData(post_id, (elements) => {
        const section = findElementById(elements, section_id);
        if (!section) {
          throw new Error(`Section ${section_id} not found`);
        }

        const results = {
          updated: [] as string[],
          not_found: [] as string[],
        };

        for (const update of widgets_updates) {
          const widget = findElementInSubtree(section, update.widget_id);
          if (!widget) {
            results.not_found.push(update.widget_id);
            continue;
          }

          if (update.widget_settings) {
            widget.settings = { ...widget.settings, ...update.widget_settings };
          }

          if (update.widget_content !== undefined) {
            const contentSet = setWidgetContent(widget, update.widget_content);
            if (!contentSet) {
              const widgetType = widget.widgetType || '';
              if (widgetType === 'html') {
                widget.settings.html = update.widget_content;
              } else if (widgetType === 'text-editor') {
                widget.settings.editor = update.widget_content;
              } else if (widgetType === 'heading') {
                widget.settings.title = update.widget_content;
              }
            }
          }

          results.updated.push(update.widget_id);
        }

        return results;
      });
      return toolSuccess(result);
    } catch (error: any) {
      return toolError(`Error updating section widgets: ${error.message}`);
    }
  },

  get_widget_content: async (params) => {
    try {
      const { post_id, widget_id } = params;

      const data = await fetchElementorData(post_id);
      const widget = findElementById(data, widget_id);

      if (!widget) {
        throw new Error(`Widget ${widget_id} not found`);
      }

      const content = getWidgetContent(widget);
      const field = getWidgetContentField(widget.widgetType || '');

      return toolSuccess({
        widget_id: widget.id,
        widget_type: widget.widgetType,
        content_field: field,
        content: content,
      });
    } catch (error: any) {
      return toolError(`Error getting widget content: ${error.message}`);
    }
  },
};
