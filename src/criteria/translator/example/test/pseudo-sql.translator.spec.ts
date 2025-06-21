import {
  type PseudoSqlParts,
  PseudoSqlTranslator,
} from '../pseudo-sql.translator.js';
import { GetTypedCriteriaSchema } from '../../../types/schema.types.js';
import { CriteriaFactory } from '../../../criteria-factory.js';
import { FilterOperator } from '../../../types/operator.types.js';
import { OrderDirection } from '../../../order/order.js';

const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt'],
  identifier_field: 'id',
  joins: [
    {
      alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
    },
    {
      alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
    },
  ],
});

const PostSchema = GetTypedCriteriaSchema({
  source_name: 'posts',
  alias: 'p',
  fields: ['id', 'title', 'content', 'userId'],
  identifier_field: 'id',
  joins: [
    {
      alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
    },
  ],
});

const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  joins: [],
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
      'SELECT `u`.`id`, `u`.`username`, `u`.`email`, `u`.`age`, `u`.`isActive`, `u`.`createdAt` FROM `users` AS `u` WHERE (`u`.`email` LIKE ?)',
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
      .join('posts', joinCriteria, {
        parent_field: 'id',
        join_field: 'userId',
      });

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
    // Updated expectation for parameters to match the translator's logic
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
      .join('roles', joinCriteria, {
        parent_field: { reference: 'id', pivot_field: 'user_id' },
        join_field: { reference: 'id', pivot_field: 'role_id' },
        pivot_source_name: 'user_roles',
      })
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
});
