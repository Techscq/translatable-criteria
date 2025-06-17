import type { CriteriaSchema, FieldOfSchema } from './schema.types.js';

/**
 * Represents the input parameters for a many-to-many join via a pivot table.
 * This is the shape the user provides to the .join() method.
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinSchema - The {@link CriteriaSchema} of the entity to be joined.
 */
export type PivotJoinInput<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
> = {
  /** The source name (table name) of the pivot table. */
  pivot_source_name: string;
  /** Configuration for the join field on the parent side, referencing the pivot table. */
  parent_field: {
    /** The field name in the pivot table that links to the parent schema. */
    pivot_field: string;
    /**
     * The field name in the parent schema that the pivot table field references.
     * Must be a valid field defined in `ParentSchema['fields']`.
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
     * Must be a valid field defined in `JoinSchema['fields']`.
     * @see FieldOfSchema<JoinSchema>
     */
    reference: FieldOfSchema<JoinSchema>;
  };
};

/**
 * Represents the input parameters for a simple join (one-to-one, one-to-many, many-to-one).
 * This is the shape the user provides to the .join() method.
 * @template ParentSchema - The {@link CriteriaSchema} of the parent entity.
 * @template JoinSchema - The {@link CriteriaSchema} of the entity to be joined.
 */
export type SimpleJoinInput<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
> = {
  /**
   * The field name in the parent schema used for the join condition.
   * Must be a valid field defined in `ParentSchema['fields']`.
   * @see FieldOfSchema<ParentSchema>
   */
  parent_field: FieldOfSchema<ParentSchema>;
  /**
   * The field name in the joined schema used for the join condition.
   * Must be a valid field defined in `JoinSchema['fields']`.
   * @see FieldOfSchema<JoinSchema>
   */
  join_field: FieldOfSchema<JoinSchema>;
};
