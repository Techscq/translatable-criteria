import { FilterOperator } from '../types/operator.types.js';
import type { IFilterExpression } from '../types/filter-expression.interface.js';
import type {
  FilterPrimitive,
  FilterValue,
  PrimitiveFilterValue,
} from './types/filter-primitive.types.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

export class Filter<T extends string, Operator extends FilterOperator>
  implements IFilterExpression
{
  constructor(private readonly primitive: FilterPrimitive<T, Operator>) {
    this.validatePrimitiveValueForOperator(primitive.operator);
  }

  get field(): T {
    return this.primitive.field;
  }

  get operator(): Operator {
    return this.primitive.operator;
  }

  get value(): FilterValue<Operator> {
    return this.primitive.value;
  }

  /**
   * Accepts a visitor and calls the appropriate visit method.
   * @template TranslationContext The type of the context object.
   * @template TFilterVisitorOutput The specific return type expected from `visitFilter`.
   * @param visitor The visitor implementation.
   * @param currentAlias The alias of the current entity being processed.
   * @param context The mutable context object for the translation.
   * @returns The result of the visitor processing this filter.
   */
  public accept<TranslationContext, TFilterVisitorOutput extends any>(
    visitor: ICriteriaVisitor<TranslationContext, TFilterVisitorOutput>,
    currentAlias: string,
    context: TranslationContext,
  ): TFilterVisitorOutput {
    return visitor.visitFilter(this, currentAlias, context);
  }

  public toPrimitive(): FilterPrimitive<T, Operator> {
    return this.primitive;
  }

  private isString(value: any): value is string {
    return typeof value === 'string';
  }
  private isNumber(value: any): value is number {
    return typeof value === 'number';
  }
  private isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
  }

  private isValidSingleKeyObjectWithValue(
    objectValue: any,
    valueValidator: (innerValue: any) => boolean,
  ): boolean {
    return (
      this.isObject(objectValue) &&
      Object.keys(objectValue).length === 1 &&
      valueValidator(Object.values(objectValue as object)[0])
    );
  }

  private validatePrimitiveValueForOperator(operator: FilterOperator) {
    switch (operator) {
      case FilterOperator.LIKE:
      case FilterOperator.NOT_LIKE:
      case FilterOperator.CONTAINS:
      case FilterOperator.NOT_CONTAINS:
      case FilterOperator.STARTS_WITH:
      case FilterOperator.ENDS_WITH:
      case FilterOperator.SET_CONTAINS:
      case FilterOperator.SET_NOT_CONTAINS:
      case FilterOperator.MATCHES_REGEX:
      case FilterOperator.ILIKE:
      case FilterOperator.NOT_ILIKE:
        if (!this.isString(this.value)) {
          throw new Error(
            `Filter value for operator ${operator} must be a string type`,
          );
        }
        break;
      case FilterOperator.EQUALS:
      case FilterOperator.NOT_EQUALS:
      case FilterOperator.GREATER_THAN:
      case FilterOperator.GREATER_THAN_OR_EQUALS:
      case FilterOperator.LESS_THAN:
      case FilterOperator.LESS_THAN_OR_EQUALS:
        if (!this.isPrimitiveFilterValue(this.value))
          throw new Error(
            `Filter value for operator ${operator} must be a string | number | boolean | Date | null type`,
          );
        break;
      case FilterOperator.ARRAY_CONTAINS_ELEMENT:
        if (
          !this.isPrimitiveFilterValue(this.value) &&
          !this.isValidSingleKeyObjectWithValue(this.value, (val) =>
            this.isPrimitiveFilterValue(val),
          )
        ) {
          throw new Error(
            'For ARRAY_CONTAINS_ELEMENT, value must be a PrimitiveFilterValue or an object like { "path.to.array": elementValue }',
          );
        }
        break;
      case FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS:
      case FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT:
      case FilterOperator.ARRAY_EQUALS:
        if (
          !this.isArrayOfPrimitives(this.value) &&
          !this.isValidSingleKeyObjectWithValue(this.value, (val) =>
            this.isArrayOfPrimitives(val),
          )
        ) {
          throw new Error(
            'For ARRAY_CONTAINS_ALL/ANY/EQUALS, value must be an Array<Primitive> or an object like { "path.to.array": [elements] }',
          );
        }
        break;
      case FilterOperator.IN:
      case FilterOperator.NOT_IN:
      case FilterOperator.SET_CONTAINS_ANY:
      case FilterOperator.SET_CONTAINS_ALL:
        if (!this.isArrayOfPrimitives(this.value))
          throw new Error(
            `Filter value for operator ${operator} must be an array of string, number, boolean, Date`,
          );
        break;
      case FilterOperator.BETWEEN:
      case FilterOperator.NOT_BETWEEN:
        if (!this.isTupleOfTwoPrimitives(this.value)) {
          throw new Error(
            `Filter value for operator ${operator} must be a tuple of two primitive values: [min, max]`,
          );
        }
        break;
      case FilterOperator.IS_NULL:
      case FilterOperator.IS_NOT_NULL:
        if (!this.isNull(this.value) && !this.isUndefined(this.value))
          throw new Error(
            `Filter value for operator ${operator} must be null or undefined`,
          );
        break;
      case FilterOperator.JSON_CONTAINS:
      case FilterOperator.JSON_NOT_CONTAINS:
        if (
          !this.isObject(this.value) ||
          !Object.values(this.value).every(
            (val) =>
              this.isPrimitiveFilterValue(val) ||
              Array.isArray(val) ||
              this.isRecord(val),
          )
        ) {
          throw new Error(
            'Filter value must be an object where each value is a string, number, boolean, Date, null, an Array, or a Record<string,any>',
          );
        }
        break;
      default:
        throw new Error(`Unhandled filter operator: ${operator}`);
    }
  }

  private isArrayOfPrimitives(
    value: any,
  ): value is Array<Exclude<PrimitiveFilterValue, null | undefined>> {
    return (
      Array.isArray(value) &&
      value.every((item) => {
        return (
          item instanceof Date ||
          this.isString(item) ||
          this.isNumber(item) ||
          this.isBoolean(item)
        );
      })
    );
  }

  private isTupleOfTwoPrimitives(
    value: any,
  ): value is [
    Exclude<PrimitiveFilterValue, null | undefined>,
    Exclude<PrimitiveFilterValue, null | undefined>,
  ] {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      this.isPrimitiveFilterValue(value[0]) &&
      !this.isNull(value[0]) &&
      !this.isUndefined(value[0]) &&
      this.isPrimitiveFilterValue(value[1]) &&
      !this.isNull(value[1]) &&
      !this.isUndefined(value[1])
    );
  }

  private isObject(value: any): value is object {
    return (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value !== null &&
      value !== undefined
    );
  }

  private isNull(value: any): value is null {
    return value === null;
  }

  private isUndefined(value: any): value is undefined {
    return value === undefined;
  }

  private isPrimitiveFilterValue(value: any): value is PrimitiveFilterValue {
    return (
      this.isString(value) ||
      this.isNumber(value) ||
      this.isBoolean(value) ||
      value instanceof Date ||
      this.isNull(value)
    );
  }

  private isRecord(value: any): value is Record<string, any> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).every((key) => typeof key === 'string')
    );
  }
}
