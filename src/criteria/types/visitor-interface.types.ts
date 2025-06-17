import type { RootCriteria } from '../root.criteria.js';
import type { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import type { LeftJoinCriteria } from '../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../join/outer.join-criteria.js';
import type { Filter } from '../filter/filter.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from './schema.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';
import type { FilterOperator } from './operator.types.js';

/**
 * Visitor interface for traversing Criteria objects.
 * @template TranslationContext - The type of the context object passed during traversal.
 * @template TranslationOutput - The type of the result returned by visitor methods.
 */
export interface ICriteriaVisitor<
  TranslationContext,
  TranslationOutput = TranslationContext,
  TFilterVisitorOutput extends any = any,
> {
  visitRoot<
    RootCSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCSchema>,
  >(
    criteria: RootCriteria<RootCSchema, RootAlias>,
    context: TranslationContext,
  ): TranslationOutput;

  visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCSchema>,
  >(
    criteria: InnerJoinCriteria<JoinCSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput;

  visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCSchema>,
  >(
    criteria: LeftJoinCriteria<JoinCSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput;

  visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCSchema>,
  >(
    criteria: OuterJoinCriteria<JoinCSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput;

  visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
  ): TFilterVisitorOutput;

  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): TranslationOutput;

  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): TranslationOutput;
}
