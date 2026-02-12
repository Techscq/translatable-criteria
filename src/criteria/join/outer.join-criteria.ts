import type { CriteriaSchema } from '../types/schema.types.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import { Criteria, type ValidSchema } from '../criteria.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

/**
 * Represents an OUTER JOIN (typically FULL OUTER JOIN) criteria.
 * It extends the base {@link Criteria} and defines how it's visited by a {@link ICriteriaVisitor}.
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 */
export class OuterJoinCriteria<
  CSchema extends CriteriaSchema,
> extends Criteria<CSchema> {
  /**
   * Accepts a criteria visitor to process this outer join criteria.
   * @template TranslationContext The type of the context object passed during traversal.
   * @param visitor The visitor instance.
   * @param parameters The fully resolved parameters for this join.
   * @param context The context object to be passed to the visitor.
   */
  public accept<TranslationContext>(
    visitor: ICriteriaVisitor<TranslationContext>,
    parameters:
      | PivotJoin<CriteriaSchema, CSchema>
      | SimpleJoin<CriteriaSchema, CSchema>,
    context: TranslationContext,
  ): void {
    typeof parameters.relation_field === 'object'
      ? this.assertFieldOnSchema(parameters.relation_field.reference)
      : this.assertFieldOnSchema(parameters.relation_field);
    visitor.visitOuterJoin(this, parameters, context);
  }
  /**
   * Returns a new instance of `OuterJoinCriteria` with the same schema configuration,
   * but with all other states reset to their defaults.
   * @returns {OuterJoinCriteria<CSchema>} A new, reset `OuterJoinCriteria` instance.
   */
  public resetCriteria(): OuterJoinCriteria<CSchema> {
    return new OuterJoinCriteria(this.schema as ValidSchema<CSchema>);
  }
}
