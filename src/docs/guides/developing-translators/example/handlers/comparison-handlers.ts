import type { Filter } from '../../../../../criteria/filter/filter.js';
import type { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';

/**
 * Handles simple comparison operators (EQUALS, NOT_EQUALS, GREATER_THAN, etc.).
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleSimpleComparison: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  const placeholder = generateParamPlaceholder();
  return {
    condition: `${fieldName} ${filter.operator} ${placeholder}`,
    params: [filter.value],
  };
};
