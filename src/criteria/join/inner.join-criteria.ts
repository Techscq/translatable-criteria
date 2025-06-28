import type {
  CriteriaSchema,
  JoinRelationType,
} from '../types/schema.types.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import { Criteria, type ValidSchema } from '../criteria.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

/**
 * Represents an INNER JOIN criteria.
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 * @template Alias - The selected alias for the joined entity from its schema.
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
      | PivotJoin<CriteriaSchema, CSchema, JoinRelationType>
      | SimpleJoin<CriteriaSchema, CSchema, JoinRelationType>,
    context: TranslationContext,
  ): void {
    typeof parameters.join_field === 'object'
      ? this.assetFieldOnSchema(parameters.join_field.reference)
      : this.assetFieldOnSchema(parameters.join_field);

    visitor.visitInnerJoin(this, parameters, context);
  }

  /**
   * Returns a new instance of `InnerJoinCriteria` with the same schema and alias configuration,
   * but with all other states reset to their defaults.
   * @returns {InnerJoinCriteria<CSchema, Alias>} A new, reset `InnerJoinCriteria` instance.
   */
  public resetCriteria(): InnerJoinCriteria<CSchema> {
    return new InnerJoinCriteria(this.schema as ValidSchema<CSchema>);
  }
}
