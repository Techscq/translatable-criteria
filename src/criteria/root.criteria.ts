import { Criteria, type ValidSchema } from './criteria.js';
import type { CriteriaSchema } from './types/schema.types.js';
import type { ICriteriaVisitor } from './types/visitor-interface.types.js';

/**
 * Represents the root criteria for a query.
 * @template CSchema - The {@link CriteriaSchema} of the root entity.
 */
export class RootCriteria<
  CSchema extends CriteriaSchema,
> extends Criteria<CSchema> {
  /**
   * Accepts a criteria visitor to process this root criteria.
   * @param visitor The visitor instance responsible for translating criteria parts.
   * @param context The context object to be passed to the visitor.
   */
  public accept<TranslationContext>(
    visitor: ICriteriaVisitor<TranslationContext>,
    context: TranslationContext,
  ): void {
    visitor.visitRoot(this, context);
  }

  /**
   * Returns a new instance of `RootCriteria` with the same schema configuration,
   * but with all other states (filters, joins, ordering, pagination, selection) reset to their defaults.
   * @returns {RootCriteria<CSchema>} A new, reset `RootCriteria` instance.
   */
  public resetCriteria(): RootCriteria<CSchema> {
    return new RootCriteria(this.schema as ValidSchema<CSchema>);
  }
}
