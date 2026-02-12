import type { CriteriaSchema } from '../types/schema.types.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import { Criteria, type ValidSchema } from '../criteria.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

/**
 * Represents an INNER JOIN criteria.
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 */
export class InnerJoinCriteria<
  CSchema extends CriteriaSchema,
> extends Criteria<CSchema> {
  /**
   * Accepts a criteria visitor to process this inner join criteria.
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

    visitor.visitInnerJoin(this, parameters, context);
  }

  /**
   * Returns a new instance of `InnerJoinCriteria` with the same schema configuration,
   * but with all other states reset to their defaults.
   * @returns {InnerJoinCriteria<CSchema>} A new, reset `InnerJoinCriteria` instance.
   */
  public resetCriteria(): InnerJoinCriteria<CSchema> {
    return new InnerJoinCriteria(this.schema as ValidSchema<CSchema>);
  }
}
