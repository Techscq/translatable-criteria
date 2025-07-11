import type { CriteriaSchema, FieldOfSchema } from './types/schema.types.js';

import { CriteriaFilterManager } from './criteria-filter-manager.js';
import { CriteriaJoinManager } from './criteria-join-manager.js';
import { Cursor } from './cursor.js';
import { Order, OrderDirection } from './order/order.js';
import type { FilterPrimitive } from './filter/types/filter-primitive.types.js';
import type { ICriteriaBase } from './types/criteria.interface.js';
import type {
  JoinCriteriaType,
  StoredJoinDetails,
} from './types/join-utility.types.js';
import { FilterOperator } from './types/operator.types.js';
import type { PivotJoin, SimpleJoin } from './types/join-parameter.types.js';
import type { FilterGroup } from './filter/filter-group.js';

export type ValidSchema<CSchema extends CriteriaSchema> =
  CSchema['identifier_field'] extends CSchema['fields'][number]
    ? CSchema
    : `Schema identifier_field '${CSchema['identifier_field']}' must be one of the schema's defined fields. Schema: ${CSchema['source_name']}`;
/**
 * Abstract base class for constructing query criteria.
 * It provides a fluent API for defining filters, joins, selections, ordering, and pagination.
 * Concrete criteria types (e.g., RootCriteria, JoinCriteria) will extend this class.
 *
 * @template TSchema - The schema definition for the entity this criteria operates on.
 */
