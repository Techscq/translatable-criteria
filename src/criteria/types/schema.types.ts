import type { ObjectValues } from './utils.js';

/**
 * Defines the type of relationship for a join.
 * - `one_to_one`: Represents a one-to-one relationship.
 * - `one_to_many`: Represents a one-to-many relationship.
 * - `many_to_one`: Represents a many-to-one relationship.
 * - `many_to_many`: Represents a many-to-many relationship, typically involving a pivot table.
 */
export type JoinRelationType =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

/**
 * Extracts a union type of all valid field names from a given {@link CriteriaSchema}.
 * @template T - The {@link CriteriaSchema} from which to extract field names.
 * @example type UserFields = FieldOfSchema<typeof UserSchema>; // "id" | "name" | "email"
 */
export type FieldOfSchema<T extends CriteriaSchema> =
  T['fields'] extends ReadonlyArray<string> ? T['fields'][number] : never;

/**
 * Defines the strategy for selecting fields from a joined entity.
 */
export const SelectType = {
  /** Selects only the identifier field of the joined entity. Useful for optimization when only the ID is needed. */
  ID_ONLY: 'ID_ONLY',
  /** Selects all fields of the joined entity. This is the standard behavior. */
  FULL_ENTITY: 'FULL_ENTITY',
  /** Performs the join but does not select any fields from the joined entity. Useful for filtering (e.g., EXISTS). */
  NO_SELECTION: 'NO_SELECTION',
} as const;

export type SelectType = ObjectValues<typeof SelectType>;

/**
 * Options to configure a join operation.
 */
export type JoinOptions = {
  /** Specifies which fields to select from the joined entity. */
  select?: SelectType;
};

/**
 * Describes the configuration for a simple joinable relation (one-to-one, one-to-many, many-to-one).
 * The `relation_field` is not strongly typed against the target schema at compile-time to avoid complex cross-schema dependencies.
 * It will be validated at runtime when the schema is defined and when the join is processed.
 * @template TFields - The readonly array of field names from the local schema.
 * @template ValidAlias - A string literal type representing the alias for this specific relation.
 */
export type SchemaSimpleJoin<
  TFields extends ReadonlyArray<string>,
  ValidAlias extends string,
> = {
  /** Optional default configuration for this relation. These options are used if no specific `joinOptions` are provided in the `.join()` call. */
  default_options?: JoinOptions;
  /** The alias for this specific relation, used to identify it in `.join()` calls. */
  relation_alias: ValidAlias;
  /** The type of relationship this join represents (e.g., 'one_to_many'). */
  relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one';
  /** The `source_name` of the schema that this relation targets. Used for robust validation. */
  target_source_name: string;
  /**
   * The field name in the local schema used for the join condition.
   * This field is strongly typed against the local schema's fields.
   */
  local_field: TFields[number];
  /**
   * The field name in the target schema (the related entity) used for the join condition.
   * This field is a string and will be validated at runtime.
   */
  relation_field: string;
  /**
   * Optional metadata associated with this specific join configuration.
   */
  metadata?: { [key: string]: any };
};

/**
 * Describes the configuration for a many-to-many joinable relation (via a pivot table).
 * The `relation_field.reference` is not strongly typed against the target schema at compile-time to avoid complex cross-schema dependencies.
 * It will be validated at runtime when the schema is defined and when the join is processed.
 * @template TFields - The readonly array of field names from the local schema.
 * @template ValidAlias - A string literal type representing the alias for this specific relation.
 */
export type SchemaPivotJoin<
  TFields extends ReadonlyArray<string>,
  ValidAlias extends string,
> = {
  /** Optional default configuration for this relation. These options are used if no specific `joinOptions` are provided in the `.join()` call. */
  default_options?: JoinOptions;
  /** The alias for this specific relation, used to identify it in `.join()` calls. */
  relation_alias: ValidAlias;
  /** The type of relationship this join represents (must be 'many_to_many'). */
  relation_type: 'many_to_many';
  /** The `source_name` of the schema that this relation targets. Used for robust validation. */
  target_source_name: string;
  /** The source name (table name) of the pivot table. */
  pivot_source_name: string;
  /** Configuration for the join field on the local side, referencing the pivot table. */
  local_field: {
    /** The field name in the pivot table that links to the local schema. */
    pivot_field: string;
    /**
     * The field name in the local schema that the pivot table field references.
     * This field is strongly typed against the local schema's fields.
     */
    reference: TFields[number];
  };
  /** Configuration for the join field on the related side, referencing the pivot table. */
  relation_field: {
    /** The field name in the pivot table that links to the related schema. */
    pivot_field: string;
    /**
     * The field name in the related schema that the pivot table field references.
     * This field is a string and will be validated at runtime.
     */
    reference: string;
  };
  /**
   * Optional metadata associated with this specific join configuration.
   */
  metadata?: { [key: string]: any };
};

/**
 * Describes the configuration for a joinable relation within a {@link CriteriaSchema}.
 * It is a union of simple and pivot join types.
 * @template TFields - The readonly array of field names from the local schema.
 * @template ValidAlias - A string literal type representing the alias for this specific relation.
 */
