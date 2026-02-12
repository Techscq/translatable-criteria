import { describe, it, expect, beforeEach } from 'vitest';
import { FilterOperator, LogicalOperator } from '../types/operator.types.js';
import {
  PermissionSchema,
  PostCommentSchema,
  PostSchema,
  UserSchema,
} from './fake-entities.js';
import {
  type CriteriaSchema,
  type FieldOfSchema,
  GetTypedCriteriaSchema,
  SelectType,
} from '../types/schema.types.js';
import { type StoredJoinDetails } from '../types/join-utility.types.js';
import { RootCriteria } from '../root.criteria.js';
import { FilterGroup } from '../filter/filter-group.js';
import { OrderDirection } from '../order/order.js';
import { InnerJoinCriteria } from '../join/inner.join-criteria.js';
import { LeftJoinCriteria } from '../join/left.join-criteria.js';
import { type FilterPrimitive } from '../filter/types/filter-primitive.types.js';

const testJoinsData = <
  const TParentSchema extends CriteriaSchema,
  const TExpectedRelationAlias extends
    TParentSchema['relations'][number]['relation_alias'],
>(
  joinDetails: StoredJoinDetails<TParentSchema>,
  expectedRelationAlias: TExpectedRelationAlias,
  parentCriteria: RootCriteria<TParentSchema>,
) => {
  const expectedRelation = parentCriteria.schema.relations.find(
    (r) => r.relation_alias === expectedRelationAlias,
  );

  expect(expectedRelation).toBeDefined();
  if (!expectedRelation) return;

  expect(joinDetails.parameters.relation_alias).toBe(
    expectedRelation.relation_alias,
  );
  expect(joinDetails.parameters.local_field).toEqual(
    expectedRelation.local_field,
  );
  expect(joinDetails.parameters.relation_field).toEqual(
    expectedRelation.relation_field,
  );
  expect(joinDetails.parameters.parent_alias).toBe(parentCriteria.alias);
  expect(joinDetails.parameters.parent_source_name).toBe(
    parentCriteria.sourceName,
  );
  expect(joinDetails.parameters.parent_identifier).toBe(
    parentCriteria.identifierField,
  );
};

