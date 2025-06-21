import { CriteriaTranslator } from '../criteria-translator.js';
import type { Order } from '../../order/order.js';
import type {
  CriteriaSchema,
  JoinRelationType,
} from '../../types/schema.types.js';
import type { RootCriteria } from '../../root.criteria.js';
import { FilterOperator, LogicalOperator } from '../../types/operator.types.js';
import { FilterGroup } from '../../filter/filter-group.js';
import type { IFilterExpression } from '../../types/filter-expression.interface.js';
import { Filter } from '../../filter/filter.js';
import type { InnerJoinCriteria } from '../../join/inner.join-criteria.js';
import type {
  PivotJoin,
  SimpleJoin,
} from '../../types/join-parameter.types.js';
import type { LeftJoinCriteria } from '../../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../../join/outer.join-criteria.js';

export type PseudoSqlParts = {
  select: string[];
  from: string;
  joins: string[];
  where: string[];
  orderBy: string[];
  limit?: number;
  offset?: number;
  params: any[];
};

type PseudoSqlFilterOutput = {
  condition: string;
  params: any[];
};

type PseudoSqlTranslationResult = {
  query: string;
  params: any[];
};

/**
 * Escapes a field name for SQL, optionally including an alias.
 * @param field The field name to escape.
 * @param alias The alias to prefix the field with.
 * @returns The escaped field name.
 */
function escapeField(field: string, alias?: string): string {
  const escape = (str: string) => `\`${str.replace(/`/g, '``')}\``;
  return alias ? `${escape(alias)}.${escape(field)}` : escape(field);
}

export class PseudoSqlTranslator extends CriteriaTranslator<
  PseudoSqlParts,
  PseudoSqlTranslationResult,
  PseudoSqlFilterOutput