export type SchemaJoins<
  TFields extends ReadonlyArray<string>,
  ValidAlias extends string,
> =
  | SchemaSimpleJoin<TFields, ValidAlias>
  | SchemaPivotJoin<TFields, ValidAlias>;

/**
 * Represents the schema definition for an entity, used by the Criteria system.
 * It defines the entity's source name (e.g., table name), a single canonical alias,
 * fields, and joinable relations.
 * @template TFields - A readonly array of string literal types representing the entity's field names.
 * @template TAliase - A string literal type for the entity's canonical alias.
 * @template TSourceName - A string literal type for the entity's source name.
 * @template Joins - A readonly array of `SchemaJoins` capturing the exact literal types of the relations.
 */
export type CriteriaSchema<
  TFields extends ReadonlyArray<string> = ReadonlyArray<string>,
  TAliase extends string = string,
  TSourceName extends string = string,
  Joins extends ReadonlyArray<SchemaJoins<TFields, string>> = ReadonlyArray<
    SchemaJoins<TFields, string>
  >,
> = {
  /** The source name of the entity (e.g., database table name). */
  source_name: TSourceName;
  /** The canonical alias used to refer to this entity in queries. */
  alias: TAliase;
  /** An array of field names available for this entity. */
  fields: TFields;
  /** An array of configurations for entities that can be joined from this entity. */
  relations: Joins;
  /**
   * The name of the field that uniquely identifies an entity of this schema.
   * This field **must** be one of the names listed in the `fields` array.
   */
  identifier_field: TFields[number];

  /**
   * Optional metadata associated with the entire schema definition.
   * This can be used to store arbitrary, translator-specific information
   * or configuration relevant to the entity this schema represents.
   * For example, it could hold information about custom data types,
   * default behaviors, or ORM-specific settings.
   */
  metadata?: { [key: string]: any };
};

/**
 * A helper function to infer and preserve the literal types of a schema definition.
 * Use this when defining schemas to get strong typing for fields, aliases, and relations.
 * This function also performs runtime validation for the schema structure.
 * @template TFields - A readonly array of string literal types representing the entity's field names.
 * @template TAliase - A string literal type for the entity's canonical alias.
 * @template TSourceName - A string literal type for the entity's source name.
 * @template Joins - A readonly array of `SchemaJoins` capturing the exact literal types of the relations.
 * @param schema - The schema definition object.
 * @returns The same schema object, with its literal types preserved for strong type inference.
 */
export function GetTypedCriteriaSchema<
  const TFields extends ReadonlyArray<string>,
  const TAliase extends string,
  const TSourceName extends string,
  const Joins extends ReadonlyArray<SchemaJoins<TFields, string>>,
>(schema: {
  source_name: TSourceName;
  alias: TAliase;
  fields: TFields;
  relations: Joins;
  identifier_field: TFields[number];
  metadata?: { [key: string]: any };
}): CriteriaSchema<TFields, TAliase, TSourceName, Joins> {
  if (!schema.fields.includes(schema.identifier_field)) {
    throw new Error(
      `Schema identifier_field '${String(
        schema.identifier_field,
      )}' must be one of the schema's defined fields. Schema: ${
        schema.source_name
      }`,
    );
  }

  const isPivotFieldObject = (
    field: any,
  ): field is { pivot_field: string; reference: string } => {
    return (
      typeof field === 'object' &&
      field !== null &&
      'pivot_field' in field &&
      'reference' in field
    );
  };

  for (const joinConfig of schema.relations) {
    const localSchemaFields = schema.fields;

    if (joinConfig.relation_type === 'many_to_many') {
      if (
        !isPivotFieldObject(joinConfig.local_field) ||
        !isPivotFieldObject(joinConfig.relation_field)
      ) {
        throw new Error(
          `Invalid JoinOptions for 'many_to_many' join. Expected local_field and relation_field to be objects with 'pivot_field' and 'reference' properties. Alias: '${String(
            joinConfig.relation_alias,
          )}'`,
        );
      }
      if (!localSchemaFields.includes(joinConfig.local_field.reference)) {
        throw new Error(
          `Local reference field '${joinConfig.local_field.reference}' for pivot join alias '${joinConfig.relation_alias}' is not defined in schema '${schema.source_name}'.`,
        );
      }
    } else {
      if (
        typeof joinConfig.local_field !== 'string' ||
        typeof joinConfig.relation_field !== 'string'
      ) {
        throw new Error(
          `Invalid JoinOptions for '${
            joinConfig.relation_type
          }' join. Expected local_field and relation_field to be strings. Alias: '${String(
            joinConfig.relation_alias,
          )}'`,
        );
      }
      if (!localSchemaFields.includes(joinConfig.local_field)) {
        throw new Error(
          `Local field '${joinConfig.local_field}' for simple join alias '${joinConfig.relation_alias}' is not defined in schema '${schema.source_name}'.`,
        );
      }
    }
  }

  return schema;
}
