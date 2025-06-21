import type { RootCriteria } from '../root.criteria.js';
import type { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import type { LeftJoinCriteria } from '../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../join/outer.join-criteria.js';
import type { Filter } from '../filter/filter.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type { CriteriaSchema, JoinRelationType } from './schema.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';
import type { FilterOperator } from './operator.types.js';

/**
 * Defines the contract for a visitor that traverses a Criteria object graph.
 * @template TranslationContext The mutable context object (e.g., a query builder) passed through the traversal.
 * @template TFilterVisitorOutput The specific type returned by `visitFilter`, typically an intermediate representation of a condition.
 */
export interface ICriteriaVisitor<
  TranslationContext,
  TFilterVisitorOutput = any,
> {
  /**
   * Visits the root node of the Criteria tree.
   */
  visitRoot<RootCSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCSchema>,
    context: TranslationContext,
  ): void;

  /**
   * Visits an Inner Join node.
   */
  visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: InnerJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: TranslationContext,
  ): void;

  /**
   * Visits a Left Join node.
   */
  visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: LeftJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: TranslationContext,
  ): void;

  /**
   * Visits an Outer Join node.
   */
  visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: TranslationContext,
  ): void;

  /**
   * Visits a single Filter node and returns an intermediate representation.
   */
  visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
    context: TranslationContext,
  ): TFilterVisitorOutput;

  /**
   * Visits a group of filters joined by a logical AND.
   */
  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): void;

  /**
   * Visits a group of filters joined by a logical OR.
   */
  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): void;
}
