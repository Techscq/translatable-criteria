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
  /** Checks if a value is within a set of specified values. */
  IN = 'IN',
  /** Checks if a value is not within a set of specified values. */
  NOT_IN = 'NOT IN',
  /** Checks if a value is NULL. */
  IS_NULL = 'IS NULL',
  /** Checks if a value is NOT NULL. */
  IS_NOT_NULL = 'IS NOT NULL',
  /** Checks if a string value contains a specific substring (often case-insensitive, depends on DB). */
  CONTAINS = 'CONTAINS',
  /** Checks if a string value starts with a specific substring. */
  STARTS_WITH = 'STARTS_WITH',
  /** Checks if a string value ends with a specific substring. */
  ENDS_WITH = 'ENDS_WITH',
  /** Checks if a string value does not contain a specific substring. */
  NOT_CONTAINS = 'NOT_CONTAINS',
  /**
   * Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), contains a specific value.
   * Expects a single value.
   */
  SET_CONTAINS = 'SET_CONTAINS',
  /**
   * Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), does NOT contain a specific value.
   * Expects a single value.
   */
  SET_NOT_CONTAINS = 'SET_NOT_CONTAINS',
  /**
   * Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), contains AT LEAST ONE of the specified values.
   * Expects an array of values.
   */
  SET_CONTAINS_ANY = 'SET_CONTAINS_ANY',
  /**
   * Checks if a field, representing a collection of values (e.g., MySQL SET type
   * or a text field with comma-delimited values), contains ALL of the specified values.
   * Expects an array of values.
   */
  SET_CONTAINS_ALL = 'SET_CONTAINS_ALL',
  /**
   * Checks if a value is within a specified range (inclusive).
   * Expects an array or tuple of two values: [min, max].
   */
  BETWEEN = 'BETWEEN',
  /**
   * Checks if a value is outside a specified range (inclusive).
   * Expects an array or tuple of two values: [min, max].
   */
  NOT_BETWEEN = 'NOT_BETWEEN',
  /**
   * Checks if a string value matches a regular expression pattern.
   * The specific regex syntax may depend on the database.
   * Expects a string representing the regular expression.
   */
  MATCHES_REGEX = 'MATCHES_REGEX',
  /**
   * Checks if a string value matches a pattern (case-insensitive).
   * Expects a string for the pattern.
   */
  ILIKE = 'ILIKE',
  /**
   * Checks if a string value does not match a pattern (case-insensitive).
   * Expects a string for the pattern.
   */
  NOT_ILIKE = 'NOT_ILIKE',
  /**
   * Checks if a JSON column contains a specific value or path.
   * The specific implementation depends on the database (e.g., JSON_CONTAINS in MySQL, @> in PostgreSQL for JSONB).
   */
  JSON_CONTAINS = 'JSON_CONTAINS',
  /**
   * Checks if a JSON column does not contain a specific value or path.
   * The specific implementation depends on the database.
   */
  JSON_NOT_CONTAINS = 'JSON_NOT_CONTAINS',
  /**
   * Checks if a column representing an array contains a specific element.
   * The underlying column could be a native array type (e.g., PostgreSQL)
   * or a JSON array (e.g., MySQL).
   */
  ARRAY_CONTAINS_ELEMENT = 'ARRAY_CONTAINS_ELEMENT',
  /**
   * Checks if a column representing an array contains ALL elements from the provided array.
   * The underlying column could be a native array type or a JSON array.
   */
  ARRAY_CONTAINS_ALL_ELEMENTS = 'ARRAY_CONTAINS_ALL_ELEMENTS',
  /**
   * Checks if a column representing an array contains AT LEAST ONE element from the provided array.
   * The underlying column could be a native array type or a JSON array.
   */
  ARRAY_CONTAINS_ANY_ELEMENT = 'ARRAY_CONTAINS_ANY_ELEMENT',
  /**
   * Checks if a column representing an array is exactly equal to the provided array
   * (order and elements must match).
   * The underlying column could be a native array type or a JSON array.
   */
  ARRAY_EQUALS = 'ARRAY_EQUALS',
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
