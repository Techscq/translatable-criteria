import {
  CriteriaFactory,
  type CriteriaSchema,
  type FieldOfSchema,
  FilterOperator,
  type FilterPrimitive,
  GetTypedCriteriaSchema,
  type ICriteriaBase,
} from '../../../criteria/index.js';

export type getPostByCriteriaRequest = {
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
  excludedCategories?: string[];
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
  relations: [
    {
      relation_alias: 'posts',
      relation_type: 'one_to_many',
      target_source_name: 'post',
      local_field: 'uuid',
      relation_field: 'user_uuid',
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
  relations: [
    {
      relation_alias: 'publisher',
      relation_type: 'many_to_one',
      target_source_name: 'user',
      local_field: 'user_uuid',
      relation_field: 'uuid',
    },
  ],
});
export type PostSchema = typeof PostSchema;

/**
 * Builds a criteria to find posts by a specific publisher's UUID,
 * but only for filtering purposes, without selecting the publisher's data.
 * @param publisherUuid The UUID of the publisher to filter by.
 * @returns A Criteria object configured for fetching posts.
 */
export function buildPostFilterOnlyByPublisherCriteria(publisherUuid: string) {
  const postCriteria = CriteriaFactory.GetCriteria(PostSchema);

  postCriteria.join(
    'publisher',
    CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: publisherUuid,
    }),
    false,
  );

  postCriteria.orderBy('created_at', 'DESC');
  postCriteria.setTake(10);

  return postCriteria;
}

/**
 * Builds a paginated criteria for posts based on the provided request parameters.
 * @param request The request object containing filter, join, and pagination parameters.
 * @returns A Criteria object configured for fetching posts.
 */
export function buildPostPaginatedCriteria(request: getPostByCriteriaRequest) {
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
      operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
      value: request.categories,
    });
  }

  if (request.excludedCategories && request.excludedCategories.length > 0) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'categories',
      operator: FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
      value: request.excludedCategories,
    });
  }

  if (request.metadata) {
    if (request.metadata.tags && request.metadata.tags.length > 0) {
      dynamicFilterApplierHelper(postCriteria, {
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS_ALL,
        value: { tags: request.metadata.tags },
      });
    }
    if (request.metadata.views !== undefined) {
      dynamicFilterApplierHelper(postCriteria, {
        field: 'metadata',
        operator: FilterOperator.JSON_PATH_VALUE_EQUALS,
        value: { views: request.metadata.views },
      });
    }
    if (request.metadata.ratings && request.metadata.ratings.length > 0) {
      dynamicFilterApplierHelper(postCriteria, {
        field: 'metadata',
        operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
        value: { ratings: request.metadata.ratings },
      });
    }
  }

  if (request.publisher_uuid) {
    postCriteria.join(
      'publisher',
      CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: request.publisher_uuid,
      }),
    );
  }

  if (request.cursor) {
    const cursorOperator =
      request.cursor.order === 'ASC'
        ? FilterOperator.GREATER_THAN
        : FilterOperator.LESS_THAN;

    postCriteria
      .setCursor(
        [
          { field: 'created_at', value: request.cursor.created_at },
          { field: 'uuid', value: request.cursor.uuid },
        ],
        cursorOperator,
        request.cursor.order,
      )
      .orderBy('created_at', request.cursor.order)
      .orderBy('uuid', request.cursor.order);
  } else if (request.offset) {
    postCriteria.setSkip(Math.max(0, (request.offset.page - 1) * 5));
    postCriteria.orderBy('created_at', request.offset.order);
  } else {
    postCriteria.orderBy('created_at', 'DESC');
  }

  postCriteria.setTake(5);

  return postCriteria;
}

/**
 * Helper function to apply filters to a criteria object, handling the initial `where` call.
 * @param criteria The criteria object to apply the filter to.
 * @param filterPrimitive The filter primitive to apply.
 */
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
