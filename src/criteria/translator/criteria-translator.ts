import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';
import type { RootCriteria } from '../root.criteria.js';
import type { CriteriaSchema } from '../types/schema.types.js';
import type { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import type { LeftJoinCriteria } from '../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../join/outer.join-criteria.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import type { Filter } from '../filter/filter.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type { FilterOperator } from '../types/operator.types.js';

/**
 * An abstract base class for creating specific criteria translators.
 * It implements the ICriteriaVisitor interface and provides a structured way to handle the translation process.
 *
 * @template TranslationContext The mutable context object (e.g., a query builder) passed through the traversal.
 * @template TranslationOutput The final result type of the translation process. Defaults to `TranslationContext`.
 * @template TFilterVisitorOutput The specific type returned by `visitFilter`.
 */
export abstract class CriteriaTranslator<
  TranslationContext,
  TranslationOutput = TranslationContext,
  TFilterVisitorOutput = any,
> implements ICriteriaVisitor<TranslationContext, TFilterVisitorOutput> {
  /**
   * Translates a `RootCriteria` object into a target format.
   * This is the main entry point for the translation process.
   * @param criteria The `RootCriteria` to translate.
   * @param source The initial context for the translation (e.g., a new query builder).
   * @returns The final translated output.
   */
  public abstract translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: TranslationContext,
  ): TranslationOutput;

  public abstract visitRoot<RootCSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCSchema>,
    context: TranslationContext,
  ): void;

  public abstract visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: InnerJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema>
      | SimpleJoin<ParentCSchema, JoinCSchema>,
    context: TranslationContext,
  ): void;

  public abstract visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: LeftJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema>
      | SimpleJoin<ParentCSchema, JoinCSchema>,
    context: TranslationContext,
  ): void;

  public abstract visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema>
      | SimpleJoin<ParentCSchema, JoinCSchema>,
    context: TranslationContext,
  ): void;

  public abstract visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
    context: TranslationContext,
  ): TFilterVisitorOutput;

  public abstract visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): void;

  public abstract visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): void;
}
