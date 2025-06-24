import type { Filter } from '../../../../../criteria/filter/filter.js';
import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { FilterHandler, PseudoSqlFilterOutput } from '../types.js';
import {
  getCollectionLogic,
  extractCollectionValues,
  getEmptyCollectionCondition,
} from '../utils/collection-logic.js';

/**
 * Type for the internal condition builder function used by handleCollectionContains.
 * @param negation The negation string ('NOT ' or '').
 * @param fieldName The escaped and qualified field name.
 * @param placeholder The parameter placeholder.
 * @param path Optional JSON path for JSON functions.
 * @returns The SQL condition string fragment.
 */
type InternalConditionBuilder = (
  negation: string,
  fieldName: string,
  placeholder: string,
  path?: string,
) => string;

/**
 * Handles collection-based operators (JSON_CONTAINS_ANY/ALL, ARRAY_CONTAINS_ANY/ALL, SET_CONTAINS_ANY/ALL).
 * This handler uses helper functions for logical determination and value extraction,
 * and a specific conditionBuilder for the SQL function (JSON_CONTAINS or FIND_IN_SET).
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @param conditionBuilder A function to build the specific SQL condition for each element.
 * @param isJson A boolean indicating if the collection is part of a JSON field.
 * @returns The translated SQL condition and its parameters.
 */
const handleCollectionContainsInternal = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
  conditionBuilder: InternalConditionBuilder,
  isJson: boolean,
): PseudoSqlFilterOutput => {
  const { logicalOp, isNot } = getCollectionLogic(filter.operator);
  let valuesToProcess: any[];
  let jsonPath: string | undefined;

  try {
    const extracted = extractCollectionValues(filter, isJson);
    valuesToProcess = extracted.values;
    jsonPath = extracted.jsonPath;
  } catch (error) {
    // Handle cases where filter.value is not an array or object as expected
    return { condition: '1=0', params: [] };
  }

  if (valuesToProcess.length === 0) {
    return {
      condition: getEmptyCollectionCondition(filter.operator),
      params: [],
    };
  }

  const conditions: string[] = [];
  const params: any[] = [];

  for (const val of valuesToProcess) {
    const placeholder = generateParamPlaceholder();
    params.push(isJson ? JSON.stringify(val) : val);
    conditions.push(
      conditionBuilder(isNot ? 'NOT ' : '', fieldName, placeholder, jsonPath),
    );
  }

  return { condition: `(${conditions.join(logicalOp)})`, params };
};

/**
 * Handles JSON collection operators (JSON_CONTAINS_ANY/ALL, JSON_NOT_CONTAINS_ANY/ALL).
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleJsonCollection: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  return handleCollectionContainsInternal(
    filter,
    fieldName,
    generateParamPlaceholder,
    (negation, fName, p, path) =>
      `${negation}JSON_CONTAINS(${fName}, ${p}, '${path}')`,
    true,
  );
};

/**
 * Handles Array collection operators (ARRAY_CONTAINS_ANY/ALL, ARRAY_NOT_CONTAINS_ANY/ALL).
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleArrayCollection: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  return handleCollectionContainsInternal(
    filter,
    fieldName,
    generateParamPlaceholder,
    (negation, fName, p, path) =>
      `${negation}JSON_CONTAINS(${fName}, ${p}, '${path}')`,
    true, // Arrays are treated as JSON arrays in PseudoSqlTranslator
  );
};

/**
 * Handles SET collection operators (SET_CONTAINS_ANY/ALL, SET_NOT_CONTAINS_ANY/ALL).
 * @param filter The Filter object.
 * @param fieldName The escaped and qualified field name.
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export const handleSetCollection: FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
): PseudoSqlFilterOutput => {
  return handleCollectionContainsInternal(
    filter,
    fieldName,
    generateParamPlaceholder,
    (negation, fName, p) => `${negation}FIND_IN_SET(${p}, ${fName})`,
    false,
  );
};
