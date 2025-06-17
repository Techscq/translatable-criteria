import { RootCriteria } from './root.criteria.js';
import type { CriteriaSchema, SelectedAliasOf } from './types/schema.types.js';
import { InnerJoinCriteria } from './join/inner.join-criteria.js';
import { LeftJoinCriteria } from './join/left.join-criteria.js';
import { OuterJoinCriteria } from './join/outer.join-criteria.js';

/**
 * Provides static methods for creating instances of different types of `Criteria`.
 * This simplifies the creation of `Criteria` objects and ensures they are instantiated
 * with the correct schema and alias configuration.
 */
export class CriteriaFactory {
  /**
   * Creates an instance of `RootCriteria`. This is the starting point for building a main query.
   * @template CSchema - The type of the `CriteriaSchema` for the root entity.
   * @template Alias - The type of the selected alias for the root entity.
   * @param {CSchema} schema - An instance of `CriteriaSchema` that defines the structure of the root entity.
   * @param {Alias} alias - A valid alias (string) for the root entity, defined within the `schema`.
   * @returns {RootCriteria<CSchema, Alias>} An instance of `RootCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { UserSchema } from './path/to/your/schemas';
   *
   * const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users');
   */
  static GetCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): RootCriteria<CSchema, Alias> {
    return new RootCriteria(schema, alias);
  }

  /**
   * Creates an instance of `InnerJoinCriteria`. Used to define an `INNER JOIN` in a query.
   * @template CSchema - The type of the `CriteriaSchema` for the entity to be joined.
   * @template Alias - The type of the selected alias for the joined entity.
   * @param {CSchema} schema - An instance of `CriteriaSchema` that defines the structure of the entity to be joined.
   * @param {Alias} alias - A valid alias (string) for the joined entity, defined within its `schema`.
   * @returns {InnerJoinCriteria<CSchema, Alias>} An instance of `InnerJoinCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { PostSchema } from './path/to/your/schemas';
   *
   * const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts');
   * // postJoinCriteria can then be used in the .join() method of another Criteria
   */
  static GetInnerJoinCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): InnerJoinCriteria<CSchema, Alias> {
    return new InnerJoinCriteria(schema, alias);
  }

  /**
   * Creates an instance of `LeftJoinCriteria`. Used to define a `LEFT JOIN` in a query.
   * @template CSchema - The type of the `CriteriaSchema` for the entity to be joined.
   * @template Alias - The type of the selected alias for the joined entity.
   * @param {CSchema} schema - An instance of `CriteriaSchema` that defines the structure of the entity to be joined.
   * @param {Alias} alias - A valid alias (string) for the joined entity, defined within its `schema`.
   * @returns {LeftJoinCriteria<CSchema, Alias>} An instance of `LeftJoinCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { CommentSchema } from './path/to/your/schemas';
   *
   * const commentJoinCriteria = CriteriaFactory.GetLeftJoinCriteria(CommentSchema, 'comments');
   */
  static GetLeftJoinCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): LeftJoinCriteria<CSchema, Alias> {
    return new LeftJoinCriteria(schema, alias);
  }

  /**
   * Creates an instance of `OuterJoinCriteria`. Used to define a `FULL OUTER JOIN` in a query.
   * @template CSchema - The type of the `CriteriaSchema` for the entity to be joined.
   * @template Alias - The type of the selected alias for the joined entity.
   * @param {CSchema} schema - An instance of `CriteriaSchema` that defines the structure of the entity to be joined.
   * @param {Alias} alias - A valid alias (string) for the joined entity, defined within its `schema`.
   * @returns {OuterJoinCriteria<CSchema, Alias>} An instance of `OuterJoinCriteria`.
   * @example
   * import { CriteriaFactory } from './criteria-factory';
   * import { ProfileSchema } from './path/to/your/schemas';
   *
   * const profileJoinCriteria = CriteriaFactory.GetOuterJoinCriteria(ProfileSchema, 'profiles');
   */
  static GetOuterJoinCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): OuterJoinCriteria<CSchema, Alias> {
    return new OuterJoinCriteria(schema, alias);
  }
}
