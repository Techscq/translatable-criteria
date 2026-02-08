import type {
  CriteriaSchema,
  FieldOfSchema,
  JoinRelationType,
} from './schema.types.js';

/**
 * Represents the fully resolved parameters for a many-to-many join,
 * including details from the parent schema and the specific relation type.
 * This type is used internally by the Criteria system after processing user input.
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity in the join.
 * @template JoinSchema - The {@link CriteriaSchema} of the entity being joined.
 * @template TJoinRelationType - The specific {@link JoinRelationType} for this join.
 */
export type PivotJoin<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
> = {
  is_relation_id: boolean;
  /**
   * If true, the joined entity's fields will be included in the final selection.
   * If false, the join will only be used for filtering purposes, and its fields will not be selected.
   * Defaults to true.
   */
  with_select: boolean;
  /** The type of relationship from the parent to the joined entity (e.g., 'many_to_many'). */
  relation_type: 'many_to_many';
  /** The source name (e.g., table name) of the parent entity. */
  parent_source_name: ParentSchema['source_name'];
  /** The alias used for the parent entity in the query. */
  parent_alias: ParentSchema['alias'][number];
  relation_alias: ParentSchema['relations'][number]['relation_alias'];
  parent_identifier: FieldOfSchema<ParentSchema>;
  /** The source name (table name) of the pivot table. */
  pivot_source_name: string;
  /** Configuration for the join field on the parent side, referencing the pivot table. */
  local_field: {
    /** The field name in the pivot table that links to the parent schema. */
    pivot_field: string;
    /**
     * The field name in the parent schema that the pivot table field references.
     * Must be a valid field from `ParentSchema['fields']`.
     * @see FieldOfSchema<ParentSchema>
     */
    reference: FieldOfSchema<ParentSchema>;
  };
  /** Configuration for the join field on the joined side, referencing the pivot table. */
  relation_field: {
    /** The field name in the pivot table that links to the joined schema. */
    pivot_field: string;
    /**
     * The field name in the joined schema that the pivot table field references.
     * Must be a valid field from `JoinSchema['fields']`.
     * @see FieldOfSchema<JoinSchema>
     */
    reference: FieldOfSchema<JoinSchema>;
  };
  /**
   * Optional metadata associated with the parent schema definition.
   * This can be used by translators to store or access additional,
   * schema-specific information relevant to the join.
   */
  parent_schema_metadata: { [key: string]: any };
  /**
   * Optional metadata specifically associated with this join configuration
   * as defined in the parent schema's `joins` array.
   * This can be used by translators to store or access additional,
   * join-specific information.
   */
  join_metadata: { [key: string]: any };
};

/**
 * Represents the fully resolved parameters for a simple join (one-to-one, one-to-many, many-to-one),
 * including details from the parent schema and the specific relation type.
 * This type is used internally by the Criteria system after processing user input.
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity in the join.
 * @template JoinSchema - The {@link CriteriaSchema} of the entity being joined.
 * @template TJoinRelationType - The specific {@link JoinRelationType} for this join.
 */
export type SimpleJoin<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
> = {
  is_relation_id: boolean;
  /**
   * If true, the joined entity's fields will be included in the final selection.
   * If false, the join will only be used for filtering purposes, and its fields will not be selected.
   * Defaults to true.
   */
  with_select: boolean;
  /** The type of relationship from the parent to the joined entity (e.g., 'one_to_one', 'many_to_one'). */
  relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one';
  /** The source name (e.g., table name) of the parent entity. */
  parent_source_name: ParentSchema['source_name'];
  /** The alias used for the parent entity in the query. */
  parent_alias: ParentSchema['alias'][number];
  relation_alias: ParentSchema['relations'][number]['relation_alias'];
  parent_identifier: FieldOfSchema<ParentSchema>;
  /**
   * The field name in the parent schema used for the join condition.
   * Must be a valid field from `ParentSchema['fields']`.
   * @see FieldOfSchema<ParentSchema>
   */
  local_field: FieldOfSchema<ParentSchema>;
  /**
   * The field name in the joined schema used for the join condition.
   * Must be a valid field from `JoinSchema['fields']`.
   * @see FieldOfSchema<JoinSchema>
   */
  relation_field: FieldOfSchema<JoinSchema>;
  /**
   * Optional metadata associated with the parent schema definition.
   * This can be used by translators to store or access additional,
   * schema-specific information relevant to the join.
   */
  parent_schema_metadata: { [key: string]: any };
  /**
   * Optional metadata specifically associated with this join configuration
   * as defined in the parent schema's `joins` array.
   * This can be used by translators to store or access additional,
   * join-specific information.
   */
  join_metadata: { [key: string]: any };
};