> {
  private paramCounter = 0;
  private collectedOrders: Array<{ alias: string; order: Order<string> }> = [];

  /**
   * Generates a placeholder for a SQL parameter.
   * @returns A string representing the parameter placeholder.
   */
  private generateParamPlaceholder(): string {
    this.paramCounter++;
    return `?`;
  }

  /**
   * Translates a RootCriteria object into a PseudoSqlTranslationResult.
   * @param criteria The RootCriteria to translate.
   * @param source The initial context for the translation.
   * @returns The final translated SQL query and its parameters.
   */
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

  /**
   * Visits the root node of the Criteria tree and populates SQL parts.
   * @param criteria The RootCriteria instance.
   * @param sqlParts The mutable SQL parts object.
   */
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
      this.visitAndGroup(criteria.rootFilterGroup, criteria.alias, sqlParts);
    }

    const finalOrderByStrings: string[] = [];
    const appliedOrderFieldsForCursor = new Set<string>();

    if (criteria.cursor) {
      const cursorFilters = criteria.cursor.filters;
      const op =
        criteria.cursor.operator === FilterOperator.GREATER_THAN ? '>' : '<';
      let cursorWhereCondition = '';

      if (cursorFilters.length === 1) {
        const primaryFilter = cursorFilters[0]!;
        const primaryPlaceholder = this.generateParamPlaceholder();
        sqlParts.params.push(primaryFilter.value);
        cursorWhereCondition = `(${escapeField(
          String(primaryFilter.field),
          criteria.alias,
        )} ${op} ${primaryPlaceholder})`;
      } else if (cursorFilters.length === 2) {
        const primaryFilter = cursorFilters[0]!;
        const secondaryFilter = cursorFilters[1]!;
        // Generate three placeholders for the three positions in the SQL condition
        const primaryPlaceholder1 = this.generateParamPlaceholder();
        const primaryPlaceholder2 = this.generateParamPlaceholder();
        const secondaryPlaceholder = this.generateParamPlaceholder();
        // Push values corresponding to the placeholders
        sqlParts.params.push(
          primaryFilter.value,
          primaryFilter.value, // Value for the second placeholder
          secondaryFilter.value,
        );
        cursorWhereCondition = `((${escapeField(
          String(primaryFilter.field),
          criteria.alias,
        )} ${op} ${primaryPlaceholder1}) OR (${escapeField(
          String(primaryFilter.field),
          criteria.alias,
        )} = ${primaryPlaceholder2} AND ${escapeField(
          String(secondaryFilter.field),
          criteria.alias,
        )} ${op} ${secondaryPlaceholder}))`;
      }

      if (cursorWhereCondition) {
        sqlParts.where.push(cursorWhereCondition);
      }

      const cursorOrderDirection = criteria.cursor.order;
      cursorFilters.forEach((cf) => {
        const fieldKey = `${criteria.alias}.${String(cf.field)}`;
        finalOrderByStrings.push(
          `${escapeField(
            String(cf.field),
            criteria.alias,
          )} ${cursorOrderDirection}`,
        );
        appliedOrderFieldsForCursor.add(fieldKey);
      });
    }

    this.collectedOrders
      .sort((a, b) => a.order.sequenceId - b.order.sequenceId)
      .forEach(({ alias, order }) => {
        const fieldKey = `${alias}.${String(order.field)}`;
        if (!appliedOrderFieldsForCursor.has(fieldKey)) {
          finalOrderByStrings.push(
            `${escapeField(String(order.field), alias)} ${order.direction}`,
          );
        }
      });

    if (finalOrderByStrings.length > 0) {
      sqlParts.orderBy = finalOrderByStrings;
    }

    if (criteria.take > 0) sqlParts.limit = criteria.take;
    if (criteria.skip > 0) sqlParts.offset = criteria.skip;
  }

  /**
   * Builds a condition string and parameters from a FilterGroup.
   * @param group The FilterGroup to process.
   * @param alias The current alias for fields.
   * @param context The mutable SQL parts object.
   * @returns The condition string and parameters, or undefined if no conditions.
   */
  private _buildConditionFromGroup(
    group: FilterGroup<any>,
    alias: string,
    context: PseudoSqlParts,
  ): PseudoSqlFilterOutput | undefined {
    if (group.items.length === 0) {
      return undefined;
    }

    const conditions: string[] = [];
    const allParams: any[] = [];

    const processItem = (item: IFilterExpression): void => {
      if (item instanceof Filter) {
        const filterResult = item.accept(this, alias, context);
        if (filterResult.condition) {
          conditions.push(filterResult.condition);
          allParams.push(...filterResult.params);
        }
      } else if (item instanceof FilterGroup) {
        const subGroupResult = this._buildConditionFromGroup(
          item,
          alias,
          context,
        );
        if (subGroupResult && subGroupResult.condition) {
          conditions.push(subGroupResult.condition);
          allParams.push(...subGroupResult.params);
        }
      }
    };

    group.items.forEach(processItem);

    if (conditions.length === 0) {
      return undefined;
    }

    const operator =
      group.logicalOperator === LogicalOperator.AND ? ' AND ' : ' OR ';
    return {
      condition: `(${conditions.join(operator)})`,
      params: allParams,
    };
  }

  /**
   * Visits an AND filter group and applies its conditions to the SQL parts.
   * @param group The FilterGroup instance.
   * @param currentAlias The current alias for fields.
   * @param context The mutable SQL parts object.
   */
  public override visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {
    const result = this._buildConditionFromGroup(group, currentAlias, context);
    if (result && result.condition) {
      context.where.push(result.condition);
      context.params.push(...result.params);
    }
  }

  /**
   * Visits an OR filter group and applies its conditions to the SQL parts.
   * Delegates to visitAndGroup as the internal logic is similar after _buildConditionFromGroup.
   * @param group The FilterGroup instance.
   * @param currentAlias The current alias for fields.
   * @param context The mutable SQL parts object.
   */
  public override visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {
    this.visitAndGroup(group, currentAlias, context);
  }

  /**
   * Visits an Inner Join node and applies its logic to the SQL parts.
   * @param criteria The InnerJoinCriteria instance.
   * @param parameters The join parameters.
   * @param context The mutable SQL parts object.
   */
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

  /**
   * Visits a Left Join node and applies its logic to the SQL parts.
   * @param criteria The LeftJoinCriteria instance.
   * @param parameters The join parameters.
   * @param context The mutable SQL parts object.
   */
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

  /**
   * Visits an Outer Join node and applies its logic to the SQL parts.
   * @param criteria The OuterJoinCriteria instance.
   * @param parameters The join parameters.
   * @param context The mutable SQL parts object.
   */
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

  /**
   * Applies the pseudo-join logic to the SQL parts.
   * @param joinType The type of join (e.g., 'INNER', 'LEFT', 'FULL OUTER').
   * @param criteria The JoinCriteria instance.
   * @param parameters The join parameters.
   * @param sqlParts The mutable SQL parts object.
   */
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
    const joinTable = `${escapeField(criteria.sourceName)} AS ${escapeField(
      parameters.join_alias,
    )}`;
    let onCondition = '';

    if ('pivot_source_name' in parameters) {
      const pivotAlias = `${parameters.parent_alias}_${parameters.join_alias}_pivot`;
      const pivotTable = `${escapeField(
        parameters.pivot_source_name,
      )} AS ${escapeField(pivotAlias)}`;
      sqlParts.joins.push(
        `${joinType} JOIN ${pivotTable} ON ${escapeField(
          String(parameters.parent_field.reference),
          parameters.parent_alias,
        )} = ${escapeField(parameters.parent_field.pivot_field, pivotAlias)}`,
      );
      onCondition = `${escapeField(
        parameters.join_field.pivot_field,
        pivotAlias,
      )} = ${escapeField(
        String(parameters.join_field.reference),
        parameters.join_alias,
      )}`;
    } else {
      onCondition = `${escapeField(
        String(parameters.parent_field),
        parameters.parent_alias,
      )} = ${escapeField(String(parameters.join_field), parameters.join_alias)}`;
    }

    if (criteria.rootFilterGroup.items.length > 0) {
      const filterResult = this._buildConditionFromGroup(
        criteria.rootFilterGroup,
        parameters.join_alias,
        sqlParts,
      );
      if (filterResult && filterResult.condition) {
        onCondition += ` AND ${filterResult.condition}`;
        sqlParts.params.push(...filterResult.params);
      }
    }

    sqlParts.joins.push(`${joinType} JOIN ${joinTable} ON ${onCondition}`);

    criteria.select.forEach((f) =>
      sqlParts.select.push(escapeField(String(f), parameters.join_alias)),
    );

    criteria.orders.forEach((order) =>
      this.collectedOrders.push({ alias: parameters.join_alias, order }),
    );

    for (const subJoinDetail of criteria.joins) {
      subJoinDetail.criteria.accept(this, subJoinDetail.parameters, sqlParts);
    }
  }

  /**
   * Visits a single Filter node and returns its SQL condition and parameters.
   * @param filter The Filter instance.
   * @param currentAlias The current alias for fields.
   * @returns The SQL condition and parameters for the filter.
   */
  public override visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
    // The context parameter is required by the ICriteriaVisitor interface,
    // but not directly used in this specific visitFilter implementation.
    // It's kept for consistency and potential future use cases where
    // a filter might need to interact with the broader translation context.
    _context: PseudoSqlParts,
  ): PseudoSqlFilterOutput {
    const fieldName = escapeField(String(filter.field), currentAlias);
    const params: any[] = [];
    let condition = '';

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        condition = `${fieldName} = ${this.generateParamPlaceholder()}`;
        params.push(filter.value);
        break;
      case FilterOperator.NOT_EQUALS:
        condition = `${fieldName} != ${this.generateParamPlaceholder()}`;
        params.push(filter.value);
        break;
      case FilterOperator.LIKE:
      case FilterOperator.NOT_LIKE:
      case FilterOperator.CONTAINS:
      case FilterOperator.NOT_CONTAINS:
      case FilterOperator.STARTS_WITH:
      case FilterOperator.ENDS_WITH:
        let val = String(filter.value);
        const isNot =
          filter.operator === FilterOperator.NOT_LIKE ||
          filter.operator === FilterOperator.NOT_CONTAINS;
        const op = isNot ? 'NOT LIKE' : 'LIKE';

        if (
          filter.operator === FilterOperator.CONTAINS ||
          filter.operator === FilterOperator.NOT_CONTAINS
        ) {
          val = `%${val}%`;
        } else if (filter.operator === FilterOperator.STARTS_WITH) {
          val = `${val}%`;
        } else if (filter.operator === FilterOperator.ENDS_WITH) {
          val = `%${val}`;
        }

        condition = `${fieldName} ${op} ${this.generateParamPlaceholder()}`;
        params.push(val);
        break;
      case FilterOperator.IN:
        if (!Array.isArray(filter.value) || filter.value.length === 0) {
          condition = '1=0';
        } else {
          const placeholders = (filter.value as any[])
            .map(() => this.generateParamPlaceholder())
            .join(', ');
          condition = `${fieldName} IN (${placeholders})`;
          params.push(...(filter.value as any[]));
        }
        break;
      case FilterOperator.IS_NULL:
        condition = `${fieldName} IS NULL`;
        break;
      case FilterOperator.IS_NOT_NULL:
        condition = `${fieldName} IS NOT NULL`;
        break;
      case FilterOperator.JSON_CONTAINS:
        if (typeof filter.value === 'object' && filter.value !== null) {
          const jsonConditions: string[] = [];
          for (const path in filter.value) {
            const pathValue = (filter.value as Record<string, any>)[path];
            jsonConditions.push(
              `JSON_CONTAINS(${fieldName}, '${JSON.stringify(
                pathValue,
              )}', '$.${path}')`,
            );
          }
          condition = jsonConditions.join(' AND ');
        } else {
          condition = '1=0';
        }
        break;
      default:
        condition = `${fieldName} ${
          filter.operator
        } ${this.generateParamPlaceholder()}`;
        params.push(filter.value);
    }
    return {
      condition,
      params: params.map((p) => (p === undefined ? null : p)),
    };
  }
}
