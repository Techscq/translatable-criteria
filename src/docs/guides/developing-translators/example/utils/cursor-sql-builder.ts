import type { PseudoSqlParts } from '../types.js';
import { escapeField } from './sql-utils.js';
import { FilterOperator, RootCriteria } from '../../../../../criteria/index.js';

export class CursorSqlBuilder {
  private generateParamPlaceholder: () => string;

  constructor(generateParamPlaceholder: () => string) {
    this.generateParamPlaceholder = generateParamPlaceholder;
  }

  /**
   * Builds the WHERE and ORDER BY clauses for cursor pagination.
   * @param criteria The RootCriteria containing cursor details.
   * @param sqlParts The mutable PseudoSqlParts context object.
   * @returns An object containing the cursor WHERE condition and the cursor ORDER BY strings.
   */
  public buildCursorPagination(
    criteria: RootCriteria<any>,
    sqlParts: PseudoSqlParts,
  ): {
    cursorWhereCondition: string | null;
    cursorOrderByStrings: string[];
    appliedOrderFieldsForCursor: Set<string>;
  } {
    const cursorOrderByStrings: string[] = [];
    const appliedOrderFieldsForCursor = new Set<string>();

    if (!criteria.cursor) {
      return {
        cursorWhereCondition: null,
        cursorOrderByStrings: [],
        appliedOrderFieldsForCursor: new Set(),
      };
    }

    const cursorFilters = criteria.cursor.filters;
    const op =
      criteria.cursor.operator === FilterOperator.GREATER_THAN ? '>' : '<';
    let cursorWhereCondition = '';

    if (cursorFilters.length === 1) {
      const primaryFilter = cursorFilters[0]!;
      const primaryPlaceholder = this.generateParamPlaceholder();
      sqlParts.params.push(primaryFilter.value);
      cursorWhereCondition = `(${escapeField(String(primaryFilter.field), criteria.alias)} ${op} ${primaryPlaceholder})`;
    } else if (cursorFilters.length === 2) {
      const primaryFilter = cursorFilters[0]!;
      const secondaryFilter = cursorFilters[1]!;
      const primaryPlaceholder1 = this.generateParamPlaceholder();
      const primaryPlaceholder2 = this.generateParamPlaceholder();
      const secondaryPlaceholder = this.generateParamPlaceholder();

      sqlParts.params.push(
        primaryFilter.value,
        primaryFilter.value,
        secondaryFilter.value,
      );
      cursorWhereCondition = `((${escapeField(String(primaryFilter.field), criteria.alias)} ${op} ${primaryPlaceholder1}) OR (${escapeField(String(primaryFilter.field), criteria.alias)} = ${primaryPlaceholder2} AND ${escapeField(String(secondaryFilter.field), criteria.alias)} ${op} ${secondaryPlaceholder}))`;
    }

    const cursorOrderDirection = criteria.cursor.order;
    cursorFilters.forEach((cf) => {
      const fieldKey = `${criteria.alias}.${String(cf.field)}`;
      cursorOrderByStrings.push(
        `${escapeField(String(cf.field), criteria.alias)} ${cursorOrderDirection}`,
      );
      appliedOrderFieldsForCursor.add(fieldKey);
    });

    return {
      cursorWhereCondition: cursorWhereCondition || null,
      cursorOrderByStrings,
      appliedOrderFieldsForCursor,
    };
  }
}
