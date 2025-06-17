import type { CriteriaSchema, FieldOfSchema } from './types/schema.types.js';
import { FilterGroup } from './filter/filter-group.js';
import type { IFilterManager } from './types/manager.interface.js';
import {
  type FilterOperator,
  LogicalOperator,
} from './types/operator.types.js';
import type { FilterPrimitive } from './filter/types/filter-primitive.types.js';

export class CriteriaFilterManager<CSchema extends CriteriaSchema>
  implements IFilterManager<CSchema>
{
  private _rootFilterGroup: FilterGroup = new FilterGroup({
    items: [],
    logicalOperator: LogicalOperator.AND,
  });

  where<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>, Operator>,
  ): void {
    this._rootFilterGroup = FilterGroup.createInitial(filterPrimitive);
  }

  andWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>, Operator>,
  ): void {
    this._rootFilterGroup = this._rootFilterGroup.addAnd(filterPrimitive);
  }

  orWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>, Operator>,
  ): void {
    this._rootFilterGroup = this._rootFilterGroup.addOr(filterPrimitive);
  }

  getRootFilterGroup(): FilterGroup {
    return this._rootFilterGroup;
  }
}
