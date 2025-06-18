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
 * Represents the primitive structure of an order by clause,
 * specifying the field and direction.
 * @template T - A string literal type representing valid field names for ordering. Defaults to `string`.
 */
export type OrderByPrimitive<T extends string = string> = {
  /** The direction of the sort (ASC or DESC). */
  direction: OrderDirection;
  /** The name of the field to order by. */
  field: T;
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
   */
  constructor(
    protected readonly _direction: OrderDirection,
    protected readonly _field: T,
  ) {
    globalOrderSequence++;
    this._sequenceId = globalOrderSequence;
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
    };
  }
}
