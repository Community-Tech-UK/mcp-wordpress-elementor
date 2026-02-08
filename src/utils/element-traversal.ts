import { ElementorElement } from '../types/elementor-types.js';

/** Generic depth-first visitor. Return true from visitor to stop early. */
export function traverseElements(
  elements: ElementorElement[],
  visitor: (element: ElementorElement, depth: number) => boolean | void,
  depth: number = 0
): boolean {
  for (const element of elements) {
    if (visitor(element, depth) === true) return true;
    if (element.elements?.length > 0) {
      if (traverseElements(element.elements, visitor, depth + 1)) return true;
    }
  }
  return false;
}

/** Find a single element by ID. */
export function findElementById(
  elements: ElementorElement[],
  id: string
): ElementorElement | undefined {
  let found: ElementorElement | undefined;
  traverseElements(elements, (el) => {
    if (el.id === id) {
      found = el;
      return true;
    }
  });
  return found;
}

/** Find the parent of an element and its index within the parent's elements array. */
export function findElementParent(
  elements: ElementorElement[],
  id: string
): { parent: ElementorElement | null; index: number } | undefined {
  // Check top-level first
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === id) return { parent: null, index: i };
  }
  let result: { parent: ElementorElement; index: number } | undefined;
  traverseElements(elements, (el) => {
    if (!el.elements) return;
    const idx = el.elements.findIndex((child) => child.id === id);
    if (idx !== -1) {
      result = { parent: el, index: idx };
      return true;
    }
  });
  return result;
}

/** Collect all elements matching a predicate. */
export function filterElements(
  elements: ElementorElement[],
  predicate: (el: ElementorElement) => boolean
): ElementorElement[] {
  const results: ElementorElement[] = [];
  traverseElements(elements, (el) => {
    if (predicate(el)) results.push(el);
  });
  return results;
}

/** Find all widgets of a specific type. */
export function findWidgetsByType(
  elements: ElementorElement[],
  widgetType: string
): ElementorElement[] {
  return filterElements(
    elements,
    (el) => el.elType === 'widget' && el.widgetType === widgetType
  );
}

/** Flatten element tree into a flat array with depth tracking. */
export function flattenElements(
  elements: ElementorElement[]
): Array<{ element: ElementorElement; depth: number }> {
  const results: Array<{ element: ElementorElement; depth: number }> = [];
  traverseElements(elements, (el, depth) => {
    results.push({ element: el, depth });
  });
  return results;
}
