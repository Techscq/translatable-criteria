import type { FilterGroup } from '../filter/filter-group.js';
import type {
  CriteriaSchema,
  FieldOfSchema,
  JoinRelationType,
} from './schema.types.js';

import type { FilterPrimitive } from '../filter/types/filter-primitive.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';
import type {
  AnyJoinCriteria,
  StoredJoinDetails,
} from './join-utility.types.js';
import type { FilterOperator } from './operator.types.js';

/**
 * Defines the contract for managing filter conditions within a Criteria object.
 * @template CSchema - The {@link CriteriaSchema} of the entity to which filters are applied.
 */
export interface IFilterManager<CSchema extends CriteriaSchema> {
  /**
   * Initializes the filter criteria with a single filter primitive.
   * This replaces any existing filters.
   * @param {FilterPrimitive<FieldOfSchema<CSchema>>} filterPrimitive - The filter to apply.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   */
  where<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>, Operator>,
  ): void;

  /**
   * Adds a filter primitive to the current filter group using an AND logical operator.
   * @param {FilterPrimitive<FieldOfSchema<CSchema>>} filterPrimitive - The filter to add.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   * @throws {Error} If `where()` has not been called first.
   */
  andWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>, Operator>,
  ): void;

  /**
   * Adds a filter primitive, creating a new OR group with the existing filters.
   * @param {FilterPrimitive<FieldOfSchema<CSchema>>} filterPrimitive - The filter to add.
   * @throws {Error} If the specified field in filterPrimitive is not defined in the schema.
   * @throws {Error} If `where()` has not been called first.
   */
  orWhere<Operator extends FilterOperator>(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>, Operator>,
  ): void;

  /**
   * Retrieves the root filter group containing all applied filter conditions.
   * @returns {FilterGroup} The root {@link FilterGroup}.
   */
  getRootFilterGroup(): FilterGroup;
}

/**
 * Defines the contract for managing join operations within a Criteria object.
 * @template CSchema - The {@link CriteriaSchema} of the parent entity from which joins are made.
 */
export interface IJoinManager<CSchema extends CriteriaSchema> {
  /**
   * Adds a join configuration to the Criteria.
   * @template JoinSchema - The {@link CriteriaSchema} of the entity being joined.
   * @param {AnyJoinCriteria<JoinSchema>} criteriaToJoin -
   *   The criteria instance representing the entity to join (e.g., InnerJoinCriteria, LeftJoinCriteria).
   * @param {PivotJoin<CSchema, JoinSchema, JoinRelationType> | SimpleJoin<CSchema, JoinSchema, JoinRelationType>} joinParameter -
   *   The fully resolved parameters defining how the join should be performed.
   */
  addJoin<JoinSchema extends CriteriaSchema>(
    criteriaToJoin: AnyJoinCriteria<JoinSchema>,
    joinParameter:
      | PivotJoin<CSchema, JoinSchema, JoinRelationType>
      | SimpleJoin<CSchema, JoinSchema, JoinRelationType>,
  ): void;

  /**
   * Retrieves all configured join details.
   * @returns {Array<StoredJoinDetails<CSchema>>} An array of {@link StoredJoinDetails}.
   */
  getJoins(): Array<StoredJoinDetails<CSchema>>;
}
