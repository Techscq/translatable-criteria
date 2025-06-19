import { Criteria } from './criteria.js';
import type { CriteriaSchema, SelectedAliasOf } from './types/schema.types.js';
import type { ICriteriaVisitor } from './types/visitor-interface.types.js';

/**
 * Represents the root criteria for a query.
 * This is the main entry point for building a query and defines the primary entity being queried.
 * It extends the base {@link Criteria} and defines how it's visited by a {@link ICriteriaVisitor}.
 * @template CSchema - The {@link CriteriaSchema} of the root entity.
 * @template Alias - The selected alias for the root entity from its schema.
 */
export class RootCriteria<
  CSchema extends CriteriaSchema,
  Alias extends SelectedAliasOf<CSchema>,
> extends Criteria<CSchema, Alias> {
  /**
   * Accepts a criteria visitor to process this root criteria.
   * This method is the entry point for the visitor pattern to traverse the criteria tree.
   * @template TranslationContext - The type of the context object passed during traversal (e.g., a query builder
   *   instance).
   * @template TranslationOutput - The type of the result returned by visitor methods (e.g., the modified query builder
   *   or a query string).
   * @param {ICriteriaVisitor<TranslationContext, TranslationOutput>} visitor - The visitor instance responsible for
   *   translating criteria parts.
   * @param {TranslationContext} context - The context object to be passed to the visitor (e.g., an initial query
   *   builder or an empty string for SQL).
   * @returns {TranslationOutput} The result of the visitor processing this root criteria and its components.
   */
  accept<TranslationContext, TranslationOutput>(
    visitor: ICriteriaVisitor<TranslationContext, TranslationOutput>,
    context: TranslationContext,
  ): TranslationOutput {
    return visitor.visitRoot(this, context);
  }
  /**
   * Returns a new instance of `RootCriteria` with the same schema and alias configuration,
   * but with all other states (filters, joins, ordering, pagination, selection) reset to their defaults.
   * @returns {RootCriteria<CSchema, Alias>} A new, reset `RootCriteria` instance.
   */
  resetCriteria(): RootCriteria<CSchema, Alias> {
    return new RootCriteria(this.schema, this._alias);
  }
}
