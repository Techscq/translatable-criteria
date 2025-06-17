import type {
  CriteriaSchema,
  FieldOfSchema,
  SchemaJoins,
  SelectedAliasOf,
} from './types/schema.types.js';

import { CriteriaFilterManager } from './criteria-filter-manager.js';
import { CriteriaJoinManager } from './criteria-join-manager.js';
import { Cursor } from './cursor.js';
import { Order, OrderDirection } from './order/order.js';
import type { FilterPrimitive } from './filter/types/filter-primitive.types.js';
import type { ICriteriaBase } from './types/criteria.interface.js';
import type {
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './types/join-utility.types.js';
import { FilterOperator } from './types/operator.types.js';
import type {
  PivotJoinInput,
  SimpleJoinInput,
} from './types/join-input.types.js';

export abstract class Criteria<
  TSchema extends CriteriaSchema,
  CurrentAlias extends SelectedAliasOf<TSchema> = SelectedAliasOf<TSchema>,
> implements ICriteriaBase<TSchema, CurrentAlias>
{
  private readonly _filterManager = new CriteriaFilterManager<TSchema>();
  private readonly _joinManager = new CriteriaJoinManager<TSchema>();
  private readonly _source_name: TSchema['source_name'];
  private _take: number = 0; // 0 = no limit
  protected _select: Set<FieldOfSchema<TSchema>> = new Set([]);
  private _selectAll: boolean = true;
  protected _cursor:
    | Cursor<
        FieldOfSchema<TSchema>,
        FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN
      >
    | undefined;

  constructor(
    protected readonly schema: TSchema,
    protected _alias: CurrentAlias,
  ) {
    if (!schema.alias.includes(this._alias))
      throw new Error(
        `Unsupported alia ${this._alias} for schema ${schema.source_name}`,
      );

    this._source_name = schema.source_name;
  }
  get select() {
    if (this._selectAll) {
      return [...this.schema.fields] as Array<FieldOfSchema<TSchema>>;
    }
    return Array.from(this._select);
  }

  abstract resetCriteria(): ICriteriaBase<TSchema, CurrentAlias>;
  resetSelect() {
    this._selectAll = true;
    this._select.clear();
    return this;
  }

  get selectAll() {
    return this._selectAll;
  }

  setSelect(selectFields: Array<FieldOfSchema<TSchema>>) {
    for (const field of selectFields) {
      this.assetFieldOnSchema(field);
    }
    if (selectFields.length !== this.schema.fields.length) {
      this._selectAll = false;
      this._select = new Set(selectFields);
    }
    return this;
  }

  get take() {
    return this._take;
  }

  private _skip: number = 0;

  get skip() {
    return this._skip;
  }

  private _orders: Array<Order<FieldOfSchema<TSchema>>> = [];

  get orders(): ReadonlyArray<Order<FieldOfSchema<TSchema>>> {
    return [...this._orders];
  }

  get joins() {
    return [...this._joinManager.getJoins()];
  }

  get rootFilterGroup() {
    return this._filterManager.getRootFilterGroup();
  }

  get sourceName() {
    return this._source_name;
  }

  get alias() {
    return this._alias;
  }

  setTake(amount: number) {
    if (amount < 0) {
      throw new Error(`Take value cant be negative`);
    }
    this._take = amount;
    return this;
  }
  setSkip(amount: number) {
    if (amount < 0) {
      throw new Error(`Skip value cant be negative`);
    }
    this._skip = amount;
    return this;
  }

  protected assetFieldOnSchema(field: FieldOfSchema<TSchema>) {
    if (!this.schema.fields.includes(field))
      throw new Error(
        `The field '${String(field)}' is not defined in the schema '${this.schema.source_name}'.`,
      );
  }
  orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection) {
    this.assetFieldOnSchema(field);
    this._orders.push(new Order(direction, field));
    return this;
  }

  where<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ) {
    this.assetFieldOnSchema(filterPrimitive.field);
    this._filterManager.where(filterPrimitive);
    return this;
  }

  andWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ) {
    this.assetFieldOnSchema(filterPrimitive.field);
    this._filterManager.andWhere(filterPrimitive);
    return this;
  }

  orWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
  ) {
    this.assetFieldOnSchema(filterPrimitive.field);
    this._filterManager.orWhere(filterPrimitive);
    return this;
  }

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
  ) {
    if (typeof criteriaToJoin === 'string') {
      throw new Error(`Invalid criteriaToJoin: ${criteriaToJoin}`);
    }

    typeof joinParameter.parent_field === 'object'
      ? this.assetFieldOnSchema(joinParameter.parent_field.reference)
      : this.assetFieldOnSchema(joinParameter.parent_field);

    const joinConfig = this.schema.joins.find(
      (join) => join.alias === criteriaToJoin.alias,
    );
    if (!joinConfig) {
      throw new Error(
        `Join configuration for alias '${String(criteriaToJoin.alias)}' not found in schema '${this.schema.source_name}'.`,
      );
    }

    this.assertIsValidJoinOptions(joinConfig, joinParameter);

    const fullJoinParameters = {
      ...joinParameter,
      parent_alias: this.alias,
      parent_source_name: this.sourceName,
      parent_to_join_relation_type: joinConfig.join_relation_type,
    };
    this._joinManager.addJoin(criteriaToJoin, fullJoinParameters);
    return this;
  }

  private assertIsValidJoinOptions<TJoinSchema extends CriteriaSchema>(
    joinConfig: SchemaJoins<string>,
    joinParameter:
      | PivotJoinInput<TSchema, TJoinSchema>
      | SimpleJoinInput<TSchema, TJoinSchema>,
  ) {
    const isPivotFieldObject = (
      field: any,
    ): field is { pivot_field: string; reference: string } => {
      return (
        typeof field === 'object' &&
        field !== null &&
        'pivot_field' in field &&
        'reference' in field
      );
    };
    if (joinConfig.join_relation_type === 'many_to_many') {
      if (
        !isPivotFieldObject(joinParameter.parent_field) ||
        !isPivotFieldObject(joinParameter.join_field)
      ) {
        throw new Error(
          `Invalid JoinOptions for 'many_to_many' join. Expected parent_field and join_field to be objects with 'pivot_field' and 'reference' properties. Alias: '${String(joinConfig.alias)}'`,
        );
      }
    } else {
      if (
        typeof joinParameter.parent_field !== 'string' ||
        typeof joinParameter.join_field !== 'string'
      ) {
        throw new Error(
          `Invalid JoinOptions for '${joinConfig.join_relation_type}' join. Expected parent_field and join_field to be strings. Alias: '${String(joinConfig.alias)}'`,
        );
      }
    }
  }

  get cursor() {
    return this._cursor;
  }

  setCursor(
    cursorFilters: [
      Omit<
        FilterPrimitive<
          FieldOfSchema<TSchema>,
          FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN
        >,
        'operator'
      >,
      Omit<
        FilterPrimitive<
          FieldOfSchema<TSchema>,
          FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN
        >,
        'operator'
      >,
    ],
    operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
    order: OrderDirection,
  ) {
    if (cursorFilters.length !== 2)
      throw new Error(`The cursor must have exactly 2 elements`);

    for (const filterPrimitive of cursorFilters) {
      this.assetFieldOnSchema(filterPrimitive.field);
    }
    this._cursor = new Cursor(cursorFilters, operator, order);
    return this;
  }
}
