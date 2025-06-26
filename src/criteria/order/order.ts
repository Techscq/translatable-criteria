/**
 * Defines the possible directions for ordering query results.
 */
export const OrderDirection = {
  /** Sorts results in ascending order. */
  ASC: 'ASC',
  /** Sorts results in descending order. */
  DESC: 'DESC',
} as const;

/**
 * Represents the direction of an order clause, either 'ASC' or 'DESC'.
 */
export type OrderDirection = keyof typeof OrderDirection;

let globalOrderSequence: number = 0;

/**
 * Resets the global order sequence counter.
 * This function is intended for testing purposes to ensure predictable sequence IDs.
 * @internal
 */
export function _resetOrderSequenceForTesting() {
  globalOrderSequence = 0;
}

/**
 * Represents the primitive structure of an order by clause,
 * specifying the field and direction.
 * @template T - A string literal type representing valid field names for ordering. Defaults to `string`.
 */
export type OrderByPrimitive<T extends string = string> = {
  /** The direction of the sort (ASC or DESC). */
  direction: OrderDirection;
  /** The name of the field to order by. */
  field: T;
  /** A unique ID to ensure stable sorting order. */
  sequence_id: number;
  /** If true, null values will be ordered first. Otherwise, they will be ordered last. */
  nulls_first: boolean;
};

/**
 * Represents a single ordering rule for a query.
 * It includes the field to order by, the direction (ASC/DESC),
 * and an internal sequence ID to maintain stable sorting when multiple
 * order rules are applied.
 * @template T - A string literal type representing valid field names for ordering. Defaults to `string`.
 */
export class Order<T extends string = string> {
  /**
   * A unique, globally incrementing ID to ensure stable sorting order
   * when multiple Order instances are created.
   * @protected
   */
  protected _sequenceId: number;

  /**
   * Creates an instance of Order.
   * @param {OrderDirection} _direction - The direction of the sort (ASC or DESC).
   * @param {T} _field - The name of the field to order by.
   * @param {boolean} [_nullsFirst=false] - If true, null values will be ordered first.
   */
  constructor(
    protected readonly _direction: OrderDirection,
    protected readonly _field: T,
    protected readonly _nullsFirst: boolean = false,
  ) {
    globalOrderSequence++;
    this._sequenceId = globalOrderSequence;
  }

  /**
   * Gets whether null values should be ordered first.
   * @returns {boolean} True if nulls are first, otherwise false.
   */
  get nullsFirst() {
    return this._nullsFirst;
  }

  /**
   * Gets the unique sequence ID of this order rule.
   * Used to maintain a stable sort order when multiple orders are applied.
   * @returns {number} The sequence ID.
   */
  get sequenceId(): number {
    return this._sequenceId;
  }

  /**
   * Gets the name of the field to order by.
   * @returns {T} The field name.
   */
  get field(): T {
    return this._field;
  }

  /**
   * Gets the direction of the sort.
   * @returns {OrderDirection} The order direction (ASC or DESC).
   */
  get direction(): OrderDirection {
    return this._direction;
  }

  /**
   * Converts the Order instance to its primitive representation.
   * @returns {OrderByPrimitive<T>} The primitive object representing this order rule.
   */
  toPrimitive(): OrderByPrimitive<T> {
    return {
      direction: this._direction,
      field: this._field,
      nulls_first: this._nullsFirst,
      sequence_id: this.sequenceId,
    };
  }
}
