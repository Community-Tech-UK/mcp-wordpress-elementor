import { ElementorElement } from '../types/elementor-types.js';

/** Generate a single 8-character alphanumeric ID matching Elementor's format. */
export function generateElementId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/** Recursively regenerate all IDs in an element tree (for cloning). */
export function reassignElementIds(element: ElementorElement): ElementorElement {
  const clone = { ...element, id: generateElementId() };
  if (clone.elements?.length > 0) {
    clone.elements = clone.elements.map((child) => reassignElementIds(child));
  }
  return clone;
}
