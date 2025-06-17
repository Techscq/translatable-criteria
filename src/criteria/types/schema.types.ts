/**
 * Defines the type of relationship for a join.
 */
export type JoinRelationType =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

/**
 * Describes the configuration for a joinable relation within a {@link CriteriaSchema}.
 * @template ValidAlias - A string literal type representing a valid alias for the join.
 */
export type SchemaJoins<ValidAlias extends string> = {
  /** The alias used to refer to this join in criteria construction. */
  alias: ValidAlias;
  /** The type of relationship this join represents (e.g., 'one_to_many'). */
  join_relation_type: JoinRelationType;
};

/**
 * Represents the schema definition for an entity, used by the Criteria system.
 * It defines the entity's source name (e.g., table name), available aliases,
 * fields, and joinable relations.
 * @template TFields - A readonly array of string literal types representing the entity's field names.
 * @template TAliases - A readonly array of string literal types representing the entity's valid aliases.
 * @template TSourceName - A string literal type for the entity's source name.
 * @template JoinsAlias - A string literal type representing valid aliases for its joinable relations.
 */
export type CriteriaSchema<
  TFields extends ReadonlyArray<string> = ReadonlyArray<string>,
  TAliases extends ReadonlyArray<string> = ReadonlyArray<string>,
  TSourceName extends string = string,
  JoinsAlias extends string = string,
> = {
  /** The source name of the entity (e.g., database table name). */
  source_name: TSourceName;
  /** An array of valid aliases that can be used to refer to this entity. */
  alias: TAliases;
  /** An array of field names available for this entity. */
  fields: TFields;
  /** An array of configurations for entities that can be joined from this entity. */
  joins: ReadonlyArray<SchemaJoins<JoinsAlias>>;
};

/**
 * A helper function to infer and preserve the literal types of a schema definition.
 * Use this when defining schemas to get strong typing for fields, aliases, etc.
 * @template TInput - The type of the schema object being passed.
 * @param {TInput} schema - The schema definition object.
 * @returns {TInput} The same schema object, with its literal types preserved.
 * @example
 * export const UserSchema = GetTypedCriteriaSchema({
 *   source_name: 'users_table',
 *   alias: ['user', 'u'],
 *   fields: ['id', 'name', 'email'],
 *   joins: [{ alias: 'posts', join_relation_type: 'one_to_many' }]
 * });
 */
export function GetTypedCriteriaSchema<const TInput extends CriteriaSchema>(
  schema: TInput,
): TInput {
  return schema;
}

/**
 * Extracts a union type of all valid field names from a given {@link CriteriaSchema}.
 * @template T - The {@link CriteriaSchema} from which to extract field names.
 * @example type UserFields = FieldOfSchema<typeof UserSchema>; // "id" | "name" | "email"
 */
export type FieldOfSchema<T extends CriteriaSchema> =
  T['fields'] extends ReadonlyArray<string> ? T['fields'][number] : never;

/**
 * Extracts a union type of all valid aliases from a given {@link CriteriaSchema}.
 * @template T - The {@link CriteriaSchema} from which to extract aliases.
 * @example type UserAliases = SelectedAliasOf<typeof UserSchema>; // "user" | "u"
 */
export type SelectedAliasOf<T extends CriteriaSchema> =
  T['alias'] extends ReadonlyArray<string> ? T['alias'][number] : never;
