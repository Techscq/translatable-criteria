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
 * This type ensures that the provided `criteriaToJoin` is valid for the chosen `relation_alias`.
 * It works by first finding the specific join configuration via `SpecificMatchingJoinConfig`.
 * If the alias is not found, it resolves to a specific error string.
 * If the alias is found, it then validates that the `source_name` of the `JoinedSchema`
 * matches the `target_source_name` defined in the configuration. If they don't match,
 * it resolves to a different, more specific error string, providing excellent developer feedback.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the entity calling `.join()`.
 * @template JoinedSchema - The {@link CriteriaSchema} of the criteria being passed to `.join()`.
 * @template SpecificRelationAlias - The literal string type of the `relation_alias` passed as the first argument to `.join()`.
 * @template MatchingConfig - The result of looking up the join configuration using the `SpecificRelationAlias`.
 */
export type JoinCriteriaType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  SpecificRelationAlias extends string,
  MatchingConfig = SpecificMatchingJoinConfig<
    ParentSchema,
    SpecificRelationAlias
  >,
> = [MatchingConfig] extends [never]
  ? `Error: The joined parent source name '${JoinedSchema['source_name']}' is not configured for join in '${ParentSchema['source_name']}'.`
  : MatchingConfig extends SchemaJoins<ParentSchema['fields'], string>
    ? MatchingConfig['target_source_name'] extends JoinedSchema['source_name']
      ? AnyJoinCriteria<JoinedSchema>
      : `Error: The selected relation '${SpecificRelationAlias}' require a schema source name of '${MatchingConfig['target_source_name']}' and recieved '${JoinedSchema['source_name']}' instead.`
    : never;

/**
 * Determines the expected shape of the join parameters object passed to the `.join()` method,
 * based on the `relation_type` defined in the `ParentSchema` for the matching join configuration.
 * If no matching join configuration is found for the `ActualJoinedSourceName`, this type resolves to `never`.
 * For 'many_to_many' relations, it expects {@link PivotJoinInput}.
 * For other relations (one-to-one, one-to-many, many-to-one), it expects {@link SimpleJoinInput}.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchema - The {@link CriteriaSchema} of the entity to be joined.
 * @template MatchingConfigForActualSourceName - The join configuration from `ParentSchema` that matches the
 *   `source_name` of `JoinedSchema`. Should be `never` if no match is found.
 */

/**
 * Extracts the specific join configuration object from the `ParentSchema`'s `relations` array
 * that matches the provided `JoinedSchemaSpecificRelationAlias`.
 * This utility type is the cornerstone of the type-safe join mechanism, enabling the `.join()` method
 * to infer the correct configuration based on the provided `relation_alias`.
 *
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinedSchemaSpecificRelationAlias - The specific `relation_alias` string literal to look for.
 */
export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificRelationAlias extends string,
> = Extract<
  ParentSchema['relations'][number],
  { relation_alias: JoinedSchemaSpecificRelationAlias }
>;
