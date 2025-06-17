import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from './types/filter-primitive.types.js';
import { FilterOperator, LogicalOperator } from '../types/operator.types.js';

export class FilterNormalizer {
  static normalizeGroup<T extends string = string>(
    group: FilterGroupPrimitive<T>,
  ): FilterGroupPrimitive<T> {
    const normalizeCache = new WeakMap<
      FilterGroupPrimitive<T>,
      FilterGroupPrimitive<T>
    >();

    const normalizeInternal = (
      current: FilterGroupPrimitive<T>,
    ): FilterGroupPrimitive<T> => {
      const cached = normalizeCache.get(current);
      if (cached) return cached;

      if (!current.items?.length) {
        const result = {
          logicalOperator: LogicalOperator.AND, // Default to AND for empty groups
          items: [],
        };
        normalizeCache.set(current, result);
        return result;
      }

      const normalizedItems = current.items.reduce<
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
        if (normalizedChild.logicalOperator === current.logicalOperator) {
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
            logicalOperator: current.logicalOperator,
            items: [singleItem],
          };
        }
      } else {
        // Multiple items remain, form a group with the current operator
        result = {
          logicalOperator: current.logicalOperator,
          items: normalizedItems,
        };
      }

      normalizeCache.set(current, result);
      return result;
    };

    return normalizeInternal(group);
  }
}
