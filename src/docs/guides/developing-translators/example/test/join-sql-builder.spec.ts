import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  JoinSqlBuilder,
  DEFAULT_JOIN_SELECT_STRATEGY,
  type TranslatorMethodsForJoinBuilder,
} from '../utils/join-sql-builder.js';
import {
  CriteriaFactory,
  GetTypedCriteriaSchema,
  SelectType,
} from '../../../../../criteria/index.js';
import type { PseudoSqlParts } from '../types.js';
import type { ICriteriaVisitor } from '../../../../../criteria/types/visitor-interface.types.js';

// Define schemas for testing
const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username'],
  identifier_field: 'id',
  relations: [],
});

describe('JoinSqlBuilder', () => {
  let joinSqlBuilder: JoinSqlBuilder;
  let mockMethods: TranslatorMethodsForJoinBuilder;
  let mockVisitor: ICriteriaVisitor<PseudoSqlParts, any>;

  beforeEach(() => {
    mockVisitor = {
      visitRoot: vi.fn(),
      visitInnerJoin: vi.fn(),
      visitLeftJoin: vi.fn(),
      visitOuterJoin: vi.fn(),
      visitFilter: vi.fn(),
      visitAndGroup: vi.fn(),
      visitOrGroup: vi.fn(),
    };

    mockMethods = {
      generateParamPlaceholder: vi.fn(() => '?'),
      _buildConditionFromGroup: vi.fn(),
      getTranslatorInstance: vi.fn(() => mockVisitor),
    };

    joinSqlBuilder = new JoinSqlBuilder(mockMethods);
  });

  const createInitialParts = (): PseudoSqlParts => ({
    select: [],
    from: '',
    joins: [],
    where: [],
    orderBy: [],
    params: [],
  });

  const createJoinParameters = (select?: SelectType) => ({
    join_options: { select },
    relation_type: 'many_to_one' as const,
    parent_source_name: 'posts',
    parent_alias: 'p',
    relation_alias: 'user',
    parent_identifier: 'id',
    local_field: 'userId',
    relation_field: 'id',
    parent_schema_metadata: {},
    join_metadata: {},
  });

  it('should use DEFAULT_JOIN_SELECT_STRATEGY when select is undefined', () => {
    const criteria = CriteriaFactory.GetInnerJoinCriteria(UserSchema);
    const sqlParts = createInitialParts();
    const parameters = createJoinParameters(undefined);

    joinSqlBuilder.buildJoin(
      'INNER',
      criteria,
      // @ts-expect-error - Testing internal logic with partial parameters
      parameters,
      sqlParts,
      [],
    );

    // Verify that the default strategy is FULL_ENTITY
    expect(DEFAULT_JOIN_SELECT_STRATEGY).toBe(SelectType.FULL_ENTITY);
    expect(sqlParts.select).toContain('`user`.`id`');
    expect(sqlParts.select).toContain('`user`.`username`');
  });

  it('should handle ID_ONLY strategy', () => {
    const criteria = CriteriaFactory.GetInnerJoinCriteria(UserSchema);
    const sqlParts = createInitialParts();
    const parameters = createJoinParameters(SelectType.ID_ONLY);

    joinSqlBuilder.buildJoin(
      'INNER',
      criteria,
      // @ts-expect-error
      parameters,
      sqlParts,
      [],
    );

    expect(sqlParts.select).toContain('`user`.`id`');
    expect(sqlParts.select).not.toContain('`user`.`username`');
  });

  it('should handle NO_SELECTION strategy', () => {
    const criteria = CriteriaFactory.GetInnerJoinCriteria(UserSchema);
    const sqlParts = createInitialParts();
    const parameters = createJoinParameters(SelectType.NO_SELECTION);

    joinSqlBuilder.buildJoin(
      'INNER',
      criteria,
      // @ts-expect-error
      parameters,
      sqlParts,
      [],
    );

    expect(sqlParts.select).toHaveLength(0);
  });

  it('should handle FULL_ENTITY strategy', () => {
    const criteria = CriteriaFactory.GetInnerJoinCriteria(UserSchema);
    const sqlParts = createInitialParts();
    const parameters = createJoinParameters(SelectType.FULL_ENTITY);

    joinSqlBuilder.buildJoin(
      'INNER',
      criteria,
      // @ts-expect-error
      parameters,
      sqlParts,
      [],
    );

    expect(sqlParts.select).toContain('`user`.`id`');
    expect(sqlParts.select).toContain('`user`.`username`');
  });
});
