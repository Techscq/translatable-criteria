import type { FilterOperator } from '../../../../criteria/types/operator.types.js';
import type { Filter } from '../../../../criteria/filter/filter.js';
import type { FilterGroup } from '../../../../criteria/filter/filter-group.js';
import type { ICriteriaVisitor } from '../../../../criteria/types/visitor-interface.types.js';

/**
 * Represents the output structure for a translated filter condition.
 */
export type PseudoSqlFilterOutput = {
  condition: string;
  params: any[];
};

/**
 * Defines the signature for a filter handler function.
 * Each handler is responsible for translating a specific FilterOperator into a SQL condition.
 * @param filter The Filter object containing the field, operator, and value.
 * @param fieldName The escaped and qualified field name (e.g., `table`.`column`).
 * @param generateParamPlaceholder A function to generate unique parameter placeholders.
 * @returns The translated SQL condition and its parameters.
 */
export type FilterHandler = (
  filter: Filter<string, FilterOperator>,
  fieldName: string,
  generateParamPlaceholder: () => string,
) => PseudoSqlFilterOutput;

/**
 * Represents the accumulating parts of the Pseudo SQL query during translation.
 */
export type PseudoSqlParts = {
  select: string[];
  from: string;
  joins: string[];
  where: string[];
  orderBy: string[];
  limit?: number;
  offset?: number;
  params: any[];
};

/**
 * Represents the final result of the Pseudo SQL translation process.
 */
export type PseudoSqlTranslationResult = {
  query: string;
  params: any[];
};

/**
 * Defines the logical properties for collection operators (e.g., JSON_CONTAINS_ANY, ARRAY_CONTAINS_ALL).
 */
export type CollectionLogic = {
  logicalOp: ' OR ' | ' AND ';
  isNot: boolean;
};

/**
 * Defines the extracted values and path for collection operators.
 */
export type ExtractedCollectionValues = {
  values: any[];
  jsonPath?: string;
};

/**
 * Defines the specific methods from PseudoSqlTranslator that JoinSqlBuilder needs to perform its operations.
 * This helps to break circular dependencies and maintain clear responsibilities.
 */
export interface TranslatorMethodsForJoinBuilder {
  generateParamPlaceholder: () => string;
  _buildConditionFromGroup: (
    group: FilterGroup<any>,
    alias: string,
    context: PseudoSqlParts,
  ) => PseudoSqlFilterOutput | undefined;
  getTranslatorInstance: () => ICriteriaVisitor<
    PseudoSqlParts,
    PseudoSqlFilterOutput
  >;
}

/**
 * Defines the specific methods from PseudoSqlTranslator that FilterGroupSqlBuilder needs to perform its operations.
 * This helps to break circular dependencies and maintain clear responsibilities.
 */
export interface TranslatorMethodsForFilterGroupBuilder {
  getTranslatorInstance: () => ICriteriaVisitor<
    PseudoSqlParts,
    PseudoSqlFilterOutput
  >;
}
