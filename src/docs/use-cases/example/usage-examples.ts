import {
  CriteriaFactory,
  type CriteriaSchema,
  type FieldOfSchema,
  FilterOperator,
  type FilterPrimitive,
  GetTypedCriteriaSchema,
  type ICriteriaBase,
} from '../../../criteria/index.js';

type getPostByCriteriaRequest = {
  offset?: { page: number; order: 'ASC' | 'DESC' };
  cursor?: {
    uuid: string;
    created_at: string;
    order: 'ASC' | 'DESC';
  };
  title?: string;
  body?: string;
  metadata?: {
    tags?: string[];
    views?: number;
    ratings?: number[];
    extra?: Record<string, any>;
  };
  publisher_uuid?: string;
  categories?: string[];
};

export interface EntityBase {
  uuid: string;
  created_at: string;
}
export interface User extends EntityBase {
  email: string;
  username: string;
  posts: Post[];
}

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: 'users',
  fields: ['uuid', 'email', 'username', 'created_at'],
  identifier_field: 'uuid',
  joins: [
    {
      alias: 'posts',
      relation_type: 'one_to_many',
      target_source_name: 'post',
    },
  ],
});
export type UserSchema = typeof UserSchema;

export interface Post extends EntityBase {
  title: string;
  body: string;
  publisher: User;
  categories: string[] | null;
  metadata?: {
    tags?: string[];
    views?: number;
    ratings?: number[];
    extra?: Record<string, any>;
  };
}
export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: 'posts',
  identifier_field: 'uuid',
  fields: [
    'uuid',
    'categories',
    'title',
    'body',
    'user_uuid',
    'created_at',
    'metadata',
  ],
  joins: [
    {
      alias: 'publisher',
      relation_type: 'many_to_one',
      target_source_name: 'user',
    },
  ],
});
export type PostSchema = typeof PostSchema;

const maxPostPerPage = 5;
function getPostsPaginatedByCriteria(
  request: getPostByCriteriaRequest,
  // repository: PostRepository,
  // actualDataSourceProcessor: DataSourceProcessor,
) {
  const postCriteria = buildPostPaginatedCriteria(request);
  // repository.matchingMany(postCriteria);
  // const [query, params] = translator.translate(postCriteria);
  // actualDataSourceProcessor.execute(query,params);
}

function buildPostPaginatedCriteria(request: getPostByCriteriaRequest) {
  const postCriteria = CriteriaFactory.GetCriteria(PostSchema);

  if (request.title) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'title',
      operator: FilterOperator.CONTAINS,
      value: request.title,
    });
  }

  if (request.body) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'body',
      operator: FilterOperator.CONTAINS,
      value: request.body,
    });
  }

  if (request.categories) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'categories',
      operator: FilterOperator.SET_CONTAINS_ANY,
      value: request.categories,
    });
  }

  if (request.metadata) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'metadata',
      operator: FilterOperator.JSON_CONTAINS,
      value: request.metadata,
    });
  }

  if (request.publisher_uuid) {
    postCriteria.join(
      'publisher',
      CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: request.publisher_uuid,
      }),
      {
        join_field: 'uuid',
        parent_field: 'user_uuid',
      },
    );
  }

  if (request.cursor) {
    postCriteria
      .setCursor(
        [
          { field: 'created_at', value: request.cursor.created_at },
          { field: 'uuid', value: request.cursor.uuid },
        ],
        FilterOperator.GREATER_THAN,
        'ASC',
      )
      .orderBy('created_at', request.cursor.order)
      .orderBy('uuid', request.cursor.order);
  } else if (request.offset) {
    postCriteria.setSkip(
      Math.max(0, (request.offset.page - 1) * maxPostPerPage),
    );
    postCriteria.orderBy('created_at', request.offset.order);
  } else {
    postCriteria.orderBy('created_at', 'DESC');
  }

  postCriteria.setTake(maxPostPerPage);

  return postCriteria;
}

function dynamicFilterApplierHelper<
  TSchema extends CriteriaSchema,
  Operator extends FilterOperator,
>(
  criteria: ICriteriaBase<TSchema>,
  filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
) {
  if (criteria.rootFilterGroup.items.length === 0) {
    criteria.where(filterPrimitive);
  } else {
    criteria.andWhere(filterPrimitive);
  }
}
