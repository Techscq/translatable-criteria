import type { Order } from '../../../../../criteria/order/order.js';
import { escapeField } from './sql-utils.js';

export class OrderSqlBuilder {
  /**
   * Builds the final ORDER BY clause string based on collected orders and cursor-applied fields.
   * @param collectedOrders An array of objects containing alias and Order details.
   * @param appliedOrderFieldsForCursor A Set of field keys (alias.field) that have already been applied by cursor pagination.
   * @param initialOrderByStrings Optional array of order strings that should be prepended (e.g., from cursor pagination).
   * @returns An array of SQL ORDER BY string fragments.
   */
  public buildOrderBy(
    collectedOrders: Array<{ alias: string; order: Order<string> }>,
    appliedOrderFieldsForCursor: Set<string>,
    initialOrderByStrings: string[] = [],
  ): string[] {
    const finalOrderByStrings: string[] = [...initialOrderByStrings];

    collectedOrders
      .sort((a, b) => a.order.sequenceId - b.order.sequenceId)
      .forEach(({ alias, order }) => {
        const fieldKey = `${alias}.${String(order.field)}`;
        if (!appliedOrderFieldsForCursor.has(fieldKey)) {
          finalOrderByStrings.push(
            `${escapeField(String(order.field), alias)} ${order.direction}`,
          );
        }
      });
    return finalOrderByStrings;
  }
}
