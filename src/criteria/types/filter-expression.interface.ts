import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from '../filter/types/filter-primitive.types.js';
import type { CriteriaSchema, FieldOfSchema } from './schema.types.js';
import type { FilterOperator } from './operator.types.js';

/**
 * Represents an expression that can be part of a filter query,
 * such as an individual filter ({@link Filter}) or a group of filters ({@link FilterGroup}).
 * This interface ensures that any filter expression can be converted
 * to its primitive, serializable representation.
 */
export interface IFilterExpression {
  /**
   * Converts the filter expression instance to its primitive, serializable representation.
   * This is useful for debugging, logging, or potentially storing criteria definitions.
   * @returns {FilterPrimitive<FieldOfSchema<CriteriaSchema>, FilterOperator> | FilterGroupPrimitive}
   * The primitive object representing this filter expression.
   */
  toPrimitive():
    | FilterPrimitive<FieldOfSchema<CriteriaSchema>, FilterOperator>
    | FilterGroupPrimitive;
}
