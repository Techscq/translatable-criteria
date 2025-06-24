import type { Filter } from '../../../../../criteria/filter/filter.js';
import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';

/**
 * Handles ARRAY_EQUALS and ARRAY_EQUALS_STRICT operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleArrayEquals: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  let valueToPush: any;
  let jsonPath: string | undefined;

  if (Array.isArray(filter.value)) {
    valueToPush = JSON.stringify(filter.value);
  } else if (typeof filter.value === 'object' && filter.value !== null) {
    const key = Object.keys(filter.value)[0]!;
    jsonPath = `$.${key}`;
    valueToPush = JSON.stringify((filter.value as Record<string, any>)[key]);
  } else {
    return { condition: '1=0', params: [] };
  }

  const placeholder = generateParamPlaceholder();
  const condition = jsonPath
    ? `JSON_EXTRACT(${fieldName}, '${jsonPath}') = ${placeholder}`
    : `${fieldName} = ${placeholder}`;

  return { condition, params: [valueToPush] };
};

/**
 * Handles ARRAY_CONTAINS_ELEMENT and ARRAY_NOT_CONTAINS_ELEMENT operators.
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleArrayContainsElement: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  const isNot = filter.operator === FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT;
  const op = isNot ? 'NOT ' : '';
  let path: string | undefined;
  let elementValue: any;

  if (
    typeof filter.value === 'object' &&
    filter.value !== null &&
    !Array.isArray(filter.value)
  ) {
    const key = Object.keys(filter.value)[0]!;
    path = `$.${key}`;
    elementValue = (filter.value as Record<string, any>)[key];
  } else {
    elementValue = filter.value;
  }

  const placeholder = generateParamPlaceholder();
  const condition = path
    ? `${op}JSON_CONTAINS(${fieldName}, ${placeholder}, '${path}')`
    : `${op}JSON_CONTAINS(${fieldName}, ${placeholder}, '$')`;

  return { condition, params: [JSON.stringify(elementValue)] };
};
