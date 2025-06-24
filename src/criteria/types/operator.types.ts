/**
 * Enumerates the available filter operators for comparing field values.
 */
export enum FilterOperator {
  /** Checks for equality. */
  EQUALS = '=',
  /** Checks for inequality. */
  NOT_EQUALS = '!=',
  /** Checks if a value is greater than another. */
  GREATER_THAN = '>',
  /** Checks if a value is greater than or equal to another. */
  GREATER_THAN_OR_EQUALS = '>=',
  /** Checks if a value is less than another. */
  LESS_THAN = '<',
  /** Checks if a value is less than or equal to another. */
  LESS_THAN_OR_EQUALS = '<=',

  /** Checks if a string value matches a pattern (often case-sensitive, depends on DB). */
  LIKE = 'LIKE',
  /** Checks if a string value does not match a pattern. */
  NOT_LIKE = 'NOT LIKE',
  /** Checks if a string value matches a pattern (case-insensitive). */
  ILIKE = 'ILIKE',
  /** Checks if a string value does not match a pattern (case-insensitive). */
  NOT_ILIKE = 'NOT_ILIKE',
  /** Checks if a string value contains a specific substring (often case-insensitive, depends on DB). */
  CONTAINS = 'CONTAINS',
  /** Checks if a string value does not contain a specific substring. */
  NOT_CONTAINS = 'NOT_CONTAINS',
  /** Checks if a string value starts with a specific substring. */
  STARTS_WITH = 'STARTS_WITH',
  /** Checks if a string value ends with a specific substring. */
  ENDS_WITH = 'ENDS_WITH',
  /** Checks if a string value matches a regular expression pattern.
   * The specific regex syntax may depend on the database. */
  MATCHES_REGEX = 'MATCHES_REGEX',

  /** Checks if a value is within a set of specified values. */
  IN = 'IN',
  /** Checks if a value is not within a set of specified values. */
  NOT_IN = 'NOT IN',
  /** Checks if a value is NULL. */
  IS_NULL = 'IS_NULL',
  /** Checks if a value is NOT NULL. */
  IS_NOT_NULL = 'IS_NOT_NULL',

  /** Checks if a value is within a specified range (inclusive).
   * Expects an array or tuple of two values: [min, max]. */
  BETWEEN = 'BETWEEN',
  /** Checks if a value is outside a specified range (inclusive).
   * Expects an array or tuple of two values: [min, max]. */
  NOT_BETWEEN = 'NOT_BETWEEN',

  /** Checks if the value at a specific JSON path is equal to a given primitive value.
   * This is for simple key-value equality checks within a JSON object.
   * @example { field: 'metadata', operator: FilterOperator.JSON_PATH_VALUE_EQUALS, value: { 'status': 'published', 'views': 100 } } */
  JSON_PATH_VALUE_EQUALS = 'JSON_PATH_VALUE_EQUALS',
  /** Checks if the value at a specific JSON path is NOT equal to a given primitive value.
   * @example { field: 'metadata', operator: FilterOperator.JSON_PATH_VALUE_NOT_EQUALS, value: { 'status': 'draft' } } */
  JSON_PATH_VALUE_NOT_EQUALS = 'JSON_PATH_VALUE_NOT_EQUALS',
  /** Checks if a JSON document (or a value at a specific path within it) contains a specified JSON value.
   * This maps directly to database functions like MySQL's `JSON_CONTAINS`.
   * @example { field: 'metadata', operator: FilterOperator.JSON_CONTAINS, value: { 'tags': 'tech', 'details.views': 100 } } */
  JSON_CONTAINS = 'JSON_CONTAINS',
  /** Checks if a JSON document (or a value at a specific path within it) does NOT contain a specified JSON value.
   * This maps directly to database functions like MySQL's `JSON_CONTAINS` with negation.
   * @example { field: 'metadata', operator: FilterOperator.JSON_NOT_CONTAINS, value: { 'tags': 'spam' } } */
  JSON_NOT_CONTAINS = 'JSON_NOT_CONTAINS',
  /** Checks if a JSON document (or a value at a specific path within it) contains AT LEAST ONE of the specified JSON values.
   * @example { field: 'metadata', operator: FilterOperator.JSON_CONTAINS_ANY, value: { 'tags': ['tech', 'news'] } } */
  JSON_CONTAINS_ANY = 'JSON_CONTAINS_ANY',
  /** Checks if a JSON document (or a value at a specific path within it) does NOT contain AT LEAST ONE of the specified JSON values.
   * (i.e., it contains none of them). */
  JSON_NOT_CONTAINS_ANY = 'JSON_NOT_CONTAINS_ANY',
  /** Checks if a JSON document (or a value at a specific path within it) contains ALL of the specified JSON values.
   * @example { field: 'metadata', operator: FilterOperator.JSON_CONTAINS_ALL, value: { 'tags': ['tech', 'important'] } } */
  JSON_CONTAINS_ALL = 'JSON_CONTAINS_ALL',
  /** Checks if a JSON document (or a value at a specific path within it) does NOT contain ALL of the specified JSON values.
   * (i.e., it is missing at least one of them). */
  JSON_NOT_CONTAINS_ALL = 'JSON_NOT_CONTAINS_ALL',

