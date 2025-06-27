import {
  CriteriaFactory,
  FilterOperator,
  GetTypedCriteriaSchema,
  OrderDirection,
} from '../../../../../criteria/index.js';
import { PseudoSqlTranslator } from '../pseudo-sql.translator.js';
import type { PseudoSqlParts } from '../types.js';

const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  relations: [
    {
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
    {
      relation_alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
      pivot_source_name: 'user_roles',
      local_field: { reference: 'id', pivot_field: 'user_id' },
      relation_field: { reference: 'id', pivot_field: 'role_id' },
    },
  ],
});

const PostSchema = GetTypedCriteriaSchema({
  source_name: 'posts',
  alias: 'p',
  fields: [
    'id',
    'title',
    'content',
    'userId',
    'categories',
    'metadata',
    'createdAt',
  ],
  identifier_field: 'id',
  relations: [
    {
      relation_alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      local_field: 'userId',
      relation_field: 'id',
    },
  ],
});

const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  relations: [],
});

describe('PseudoSqlTranslator (API v3 Tests)', () => {
  let translator: PseudoSqlTranslator;

  beforeAll(() => {
    translator = new PseudoSqlTranslator();
  });

  const createInitialParts = (): PseudoSqlParts => ({
    select: [],
    from: '',
    joins: [],
    where: [],
    orderBy: [],
    params: [],
  });

  it('should translate a simple filter criteria', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
      field: 'email',
      operator: FilterOperator.CONTAINS,
      value: '@example.com',
    });

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toBe(
      'SELECT `u`.`id`, `u`.`username`, `u`.`email`, `u`.`age`, `u`.`isActive`, `u`.`createdAt`, `u`.`tags` FROM `users` AS `u` WHERE (`u`.`email` LIKE ?)',
    );
    expect(params).toEqual(['%@example.com%']);
  });

  it('should handle pagination with take and skip', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .setTake(10)
      .setSkip(20);

    const { query } = translator.translate(criteria, createInitialParts());
    expect(query).toContain('LIMIT 10');
    expect(query).toContain('OFFSET 20');
  });

  it('should handle ordering', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema).orderBy(
      'createdAt',
      OrderDirection.DESC,
    );

    const { query } = translator.translate(criteria, createInitialParts());
    expect(query).toContain('ORDER BY `u`.`createdAt` DESC');
  });

  it('should handle field selection', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema).setSelect([
      'id',
      'username',
    ]);

    const { query } = translator.translate(criteria, createInitialParts());
    expect(query).toBe('SELECT `u`.`id`, `u`.`username` FROM `users` AS `u`');
  });

  it('should translate an inner join with filters', () => {
    const joinCriteria = CriteriaFactory.GetInnerJoinCriteria(PostSchema).where(
      {
        field: 'title',
        operator: FilterOperator.CONTAINS,
        value: 'TypeScript',
      },
    );

    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .where({
        field: 'isActive',
        operator: FilterOperator.EQUALS,
        value: true,
      })
      .join('posts', joinCriteria);

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'INNER JOIN `posts` AS `posts` ON `u`.`id` = `posts`.`userId` AND (`posts`.`title` LIKE ?)',
    );
    expect(query).toContain('WHERE (`u`.`isActive` = ?)');
    expect(params).toEqual(['%TypeScript%', true]);
  });

  it('should translate complex AND/OR filter groups using the fluent API', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .where({
        field: 'isActive',
        operator: FilterOperator.EQUALS,
        value: true,
      })
      .andWhere({
        field: 'email',
        operator: FilterOperator.NOT_CONTAINS,
        value: 'spam.com',
      })
      .orWhere({
        field: 'age',
        operator: FilterOperator.GREATER_THAN,
        value: 30,
      });

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'WHERE ((`u`.`isActive` = ? AND `u`.`email` NOT LIKE ?) OR (`u`.`age` > ?))',
    );
    expect(params).toEqual([true, '%spam.com%', 30]);
  });

  it('should handle cursor pagination with one field', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .orderBy('createdAt', OrderDirection.ASC)
      .setTake(10)
      .setCursor(
        [{ field: 'createdAt', value: '2023-01-01T00:00:00.000Z' }],
        FilterOperator.GREATER_THAN,
        OrderDirection.ASC,
      );

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain('WHERE (`u`.`createdAt` > ?)');
    expect(query).toContain('ORDER BY `u`.`createdAt` ASC');
    expect(params).toEqual(['2023-01-01T00:00:00.000Z']);
  });

  it('should handle cursor pagination with two fields', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .orderBy('createdAt', OrderDirection.ASC)
      .orderBy('id', OrderDirection.ASC)
      .setTake(10)
      .setCursor(
        [
          { field: 'createdAt', value: '2023-01-01T00:00:00.000Z' },
          { field: 'id', value: 123 },
        ],
        FilterOperator.GREATER_THAN,
        OrderDirection.ASC,
      );

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'WHERE ((`u`.`createdAt` > ?) OR (`u`.`createdAt` = ? AND `u`.`id` > ?))',
    );
    expect(query).toContain('ORDER BY `u`.`createdAt` ASC, `u`.`id` ASC');
    expect(params).toEqual([
      '2023-01-01T00:00:00.000Z',
      '2023-01-01T00:00:00.000Z',
      123,
    ]);
  });

  it('should correctly handle IN and IS_NULL operators', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .where({ field: 'id', operator: FilterOperator.IN, value: [1, 2, 3] })
      .orWhere({
        field: 'email',
        operator: FilterOperator.IS_NULL,
        value: null,
      });

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'WHERE ((`u`.`id` IN (?, ?, ?)) OR (`u`.`email` IS NULL))',
    );
    expect(params).toEqual([1, 2, 3]);
  });

  it('should translate a many-to-many pivot join', () => {
    const joinCriteria = CriteriaFactory.GetInnerJoinCriteria(RoleSchema).where(
      {
        field: 'name',
        operator: FilterOperator.EQUALS,
        value: 'admin',
      },
    );

    const criteria = CriteriaFactory.GetCriteria(UserSchema)
      .join('roles', joinCriteria)
      .setSelect(['username']);

    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'INNER JOIN `user_roles` AS `u_roles_pivot` ON `u`.`id` = `u_roles_pivot`.`user_id`',
    );
    expect(query).toContain(
      'INNER JOIN `roles` AS `roles` ON `u_roles_pivot`.`role_id` = `roles`.`id` AND (`roles`.`name` = ?)',
    );
    expect(params).toEqual(['admin']);
  });

  describe('JSON and Array Operator Translation', () => {
    it('should translate JSON_CONTAINS correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS,
        value: { tags: 'tech' },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (JSON_CONTAINS(`p`.`metadata`, ?, '$.tags'))",
      );
      expect(params).toEqual(['"tech"']);
    });

    it('should translate JSON_NOT_CONTAINS correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_NOT_CONTAINS,
        value: { tags: 'spam' },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (NOT JSON_CONTAINS(`p`.`metadata`, ?, '$.tags'))",
      );
      expect(params).toEqual(['"spam"']);
    });

    it('should translate JSON_CONTAINS_ANY correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS_ANY,
        value: { tags: ['tech', 'news'] },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((JSON_CONTAINS(`p`.`metadata`, ?, '$.tags') OR JSON_CONTAINS(`p`.`metadata`, ?, '$.tags')))",
      );
      expect(params).toEqual(['"tech"', '"news"']);
    });

    it('should translate JSON_NOT_CONTAINS_ANY correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_NOT_CONTAINS_ANY,
        value: { tags: ['tech', 'news'] },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((NOT JSON_CONTAINS(`p`.`metadata`, ?, '$.tags') AND NOT JSON_CONTAINS(`p`.`metadata`, ?, '$.tags')))",
      );
      expect(params).toEqual(['"tech"', '"news"']);
    });

    it('should translate JSON_CONTAINS_ALL correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS_ALL,
        value: { tags: ['tech', 'important'] },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((JSON_CONTAINS(`p`.`metadata`, ?, '$.tags') AND JSON_CONTAINS(`p`.`metadata`, ?, '$.tags')))",
      );
      expect(params).toEqual(['"tech"', '"important"']);
    });

    it('should translate JSON_NOT_CONTAINS_ALL correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_NOT_CONTAINS_ALL,
        value: { tags: ['tech', 'important'] },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((NOT JSON_CONTAINS(`p`.`metadata`, ?, '$.tags') OR NOT JSON_CONTAINS(`p`.`metadata`, ?, '$.tags')))",
      );
      expect(params).toEqual(['"tech"', '"important"']);
    });

    it('should translate JSON_PATH_VALUE_EQUALS with a nested path', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.JSON_PATH_VALUE_EQUALS,
        value: { 'extra.source': 'import' },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (JSON_EXTRACT(`p`.`metadata`, '$.extra.source') = ?)",
      );
      expect(params).toEqual(['import']);
    });

    it('should translate ARRAY_CONTAINS_ELEMENT for a top-level array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
        value: 'sports',
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (JSON_CONTAINS(`p`.`categories`, ?, '$'))",
      );
      expect(params).toEqual(['"sports"']);
    });

    it('should translate ARRAY_NOT_CONTAINS_ELEMENT for a top-level array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT,
        value: 'sports',
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (NOT JSON_CONTAINS(`p`.`categories`, ?, '$'))",
      );
      expect(params).toEqual(['"sports"']);
    });

    it('should translate ARRAY_CONTAINS_ELEMENT for a nested JSON array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
        value: { tags: 'finance' },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (JSON_CONTAINS(`p`.`metadata`, ?, '$.tags'))",
      );
      expect(params).toEqual(['"finance"']);
    });

    it('should translate ARRAY_NOT_CONTAINS_ELEMENT for a nested JSON array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT,
        value: { tags: 'finance' },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (NOT JSON_CONTAINS(`p`.`metadata`, ?, '$.tags'))",
      );
      expect(params).toEqual(['"finance"']);
    });

    it('should translate ARRAY_CONTAINS_ANY_ELEMENT for a top-level array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
        value: ['tech', 'news'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((JSON_CONTAINS(`p`.`categories`, ?, '$') OR JSON_CONTAINS(`p`.`categories`, ?, '$')))",
      );
      expect(params).toEqual(['"tech"', '"news"']);
    });

    it('should translate ARRAY_NOT_CONTAINS_ANY_ELEMENT for a top-level array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
        value: ['tech', 'news'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((NOT JSON_CONTAINS(`p`.`categories`, ?, '$') AND NOT JSON_CONTAINS(`p`.`categories`, ?, '$')))",
      );
      expect(params).toEqual(['"tech"', '"news"']);
    });

    it('should translate ARRAY_CONTAINS_ALL_ELEMENTS for a top-level array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
        value: ['tech', 'important'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((JSON_CONTAINS(`p`.`categories`, ?, '$') AND JSON_CONTAINS(`p`.`categories`, ?, '$')))",
      );
      expect(params).toEqual(['"tech"', '"important"']);
    });

    it('should translate ARRAY_NOT_CONTAINS_ALL_ELEMENTS for a top-level array', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_NOT_CONTAINS_ALL_ELEMENTS,
        value: ['tech', 'important'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE ((NOT JSON_CONTAINS(`p`.`categories`, ?, '$') OR NOT JSON_CONTAINS(`p`.`categories`, ?, '$')))",
      );
      expect(params).toEqual(['"tech"', '"important"']);
    });

    it('should translate ARRAY_EQUALS for a native array column', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_EQUALS,
        value: ['tech', 'news'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain('WHERE (`p`.`categories` = ?)');
      expect(params).toEqual(['["tech","news"]']);
    });

    it('should translate ARRAY_EQUALS_STRICT for a native array column', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'categories',
        operator: FilterOperator.ARRAY_EQUALS_STRICT,
        value: ['tech', 'news'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain('WHERE (`p`.`categories` = ?)');
      expect(params).toEqual(['["tech","news"]']);
    });

    it('should translate ARRAY_EQUALS_STRICT for a JSON array column', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema).where({
        field: 'metadata',
        operator: FilterOperator.ARRAY_EQUALS_STRICT,
        value: { ratings: [4, 5] },
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        "WHERE (JSON_EXTRACT(`p`.`metadata`, '$.ratings') = ?)",
      );
      expect(params).toEqual(['[4,5]']);
    });

    it('should translate SET_CONTAINS correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
        field: 'tags',
        operator: FilterOperator.SET_CONTAINS,
        value: 'admin',
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain('WHERE (FIND_IN_SET(?, `u`.`tags`))');
      expect(params).toEqual(['admin']);
    });

    it('should translate SET_NOT_CONTAINS correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
        field: 'tags',
        operator: FilterOperator.SET_NOT_CONTAINS,
        value: 'admin',
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain('WHERE (NOT FIND_IN_SET(?, `u`.`tags`))');
      expect(params).toEqual(['admin']);
    });

    it('should translate SET_CONTAINS_ANY correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
        field: 'tags',
        operator: FilterOperator.SET_CONTAINS_ANY,
        value: ['admin', 'editor'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        'WHERE ((FIND_IN_SET(?, `u`.`tags`) OR FIND_IN_SET(?, `u`.`tags`)))',
      );
      expect(params).toEqual(['admin', 'editor']);
    });

    it('should translate SET_NOT_CONTAINS_ANY correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
        field: 'tags',
        operator: FilterOperator.SET_NOT_CONTAINS_ANY,
        value: ['admin', 'editor'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        'WHERE ((NOT FIND_IN_SET(?, `u`.`tags`) AND NOT FIND_IN_SET(?, `u`.`tags`)))',
      );
      expect(params).toEqual(['admin', 'editor']);
    });

    it('should translate SET_CONTAINS_ALL correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
        field: 'tags',
        operator: FilterOperator.SET_CONTAINS_ALL,
        value: ['admin', 'editor'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        'WHERE ((FIND_IN_SET(?, `u`.`tags`) AND FIND_IN_SET(?, `u`.`tags`)))',
      );
      expect(params).toEqual(['admin', 'editor']);
    });

    it('should translate SET_NOT_CONTAINS_ALL correctly', () => {
      const criteria = CriteriaFactory.GetCriteria(UserSchema).where({
        field: 'tags',
        operator: FilterOperator.SET_NOT_CONTAINS_ALL,
        value: ['admin', 'editor'],
      });
      const { query, params } = translator.translate(
        criteria,
        createInitialParts(),
      );
      expect(query).toContain(
        'WHERE ((NOT FIND_IN_SET(?, `u`.`tags`) OR NOT FIND_IN_SET(?, `u`.`tags`)))',
      );
      expect(params).toEqual(['admin', 'editor']);
    });
  });

  it('should handle ordering with NULLS FIRST', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema).orderBy(
      'createdAt',
      OrderDirection.ASC,
      true,
    );

    const { query } = translator.translate(criteria, createInitialParts());
    expect(query).toContain('ORDER BY `u`.`createdAt` ASC NULLS FIRST');
  });

  it('should handle ordering with NULLS LAST (explicitly false)', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema).orderBy(
      'createdAt',
      OrderDirection.DESC,
      false,
    );

    const { query } = translator.translate(criteria, createInitialParts());
    expect(query).toContain('ORDER BY `u`.`createdAt` DESC NULLS LAST');
  });

  it('should handle ordering with NULLS LAST (default behavior when parameter is omitted)', () => {
    const criteria = CriteriaFactory.GetCriteria(UserSchema).orderBy(
      'createdAt',
      OrderDirection.DESC,
    );

    const { query } = translator.translate(criteria, createInitialParts());
    expect(query).toContain('ORDER BY `u`.`createdAt` DESC NULLS LAST');
  });
});
