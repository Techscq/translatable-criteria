import type { PseudoSqlFilterOutput, PseudoSqlParts } from '../types.js';
import {
  Filter,
  FilterGroup,
  type ICriteriaVisitor,
  type IFilterExpression,
  LogicalOperator,
} from '../../../../../criteria/index.js';

/**
 * Defines the specific methods from PseudoSqlTranslator that FilterGroupSqlBuilder needs to perform its operations.
 * This helps to break circular dependencies and maintain clear responsibilities.
 */
export interface TranslatorMethodsForFilterGroupBuilder {
  /**
   * Returns the current translator instance, typed as an ICriteriaVisitor, for recursive calls.
   * @returns The translator instance.
   */
  getTranslatorInstance: () => ICriteriaVisitor<
    PseudoSqlParts,
    PseudoSqlFilterOutput
  >;
}

export class FilterGroupSqlBuilder {
  private methods: TranslatorMethodsForFilterGroupBuilder;

  /**
   * Creates an instance of FilterGroupSqlBuilder.
   * @param methods An object containing necessary methods from the translator.
   */
  constructor(methods: TranslatorMethodsForFilterGroupBuilder) {
    this.methods = methods;
  }

  /**
   * Builds a SQL condition string from a FilterGroup.
   * This is a recursive helper method.
   * @param group The FilterGroup to process.
   * @param alias The current entity alias.
   * @param context The mutable PseudoSqlParts context object.
   * @returns The translated SQL condition and its parameters, or undefined if the group is empty.
   */
  public buildConditionFromGroup(
    group: FilterGroup<any>,
    alias: string,
    context: PseudoSqlParts,
  ): PseudoSqlFilterOutput | undefined {
    if (group.items.length === 0) {
      return undefined;
    }

    const conditions: string[] = [];
    const allParams: any[] = [];
    const translatorInstance = this.methods.getTranslatorInstance();

    const processItem = (item: IFilterExpression): void => {
      if (item instanceof Filter) {
        const filterResult = item.accept(translatorInstance, alias, context);
        if (filterResult.condition) {
          conditions.push(filterResult.condition);
          allParams.push(...filterResult.params);
        }
      } else if (item instanceof FilterGroup) {
        const subGroupResult = this.buildConditionFromGroup(
          item,
          alias,
          context,
        );
        if (subGroupResult && subGroupResult.condition) {
          conditions.push(subGroupResult.condition);
          allParams.push(...subGroupResult.params);
        }
      }
    };

    group.items.forEach(processItem);

    if (conditions.length === 0) {
      return undefined;
    }

    const operator =
      group.logicalOperator === LogicalOperator.AND ? ' AND ' : ' OR ';
    return {
      condition: `(${conditions.join(operator)})`,
      params: allParams,
    };
  }
}
