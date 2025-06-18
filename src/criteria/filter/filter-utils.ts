import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from './types/filter-primitive.types.js';
import { FilterOperator, LogicalOperator } from '../types/operator.types.js';
/**
 * Utility class for normalizing filter group structures.
 * Normalization helps in simplifying complex filter groups by flattening
 * redundant nested groups and removing empty ones, leading to a more
 * canonical and easier-to-process filter structure.
 */
export class FilterNormalizer {
  static normalizeGroup<T extends string = string>(
    group: FilterGroupPrimitive<T>,
  ): FilterGroupPrimitive<T> {
    const normalizeCache = new WeakMap<
      FilterGroupPrimitive<T>,
      FilterGroupPrimitive<T>
    >();
    /**
     * Normalizes a given filter group primitive.
     * This process involves:
     * - Recursively normalizing child filter groups.
     * - Flattening nested groups if they use the same logical operator as their parent.
     * - Removing empty child groups.
     * - Simplifying groups that end up with a single item (either by lifting the item
     *   if it's a group, or by ensuring the single filter is wrapped in a group
     *   with the original logical operator).
     *
     * @template T - A string literal type representing valid field names. Defaults to `string`.
     * @param {FilterGroupPrimitive<T>} group - The filter group primitive to normalize.
     * @returns {FilterGroupPrimitive<T>} The normalized filter group primitive.
     */
    const normalizeInternal = (
      group: FilterGroupPrimitive<T>,
    ): FilterGroupPrimitive<T> => {
      const cached = normalizeCache.get(group);
      if (cached) return cached;

      if (!group.items?.length) {
        const result = {
          logicalOperator: LogicalOperator.AND, // Default to AND for empty groups
          items: [],
        };
        normalizeCache.set(group, result);
        return result;
      }

      const normalizedItems = group.items.reduce<
        Array<FilterPrimitive<T, FilterOperator> | FilterGroupPrimitive<T>>
      >((acc, item) => {
        if (!('logicalOperator' in item)) {
          acc.push(item);
          return acc;
        }

        // It's a FilterGroupPrimitive, normalize it recursively
        const normalizedChild = normalizeInternal(item);

        if (normalizedChild.items.length === 0) {
          // Skip empty child groups
          return acc;
        }

        // If child's operator is same as current's, flatten its items
        if (normalizedChild.logicalOperator === group.logicalOperator) {
          acc.push(...normalizedChild.items);
        } else {
          // Otherwise, add the normalized child group as is
          acc.push(normalizedChild);
        }

        return acc;
      }, []);

      let result: FilterGroupPrimitive<T>;

      if (normalizedItems.length === 0) {
        result = {
          // default to AND if it was truly empty from start.
          logicalOperator: LogicalOperator.AND,
          items: [],
        };
      } else if (
        normalizedItems.length === 1 &&
        normalizedItems[0] !== undefined
      ) {
        const singleItem = normalizedItems[0];
        // If the single remaining item is a group, that group becomes the result (lifting)
        if ('logicalOperator' in singleItem) {
          result = singleItem as FilterGroupPrimitive<T>;
        } else {
          // If it's a single filter, wrap it in a group with the current operator
          result = {
            logicalOperator: group.logicalOperator,
            items: [singleItem],
          };
        }
      } else {
        // Multiple items remain, form a group with the current operator
        result = {
          logicalOperator: group.logicalOperator,
          items: normalizedItems,
        };
      }

      normalizeCache.set(group, result);
      return result;
    };

    return normalizeInternal(group);
  }
}
