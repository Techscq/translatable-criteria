import { FilterOperator, LogicalOperator } from '../types/operator.types.js';
import { Filter } from './filter.js';
import { FilterNormalizer } from './filter-utils.js';
import type { IFilterExpression } from '../types/filter-expression.interface.js';
import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from './types/filter-primitive.types.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

export class FilterGroup<T extends string = string>
  implements IFilterExpression
{
  private readonly _logicalOperator: LogicalOperator;
  private readonly _items: ReadonlyArray<
    Filter<T, FilterOperator> | FilterGroup<T>
  >;

  constructor(filterGroupPrimitive: FilterGroupPrimitive<T>) {
    const normalizedGroup =
      FilterNormalizer.normalizeGroup(filterGroupPrimitive);
    this._logicalOperator = normalizedGroup.logicalOperator;
    this._items = normalizedGroup.items.map((item) => {
      if ('logicalOperator' in item) {
        return new FilterGroup(item);
      }
      return new Filter(item);
    });
  }

  get items(): ReadonlyArray<Filter<T, FilterOperator> | FilterGroup<T>> {
    return this._items;
  }

  get logicalOperator(): LogicalOperator {
    return this._logicalOperator;
  }

  static createInitial<T extends string = string>(
    filterPrimitive: FilterPrimitive<T, FilterOperator>,
  ): FilterGroup<T> {
    return new FilterGroup({
      logicalOperator: LogicalOperator.AND,
      items: [filterPrimitive],
    });
  }

  toPrimitive(): FilterGroupPrimitive<T> {
    return {
      logicalOperator: this._logicalOperator,
      items: this._items.map((item) => item.toPrimitive()),
    };
  }

  addAnd(filterPrimitive: FilterPrimitive<T, FilterOperator>): FilterGroup<T> {
    if (this._logicalOperator === LogicalOperator.AND) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [
          ...this._items.map((item) => item.toPrimitive()),
          filterPrimitive,
        ],
      });
    }

    const currentItems = this._items.map((item) => item.toPrimitive());
    const lastItem = currentItems[currentItems.length - 1];

    if (
      !lastItem ||
      !('logicalOperator' in lastItem) ||
      lastItem.logicalOperator !== LogicalOperator.AND
    ) {
      currentItems.push({
        logicalOperator: LogicalOperator.AND,
        items: [filterPrimitive],
      });
    } else {
      currentItems[currentItems.length - 1] = {
        logicalOperator: LogicalOperator.AND,
        items: [...lastItem.items, filterPrimitive],
      };
    }

    return new FilterGroup({
      logicalOperator: LogicalOperator.OR,
      items: currentItems,
    });
  }

  addOr(filterPrimitive: FilterPrimitive<T, FilterOperator>): FilterGroup<T> {
    const currentItems = this._items.map((item) => item.toPrimitive());

    if (this._logicalOperator === LogicalOperator.AND) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [
          ...(currentItems.length > 0
            ? [
                {
                  logicalOperator: LogicalOperator.AND,
                  items: currentItems,
                },
              ]
            : []),
          {
            logicalOperator: LogicalOperator.AND,
            items: [filterPrimitive],
          },
        ],
      });
    }

    return new FilterGroup({
      logicalOperator: LogicalOperator.OR,
      items: [
        ...currentItems,
        {
          logicalOperator: LogicalOperator.AND,
          items: [filterPrimitive],
        },
      ],
    });
  }

  accept<TranslationContext, TranslationOutput = TranslationContext>(
    visitor: ICriteriaVisitor<TranslationContext, TranslationOutput>,
    currentAlias: string,
    context: TranslationContext,
  ): TranslationOutput {
    return this.logicalOperator === LogicalOperator.AND
      ? visitor.visitAndGroup(this, currentAlias, context)
      : visitor.visitOrGroup(this, currentAlias, context);
  }
}
