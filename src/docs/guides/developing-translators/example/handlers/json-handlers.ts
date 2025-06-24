import type { Filter } from '../../../../../criteria/filter/filter.js';
import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';

/**
 * Handles JSON_PATH_VALUE_EQUALS and JSON_PATH_VALUE_NOT_EQUALS operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleJsonPathValueEquals: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  if (typeof filter.value !== 'object' || filter.value === null) {
    return { condition: '1=0', params: [] };
  }
  const op =
    filter.operator === FilterOperator.JSON_PATH_VALUE_EQUALS ? '=' : '!=';
  const conditions: string[] = [];
  const params: any[] = [];

  for (const path in filter.value) {
    const pathValue = (filter.value as Record<string, any>)[path];
    const placeholder = generateParamPlaceholder();
    params.push(pathValue);
    conditions.push(
      `JSON_EXTRACT(${fieldName}, '$.${path}') ${op} ${placeholder}`,
    );
  }
  return { condition: conditions.join(' AND '), params };
};

/**
 * Handles JSON_CONTAINS and JSON_NOT_CONTAINS operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleJsonContains: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  if (typeof filter.value !== 'object' || filter.value === null) {
    return { condition: '1=0', params: [] };
  }
  const op = filter.operator === FilterOperator.JSON_CONTAINS ? '' : 'NOT ';
  const conditions: string[] = [];
  const params: any[] = [];

  for (const path in filter.value) {
    const jsonValue = (filter.value as Record<string, any>)[path];
    const placeholder = generateParamPlaceholder();
    params.push(JSON.stringify(jsonValue));
    conditions.push(
      `${op}JSON_CONTAINS(${fieldName}, ${placeholder}, '$.${path}')`,
    );
  }
  return { condition: conditions.join(' AND '), params };
};
