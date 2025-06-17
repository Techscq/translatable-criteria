import type {
  CriteriaSchema,
  JoinRelationType,
  SchemaJoins,
  SelectedAliasOf,
} from './schema.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';

import type { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import type { LeftJoinCriteria } from '../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../join/outer.join-criteria.js';
import type { PivotJoinInput, SimpleJoinInput } from './join-input.types.js';

/**
 * Represents any type of join criteria (Inner, Left, or Outer).
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 * @template Alias - The selected alias for the joined entity from its schema.
 */
export type AnyJoinCriteria<
  CSchema extends CriteriaSchema,
  Alias extends SelectedAliasOf<CSchema> = SelectedAliasOf<CSchema>,
> =
  | InnerJoinCriteria<CSchema, Alias>
  | LeftJoinCriteria<CSchema, Alias>
  | OuterJoinCriteria<CSchema, Alias>;

/**
 * Defines the structure for storing the details of a configured join.
 * This is used internally by the Criteria system.
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity in the join.
 */
export interface StoredJoinDetails<ParentSchema extends CriteriaSchema> {
  /**
   * The fully resolved parameters for the join, either {@link PivotJoin} or {@link SimpleJoin}.
   */
  parameters:
    | PivotJoin<ParentSchema, CriteriaSchema, JoinRelationType>
    | SimpleJoin<ParentSchema, CriteriaSchema, JoinRelationType>;
  /**
   * The criteria instance representing the joined entity (e.g., InnerJoinCriteria).
   */
  criteria: AnyJoinCriteria<CriteriaSchema, SelectedAliasOf<CriteriaSchema>>;
}

/**
 * Determines the type of the criteria object to be passed to the `.join()` method.
 * If the `ActualJoinedAlias` is not a valid join alias in the `ParentSchema`,
 * this type resolves to an error message string, providing strong type-time feedback.
 * Otherwise, it resolves to {@link AnyJoinCriteria}.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchema - The {@link CriteriaSchema} of the entity to be joined.
 * @template ActualJoinedAlias - The specific alias used for the `JoinedSchema`.
 * @template MatchingConfigForActualAlias - The join configuration from `ParentSchema` that matches `ActualJoinedAlias`.
 *                                         Should be `never` if no match is found.
 */
export type JoinCriteriaParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  ActualJoinedAlias extends SelectedAliasOf<JoinedSchema>,
  MatchingConfigForActualAlias extends SchemaJoins<string> | never,
> = [MatchingConfigForActualAlias] extends [never]
  ? `Error: The alias '${ActualJoinedAlias}' of schema '${JoinedSchema['source_name']}' is not configured for join in '${ParentSchema['source_name']}'.`
  : AnyJoinCriteria<JoinedSchema, ActualJoinedAlias>;

/**
 * Determines the expected shape of the join parameters object passed to the `.join()` method,
 * based on the `join_relation_type` defined in the `ParentSchema` for the `ActualJoinedAlias`.
 * If the `ActualJoinedAlias` is not a valid join alias, this type resolves to `never`.
 * For 'many_to_many' relations, it expects {@link PivotJoinInput}.
 * For other relations (one-to-one, one-to-many, many-to-one), it expects {@link SimpleJoinInput}.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchema - The {@link CriteriaSchema} of the entity to be joined.
 * @template MatchingConfigForActualAlias - The join configuration from `ParentSchema` that matches the alias of `JoinedSchema`.
 *                                         Should be `never` if no match is found.
 */
export type JoinParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  MatchingConfigForActualAlias extends SchemaJoins<string> | never,
> = [MatchingConfigForActualAlias] extends [never]
  ? never
  : MatchingConfigForActualAlias['join_relation_type'] extends 'many_to_many'
    ? PivotJoinInput<ParentSchema, JoinedSchema>
    : SimpleJoinInput<ParentSchema, JoinedSchema>;

/**
 * Extracts the specific join configuration object from the `ParentSchema`'s `joins` array
 * that matches the provided `JoinedSchemaSpecificAlias`.
 * This utility type is crucial for inferring the `join_relation_type` and other
 * join-specific details defined in the parent schema.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchemaSpecificAlias - The specific alias of the joined entity,
 *                                       as defined in the `ParentSchema.joins` configuration.
 * @example
 * // Given UserSchema has a join defined as: { alias: 'posts', join_relation_type: 'one_to_many' }
 * // type UserPostsJoinConfig = SpecificMatchingJoinConfig<typeof UserSchema, 'posts'>;
 * // UserPostsJoinConfig would be: { alias: 'posts'; join_relation_type: 'one_to_many'; }
 */
export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificAlias extends string,
> = Extract<
  ParentSchema['joins'][number],
  { alias: JoinedSchemaSpecificAlias }
>;