  /** Checks if an array contains a specific element.
   * @example { field: 'tags', operator: FilterOperator.ARRAY_CONTAINS_ELEMENT, value: 'tech' } */
  ARRAY_CONTAINS_ELEMENT = 'ARRAY_CONTAINS_ELEMENT',
  /** Checks if an array does NOT contain a specific element.
   * @example { field: 'tags', operator: FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT, value: 'finance' } */
  ARRAY_NOT_CONTAINS_ELEMENT = 'ARRAY_NOT_CONTAINS_ELEMENT',
  /** Checks if an array contains AT LEAST ONE element from a given array.
   * @example { field: 'tags', operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT, value: ['tech', 'news'] } */
  ARRAY_CONTAINS_ANY_ELEMENT = 'ARRAY_CONTAINS_ANY_ELEMENT',
  /** Checks if an array does NOT contain AT LEAST ONE element from a given array.
   * (i.e., it contains none of them). */
  ARRAY_NOT_CONTAINS_ANY_ELEMENT = 'ARRAY_NOT_CONTAINS_ANY_ELEMENT',
  /** Checks if an array contains ALL elements from a given array.
   * @example { field: 'tags', operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS, value: ['tech', 'important'] } */
  ARRAY_CONTAINS_ALL_ELEMENTS = 'ARRAY_CONTAINS_ALL_ELEMENTS',
  /** Checks if an array does NOT contain ALL elements from a given array.
   * (i.e., it is missing at least one of them). */
  ARRAY_NOT_CONTAINS_ALL_ELEMENTS = 'ARRAY_NOT_CONTAINS_ALL_ELEMENTS',
  /** Checks if an array is equal to a given array (order-insensitive).
   * @example { field: 'tags', operator: FilterOperator.ARRAY_EQUALS, value: ['news', 'tech'] } */
  ARRAY_EQUALS = 'ARRAY_EQUALS',
  /** Checks if an array is NOT equal to a given array (order-insensitive).
   * @example { field: 'tags', operator: FilterOperator.ARRAY_NOT_EQUALS, value: ['finance', 'sports'] } */
  ARRAY_NOT_EQUALS = 'ARRAY_NOT_EQUALS',
  /** Checks if an array is exactly equal to a given array (order-sensitive).
   * @example { field: 'tags', operator: FilterOperator.ARRAY_EQUALS_STRICT, value: ['tech', 'news'] } */
  ARRAY_EQUALS_STRICT = 'ARRAY_EQUALS_STRICT',
  /** Checks if an array is NOT exactly equal to a given array (order-sensitive).
   * @example { field: 'tags', operator: FilterOperator.ARRAY_NOT_EQUALS_STRICT, value: ['news', 'tech'] } */
  ARRAY_NOT_EQUALS_STRICT = 'ARRAY_NOT_EQUALS_STRICT',
  /** Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), contains a specific value. */
  SET_CONTAINS = 'SET_CONTAINS',
  /** Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), does NOT contain a specific value. */
  SET_NOT_CONTAINS = 'SET_NOT_CONTAINS',
  /** Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), contains AT LEAST ONE of the specified values. */
  SET_CONTAINS_ANY = 'SET_CONTAINS_ANY',
  /** Checks if a field, representing a collection of values, does NOT contain AT LEAST ONE of the specified values.
   * (i.e., it contains none of them). */
  SET_NOT_CONTAINS_ANY = 'SET_NOT_CONTAINS_ANY',
  /** Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), contains ALL of the specified values. */
  SET_CONTAINS_ALL = 'SET_CONTAINS_ALL',
  /** Checks if a field, representing a collection of values, does NOT contain ALL of the specified values.
   * (i.e., it is missing at least one of them). */
  SET_NOT_CONTAINS_ALL = 'SET_NOT_CONTAINS_ALL',
}

/**
 * Enumerates the logical operators used to combine filter conditions or groups.
 */
export enum LogicalOperator {
  /** Combines conditions with a logical AND. All conditions must be true. */
  AND = 'AND',
  /** Combines conditions with a logical OR. At least one condition must be true. */
  OR = 'OR',
}