export abstract class Criteria<const TSchema extends CriteriaSchema>
  implements ICriteriaBase<TSchema>
{
  private readonly _filterManager = new CriteriaFilterManager<TSchema>();
  private readonly _joinManager = new CriteriaJoinManager<TSchema>();
  private readonly _source_name: TSchema['source_name'];
  private _take: number = 0; // 0 = no limit
  /**
   * Stores the set of fields explicitly selected by the user.
   * This is used when `_selectAll` is false.
   * @protected
   */
  protected _select: Set<FieldOfSchema<TSchema>> = new Set([]);
  private _selectAll: boolean = true;
  /**
   * Stores the cursor configuration for pagination, if set.
   * @protected
   */
  protected _cursor:
    | Cursor<
        FieldOfSchema<TSchema>,
        FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN
      >
    | undefined;

  protected readonly _schema: TSchema;
  /**
   * Initializes a new instance of the Criteria class.
   * @param {ValidSchema<TSchema>} schema - The schema definition for the entity.
   * @throws {Error} If the schema's identifier_field is not one of its defined fields.
   * @protected
   */
  constructor(schema: ValidSchema<TSchema>) {
    if (typeof schema === 'string') {
      throw new Error(`Invalid Schema: ${schema}`);
    }
    if (!schema.fields.includes(schema.identifier_field)) {
      throw new Error(
        `Schema identifier_field '${String(
          schema.identifier_field,
        )}' must be one of the schema's defined fields. Schema: ${
          schema.source_name
        }`,
      );
    }
    this._schema = schema as TSchema;

    this._source_name = schema.source_name;
  }

  get schema(): TSchema {
    return { ...this._schema };
  }

  /**
   * Gets the metadata associated with the root schema of this criteria.
   * @returns {TSchema['metadata']} The metadata object from the schema, which can be undefined.
   * @remarks This is intended primarily for use by translators.
   */
  get schemaMetadata(): TSchema['metadata'] {
    return this.schema.metadata;
  }

  /**
   * Gets the name of the identifier field for the current schema.
   * @returns {FieldOfSchema<TSchema>} The name of the identifier field.
   */
  get identifierField(): FieldOfSchema<TSchema> {
    return this.schema.identifier_field as FieldOfSchema<TSchema>;
  }

  /**
   * Gets the currently selected fields.
   * If `_selectAll` is true (default or after `resetSelect()`), it returns all fields from the schema.
   * If `_selectAll` is false (after `setSelect()`), it returns the fields explicitly set by the user,
   * plus the schema's `identifier_field` (which is added implicitly by `setSelect`).
   * @returns {Array<FieldOfSchema<TSchema>>} An array of selected field names.
   */
  get select(): Array<FieldOfSchema<TSchema>> {
    if (this._selectAll) {
      return [...this.schema.fields] as Array<FieldOfSchema<TSchema>>;
    }
    return Array.from(this._select);
  }
  /**
   * Resets the selection to include all fields from the schema.
   * Later calls to `get select()` will return all schema fields
   * until `setSelect()` is called again.
   * @returns {this} The current criteria instance for chaining.
   */
  resetSelect(): this {
    this._selectAll = true;
    this._select.clear();
    return this;
  }
  /**
   * Indicates whether all fields are currently configured to be selected.
   * @returns {boolean} True if all fields are selected, false if specific fields are selected.
   */
  get selectAll(): boolean {
    return this._selectAll;
  }
  /**
   * Specifies which fields to select for the entity.
   * Calling this method sets `selectAll` to false.
   * The schema's `identifier_field` will always be included in the selection
   * if it's not already present in `selectFields`.
   * If `selectFields` is empty, only the `identifier_field` will be selected.
   * @param {Array<FieldOfSchema<TSchema>>} selectFields - An array of field names to select.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If any of the specified fields are not defined in the schema.
   */
  setSelect(selectFields: Array<FieldOfSchema<TSchema>>): this {
    for (const field of selectFields) {
      this.assetFieldOnSchema(field);
    }
    this._selectAll = false;
    this._select = new Set(selectFields);
    this._select.add(this.schema.identifier_field as FieldOfSchema<TSchema>);
    return this;
  }
  /**
   * Gets the maximum number of records to return (LIMIT).
   * @returns {number} The take value.
   */
  get take(): number {
    return this._take;
  }

  private _skip: number = 0;
  /**
   * Gets the number of records to skip (OFFSET).
   * @returns {number} The skip value.
   */
  get skip(): number {
    return this._skip;
  }

  private _orders: Array<Order<FieldOfSchema<TSchema>>> = [];
  /**
   * Gets the current ordering rules applied to this criteria.
   * @returns {ReadonlyArray<Order<FieldOfSchema<TSchema>>>} A readonly array of order objects.
   */
  get orders(): ReadonlyArray<Order<FieldOfSchema<TSchema>>> {
    return [...this._orders];
  }
  /**
   * Gets the configured join details for this criteria.
   * @returns {ReadonlyArray<StoredJoinDetails<TSchema>>} A readonly array of join configurations.
   */
  get joins(): ReadonlyArray<StoredJoinDetails<TSchema>> {
    return [...this._joinManager.getJoins()];
  }
  /**
   * Gets the root filter group for this criteria, which holds all filter conditions.
   * @returns {FilterGroup} The root filter group.
   */
  get rootFilterGroup(): FilterGroup {
    return this._filterManager.getRootFilterGroup();
  }
  /**
   * Gets the source name (e.g., table name) for the entity of this criteria.
   * @returns {TSchema['source_name']} The source name string.
   */
  get sourceName(): TSchema['source_name'] {
    return this._source_name;
  }
  /**
   * Gets the alias used for the entity of this criteria.
   * @returns {CurrentAlias} The alias string.
   */
  get alias(): TSchema['alias'] {
    return this.schema.alias;
  }
  /**
   * Sets the maximum number of records to return (LIMIT).
   * @param {number} amount - The number of records to take. Must be non-negative.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the amount is negative.
   */
  setTake(amount: number): this {
    if (amount < 0) {
      throw new Error(`Take value cant be negative`);
    }
    this._take = amount;
    return this;
  }
  /**
   * Sets the number of records to skip before starting to return records (OFFSET).
   * @param {number} amount - The number of records to skip. Must be non-negative.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If the amount is negative.
   */
  setSkip(amount: number): this {
    if (amount < 0) {
      throw new Error(`Skip value cant be negative`);
    }
    this._skip = amount;
    return this;
  }

  /**
   * Asserts that a given field name is defined within the current criteria's schema.
   * This is a protected utility method used internally to validate field names
   * before they are used in filters, ordering, or selections.
   *
   * @protected
   * @param {FieldOfSchema<TSchema>} field - The field name to validate.
   * @throws {Error} If the field is not defined in the schema.
   */
  protected assetFieldOnSchema(field: TSchema['fields'][number]) {
    if (!this.schema.fields.includes(field))
      throw new Error(
        `The field '${String(
          field,
        )}' is not defined in the schema '${this.schema.source_name}'.`,
      );
  }
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
    nullFirst: boolean = false,
  ): this {
    this.assetFieldOnSchema(field);
    this._orders.push(new Order(direction, field, nullFirst));
    return this;
  }
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
  ): this {
    this.assetFieldOnSchema(filterPrimitive.field);
    this._filterManager.where(filterPrimitive);
    return this;
  }
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
  ): this {
    this.assetFieldOnSchema(filterPrimitive.field);
    this._filterManager.andWhere(filterPrimitive);
    return this;
  }
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
  ): this {
    this.assetFieldOnSchema(filterPrimitive.field);
    this._filterManager.orWhere(filterPrimitive);
    return this;
  }
  /**
   * Adds a join to another criteria. This method is fully type-safe.
   * The `joinAlias` argument provides autocompletion for all valid relation aliases defined in the schema.
   * The `criteriaToJoin` argument is then validated to ensure its `source_name` matches the one
   * configured for the chosen `joinAlias`, providing clear, compile-time error messages if they mismatch.
   *
   * @template TJoinSchema - The schema of the entity to join.
   * @template SpecificRelationAlias - The literal type of the relation alias being used for the join.
   * @param {SpecificRelationAlias} joinAlias - The specific alias defined in the parent schema's `relations` array for
   *   this relation.
   * @param {JoinCriteriaType<TSchema, TJoinSchema, SpecificRelationAlias>} criteriaToJoin - The criteria instance
   *   representing the entity to join (e.g., `InnerJoinCriteria`).
   * @param {boolean} [withSelect=true] - If true (default), the joined entity's fields will be included in the final
   *   selection. If false, the join will only be used for filtering and its fields will not be selected.
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
    withSelect: boolean = true,
  ): this {
    if (typeof criteriaToJoin === 'string') {
      throw new Error(`Invalid criteriaToJoin: ${criteriaToJoin}`);
    }
    const relation = this.schema.relations.find(
      (r) => r.relation_alias === joinAlias,
    );

    if (!relation) {
      throw new Error(
        `Join configuration for '${String(
          joinAlias,
        )}' not found in schema '${this.schema.source_name}'.`,
      );
    }

    const baseParameters = {
      with_select: withSelect,
      parent_alias: this.alias,
      parent_source_name: this.sourceName,
      relation_alias: relation.relation_alias,
      parent_identifier: this.identifierField,
      relation_type: relation.relation_type,
      join_metadata: relation.metadata ?? {},
      parent_schema_metadata: this.schema.metadata ?? {},
    };

    let fullJoinParameters:
      | PivotJoin<TSchema, TJoinSchema, typeof relation.relation_type>
      | SimpleJoin<TSchema, TJoinSchema, typeof relation.relation_type>;

    if (relation.relation_type === 'many_to_many') {
      fullJoinParameters = {
        ...baseParameters,
        pivot_source_name: relation.pivot_source_name,
        local_field: relation.local_field,
        relation_field: relation.relation_field,
      } as PivotJoin<TSchema, TJoinSchema, typeof relation.relation_type>;
    } else {
      fullJoinParameters = {
        ...baseParameters,
        local_field: relation.local_field,
        relation_field: relation.relation_field,
      } as SimpleJoin<TSchema, TJoinSchema, typeof relation.relation_type>;
    }

    this._joinManager.addJoin(criteriaToJoin, fullJoinParameters);
    return this;
  }
  /**
   * Gets the current cursor configuration, if set.
   * @returns {Cursor<FieldOfSchema<TSchema>, FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN> | undefined}
   * The cursor object or undefined.
   */
  get cursor():
    | Cursor<
        FieldOfSchema<TSchema>,
        FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN
      >
    | undefined {
    return this._cursor;
  }
  /**
   * Sets the cursor for pagination.
   * @template Operator - The specific comparison operator for the cursor.
   * @param {readonly [Omit<FilterPrimitive<FieldOfSchema<TSchema>, Operator>, 'operator'>] | readonly
   *   [Omit<FilterPrimitive<FieldOfSchema<TSchema>, Operator>, 'operator'>,
   *   Omit<FilterPrimitive<FieldOfSchema<TSchema>, Operator>, 'operator'>]} filterPrimitives - An array of one or two
   *   filter primitives defining the cursor's fields and values.
   * @param {Operator} operator - The comparison operator (GREATER_THAN or LESS_THAN).
   * @param {OrderDirection} order - The primary order direction for pagination.
   * @returns {this} The current criteria instance for chaining.
   * @throws {Error} If filterPrimitives does not contain exactly 1 or 2 elements.
   * @throws {Error} If any cursor field is not defined in the schema.
   * @throws {Error} If any cursor value is undefined (null is allowed, per Cursor constructor).
   * @throws {Error} If two cursor fields are provided and they are identical (per Cursor constructor).
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
  ): this {
    if (filterPrimitives.length !== 1 && filterPrimitives.length !== 2) {
      throw new Error('The cursor must have exactly 1 or 2 elements');
    }

    for (const filterPrimitive of filterPrimitives) {
      this.assetFieldOnSchema(filterPrimitive.field);
    }
    this._cursor = new Cursor(filterPrimitives, operator, order);
    return this;
  }
}
