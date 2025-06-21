import type {
  CriteriaSchema,
  JoinRelationType,
  SchemaJoins,
} from './schema.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';

import type { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import type { LeftJoinCriteria } from '../join/left.join-criteria.js';
import type { OuterJoinCriteria } from '../join/outer.join-criteria.js';
import type { PivotJoinInput, SimpleJoinInput } from './join-input.types.js';

/**
 * Represents any type of join criteria (Inner, Left, or Outer).
 * @template CSchema - The {@link CriteriaSchema} of the entity being joined.
 */
export type AnyJoinCriteria<CSchema extends CriteriaSchema> =
  | InnerJoinCriteria<CSchema>
  | LeftJoinCriteria<CSchema>
  | OuterJoinCriteria<CSchema>;

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
  criteria: AnyJoinCriteria<CriteriaSchema>;
}

/**
 * Determines the type of the criteria object to be passed to the `.join()` method.
 * If the `ActualJoinedSourceName` is not configured for join in the `ParentSchema`,
 * this type resolves to an error message string, providing strong type-time feedback.
 * Otherwise, it resolves to {@link AnyJoinCriteria}.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchema - The {@link CriteriaSchema} of the entity to be joined.
 * @template ActualJoinedSourceName - The specific `source_name` of the `JoinedSchema` being joined.
 * @template MatchingConfigForActualSourceName - The join configuration from `ParentSchema` that matches `ActualJoinedSourceName`.
 *                                         Should be `never` if no match is found.
 */
export type JoinCriteriaParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  ActualJoinedSourceName extends JoinedSchema['source_name'],
  MatchingConfigForActualSourceName extends SchemaJoins<string> | never,
> = [MatchingConfigForActualSourceName] extends [never]
  ? `Error: The joined parent source name '${ActualJoinedSourceName}' is not configured for join in '${ParentSchema['source_name']}'.`
  : AnyJoinCriteria<JoinedSchema>;

/**
 * Determines the expected shape of the join parameters object passed to the `.join()` method,
 * based on the `relation_type` defined in the `ParentSchema` for the matching join configuration.
 * If no matching join configuration is found for the `ActualJoinedSourceName`, this type resolves to `never`.
 * For 'many_to_many' relations, it expects {@link PivotJoinInput}.
 * For other relations (one-to-one, one-to-many, many-to-one), it expects {@link SimpleJoinInput}.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchema - The {@link CriteriaSchema} of the entity to be joined.
 * @template MatchingConfigForActualSourceName - The join configuration from `ParentSchema` that matches the `source_name` of `JoinedSchema`.
 *                                         Should be `never` if no match is found.
 */
export type JoinParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  MatchingConfigForActualAlias extends SchemaJoins<string> | never,
> = [MatchingConfigForActualAlias] extends [never]
  ? never
  : MatchingConfigForActualAlias['relation_type'] extends 'many_to_many'
    ? PivotJoinInput<ParentSchema, JoinedSchema>
    : SimpleJoinInput<ParentSchema, JoinedSchema>;

/**
 * Extracts the specific join configuration object from the `ParentSchema`'s `joins` array
 * that matches the provided `JoinedSchemaSpecificSourceName`.
 * This utility type is crucial for inferring the `relation_type` and other
 * join-specific details defined in the parent schema.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchemaSpecificSourceName - The specific `source_name` of the joined entity,
 *                                       as defined in the `ParentSchema.joins` configuration.
 * @example
 * // Given UserSchema has a join defined as: { alias: 'posts', target_source_name: 'posts_table', relation_type: 'one_to_many' }
 * // type UserPostsJoinConfig = SpecificMatchingJoinConfig<typeof UserSchema, 'posts_table'>;
 * // UserPostsJoinConfig would be: { alias: 'posts'; target_source_name: 'posts_table'; relation_type: 'one_to_many'; }
 */
export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificSourceName extends string,
> = Extract<
  ParentSchema['joins'][number],
  { target_source_name: JoinedSchemaSpecificSourceName }
>;
