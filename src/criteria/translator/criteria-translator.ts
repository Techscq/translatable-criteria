import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from '../types/schema.types.js';
import type { RootCriteria } from '../root.criteria.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import type { LeftJoinCriteria } from '../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../join/outer.join-criteria.js';
import type { Filter } from '../filter/filter.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';
import type { FilterOperator } from '../types/operator.types.js';

/**
 * Abstract Class for translating criteria into various query formats
 * @template TranslationContext - The target format (e.g., QueryBuilder, raw SQL string, etc.)
 * @template TranslationOutput - The output format by default its Source (Only specify this if
 * you really need something like a memory translator and the output would be different
 * from the TranslationContext itself)
 * @template RootSchema - The schema type for the root criteria
 * @example
 * // TypeORM QueryBuilder translator
 * class TypeORMTranslator implements CriteriaTranslator<SelectQueryBuilder<Entity>> {
 *  ...Concrete implementation
 * }
 *
 * // Raw MySQL translator
 * export class MysqlTranslator extends CriteriaTranslator<string, string> { {
 *  ...Concrete implementation
 * }
 */
export abstract class CriteriaTranslator<
  TranslationContext,
  TranslationOutput = TranslationContext,
  TFilterVisitorOutput extends any = any,
> implements
    ICriteriaVisitor<
      TranslationContext,
      TranslationOutput,
      TFilterVisitorOutput
    >
{
  /**
   * Translates a criteria into the target source format
   * @param criteria - The criteria to translate
   * @param source - The source object to translate into (e.g., QueryBuilder instance, or raw SQL string)
   * @returns The modified source or the output format if specified
   */
  translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
    source: TranslationContext,
  ): TranslationOutput {
    return criteria.accept(this, source);
  }

  abstract visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    context: TranslationContext,
  ): TranslationOutput;

  abstract visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput;

  abstract visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput;

  abstract visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput;

  abstract visitFilter<
    FieldType extends string,
    Operator extends FilterOperator,
  >(
    filter: Filter<FieldType, Operator>,
    currentAlias: string,
  ): TFilterVisitorOutput;

  abstract visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): TranslationOutput;

  abstract visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: TranslationContext,
  ): TranslationOutput;
}
