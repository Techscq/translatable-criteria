import type { Filter } from '../../../../../criteria/filter/filter.js';
import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';

/**
 * Handles IN and NOT_IN operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleInOperator: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  const values = filter.value as any[];
  if (!Array.isArray(values) || values.length === 0) {
    return {
      condition: filter.operator === FilterOperator.IN ? '1=0' : '1=1',
      params: [],
    };
  }
  const placeholders = values.map(() => generateParamPlaceholder()).join(', ');
  return {
    condition: `${fieldName} ${filter.operator} (${placeholders})`,
    params: values,
  };
};

/**
 * Handles IS_NULL and IS_NOT_NULL operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @returns The translated SQL condition and its parameters.
 */
export const handleNullOperator: FilterHandler = (
  _filter: Filter<string, FilterOperator>,
  fieldName: string,
): PseudoSqlFilterOutput => {
  const isNotNull = _filter.operator === FilterOperator.IS_NOT_NULL;
  return {
    condition: `${fieldName} IS ${isNotNull ? 'NOT ' : ''}NULL`,
    params: [],
  };
};

/**
 * Handles BETWEEN and NOT_BETWEEN operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleBetweenOperator: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  const [min, max] = filter.value as [any, any];
  const minPlaceholder = generateParamPlaceholder();
  const maxPlaceholder = generateParamPlaceholder();
  return {
    condition: `${fieldName} ${filter.operator} ${minPlaceholder} AND ${maxPlaceholder}`,
    params: [min, max],
  };
};

/**
 * Handles MATCHES_REGEX operator.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleMatchesRegex: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  const placeholder = generateParamPlaceholder();
  return {
    condition: `${fieldName} REGEXP ${placeholder}`,
    params: [filter.value],
  };
};
