import type {
  CriteriaSchema,
  FieldOfSchema,
  JoinOptions,
} from './schema.types.js';
import type { FilterGroup } from '../filter/filter-group.js';

import type { Cursor } from '../cursor.js';
import type { Order, OrderDirection } from '../order/order.js';
import { FilterOperator } from './operator.types.js';
import type {
  StoredJoinDetails,
  JoinCriteriaType,
} from './join-utility.types.js';
import type { FilterPrimitive } from '../filter/types/filter-primitive.types.js';

/**
 * Base interface for defining query criteria.
 * It provides methods for filtering, joining, selecting fields, ordering, and paginating results.
 * @template TSchema - The schema definition for the primary entity.
 */
export interface ICriteriaBase<TSchema extends CriteriaSchema> {
  /**
   * Gets the metadata associated with the root schema of this criteria.
   * @returns {TSchema['metadata']} The metadata object from the schema, which can be undefined.
   */
  get schemaMetadata(): TSchema['metadata'];

  /**
   * Gets the name of the identifier field for the current schema.
   * @returns {FieldOfSchema<TSchema>} The name of the identifier field.
   */
  get identifierField(): FieldOfSchema<TSchema>;

  /**
   * Configures the criteria to select all available fields from the root entity
   * and any joined entities that also have `selectAll()` called or by default.
   * This overrides any previous specific selections made by `setSelect()`.
   * @returns {this} The current criteria instance for chaining.
   */
  resetSelect(): this;
  /**
   * Indicates whether all fields are currently selected for the root entity.
   * @returns {boolean} True if all fields are selected, false otherwise.
   */
  get selectAll(): boolean;
  /**
   * Sets the cursor for pagination. A cursor defines a point from which to fetch
   * the next or previous set of results. It typically uses a combination of
   * unique and ordered fields.
   *
   * @param {Array<Omit<FilterPrimitive<FieldOfSchema<TSchema>>, 'operator'>>} filterPrimitives -
   *   An array of exactly one or two filter primitives (without the operator)
   *   defining the fields and their values for the cursor.
   *   Example: `[{ field: 'created_at', value: '2023-10-26T10:00:00Z' }, { field: 'uuid', value: 'some-uuid' }]`
   * @param {FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN} operator -
   *   The comparison operator to apply to the cursor fields (e.g., fetch records
   *   greater than or less than the cursor values).
   * @param {OrderDirection} order - The direction of ordering that matches the cursor logic.
   *   If operator is GREATER_THAN, order should typically be ASC.
   *   If operator is LESS_THAN, order should typically be DESC.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If filterPrimitive does not contain exactly 1 or 2 elements.
   * @throws {Error} If any cursor field is not defined in the schema.
   * @throws {Error} If any cursor value is undefined (null is allowed).
   * @throws {Error} If the two cursor fields are identical.
   */
  setCursor<
    Operator extends FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
  >(
    filterPrimitives:
      | readonly [
          Omit<FilterPrimitive<FieldOfSchema<TSchema>, Operator>, 'operator'>,
        ]
      | readonly [
          Omit<FilterPrimitive<FieldOfSchema<TSchema>, Operator>, 'operator'>,
          Omit<FilterPrimitive<FieldOfSchema<TSchema>, Operator>, 'operator'>,
        ],
    operator: Operator,
    order: OrderDirection,
  ): this;

  /**
   * Gets the current cursor configuration, if set.
   * @returns {Cursor<FieldOfSchema<TSchema>> | undefined} The cursor object or undefined.
   */
  get cursor():
    | Cursor<
        FieldOfSchema<TSchema>,
        FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN
      >
    | undefined;

  /**
   * Specifies which fields to select for the root entity.
   * Calling this method disables `selectAll()` behavior.
   * @param {Array<FieldOfSchema<TSchema>>} selectFields - An array of field names to select.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If any of the specified fields are not defined in the schema.
   */
  setSelect(selectFields: Array<FieldOfSchema<TSchema>>): this;

  /**
   * Gets the currently selected fields. If `selectAll()` was last called or is default,
   * it returns all fields from the schema.
   * @returns {Array<FieldOfSchema<TSchema>>} An array of selected field names.
   */
  get select(): Array<FieldOfSchema<TSchema>>;

