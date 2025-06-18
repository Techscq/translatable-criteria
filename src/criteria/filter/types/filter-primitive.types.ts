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
  // String-based operators
  Operator extends
    | FilterOperator.LIKE
    | FilterOperator.NOT_LIKE
    | FilterOperator.CONTAINS
    | FilterOperator.NOT_CONTAINS
    | FilterOperator.STARTS_WITH
    | FilterOperator.ENDS_WITH
    | FilterOperator.SET_CONTAINS
    | FilterOperator.SET_NOT_CONTAINS
    | FilterOperator.MATCHES_REGEX
    | FilterOperator.ILIKE
    | FilterOperator.NOT_ILIKE
    ? /** Expected value: A string. */
      string
    : // Comparison and equality operators
      Operator extends
          | FilterOperator.EQUALS
          | FilterOperator.NOT_EQUALS
          | FilterOperator.GREATER_THAN
          | FilterOperator.GREATER_THAN_OR_EQUALS
          | FilterOperator.LESS_THAN
          | FilterOperator.LESS_THAN_OR_EQUALS
      ? /** Expected value: A primitive value (string, number, boolean, Date, or null) for comparison. */
        PrimitiveFilterValue
      : // Array-based operators (for IN, NOT_IN, SET_CONTAINS_ANY, SET_CONTAINS_ALL)
        Operator extends
            | FilterOperator.IN
            | FilterOperator.NOT_IN
            | FilterOperator.SET_CONTAINS_ANY
            | FilterOperator.SET_CONTAINS_ALL
        ? /** Expected value: An array of primitive values (excluding null/undefined). */
          Array<Exclude<PrimitiveFilterValue, null | undefined>>
        : // Range operators: BETWEEN, NOT_BETWEEN (Nuevos)
          Operator extends FilterOperator.BETWEEN | FilterOperator.NOT_BETWEEN
          ? /** Expected value: A tuple of two primitive values [min, max] (excluding null/undefined). */
            [
              Exclude<PrimitiveFilterValue, null | undefined>,
              Exclude<PrimitiveFilterValue, null | undefined>,
            ]
          : // Array element operators
            Operator extends FilterOperator.ARRAY_CONTAINS_ELEMENT
            ? /**
               * Expected value:
               * 1. A primitive value for direct array column comparison.
               * 2. An object `{ [jsonPath: string]: PrimitiveFilterValue }` for checking an element
               *    within an array at a specific path inside a JSON column.
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
                 */
                | Array<Exclude<PrimitiveFilterValue, null | undefined>>
                  | {
                      [key: string]: Array<
                        Exclude<PrimitiveFilterValue, null | undefined>
                      >;
                    }
              : // Null operators
                Operator extends
                    | FilterOperator.IS_NULL
                    | FilterOperator.IS_NOT_NULL
                ? /** Expected value: `null` or `undefined`. The actual value is often ignored by the translator. */
                  null | undefined
                : // JSON operators
                  Operator extends
                      | FilterOperator.JSON_CONTAINS
                      | FilterOperator.JSON_NOT_CONTAINS
                  ? /**
                     * Expected value: An object where keys are JSON path strings
                     * and values are the candidates to search for at that path.
                     */
                    {
                      [key: string]: // JSON path
                      PrimitiveFilterValue | Array<any> | Record<string, any>;
                    }
                  : // Fallback
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
