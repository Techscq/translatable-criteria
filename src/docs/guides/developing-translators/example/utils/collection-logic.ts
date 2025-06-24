import { FilterOperator } from '../../../../../criteria/types/operator.types.js';
import type { Filter } from '../../../../../criteria/filter/filter.js';
import type { CollectionLogic, ExtractedCollectionValues } from '../types.js';

/**
 * Determines the logical operator and negation status for collection-based filter operators.
 * Applies De Morgan's laws for NOT_CONTAINS_ANY and NOT_CONTAINS_ALL.
 * @param operator The FilterOperator to analyze.
 * @returns An object containing the logical operator (' OR ' | ' AND ') and a boolean indicating negation.
 */
export function getCollectionLogic(operator: FilterOperator): CollectionLogic {
  switch (operator) {
    case FilterOperator.JSON_CONTAINS_ANY:
    case FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT:
    case FilterOperator.SET_CONTAINS_ANY:
      return { logicalOp: ' OR ', isNot: false };
    case FilterOperator.JSON_CONTAINS_ALL:
    case FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS:
    case FilterOperator.SET_CONTAINS_ALL:
      return { logicalOp: ' AND ', isNot: false };
    case FilterOperator.JSON_NOT_CONTAINS_ANY: // NOT (A OR B) => NOT A AND NOT B
    case FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT:
    case FilterOperator.SET_NOT_CONTAINS_ANY:
      return { logicalOp: ' AND ', isNot: true };
    case FilterOperator.JSON_NOT_CONTAINS_ALL: // NOT (A AND B) => NOT A OR NOT B
    case FilterOperator.ARRAY_NOT_CONTAINS_ALL_ELEMENTS:
    case FilterOperator.SET_NOT_CONTAINS_ALL:
      return { logicalOp: ' OR ', isNot: true };
    default:
      throw new Error(`Unsupported collection operator: ${operator}`);
  }
}

/**
 * Extracts the values and potential JSON path from a filter's value for collection operators.
 * @param filter The Filter object.
 * @param isJson A boolean indicating if the collection is part of a JSON field.
 * @returns An object containing the array of values to process and an optional JSON path.
 */
export function extractCollectionValues(
  filter: Filter<string, FilterOperator>,
  isJson: boolean,
): ExtractedCollectionValues {
  if (Array.isArray(filter.value)) {
    return { values: filter.value, jsonPath: '$' };
  } else if (
    isJson &&
    typeof filter.value === 'object' &&
    filter.value !== null
  ) {
    const key = Object.keys(filter.value)[0]!;
    const extractedValue = (filter.value as Record<string, any>)[key];
    if (!Array.isArray(extractedValue)) {
      throw new Error(
        'Expected an array of values for JSON collection operator',
      );
    }
    return { values: extractedValue, jsonPath: `$.${key}` };
  } else {
    throw new Error('Invalid filter value for collection operator');
  }
}

/**
 * Determines the condition for an empty collection in collection-based operators.
 * @param operator The FilterOperator.
 * @returns '1=1' if an empty collection makes the condition true, '1=0' otherwise.
 */
export function getEmptyCollectionCondition(operator: FilterOperator): string {
  const isEmptySetTrue = [
    FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
    FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
    FilterOperator.JSON_CONTAINS_ALL,
    FilterOperator.JSON_NOT_CONTAINS_ANY,
    FilterOperator.SET_CONTAINS_ALL,
    FilterOperator.SET_NOT_CONTAINS_ANY,
  ].includes(operator);
  return isEmptySetTrue ? '1=1' : '1=0';
}
