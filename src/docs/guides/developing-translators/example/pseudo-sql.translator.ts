import { CriteriaTranslator } from '../../../../criteria/translator/criteria-translator.js';
import {
  Filter,
  FilterGroup,
  FilterOperator,
  InnerJoinCriteria,
  LeftJoinCriteria,
  type Order,
  OuterJoinCriteria,
  RootCriteria,
  type CriteriaSchema,
  type ICriteriaVisitor,
  type JoinRelationType,
  type PivotJoin,
  type SimpleJoin,
} from '../../../../criteria/index.js';
import * as Handlers from './handlers/index.js';
import type {
  FilterHandler,
  PseudoSqlFilterOutput,
  PseudoSqlParts,
  PseudoSqlTranslationResult,
  TranslatorMethodsForFilterGroupBuilder,
  TranslatorMethodsForJoinBuilder,
} from './types.js';
import {
  CursorSqlBuilder,
  escapeField,
  FilterGroupSqlBuilder,
  JoinSqlBuilder,
  OrderSqlBuilder,
} from './utils/index.js';

export class PseudoSqlTranslator extends CriteriaTranslator<
  PseudoSqlParts,
  PseudoSqlTranslationResult,
  PseudoSqlFilterOutput
> {
  private paramCounter = 0;
  private collectedOrders: Array<{ alias: string; order: Order<string> }> = [];
  private readonly operatorHandlers: Map<FilterOperator, FilterHandler>;
  private readonly cursorSqlBuilder: CursorSqlBuilder;
  private readonly orderSqlBuilder: OrderSqlBuilder;
  private readonly joinSqlBuilder: JoinSqlBuilder;
  private readonly filterGroupSqlBuilder: FilterGroupSqlBuilder;

  constructor() {
    super();
    this.operatorHandlers = this.initializeOperatorHandlers();
    this.cursorSqlBuilder = new CursorSqlBuilder(
      this.generateParamPlaceholder.bind(this),
    );
    this.orderSqlBuilder = new OrderSqlBuilder();

    const translatorMethodsForFilterGroupBuilder: TranslatorMethodsForFilterGroupBuilder =
      {
        getTranslatorInstance: () =>
          this as ICriteriaVisitor<PseudoSqlParts, PseudoSqlFilterOutput>,
      };
    this.filterGroupSqlBuilder = new FilterGroupSqlBuilder(
      translatorMethodsForFilterGroupBuilder,
    );

    const translatorMethodsForJoinBuilder: TranslatorMethodsForJoinBuilder = {
      generateParamPlaceholder: this.generateParamPlaceholder.bind(this),
      _buildConditionFromGroup:
        this.filterGroupSqlBuilder.buildConditionFromGroup.bind(
          this.filterGroupSqlBuilder,
        ),
      getTranslatorInstance: () =>
        this as ICriteriaVisitor<PseudoSqlParts, PseudoSqlFilterOutput>,
    };
    this.joinSqlBuilder = new JoinSqlBuilder(translatorMethodsForJoinBuilder);
  }

  private generateParamPlaceholder(): string {
    this.paramCounter++;
    return `?`;
  }

  private initializeOperatorHandlers(): Map<FilterOperator, FilterHandler> {
    const handlers = new Map<FilterOperator, FilterHandler>();

    [
      FilterOperator.EQUALS,
      FilterOperator.NOT_EQUALS,
      FilterOperator.GREATER_THAN,
      FilterOperator.GREATER_THAN_OR_EQUALS,
      FilterOperator.LESS_THAN,
      FilterOperator.LESS_THAN_OR_EQUALS,
    ].forEach((op) => handlers.set(op, Handlers.handleSimpleComparison));

    [
      FilterOperator.LIKE,
      FilterOperator.NOT_LIKE,
      FilterOperator.ILIKE,
      FilterOperator.NOT_ILIKE,
      FilterOperator.CONTAINS,
      FilterOperator.NOT_CONTAINS,
      FilterOperator.STARTS_WITH,
      FilterOperator.ENDS_WITH,
    ].forEach((op) => handlers.set(op, Handlers.handleLikeOperator));

    [FilterOperator.IN, FilterOperator.NOT_IN].forEach((op) =>
      handlers.set(op, Handlers.handleInOperator),
    );
    [FilterOperator.IS_NULL, FilterOperator.IS_NOT_NULL].forEach((op) =>
      handlers.set(op, Handlers.handleNullOperator),
    );
    [FilterOperator.BETWEEN, FilterOperator.NOT_BETWEEN].forEach((op) =>
      handlers.set(op, Handlers.handleBetweenOperator),
    );
    handlers.set(FilterOperator.MATCHES_REGEX, Handlers.handleMatchesRegex);

    [
      FilterOperator.JSON_PATH_VALUE_EQUALS,
      FilterOperator.JSON_PATH_VALUE_NOT_EQUALS,
    ].forEach((op) => handlers.set(op, Handlers.handleJsonPathValueEquals));

    [FilterOperator.JSON_CONTAINS, FilterOperator.JSON_NOT_CONTAINS].forEach(
      (op) => handlers.set(op, Handlers.handleJsonContains),
    );

    [
      FilterOperator.JSON_CONTAINS_ANY,
      FilterOperator.JSON_CONTAINS_ALL,
      FilterOperator.JSON_NOT_CONTAINS_ANY,
      FilterOperator.JSON_NOT_CONTAINS_ALL,
    ].forEach((op) => handlers.set(op, Handlers.handleJsonCollection));

    [FilterOperator.ARRAY_EQUALS, FilterOperator.ARRAY_EQUALS_STRICT].forEach(
      (op) => handlers.set(op, Handlers.handleArrayEquals),
    );

    [
      FilterOperator.ARRAY_CONTAINS_ELEMENT,
      FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT,
    ].forEach((op) => handlers.set(op, Handlers.handleArrayContainsElement));

    [
      FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
      FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
      FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
      FilterOperator.ARRAY_NOT_CONTAINS_ALL_ELEMENTS,
    ].forEach((op) => handlers.set(op, Handlers.handleArrayCollection));

    [FilterOperator.SET_CONTAINS, FilterOperator.SET_NOT_CONTAINS].forEach(
      (op) => handlers.set(op, Handlers.handleSetContains),
    );

    [
      FilterOperator.SET_CONTAINS_ANY,
      FilterOperator.SET_CONTAINS_ALL,
      FilterOperator.SET_NOT_CONTAINS_ANY,
      FilterOperator.SET_NOT_CONTAINS_ALL,
    ].forEach((op) => handlers.set(op, Handlers.handleSetCollection));

    return handlers;
  }

  public override translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: PseudoSqlParts,
  ): PseudoSqlTranslationResult {
    this.paramCounter = 0;
    this.collectedOrders = [];

    this.visitRoot(criteria, source);

    let sqlString = `SELECT ${source.select.join(', ') || '*'}`;
    sqlString += ` FROM ${source.from}`;
    if (source.joins.length > 0) {
      sqlString += ` ${source.joins.join(' ')}`;
    }
    if (source.where.length > 0) {
      sqlString += ` WHERE ${source.where.join(' AND ')}`;
    }
    if (source.orderBy.length > 0) {
      sqlString += ` ORDER BY ${source.orderBy.join(', ')}`;
    }

    if (source.limit !== undefined) {
      sqlString += ` LIMIT ${source.limit}`;
    }
    if (source.offset !== undefined) {
      sqlString += ` OFFSET ${source.offset}`;
    }

    return {
      query: sqlString,
      params: source.params,
    };
  }

  public override visitRoot<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    sqlParts: PseudoSqlParts,
  ): void {
    sqlParts.from = `${escapeField(criteria.sourceName)} AS ${escapeField(
      criteria.alias,
    )}`;
    sqlParts.select = criteria.select.map((f) =>
      escapeField(String(f), criteria.alias),
    );

    criteria.orders.forEach((order) =>
      this.collectedOrders.push({ alias: criteria.alias, order }),
    );

    for (const joinDetail of criteria.joins) {
      joinDetail.criteria.accept(this, joinDetail.parameters, sqlParts);
    }

    if (criteria.rootFilterGroup.items.length > 0) {
      const result = this.filterGroupSqlBuilder.buildConditionFromGroup(
        criteria.rootFilterGroup,
        criteria.alias,
        sqlParts,
      );
      if (result && result.condition) {
        sqlParts.where.push(result.condition);
        sqlParts.params.push(...result.params);
      }
    }

    const {
      cursorWhereCondition,
      cursorOrderByStrings,
      appliedOrderFieldsForCursor: newAppliedOrderFieldsForCursor,
    } = this.cursorSqlBuilder.buildCursorPagination(criteria, sqlParts);

    if (cursorWhereCondition) {
      sqlParts.where.push(cursorWhereCondition);
    }

    sqlParts.orderBy = this.orderSqlBuilder.buildOrderBy(
      this.collectedOrders,
      newAppliedOrderFieldsForCursor,
      cursorOrderByStrings,
    );

    if (criteria.take > 0) sqlParts.limit = criteria.take;
    if (criteria.skip > 0 || (criteria.skip === 0 && criteria.take > 0)) {
      sqlParts.offset = criteria.skip;
    }
  }

  public override visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {
    const result = this.filterGroupSqlBuilder.buildConditionFromGroup(
      group,
      currentAlias,
      context,
    );
    if (result && result.condition) {
      context.where.push(result.condition);
      context.params.push(...result.params);
    }
  }

  public override visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {
    const result = this.filterGroupSqlBuilder.buildConditionFromGroup(
      group,
      currentAlias,
      context,
    );
    if (result && result.condition) {
      context.where.push(result.condition);
      context.params.push(...result.params);
    }
  }

  public override visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: InnerJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {
    this.applyPseudoJoin('INNER', criteria, parameters, context);
  }

  public override visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: LeftJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {
    this.applyPseudoJoin('LEFT', criteria, parameters, context);
  }

  public override visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {
    this.applyPseudoJoin('FULL OUTER', criteria, parameters, context);
  }

  private applyPseudoJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    joinType: string,
    criteria:
      | InnerJoinCriteria<JoinCSchema>
      | LeftJoinCriteria<JoinCSchema>
      | OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    sqlParts: PseudoSqlParts,
  ): void {
    this.joinSqlBuilder.buildJoin(
      joinType,
      criteria,
      parameters,
      sqlParts,
      this.collectedOrders,
    );
  }

  public override visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
    _context: PseudoSqlParts,
  ): PseudoSqlFilterOutput {
    const fieldName = escapeField(String(filter.field), currentAlias);
    const handler = this.operatorHandlers.get(filter.operator);

    if (!handler) {
      throw new Error(`Unhandled filter operator: ${filter.operator}`);
    }

    const result = handler(
      filter,
      fieldName,
      this.generateParamPlaceholder.bind(this),
    );
    result.params = result.params.map((p) => (p === undefined ? null : p));
    return result;
  }
}
