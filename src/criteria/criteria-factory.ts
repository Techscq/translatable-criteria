import { RootCriteria } from './root.criteria.js';
import type { CriteriaSchema } from './types/schema.types.js';
import { InnerJoinCriteria } from './join/inner.join-criteria.js';
import { LeftJoinCriteria } from './join/left.join-criteria.js';
import { OuterJoinCriteria } from './join/outer.join-criteria.js';
import type { ValidSchema } from './criteria.js';

/**
 * Provides static methods for creating instances of different types of `Criteria`.
 * This simplifies the creation of `Criteria` objects and ensures they are instantiated
 * with the correct schema configuration.
 */
export class CriteriaFactory {
  /**
   * Creates an instance of `RootCriteria`. This is the starting point for building a main query.
   * @template CSchema - The type of the `CriteriaSchema` for the root entity.
   * @param {ValidSchema<CSchema>} schema - An instance of `CriteriaSchema` that defines the structure of the root entity.
   * @returns {RootCriteria<CSchema>} An instance of `RootCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { UserSchema } from './path/to/your/schemas';
   *
   * const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
   */
  static GetCriteria<CSchema extends CriteriaSchema>(
    schema: ValidSchema<CSchema>,
  ): RootCriteria<CSchema> {
    return new RootCriteria(schema);
  }

  /**
   * Creates an instance of `InnerJoinCriteria`. Used to define an `INNER JOIN` in a query.
   * @template CSchema - The type of the `CriteriaSchema` for the entity to be joined.
   * @param {ValidSchema<CSchema>} schema - An instance of `CriteriaSchema` that defines the structure of the entity to be joined.
   * @returns {InnerJoinCriteria<CSchema>} An instance of `InnerJoinCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { PostSchema } from './path/to/your/schemas';
   *
   * const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(PostSchema);
   * // postJoinCriteria can then be used in the .join() method of another Criteria
   */
  static GetInnerJoinCriteria<CSchema extends CriteriaSchema>(
    schema: ValidSchema<CSchema>,
  ): InnerJoinCriteria<CSchema> {
    return new InnerJoinCriteria(schema);
  }

  /**
   * Creates an instance of `LeftJoinCriteria`. Used to define a `LEFT JOIN` in a query.
   * @template CSchema - The type of the `CriteriaSchema` for the entity to be joined.
   * @param {ValidSchema<CSchema>} schema - An instance of `CriteriaSchema` that defines the structure of the entity to be joined.
   * @returns {LeftJoinCriteria<CSchema>} An instance of `LeftJoinCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { CommentSchema } from './path/to/your/schemas';
   *
   * const commentJoinCriteria = CriteriaFactory.GetLeftJoinCriteria(CommentSchema);
   */
  static GetLeftJoinCriteria<CSchema extends CriteriaSchema>(
    schema: ValidSchema<CSchema>,
  ): LeftJoinCriteria<CSchema> {
    return new LeftJoinCriteria(schema);
  }

  /**
   * Creates an instance of `OuterJoinCriteria`. Used to define a `FULL OUTER JOIN` in a query.
   * @template CSchema - The type of the `CriteriaSchema` for the entity to be joined.
   * @param {ValidSchema<CSchema>} schema - An instance of `CriteriaSchema` that defines the structure of the entity to be joined.
   * @returns {OuterJoinCriteria<CSchema>} An instance of `OuterJoinCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { ProfileSchema } from './path/to/your/schemas';
   *
   * const profileJoinCriteria = CriteriaFactory.GetOuterJoinCriteria(ProfileSchema);
   */
  static GetOuterJoinCriteria<CSchema extends CriteriaSchema>(
    schema: ValidSchema<CSchema>,
  ): OuterJoinCriteria<CSchema> {
    return new OuterJoinCriteria(schema);
  }
}
