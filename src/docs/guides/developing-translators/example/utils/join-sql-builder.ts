import type { PseudoSqlParts, PseudoSqlFilterOutput } from '../types.js';
import { escapeField } from './sql-utils.js';

import type {
  PivotJoin,
  SimpleJoin,
} from '../../../../../criteria/types/join-parameter.types.js';
import {
  type CriteriaSchema,
  SelectType,
} from '../../../../../criteria/types/schema.types.js';
import type { FilterGroup } from '../../../../../criteria/filter/filter-group.js';
import type { Order } from '../../../../../criteria/order/order.js';
import type { ICriteriaVisitor } from '../../../../../criteria/types/visitor-interface.types.js';
import type { LeftJoinCriteria } from '../../../../../criteria/join/left.join-criteria.js';
import type { InnerJoinCriteria } from '../../../../../criteria/join/inner.join-criteria.js';
import type { OuterJoinCriteria } from '../../../../../criteria/join/outer.join-criteria.js';

/**
 * The default selection strategy to use when none is specified (undefined).
 * This constant allows the translator to define its own default behavior.
 */
export const DEFAULT_JOIN_SELECT_STRATEGY = SelectType.FULL_ENTITY;

/**
 * Defines the specific methods from PseudoSqlTranslator that JoinSqlBuilder needs to perform its operations.
 * This helps to break circular dependencies and maintain clear responsibilities.
 */
export interface TranslatorMethodsForJoinBuilder {
  generateParamPlaceholder: () => string;
  _buildConditionFromGroup: (
    group: FilterGroup<any>,
    alias: string,
    context: PseudoSqlParts,
  ) => PseudoSqlFilterOutput | undefined;
  // The actual translator instance is needed for recursive accept calls on sub-joins.
  // We use ICriteriaVisitor to avoid direct circular dependency on PseudoSqlTranslator.
  getTranslatorInstance: () => ICriteriaVisitor<
    PseudoSqlParts,
    PseudoSqlFilterOutput
  >;
}

export class JoinSqlBuilder {
  private methods: TranslatorMethodsForJoinBuilder;

  constructor(methods: TranslatorMethodsForJoinBuilder) {
    this.methods = methods;
  }

  /**
   * Builds the SQL for a join clause (INNER, LEFT, FULL OUTER).
   * Encapsulates the logic for simple joins, pivot joins, and applying filters on joined entities.
   * It also handles the recursive processing of sub-joins.
   * @param joinType The type of join ('INNER', 'LEFT', 'FULL OUTER').
   * @param criteria The JoinCriteria object being processed.
   * @param parameters The resolved join parameters.
   * @param sqlParts The mutable PseudoSqlParts context object.
   * @param collectedOrders A collection of orders to which orders from joined entities will be added.
   */
  public buildJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    joinType: string,
    criteria:
      | InnerJoinCriteria<JoinCSchema>
      | LeftJoinCriteria<JoinCSchema>
      | OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema>
      | SimpleJoin<ParentCSchema, JoinCSchema>,
    sqlParts: PseudoSqlParts,
    collectedOrders: Array<{ alias: string; order: Order<string> }>,
  ): void {
    const joinTable = `${escapeField(criteria.sourceName)} AS ${escapeField(
      parameters.relation_alias,
    )}`;
    let onCondition = '';

    if ('pivot_source_name' in parameters) {
      const pivotAlias = `${parameters.parent_alias}_${parameters.relation_alias}_pivot`;
      const pivotTable = `${escapeField(
        parameters.pivot_source_name,
      )} AS ${escapeField(pivotAlias)}`;
      sqlParts.joins.push(
        `${joinType} JOIN ${pivotTable} ON ${escapeField(
          String(parameters.local_field.reference),
          parameters.parent_alias,
        )} = ${escapeField(parameters.local_field.pivot_field, pivotAlias)}`,
      );
      onCondition = `${escapeField(
        parameters.relation_field.pivot_field,
        pivotAlias,
      )} = ${escapeField(
        String(parameters.relation_field.reference),
        parameters.relation_alias,
      )}`;
    } else {
      onCondition = `${escapeField(
        String(parameters.local_field),
        parameters.parent_alias,
      )} = ${escapeField(String(parameters.relation_field), parameters.relation_alias)}`;
    }

    if (criteria.rootFilterGroup.items.length > 0) {
      const filterResult = this.methods._buildConditionFromGroup(
        criteria.rootFilterGroup,
        parameters.relation_alias,
        sqlParts,
      );
      if (filterResult && filterResult.condition) {
        onCondition += ` AND ${filterResult.condition}`;
        sqlParts.params.push(...filterResult.params);
      }
    }

    sqlParts.joins.push(`${joinType} JOIN ${joinTable} ON ${onCondition}`);

    // Determine the selection strategy.
    // If undefined, fallback to the translator's default constant.
    const selectStrategy =
      parameters.join_options.select ?? DEFAULT_JOIN_SELECT_STRATEGY;

    switch (selectStrategy) {
      case SelectType.ID_ONLY:
        sqlParts.select.push(
          escapeField(
            String(criteria.identifierField),
            parameters.relation_alias,
          ),
        );
        break;

      case SelectType.NO_SELECTION:
        // Do not add any fields to the select list.
        break;

      case SelectType.FULL_ENTITY:
      default:
        // Select all fields defined in the criteria (which defaults to all schema fields unless setSelect is used).
        criteria.select.forEach((f) =>
          sqlParts.select.push(
            escapeField(String(f), parameters.relation_alias),
          ),
        );
        break;
    }

    criteria.orders.forEach((order) =>
      collectedOrders.push({ alias: parameters.relation_alias, order }),
    );

    const translatorInstance = this.methods.getTranslatorInstance();
    for (const subJoinDetail of criteria.joins) {
      subJoinDetail.criteria.accept(
        translatorInstance,
        subJoinDetail.parameters,
        sqlParts,
      );
    }
  }
}
