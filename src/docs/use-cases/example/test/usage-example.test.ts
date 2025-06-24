import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildPostPaginatedCriteria,
  type getPostByCriteriaRequest,
} from '../usage-examples.js';
import {
  type PseudoSqlParts,
  PseudoSqlTranslator,
} from '../../../guides/developing-translators/example/pseudo-sql.translator.js';

describe('buildPostPaginatedCriteria with PseudoSqlTranslator', () => {
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

  it('should generate correct SQL for title and body filters', () => {
    const request: getPostByCriteriaRequest = {
      title: 'TypeORM',
      body: 'guide',
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'WHERE (`posts`.`title` LIKE ? AND `posts`.`body` LIKE ?)',
    );
    expect(params).toEqual(['%TypeORM%', '%guide%']);
  });

  it('should handle category inclusion and exclusion filters', () => {
    const request: getPostByCriteriaRequest = {
      categories: ['nestjs', 'api'],
      excludedCategories: ['legacy', 'old'],
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      "WHERE ((JSON_CONTAINS(`posts`.`categories`, ?, '$') OR JSON_CONTAINS(`posts`.`categories`, ?, '$')) AND (NOT JSON_CONTAINS(`posts`.`categories`, ?, '$') AND NOT JSON_CONTAINS(`posts`.`categories`, ?, '$')))",
    );
    expect(params).toEqual(['"nestjs"', '"api"', '"legacy"', '"old"']);
  });

  it('should handle complex metadata filters for tags, views, and ratings', () => {
    const request: getPostByCriteriaRequest = {
      metadata: {
        tags: ['tech', 'important'],
        views: 1000,
        ratings: [4, 5],
      },
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      "WHERE ((JSON_CONTAINS(`posts`.`metadata`, ?, '$.tags') AND JSON_CONTAINS(`posts`.`metadata`, ?, '$.tags')) AND JSON_EXTRACT(`posts`.`metadata`, '$.views') = ? AND (JSON_CONTAINS(`posts`.`metadata`, ?, '$.ratings') AND JSON_CONTAINS(`posts`.`metadata`, ?, '$.ratings')))",
    );
    expect(params).toEqual(['"tech"', '"important"', 1000, '4', '5']);
  });

  it('should generate a correct INNER JOIN for publisher_uuid', () => {
    const request: getPostByCriteriaRequest = {
      publisher_uuid: 'user-123',
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` AND (`publisher`.`uuid` = ?)',
    );
    expect(params).toEqual(['user-123']);
  });

  it('should apply offset pagination correctly', () => {
    const request: getPostByCriteriaRequest = {
      offset: { page: 3, order: 'ASC' },
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query } = translator.translate(criteria, createInitialParts());

    expect(query).toContain('ORDER BY `posts`.`created_at` ASC');
    expect(query).toContain('LIMIT 5');
    expect(query).toContain('OFFSET 10');
  });

  it('should apply cursor pagination correctly', () => {
    const request: getPostByCriteriaRequest = {
      cursor: {
        created_at: '2023-10-27T10:00:00.000Z',
        uuid: 'post-abc',
        order: 'DESC',
      },
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'WHERE ((`posts`.`created_at` < ?) OR (`posts`.`created_at` = ? AND `posts`.`uuid` < ?))',
    );
    expect(query).toContain(
      'ORDER BY `posts`.`created_at` DESC, `posts`.`uuid` DESC',
    );
    expect(params).toEqual([
      '2023-10-27T10:00:00.000Z',
      '2023-10-27T10:00:00.000Z',
      'post-abc',
    ]);
  });

  it('should combine multiple filters, a join, and pagination into a single query', () => {
    const request: getPostByCriteriaRequest = {
      title: 'Advanced',
      excludedCategories: ['beginner'],
      metadata: {
        views: 500,
      },
      publisher_uuid: 'user-456',
      offset: { page: 1, order: 'DESC' },
    };
    const criteria = buildPostPaginatedCriteria(request);
    const { query, params } = translator.translate(
      criteria,
      createInitialParts(),
    );

    expect(query).toContain(
      'INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` AND (`publisher`.`uuid` = ?)',
    );
    expect(query).toContain(
      "WHERE (`posts`.`title` LIKE ? AND (NOT JSON_CONTAINS(`posts`.`categories`, ?, '$')) AND JSON_EXTRACT(`posts`.`metadata`, '$.views') = ?)",
    );
    expect(query).toContain('ORDER BY `posts`.`created_at` DESC');
    expect(query).toContain('LIMIT 5');
    expect(query).toContain('OFFSET 0');
    expect(params).toEqual(['user-456', '%Advanced%', '"beginner"', 500]);
  });
});
