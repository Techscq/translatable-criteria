import { Filter } from './filter/filter.js';
import { OrderDirection } from './order/order.js';
import type { FilterPrimitive } from './filter/types/filter-primitive.types.js';
import { FilterOperator } from './types/operator.types.js';

export class Cursor<
  TFields extends string,
  Operator extends FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
> {
  readonly filters:
    | [Filter<TFields, Operator>, Filter<TFields, Operator>]
    | [Filter<TFields, Operator>];
  readonly order: OrderDirection;

  constructor(
    filterPrimitive:
      | readonly [
          Omit<FilterPrimitive<TFields, Operator>, 'operator'>,
          Omit<FilterPrimitive<TFields, Operator>, 'operator'>,
        ]
      | readonly [Omit<FilterPrimitive<TFields, Operator>, 'operator'>],
    operator: Operator,
    order: OrderDirection,
  ) {
    for (const filter of filterPrimitive) {
      if (!filter.field) {
        throw new Error('Cursor field must be defined');
      }
      if (filter.value === undefined || filter.value === null) {
        throw new Error(
          `Cursor value for field ${filter.field} must be defined`,
        );
      }
    }

    if (
      filterPrimitive.length === 2 &&
      filterPrimitive[0].field === filterPrimitive[1]?.field
    ) {
      throw new Error('Cursor fields must be different for a composite cursor');
    }

    const filterArray = filterPrimitive.map(
      (filterPrimitive) => new Filter({ ...filterPrimitive, operator }),
    );
    if (!filterArray[0]) {
      throw new Error('Cursor filters must be defined');
    }
    this.filters = [filterArray[0]];
    if (filterArray[1]) {
      this.filters.push(filterArray[1]);
    }
    this.order = order;
  }
}
