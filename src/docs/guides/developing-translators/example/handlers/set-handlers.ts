import type { Filter } from '../../../../../criteria/filter/filter.js';
import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';

/**
 * Handles SET_CONTAINS and SET_NOT_CONTAINS operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleSetContains: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  const isNot = filter.operator === FilterOperator.SET_NOT_CONTAINS;
  const op = isNot ? 'NOT ' : '';
  const placeholder = generateParamPlaceholder();
  return {
    condition: `${op}FIND_IN_SET(${placeholder}, ${fieldName})`,
    params: [filter.value],
  };
};
