import type { Filter } from '../../../../../criteria/filter/filter.js';
import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';

/**
 * Handles LIKE-based operators (LIKE, NOT_LIKE, CONTAINS, STARTS_WITH, ENDS_WITH, ILIKE, NOT_ILIKE).
 * Applies appropriate wildcards and negation.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleLikeOperator: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  let val = String(filter.value);
  const isNot =
    filter.operator === FilterOperator.NOT_LIKE ||
    filter.operator === FilterOperator.NOT_CONTAINS ||
    filter.operator === FilterOperator.NOT_ILIKE;
  const op = isNot ? 'NOT LIKE' : 'LIKE';

  if (
    filter.operator === FilterOperator.CONTAINS ||
    filter.operator === FilterOperator.NOT_CONTAINS
  ) {
    val = `%${val}%`;
  } else if (filter.operator === FilterOperator.STARTS_WITH) {
    val = `${val}%`;
  } else if (filter.operator === FilterOperator.ENDS_WITH) {
    val = `%${val}`;
  }

  const placeholder = generateParamPlaceholder();
  return {
    condition: `${fieldName} ${op} ${placeholder}`,
    params: [val],
  };
};
