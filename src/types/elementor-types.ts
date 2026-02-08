import { z } from 'zod';

// ── Core Elementor element schema ──

export const ElementorSettingsSchema = z.record(z.any());

export const ElementorElementSchema: z.ZodType<ElementorElement> = z.lazy(
  () =>
    z.object({
      id: z.string(),
      elType: z.enum(['section', 'column', 'widget', 'container']),
      widgetType: z.string().optional(),
      isInner: z.boolean().optional(),
      settings: ElementorSettingsSchema,
      elements: z.array(ElementorElementSchema),
    })
);

export type ElementorElement = {
  id: string;
  elType: 'section' | 'column' | 'widget' | 'container';
  widgetType?: string;
  isInner?: boolean;
  settings: Record<string, any>;
  elements: ElementorElement[];
};

export type ElementorData = ElementorElement[];

// ── Tool result helpers ──

export interface ToolResult {
  toolResult: {
    content: { type: string; text: string }[];
    isError?: boolean;
  };
}

export function toolSuccess(data: any): ToolResult {
  return {
    toolResult: {
      content: [
        { type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) },
      ],
    },
  };
}

export function toolError(message: string): ToolResult {
  return {
    toolResult: {
      isError: true,
      content: [{ type: 'text', text: message }],
    },
  };
}
