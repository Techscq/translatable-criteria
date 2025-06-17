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
  TJoinRelationType extends JoinRelationType,
> = {
  /** The type of relationship from the parent to the joined entity (e.g., 'many_to_many'). */
  parent_to_join_relation_type: TJoinRelationType;
  /** The source name (e.g., table name) of the parent entity. */
  parent_source_name: ParentSchema['source_name'];
  /** The alias used for the parent entity in the query. */
  parent_alias: ParentSchema['alias'][number];

  /** The source name (table name) of the pivot table. */
  pivot_source_name: string;
  /** Configuration for the join field on the parent side, referencing the pivot table. */
  parent_field: {
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
  join_field: {
    /** The field name in the pivot table that links to the joined schema. */
    pivot_field: string;
    /**
     * The field name in the joined schema that the pivot table field references.
     * Must be a valid field from `JoinSchema['fields']`.
     * @see FieldOfSchema<JoinSchema>
     */
    reference: FieldOfSchema<JoinSchema>;
  };
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
  TJoinRelationType extends JoinRelationType,
> = {
  /** The type of relationship from the parent to the joined entity (e.g., 'one_to_one', 'many_to_one'). */
  parent_to_join_relation_type: TJoinRelationType;
  /** The source name (e.g., table name) of the parent entity. */
  parent_source_name: ParentSchema['source_name'];
  /** The alias used for the parent entity in the query. */
  parent_alias: ParentSchema['alias'][number];
  /**
   * The field name in the parent schema used for the join condition.
   * Must be a valid field from `ParentSchema['fields']`.
   * @see FieldOfSchema<ParentSchema>
   */
  parent_field: FieldOfSchema<ParentSchema>;
  /**
   * The field name in the joined schema used for the join condition.
   * Must be a valid field from `JoinSchema['fields']`.
   * @see FieldOfSchema<JoinSchema>
   */
  join_field: FieldOfSchema<JoinSchema>;
};
