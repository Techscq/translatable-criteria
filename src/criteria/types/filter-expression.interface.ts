import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from '../filter/types/filter-primitive.types.js';
import type { CriteriaSchema, FieldOfSchema } from './schema.types.js';
import type { FilterOperator } from './operator.types.js';

export interface IFilterExpression {
  toPrimitive():
    | FilterPrimitive<FieldOfSchema<CriteriaSchema>, FilterOperator>
    | FilterGroupPrimitive;
}
