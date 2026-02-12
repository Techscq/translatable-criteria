import type { CriteriaSchema } from '../types/schema.types.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import { Criteria, type ValidSchema } from '../criteria.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

/**
 * Represents a LEFT JOIN criteria.
 * It extends the base {@link Criteria} and defines how it's visited by a {@link ICriteriaVisitor}.
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 */
export class LeftJoinCriteria<
  CSchema extends CriteriaSchema,
> extends Criteria<CSchema> {
  /**
   * Accepts a criteria visitor to process this left join criteria.
   * It first validates the join field against the schema before dispatching to the visitor.
   * @template TranslationContext - The type of the context object passed during traversal.
   * @param {ICriteriaVisitor<TranslationContext>} visitor - The visitor instance.
   * @param {PivotJoin<CriteriaSchema, CSchema> | SimpleJoin<CriteriaSchema, CSchema>} parameters -
   *   The fully resolved parameters for this join, including parent and join field details.
   * @param {TranslationContext} context - The context object to be passed to the visitor.
   */
  accept<TranslationContext>(
    visitor: ICriteriaVisitor<TranslationContext>,
    parameters:
      | PivotJoin<CriteriaSchema, CSchema>
      | SimpleJoin<CriteriaSchema, CSchema>,
    context: TranslationContext,
  ): void {
    typeof parameters.relation_field === 'object'
      ? this.assertFieldOnSchema(parameters.relation_field.reference)
      : this.assertFieldOnSchema(parameters.relation_field);

    visitor.visitLeftJoin(this, parameters, context);
  }
  /**
   * Returns a new instance of `LeftJoinCriteria` with the same schema configuration,
   * but with all other states (filters, joins, ordering, pagination, selection) reset to their defaults.
   * @returns {LeftJoinCriteria<CSchema>} A new, reset `LeftJoinCriteria` instance.
   */
  resetCriteria(): LeftJoinCriteria<CSchema> {
    return new LeftJoinCriteria(this.schema as ValidSchema<CSchema>);
  }
}
