import { FilterOperator, LogicalOperator } from '../../types/operator.types.js';
import type {
  CriteriaSchema,
  FieldOfSchema,
} from '../../types/schema.types.js';

/**
 * Represents a simple, primitive value that can be used in a filter.
 * It can be a string, number, boolean, Date, or null.
 */
export type PrimitiveFilterValue = string | number | boolean | Date | null;

/**
 * Represents the value associated with a filter, strongly typed based on the {@link FilterOperator}.
 * @template Operator - The specific filter operator.
 */
export type FilterValue<Operator extends FilterOperator> =
  // String-based operators: LIKE, NOT_LIKE, CONTAINS, NOT_CONTAINS, STARTS_WITH, ENDS_WITH
  Operator extends
    | FilterOperator.LIKE
    | FilterOperator.NOT_LIKE
    | FilterOperator.CONTAINS
    | FilterOperator.NOT_CONTAINS
    | FilterOperator.STARTS_WITH
    | FilterOperator.ENDS_WITH
    | FilterOperator.SET_CONTAINS
    | FilterOperator.SET_NOT_CONTAINS
    ? /** Expected value: A string value to search within the SET-like field. */
      string
    : // Comparison and equality operators: EQUALS, NOT_EQUALS, GREATER_THAN, GREATER_THAN_OR_EQUALS, LESS_THAN, LESS_THAN_OR_EQUALS
      Operator extends
          | FilterOperator.EQUALS
          | FilterOperator.NOT_EQUALS
          | FilterOperator.GREATER_THAN
          | FilterOperator.GREATER_THAN_OR_EQUALS
          | FilterOperator.LESS_THAN
          | FilterOperator.LESS_THAN_OR_EQUALS
      ? /** Expected value: A primitive value (string, number, boolean, Date, or null) for comparison. */
        PrimitiveFilterValue
      : // Array-based operators (for IN, NOT_IN): IN, NOT_IN
        Operator extends FilterOperator.IN | FilterOperator.NOT_IN
        ? /** Expected value: An array of primitive values (excluding null/undefined) to check for inclusion. */
          Array<Exclude<PrimitiveFilterValue, null | undefined>>
        : Operator extends FilterOperator.ARRAY_CONTAINS_ELEMENT
          ? /**
             * Expected value:
             * 1. A primitive value for direct array column comparison.
             * 2. An object `{ [jsonPath: string]: PrimitiveFilterValue }` for checking an element
             *    within an array at a specific path inside a JSON column.
             *    Example: `{ "tags": "admin" }` or `{ "$.tags": "admin" }`
             *    Only one path-element pair is expected.
             */
            PrimitiveFilterValue | { [key: string]: PrimitiveFilterValue }
          : Operator extends
                | FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS
                | FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT
                | FilterOperator.ARRAY_EQUALS
            ? /**
               * Expected value:
               * 1. An array of primitive values for direct array column comparison.
               * 2. An object `{ [jsonPath: string]: Array<Exclude<PrimitiveFilterValue, null | undefined>> }`
               *    for checking elements within an array at a specific path inside a JSON column.
               *    Example: `{ "tags": ["admin", "editor"] }` or `{ "$.tags": ["admin", "editor"] }`
               *    Only one path-array pair is expected.
               */
              | Array<Exclude<PrimitiveFilterValue, null | undefined>>
                | {
                    [key: string]: Array<
                      Exclude<PrimitiveFilterValue, null | undefined>
                    >;
                  }
            : // Null operators: IS_NULL, IS_NOT_NULL
              Operator extends
                  | FilterOperator.IS_NULL
                  | FilterOperator.IS_NOT_NULL
              ? /** Expected value: `null` or `undefined`. The actual value is often ignored by the translator for these operators. */
                null | undefined
              : // JSON operators: JSON_CONTAINS, JSON_NOT_CONTAINS
                Operator extends
                    | FilterOperator.JSON_CONTAINS
                    | FilterOperator.JSON_NOT_CONTAINS
                ? /**
                   * Expected value: An object where keys are JSON path strings (e.g., "$.user.name" or just "user.name" depending on translator convention)
                   * and values are the candidates to search for at that path.
                   * Candidate values can be primitives, objects, or arrays.
                   * Example: `{ "$.name": "John", "$.address.city": "New York", "$.tags": ["dev", "js"] }`
                   */
                  {
                    [
                      key: string
                    ]: // JSON path (e.g., "$.user.details" or "details.address")
                    | PrimitiveFilterValue // Candidate for the path is a primitive
                      | Array<any> // Candidate for the path is a JSON array
                      | Record<string, any>; // Candidate for the path is a JSON object
                  }
                : // Fallback for any unhandled operator
                  /** Indicates an operator that is not explicitly handled by the FilterValue type definition.
                   *  This should ideally not be reached if all operators are covered.
                   *  A runtime error for unsupported operators should be handled by the translator.
                   */
                  never;

/**
 * Defines the structure for a single filter condition.
 * It specifies the field to filter on, the operator to use, and the value to compare against.
 * @template Field - A string literal type representing the valid field names for this filter,
 * typically derived from {@link FieldOfSchema} of a {@link CriteriaSchema}. Defaults to `string`.
 * @template Operator - The specific filter operator being used.
 */
export interface FilterPrimitive<
  Field extends FieldOfSchema<CriteriaSchema>,
  Operator extends FilterOperator,
> {
  /** The name of the field to apply the filter to. */
  readonly field: Field;
  /** The comparison operator to use for the filter. */
  readonly operator: Operator;
  /** The value to compare the field against. Its type is determined by the {@link FilterValue} generic, based on the operator. */
  readonly value: FilterValue<Operator>;
}

/**
 * Represents an item within a filter group.
 * It can be either a single {@link FilterPrimitive} or another nested {@link FilterGroupPrimitive}.
 * @template Field - A string literal type representing the valid field names,
 * typically derived from {@link FieldOfSchema} of a {@link CriteriaSchema}.
 */
type FilterItem<Field extends string> =
  | FilterPrimitive<Field, FilterOperator> // Explicitly state FilterOperator for the second generic arg
  | FilterGroupPrimitive<Field>;

/**
 * Defines the structure for a group of filter conditions.
 * Filters within a group are combined using a specified logical operator (AND/OR).
 * @template Field - A string literal type representing the valid field names for filters
 * within this group, typically derived from {@link FieldOfSchema} of a {@link CriteriaSchema}. Defaults to `string`.
 */
export interface FilterGroupPrimitive<
  Field extends string = FieldOfSchema<CriteriaSchema>,
> {
  /** The logical operator (AND/OR) used to combine the items in this group. */
  readonly logicalOperator: LogicalOperator;
  /** An array of filter items, which can be individual filters or nested filter groups. */
  readonly items: ReadonlyArray<FilterItem<Field>>;
}
