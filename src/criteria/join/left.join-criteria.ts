import type {
  CriteriaSchema,
  JoinRelationType,
} from '../types/schema.types.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import { Criteria, type ValidSchema } from '../criteria.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

/**
 * Represents a LEFT JOIN criteria.
 * It extends the base {@link Criteria} and defines how it's visited by a {@link ICriteriaVisitor}.
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 * @template Alias - The selected alias for the joined entity from its schema.
 */
export class LeftJoinCriteria<
  CSchema extends CriteriaSchema,
> extends Criteria<CSchema> {
  /**
   * Accepts a criteria visitor to process this left join criteria.
   * It first validates the join field against the schema before dispatching to the visitor.
   * @template TranslationContext - The type of the context object passed during traversal.
   * @template TranslationOutput - The type of the result returned by visitor methods.
   * @param {ICriteriaVisitor<TranslationContext, TranslationOutput>} visitor - The visitor instance.
   * @param {PivotJoin<CriteriaSchema, CSchema, JoinRelationType> | SimpleJoin<CriteriaSchema, CSchema, JoinRelationType>} parameters -
   *   The fully resolved parameters for this join, including parent and join field details.
   * @param {TranslationContext} context - The context object to be passed to the visitor.
   * @returns {TranslationOutput} The result of the visitor processing this join.
   */
  accept<TranslationContext>(
    visitor: ICriteriaVisitor<TranslationContext>,
    parameters:
      | PivotJoin<CriteriaSchema, CSchema, JoinRelationType>
      | SimpleJoin<CriteriaSchema, CSchema, JoinRelationType>,
    context: TranslationContext,
  ): void {
    typeof parameters.relation_field === 'object'
      ? this.assetFieldOnSchema(parameters.relation_field.reference)
      : this.assetFieldOnSchema(parameters.relation_field);

    visitor.visitLeftJoin(this, parameters, context);
  }
  /**
   * Returns a new instance of `RootCriteria` with the same schema and alias configuration,
   * but with all other states (filters, joins, ordering, pagination, selection) reset to their defaults.
   * @returns {LeftJoinCriteria<CSchema, Alias>} A new, reset `RootCriteria` instance.
   */
  resetCriteria(): LeftJoinCriteria<CSchema> {
    return new LeftJoinCriteria(this.schema as ValidSchema<CSchema>);
  }
}
