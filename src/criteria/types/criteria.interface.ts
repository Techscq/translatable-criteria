import type {
  CriteriaSchema,
  FieldOfSchema,
  SelectedAliasOf,
} from './schema.types.js';
import type { FilterGroup } from '../filter/filter-group.js';

import type { Cursor } from '../cursor.js';
import type { Order, OrderDirection } from '../order/order.js';
import { FilterOperator } from './operator.types.js';
import type {
  StoredJoinDetails,
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './join-utility.types.js';
import type { FilterPrimitive } from '../filter/types/filter-primitive.types.js';

/**
 * Base interface for defining query criteria.
 * It provides methods for filtering, joining, selecting fields, ordering, and paginating results.
 * @template TSchema - The schema definition for the primary entity.
 * @template CurrentAlias - The selected alias for the primary entity from its schema.
 */
export interface ICriteriaBase<
  TSchema extends CriteriaSchema,
  CurrentAlias extends SelectedAliasOf<TSchema>,
> {
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
   * Multiple calls to `orderBy` will append new ordering rules.
   * @param {FieldOfSchema<TSchema>} field - The field to order by.
   * @param {OrderDirection} direction - The direction of the ordering (ASC or DESC).
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field is not defined in the schema.
   */
  orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection): this;

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
   * @returns {CurrentAlias} The alias string.
   */
  get alias(): CurrentAlias;

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
   * This replaces any existing filters.
   * @param {FilterPrimitive<FieldOfSchema<TSchema>>} filterPrimitive - The filter to apply.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   */
  where<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ): this;

  /**
   * Adds a filter primitive to the current filter group using an AND logical operator.
   * @param {FilterPrimitive<FieldOfSchema<TSchema>>} filterPrimitive - The filter to add.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   * @throws {Error} If `where()` has not been called first.
   */
  andWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ): this;

  /**
   * Adds a filter primitive, creating a new OR group with the existing filters.
   * @param {FilterPrimitive<FieldOfSchema<TSchema>>} filterPrimitive - The filter to add.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   * @throws {Error} If `where()` has not been called first.
   */
  orWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ): this;

  /**
   * Adds a join to another criteria.
   * @template TJoinSchema - The schema of the entity to join.
   * @template TJoinedCriteriaAlias - The alias for the joined entity.
   * @template TMatchingJoinConfig - The specific join configuration from the parent schema that matches the joined alias.
   * @param {JoinCriteriaParameterType<TSchema, TJoinSchema, TJoinedCriteriaAlias, TMatchingJoinConfig>} criteriaToJoin
   * The criteria instance representing the entity to join (e.g., `InnerJoinCriteria`, `LeftJoinCriteria`).
   * @param {JoinParameterType<TSchema, TJoinSchema, TMatchingJoinConfig>} joinParameter
   * The parameters defining how the join should be performed (e.g., fields for simple join, pivot table details for many-to-many).
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the join configuration for the given alias is not found in the parent schema.
   * @throws {Error} If `parent_field` in `joinParameter` is not defined in the parent schema.
   * @throws {Error} If `joinParameter` is invalid for the `relation_type` defined in the schema (e.g., using simple join input for many-to-many).
   */
  join<
    TJoinSchema extends CriteriaSchema,
    TJoinedCriteriaAlias extends SelectedAliasOf<TJoinSchema>,
    TMatchingJoinConfig extends SpecificMatchingJoinConfig<
      TSchema,
      TJoinedCriteriaAlias
    >,
  >(
    criteriaToJoin: JoinCriteriaParameterType<
      TSchema,
      TJoinSchema,
      TJoinedCriteriaAlias,
      TMatchingJoinConfig
    >,
    joinParameter: JoinParameterType<TSchema, TJoinSchema, TMatchingJoinConfig>,
  ): this;
}