describe('Criteria', () => {
  let criteriaRoot: RootCriteria<typeof PostSchema>;

  beforeEach(() => {
    criteriaRoot = new RootCriteria(PostSchema);
  });

  describe('Initialization and Defaults', () => {
    it('should be created with ROOT type, correct sourceName, and alias', () => {
      expect(criteriaRoot).toBeInstanceOf(RootCriteria);
      expect(criteriaRoot.sourceName).toBe(PostSchema.source_name);
      expect(criteriaRoot.alias).toBe('posts');
    });

    it('should have default take and skip values', () => {
      expect(criteriaRoot.take).toBe(0);
      expect(criteriaRoot.skip).toBe(0);
    });

    it('should have empty orders and joins initially', () => {
      expect(criteriaRoot.orders).toEqual([]);
      expect(criteriaRoot.joins).toEqual([]);
    });

    it('should correctly expose the identifierField from the schema', () => {
      expect(criteriaRoot.identifierField).toBe(PostSchema.identifier_field);
    });

    it('should correctly expose schemaMetadata from the schema', () => {
      const schemaWithMetadata = GetTypedCriteriaSchema({
        ...PostSchema,
        metadata: { customInfo: 'testValue' },
      });
      const criteriaWithMeta = new RootCriteria(schemaWithMetadata);
      expect(criteriaWithMeta.schemaMetadata).toEqual({
        customInfo: 'testValue',
      });
    });

    it('should have undefined schemaMetadata if not present in schema', () => {
      expect(criteriaRoot.schemaMetadata).toBeUndefined();
    });

    it('should throw error if identifier_field is not in schema fields during construction', () => {
      const invalidSchema = {
        ...UserSchema,
        identifier_field: 'non_existent_field',
      };
      expect(
        () =>
          new RootCriteria(
            // @ts-expect-error Testing invalid schema
            invalidSchema,
          ),
      ).toThrow(
        `Schema identifier_field 'non_existent_field' must be one of the schema's defined fields. Schema: user`,
      );
    });
  });

  describe('Filter Logic', () => {
    it('should set root filter group with where', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.EQUALS
      > = {
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: 'abc',
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria).toBe(criteriaRoot);
      expect(criteria.rootFilterGroup).toBeInstanceOf(FilterGroup);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should AND filters with andWhere for a flatter structure', () => {
      const filter1: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.EQUALS
      > = {
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: 'abc',
      };
      const filter2: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.LIKE
      > = {
        field: 'title',
        operator: FilterOperator.LIKE,
        value: '%test%',
      };
      const criteria = criteriaRoot.where(filter1).andWhere(filter2);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1, filter2],
      });
    });

    it('should OR filters with orWhere, creating OR( AND(f1), AND(f2) )', () => {
      const filter1: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.EQUALS
      > = {
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: 'abc',
      };
      const filter2: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.LIKE
      > = {
        field: 'title',
        operator: FilterOperator.LIKE,
        value: '%test%',
      };
      const criteria = criteriaRoot.where(filter1).orWhere(filter2);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          { logicalOperator: LogicalOperator.AND, items: [filter2] },
        ],
      });
    });

    it('should handle sequence: where().andWhere().orWhere()', () => {
      const filter1: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.EQUALS
      > = {
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: 'abc',
      };
      const filter2: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.LIKE
      > = {
        field: 'title',
        operator: FilterOperator.LIKE,
        value: '%test%',
      };
      const filter3: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.CONTAINS
      > = {
        field: 'body',
        operator: FilterOperator.CONTAINS,
        value: 'content',
      };

      const criteria = criteriaRoot
        .where(filter1)
        .andWhere(filter2)
        .orWhere(filter3);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1, filter2] },
          { logicalOperator: LogicalOperator.AND, items: [filter3] },
        ],
      });
    });

    it('should handle sequence: where().orWhere().andWhere()', () => {
      const filter1: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.EQUALS
      > = {
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: 'abc',
      };
      const filter2: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.LIKE
      > = {
        field: 'title',
        operator: FilterOperator.LIKE,
        value: '%test%',
      };
      const filter3: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.CONTAINS
      > = {
        field: 'body',
        operator: FilterOperator.CONTAINS,
        value: 'content',
      };

      const criteria = criteriaRoot
        .where(filter1)
        .orWhere(filter2)
        .andWhere(filter3);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          { logicalOperator: LogicalOperator.AND, items: [filter2, filter3] },
        ],
      });
    });
  });

  describe('Advanced Filter Logic (JSON & Array Operators)', () => {
    it('should correctly build a criteria with JSON_CONTAINS', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.JSON_CONTAINS
      > = {
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS,
        value: { tags: 'tech' },
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with JSON_NOT_CONTAINS', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.JSON_NOT_CONTAINS
      > = {
        field: 'metadata',
        operator: FilterOperator.JSON_NOT_CONTAINS,
        value: { tags: 'obsolete' },
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with JSON_CONTAINS_ANY', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.JSON_CONTAINS_ANY
      > = {
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS_ANY,
        value: { tags: ['tech', 'news'] },
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with JSON_CONTAINS_ALL', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.JSON_CONTAINS_ALL
      > = {
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS_ALL,
        value: { tags: ['tech', 'important'] },
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with ARRAY_NOT_CONTAINS_ELEMENT', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT
      > = {
        field: 'categories',
        operator: FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT,
        value: 'sports',
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with ARRAY_EQUALS_STRICT', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.ARRAY_EQUALS_STRICT
      > = {
        field: 'categories',
        operator: FilterOperator.ARRAY_EQUALS_STRICT,
        value: ['tech', 'news'],
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with ARRAY_NOT_EQUALS', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.ARRAY_NOT_EQUALS
      > = {
        field: 'categories',
        operator: FilterOperator.ARRAY_NOT_EQUALS,
        value: ['finance', 'sports'],
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with ARRAY_NOT_EQUALS_STRICT', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.ARRAY_NOT_EQUALS_STRICT
      > = {
        field: 'categories',
        operator: FilterOperator.ARRAY_NOT_EQUALS_STRICT,
        value: ['news', 'tech'],
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });

    it('should correctly build a criteria with ARRAY_EQUALS_STRICT using a JSON path', () => {
      const filter: FilterPrimitive<
        FieldOfSchema<typeof PostSchema>,
        FilterOperator.ARRAY_EQUALS_STRICT
      > = {
        field: 'metadata',
        operator: FilterOperator.ARRAY_EQUALS_STRICT,
        value: { ratings: [1, 2, 3] },
      };
      const criteria = criteriaRoot.where(filter);
      expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter],
      });
    });
  });

  describe('Selection Logic', () => {
    it('should clear specific selections and revert to selectAll when resetSelect() is called after setSelect', () => {
      criteriaRoot.setSelect(['uuid', 'title']);
      expect(criteriaRoot.select).toEqual(
        expect.arrayContaining(['uuid', 'title']),
      );
      expect(criteriaRoot.select).toHaveLength(2);

      criteriaRoot.resetSelect();
      expect(criteriaRoot.select).toEqual(PostSchema.fields);
      expect(criteriaRoot.selectAll).toBe(true);
    });

    it('should select all fields by default', () => {
      expect(criteriaRoot.selectAll).toBe(true);
      expect(criteriaRoot.select).toEqual(PostSchema.fields);
    });

    it('should allow selecting specific fields and implicitly add identifierField', () => {
      criteriaRoot.setSelect(['title', 'body']);
      expect(criteriaRoot.selectAll).toBe(false);
      expect(criteriaRoot.select).toEqual(
        expect.arrayContaining(['title', 'body', PostSchema.identifier_field]),
      );
      expect(criteriaRoot.select).toHaveLength(3);
    });

    it('should select only identifierField if setSelect is called with an empty array', () => {
      criteriaRoot.setSelect([]);
      expect(criteriaRoot.selectAll).toBe(false);
      expect(criteriaRoot.select).toEqual([PostSchema.identifier_field]);
    });

    it('should select only identifierField if setSelect is called with only the identifierField', () => {
      criteriaRoot.setSelect([PostSchema.identifier_field]);
      expect(criteriaRoot.selectAll).toBe(false);
      expect(criteriaRoot.select).toEqual([PostSchema.identifier_field]);
    });

    it('should not duplicate identifierField if explicitly included in setSelect', () => {
      criteriaRoot.setSelect(['title', PostSchema.identifier_field]);
      expect(criteriaRoot.selectAll).toBe(false);
      expect(criteriaRoot.select).toEqual(
        expect.arrayContaining(['title', PostSchema.identifier_field]),
      );
      expect(criteriaRoot.select).toHaveLength(2);
    });

    it('should validate selected fields exist in schema', () => {
      expect(() => {
        // @ts-expect-error
        criteriaRoot.setSelect(['non_existent_field']);
      }).toThrow(
        "The field 'non_existent_field' is not defined in the schema 'post'.",
      );
    });

    it('should maintain selected fields after other operations', () => {
      criteriaRoot
        .setSelect(['title', 'body'])
        .where({ field: 'uuid', operator: FilterOperator.EQUALS, value: '1' })
        .orderBy('uuid', OrderDirection.ASC);

      expect(criteriaRoot.selectAll).toBe(false);
      expect(criteriaRoot.select).toEqual(
        expect.arrayContaining(['title', 'body', PostSchema.identifier_field]),
      );
      expect(criteriaRoot.select).toHaveLength(3);
    });
  });

  describe('Cursor Functionality', () => {
    const testUuid = 'test-uuid';

    it('should set cursor with composite key correctly', () => {
      criteriaRoot.setCursor(
        [
          { field: 'uuid', value: testUuid },
          { field: 'user_uuid', value: 'user-1' },
        ],
        FilterOperator.GREATER_THAN,
        OrderDirection.ASC,
      );

      const cursor = criteriaRoot.cursor;
      expect(cursor).toBeDefined();
      if (cursor) {
        expect(cursor.filters).toHaveLength(2);
        expect(cursor.filters[0].field).toBe('uuid');
        expect(cursor.filters[1]?.field).toBe('user_uuid');
        expect(cursor.order).toBe(OrderDirection.ASC);
      }
    });

    it('should validate cursor fields exist in schema', () => {
      expect(() => {
        criteriaRoot.setCursor(
          [
            // @ts-expect-error
            { field: 'non_existent', value: 'test' },
            { field: 'uuid', value: testUuid },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).toThrow(
        "The field 'non_existent' is not defined in the schema 'post'.",
      );
    });

    it('should not allow duplicate fields in cursor', () => {
      expect(() => {
        criteriaRoot.setCursor(
          [
            { field: 'uuid', value: testUuid },
            { field: 'uuid', value: 'another-uuid-for-same-field' },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).toThrow('Cursor fields must be different for a composite cursor');
    });

    it('should validate cursor values are not undefined but could be null', () => {
      expect(() => {
        criteriaRoot.setCursor(
          [
            { field: 'uuid', value: null },
            { field: 'user_uuid', value: 'user-1' },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).not.toThrow();

      expect(() => {
        criteriaRoot.setCursor(
          [
            { field: 'uuid', value: testUuid },
            // @ts-expect-error
            { field: 'user_uuid', value: undefined },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).toThrow(
        'Cursor value for field user_uuid must be explicitly defined (can be null, but not undefined)',
      );
    });
  });

  describe('Pagination and Ordering', () => {
    it('should set take and skip values correctly', () => {
      criteriaRoot.setTake(10).setSkip(20);
      expect(criteriaRoot.take).toBe(10);
      expect(criteriaRoot.skip).toBe(20);
    });

    it('should validate take and skip are non-negative', () => {
      expect(() => criteriaRoot.setTake(-1)).toThrow(
        `Take value cannot be negative`,
      );
      expect(() => criteriaRoot.setSkip(-1)).toThrow(
        `Skip value cannot be negative`,
      );
    });

    it('should set order correctly', () => {
      criteriaRoot.orderBy('uuid', OrderDirection.DESC);
      expect(criteriaRoot.orders).toHaveLength(1);
      expect(criteriaRoot.orders[0]!.direction).toBe(OrderDirection.DESC);
      expect(criteriaRoot.orders[0]!.field).toBe('uuid');
    });

    it('should allow multiple orders', () => {
      criteriaRoot
        .orderBy('uuid', OrderDirection.DESC)
        .orderBy('title', OrderDirection.ASC);

      expect(criteriaRoot.orders).toHaveLength(2);
      expect(criteriaRoot.orders[0]!.field).toBe('uuid');
      expect(criteriaRoot.orders[1]!.field).toBe('title');
    });

    it('should validate orderBy field exists in schema', () => {
      expect(() => {
        // @ts-expect-error
        criteriaRoot.orderBy('non_existent_field', OrderDirection.ASC);
      }).toThrow(
        "The field 'non_existent_field' is not defined in the schema 'post'.",
      );
    });
  });

  describe('Join Functionality', () => {
    it('should add an inner join and correctly populate parameters', () => {
      const userJoinCriteria = new InnerJoinCriteria(UserSchema);

      criteriaRoot.join('publisher', userJoinCriteria);

      const joinsArray = criteriaRoot.joins;
      expect(joinsArray.length).toBe(1);

      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        expect(joinEntry.parameters.relation_alias).toBe('publisher');
        expect(joinEntry.criteria).toBeInstanceOf(InnerJoinCriteria);
        testJoinsData(joinEntry, 'publisher', criteriaRoot);
        expect(joinEntry.criteria).toBe(userJoinCriteria);
      }
    });

    it('should add a many-to-many join and correctly populate parameters', () => {
      const userCriteriaRoot = new RootCriteria(UserSchema);
      const permissionJoinCriteria = new InnerJoinCriteria(PermissionSchema);

      userCriteriaRoot.join('permissions', permissionJoinCriteria);

      const joinsArray = userCriteriaRoot.joins;
      expect(joinsArray.length).toBe(1);
      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        expect(joinEntry.criteria.alias).toBe('permissions');
        expect(joinEntry.criteria).toBeInstanceOf(InnerJoinCriteria);
        testJoinsData(joinEntry, 'permissions', userCriteriaRoot);
        expect(joinEntry.criteria).toBe(permissionJoinCriteria);
        expect(joinEntry.parameters.parent_identifier).toBe(
          UserSchema.identifier_field,
        );
      }
    });

    it('should add multiple joins and correctly populate parameters for each', () => {
      const userJoinCriteria = new InnerJoinCriteria(UserSchema);
      const commentJoinCriteria = new LeftJoinCriteria(PostCommentSchema);

      criteriaRoot
        .join('publisher', userJoinCriteria)
        .join('comments', commentJoinCriteria);

      const joinsArray = criteriaRoot.joins;
      expect(joinsArray.length).toBe(2);

      const publisherJoin = joinsArray.find(
        (entry) => entry.parameters.relation_alias === 'publisher',
      );
      const commentsJoin = joinsArray.find(
        (entry) => entry.parameters.relation_alias === 'comments',
      );

      expect(publisherJoin).toBeDefined();
      if (publisherJoin) {
        expect(publisherJoin.criteria).toBeInstanceOf(InnerJoinCriteria);
        testJoinsData(publisherJoin, 'publisher', criteriaRoot);
      }

      expect(commentsJoin).toBeDefined();
      if (commentsJoin) {
        expect(commentsJoin.criteria).toBeInstanceOf(LeftJoinCriteria);
        testJoinsData(commentsJoin, 'comments', criteriaRoot);
      }
    });

    it('should replace a join if the same alias is used', () => {
      const userJoinCriteria1 = new InnerJoinCriteria(UserSchema);
      const userJoinCriteria2 = new LeftJoinCriteria(UserSchema);

      criteriaRoot
        .join('publisher', userJoinCriteria1)
        .join('publisher', userJoinCriteria2);

      const joinsArray = criteriaRoot.joins;
      expect(joinsArray.length).toBe(1);

      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        expect(joinEntry.parameters.relation_alias).toBe('publisher');
        expect(joinEntry.criteria).toBeInstanceOf(LeftJoinCriteria);
        testJoinsData(joinEntry, 'publisher', criteriaRoot);
        expect(joinEntry.criteria).toBe(userJoinCriteria2);
      }
    });

    it('should handle missing default_options in schema relation', () => {
      const SchemaWithoutDefaults = GetTypedCriteriaSchema({
        source_name: 'test_source',
        alias: 'ts',
        fields: ['id', 'name'],
        identifier_field: 'id',
        relations: [
          {
            relation_alias: 'related',
            relation_type: 'one_to_many',
            target_source_name: 'related_source',
            local_field: 'id',
            relation_field: 'parent_id',
            // default_options omitted
          },
        ],
      });

      const RelatedSchema = GetTypedCriteriaSchema({
        source_name: 'related_source',
        alias: 'rs',
        fields: ['id', 'parent_id'],
        identifier_field: 'id',
        relations: [],
      });

      const criteria = new RootCriteria(SchemaWithoutDefaults);
      const relatedCriteria = new InnerJoinCriteria(RelatedSchema);

      criteria.join('related', relatedCriteria);

      const joins = criteria.joins;
      expect(joins).toHaveLength(1);
      expect(joins[0]?.parameters.join_options.select).toBeUndefined();
    });
  });

  describe('Complex Criteria Building', () => {
    it('should build a complete criteria with all features', () => {
      const criteria = new RootCriteria(PostSchema)
        .setSelect(['uuid', 'title', 'user_uuid'])
        .where({
          field: 'title',
          operator: FilterOperator.LIKE,
          value: '%test%',
        })
        .join(
          'comments',
          new InnerJoinCriteria(PostCommentSchema)
            .setSelect(['uuid', 'comment_text'])
            .where({
              field: 'comment_text',
              operator: FilterOperator.IS_NOT_NULL,
              value: null,
            }),
        )
        .orderBy('uuid', OrderDirection.ASC)
        .setTake(10)
        .setCursor(
          [
            { field: 'uuid', value: 'last-uuid' },
            { field: 'user_uuid', value: 'last-user' },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );

      const cursor = criteria.cursor;
      expect(criteria.select).toEqual(
        expect.arrayContaining(['uuid', 'title', 'user_uuid']),
      );
      expect(criteria.select).toHaveLength(3);
      expect(criteria.take).toBe(10);
      expect(cursor).toBeDefined();
      if (cursor) {
        expect(cursor.filters).toHaveLength(2);
      }
      expect(criteria.joins).toHaveLength(1);
      expect(criteria.orders).toHaveLength(1);
      const joinCriteria = criteria.joins[0]?.criteria as InnerJoinCriteria<
        typeof PostCommentSchema
      >;
      expect(joinCriteria?.select).toEqual(
        expect.arrayContaining([
          'uuid',
          'comment_text',
          PostCommentSchema.identifier_field,
        ]),
      );
      expect(joinCriteria?.select).toHaveLength(2);
    });
  });
  it('should correctly store withSelect property for simple join', () => {
    const userJoinCriteria = new InnerJoinCriteria(UserSchema);

    criteriaRoot.join('publisher', userJoinCriteria, {
      select: SelectType.NO_SELECTION,
    });
    let joinsArray = criteriaRoot.joins;
    expect(joinsArray.length).toBe(1);
    expect(joinsArray[0]?.parameters.join_options.select).toBe(
      SelectType.NO_SELECTION,
    );

    criteriaRoot = new RootCriteria(PostSchema);
    criteriaRoot.join('publisher', userJoinCriteria, {
      select: SelectType.NO_SELECTION,
    });
    joinsArray = criteriaRoot.joins;
    expect(joinsArray.length).toBe(1);
    expect(joinsArray[0]?.parameters.join_options.select).toBe(
      SelectType.NO_SELECTION,
    );

    criteriaRoot = new RootCriteria(PostSchema);
    criteriaRoot.join('publisher', userJoinCriteria);
    joinsArray = criteriaRoot.joins;
    expect(joinsArray.length).toBe(1);
    const firstJoin = joinsArray[0];
    expect(firstJoin?.parameters.join_options.select).toBe(
      PostSchema.relations.find(
        (join) =>
          join.target_source_name === firstJoin?.criteria.schema.source_name,
      )?.default_options?.select,
    );
  });

  it('should correctly store withSelect property for many-to-many join', () => {
    let userCriteriaRoot = new RootCriteria(UserSchema);
    const permissionJoinCriteria = new InnerJoinCriteria(PermissionSchema);

    userCriteriaRoot.join('permissions', permissionJoinCriteria, {
      select: SelectType.NO_SELECTION,
    });
    let joinsArray = userCriteriaRoot.joins;
    expect(joinsArray.length).toBe(1);
    expect(joinsArray[0]?.parameters.join_options.select).toBe(
      SelectType.NO_SELECTION,
    );

    userCriteriaRoot = new RootCriteria(UserSchema);
    userCriteriaRoot.join('permissions', permissionJoinCriteria, {
      select: SelectType.NO_SELECTION,
    });
    joinsArray = userCriteriaRoot.joins;
    expect(joinsArray.length).toBe(1);
    expect(joinsArray[0]?.parameters.join_options.select).toBe(
      SelectType.NO_SELECTION,
    );

    userCriteriaRoot = new RootCriteria(UserSchema);
    userCriteriaRoot.join('permissions', permissionJoinCriteria);
    joinsArray = userCriteriaRoot.joins;
    expect(joinsArray.length).toBe(1);
    const firstJoin = joinsArray[0];
    expect(firstJoin?.parameters.join_options.select).toBe(
      UserSchema.relations.find(
        (join) =>
          join.target_source_name === firstJoin?.criteria.schema.source_name,
      )?.default_options?.select,
    );
  });
});
