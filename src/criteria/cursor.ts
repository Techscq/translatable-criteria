import { Filter } from './filter/filter.js';
import { OrderDirection } from './order/order.js';
import type { FilterPrimitive } from './filter/types/filter-primitive.types.js';
import { FilterOperator } from './types/operator.types.js';

let globalCursorSequence: number = 0;
/**
 * Represents the configuration for cursor-based pagination.
 * A cursor defines a point in a sorted dataset from which to fetch
 * the next or previous set of results.
 *
 * @template TFields - A string literal type representing valid field names for cursor filters.
 * @template Operator - The specific comparison operator for the cursor (GREATER_THAN or LESS_THAN).
 */
export class Cursor<
  TFields extends string,
  Operator extends FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
> {
  /**
   * A unique, globally incrementing ID. This is used by translators to maintain
   * a stable sort order when merging cursor logic from multiple `Criteria`
   * instances (e.g., a root criteria and its joins).
   * @protected
   */
  protected _sequenceId: number;
  /**
   * An array of one or two {@link Filter} instances that define the cursor's position.
   * - A single filter is used for simple cursor pagination (e.g., based on `created_at`).
   * - Two filters are used for composite cursor pagination (e.g., based on `created_at` and `uuid`).
   * @readonly
   */
  readonly filters:
    | [Filter<TFields, Operator>, Filter<TFields, Operator>]
    | [Filter<TFields, Operator>];
  /**
   * The primary {@link OrderDirection} associated with the cursor.
   * This should align with the main sort order of the query being paginated.
   * @readonly
   */
  readonly order: OrderDirection;
  /**
   * Creates an instance of Cursor.
   * @param {readonly [Omit<FilterPrimitive<TFields, Operator>, 'operator'>] | readonly [Omit<FilterPrimitive<TFields, Operator>, 'operator'>, Omit<FilterPrimitive<TFields, Operator>, 'operator'>]} filterPrimitive -
   *   An array of one or two filter primitives (without the 'operator' property)
   *   that define the cursor's fields and values.
   * @param {Operator} operator - The comparison operator (GREATER_THAN or LESS_THAN) to apply.
   * @param {OrderDirection} order - The primary order direction for pagination.
   * @throws {Error} If any cursor field is not defined.
   * @throws {Error} If any cursor value is null or undefined.
   * @throws {Error} If two cursor fields are provided and they are identical.
   * @throws {Error} If no filter primitives are provided.
   */
  constructor(
    filterPrimitive:
      | readonly [
          Omit<FilterPrimitive<TFields, Operator>, 'operator'>,
          Omit<FilterPrimitive<TFields, Operator>, 'operator'>,
        ]
      | readonly [Omit<FilterPrimitive<TFields, Operator>, 'operator'>],
    operator: Operator,
    order: OrderDirection,
  ) {
    for (const filter of filterPrimitive) {
      if (!filter.field) {
        throw new Error('Cursor field must be defined');
      }
      if (filter.value === undefined) {
        throw new Error(
          `Cursor value for field ${String(
            filter.field,
          )} must be explicitly defined (can be null, but not undefined)`,
        );
      }
    }

    if (
      filterPrimitive.length === 2 &&
      filterPrimitive[0].field === filterPrimitive[1]?.field
    ) {
      throw new Error('Cursor fields must be different for a composite cursor');
    }

    const filterArray = filterPrimitive.map(
      (filterPrimitive) => new Filter({ ...filterPrimitive, operator }),
    );
    if (!filterArray[0]) {
      throw new Error('Cursor filters must be defined');
    }
    globalCursorSequence++;
    this._sequenceId = globalCursorSequence;
    this.filters = filterArray as typeof this.filters;
    this.order = order;
  }

  /**
   * Gets the unique sequence ID of this cursor configuration.
   * This ID is used to maintain a stable application order when cursor
   * logic is defined across multiple related criteria (e.g., in joins).
   * @returns {number} The sequence ID.
   */
  get sequenceId(): number {
    return this._sequenceId;
  }

  get operator() {
    return this.filters[0].operator;
  }
}