  /**
   * Adds an ordering rule to the criteria.
   * Multiple calls will append new ordering rules.
   * @param {FieldOfSchema<TSchema>} field - The field to order by.
   * @param {OrderDirection} direction - The direction of the ordering (ASC or DESC).
   * @param {boolean} [nullFirst=false] - If true, null values will be ordered first.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field is not defined in the schema.
   */
  orderBy(
    field: FieldOfSchema<TSchema>,
    direction: OrderDirection,
    nullFirst?: boolean,
  ): this;

  /**
   * Sets the maximum number of records to return (LIMIT).
   * @param {number} amount - The number of records to take. Must be non-negative.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the amount is negative.
   */
  setTake(amount: number): this;

  /**
   * Sets the number of records to skip before starting to return records (OFFSET).
   * @param {number} amount - The number of records to skip. Must be non-negative.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the amount is negative.
   */
  setSkip(amount: number): this;

  /**
   * Gets the configured join details.
   * @returns {ReadonlyArray<StoredJoinDetails<TSchema>>} An array of join configurations.
   */
  get joins(): ReadonlyArray<StoredJoinDetails<TSchema>>;

  /**
   * Gets the root filter group for this criteria.
   * @returns {FilterGroup} The root filter group.
   */
  get rootFilterGroup(): FilterGroup;

  /**
   * Gets the alias for the root entity of this criteria.
   * @returns {TSchema['alias']} The alias string.
   */
  get alias(): TSchema['alias'];

  /**
   * Gets the source name (e.g., table name) for the root entity of this criteria.
   * @returns {TSchema['source_name']} The source name string.
   */
  get sourceName(): TSchema['source_name'];

  /**
   * Gets the current take value (LIMIT).
   * @returns {number} The take value.
   */
  get take(): number;

  /**
   * Gets the current skip value (OFFSET).
   * @returns {number} The skip value.
   */
  get skip(): number;

  /**
   * Gets the current ordering rules.
   * @returns {readonly Order[]} An array of order objects.
   */
  get orders(): readonly Order[];

  /**
   * Initializes the filter criteria with a single filter primitive.
   * This replaces any existing filters in the root filter group.
   * @template Operator - The specific filter operator type.
   * @param {FilterPrimitive<FieldOfSchema<TSchema>, Operator>} filterPrimitive - The filter to apply.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   */
  where<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ): this;

  /**
   * Adds a filter primitive to the current filter group using an AND logical operator.
   * Requires `where()` to have been called first to initialize the filter group.
   * @template Operator - The specific filter operator type.
   * @param {FilterPrimitive<FieldOfSchema<TSchema>, Operator>} filterPrimitive - The filter to add.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   * @throws {Error} If `where()` has not been called first.
   */
  andWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ): this;

  /**
   * Adds a filter primitive to the current filter group using an OR logical operator.
   * Requires `where()` to have been called first to initialize the filter group.
   * @template Operator - The specific filter operator type.
   * @param {FilterPrimitive<FieldOfSchema<TSchema>, Operator>} filterPrimitive - The filter to add.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   * @throws {Error} If `where()` has not been called first.
   */
  orWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ): this;

  /**
   * Adds a join to another criteria. This method is fully type-safe.
   * The `joinAlias` argument provides autocompletion for all valid relation aliases defined in the schema.
   * The `criteriaToJoin` argument is then validated to ensure its `source_name` matches the one
   * configured for the chosen `joinAlias`, providing clear, compile-time error messages if they mismatch.
   *
   * @template TJoinSchema - The schema of the entity to join.
   * @template SpecificRelationAlias - The literal type of the relation alias being used for the join.
   * @param {SpecificRelationAlias} joinAlias - The specific alias defined in the parent schema's `relations` array for this relation.
   * @param {JoinCriteriaType<TSchema, TJoinSchema, SpecificRelationAlias>} criteriaToJoin - The criteria instance representing the entity to join (e.g., `InnerJoinCriteria`).
   * @param {JoinOptions} [joinOptions] - Optional configuration for the join (e.g., selection strategy).
   *   If provided, it overrides the `default_options` defined in the schema for this relation.
   * @returns {this} The current criteria instance for chaining.
   */
  join<
    const TJoinSchema extends CriteriaSchema,
    const SpecificRelationAlias extends
      TSchema['relations'][number]['relation_alias'],
  >(
    joinAlias: SpecificRelationAlias,
    criteriaToJoin: JoinCriteriaType<
      TSchema,
      TJoinSchema,
      SpecificRelationAlias
    >,
    joinOptions?: JoinOptions,
  ): this;
}
