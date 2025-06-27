# Practical Guide: Dynamic Criteria Building

The previous guides have shown you how to [Define Schemas](../guides/schema-definitions/en.md) and [Build Criteria](../guides/building-criteria/en.md). Now, let's see how these pieces fit together in a more realistic, dynamic application scenario.

This guide presents a complete example demonstrating the construction of a complex `Criteria` object based on optional input parameters, such as those from an API request. The goal is to illustrate how the library can be used to solve problems in a subtle, orderly, and decoupled manner, regardless of whether the context is simple or highly complex.

## Index

- 1. [The Example Scenario](#1-the-example-scenario)
- 2. [Schema Definitions (Reminder)](#2-schema-definitions-reminder)
- 3. [Building the Dynamic Criteria](#3-building-the-dynamic-criteria)
- 4. [The Helper Function: A Good Practice](#4-the-helper-function-a-good-practice)
- 5. [Conclusion: A Philosophy of Flexibility](#5-conclusion-a-philosophy-of-flexibility)

---

## 1. The Example Scenario

Imagine you are building an API endpoint to search for blog posts. The endpoint must support filtering by various optional parameters like title, body content, tags, and author details. It also needs to handle different pagination strategies (offset and cursor-based).

A typical request object might look like this, where any field can be omitted:

```typescript
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
  excludedCategories?: string[];
};
```

Our goal is to build a single function that takes this request object and dynamically constructs a [`Criteria`](../api-reference/en.md#criteria-abstract-base-class) object, applying filters, joins, and pagination logic only if the corresponding parameters are provided.

## 2. Schema Definitions (Reminder)

For this example, we will use the `PostSchema` and `UserSchema`. For a detailed guide on how to create them, please refer to [the Schema Definition guide.](../guides/schema-definitions/en.md)

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

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
```

## 3. Building the Dynamic Criteria

We will create a function, `buildPostPaginatedCriteria`, that accepts the request object and conditionally builds the `Criteria`. This approach keeps the query construction logic clean and centralized.

```typescript
const maxPostPerPage = 5;

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
```

**Criteria Breakdown:**

- **Initialization:** We start with a base `RootCriteria` for `PostSchema`.
- **Conditional Filters:** Each `if (request.field)` block checks for a parameter's existence. If present, it uses a helper function (`dynamicFilterApplierHelper`) to apply the corresponding filter. Note the use of `FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT` for `excludedCategories`, which efficiently filters out posts belonging to any of the specified categories in a single operation.
- **Conditional Join:** The `JOIN` to the `publisher` (User) is only added if a `publisher_uuid` is provided for filtering. This ensures that the join is not performed unnecessarily.
- **Conditional Pagination:** The logic handles three scenarios: applying cursor-based pagination if a cursor is present, falling back to offset-based pagination if an offset is provided, or applying a default ordering if neither is specified.
- **Global Limit:** A `setTake()` is applied at the end, which serves as a default page size for both pagination methods.

## 4. The Helper Function: A Good Practice

The example uses a helper function, `dynamicFilterApplierHelper`, to manage the application of filters.

```typescript
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
```

This helper is provided purely as an **example** of how a developer can handle the complexity of building a criteria object. The key takeaway is not the specific implementation of the helper, but the **principle** behind it:

- **Encapsulation:** It encapsulates the logic of solving the common problem of whether to call `.where()` (for the first filter) or `.andWhere()` (for subsequent filters) when building a query dynamically.
- **Type Safety:** The helper is generic (`<TSchema extends CriteriaSchema, ...>`). This is a **highly recommended practice**. By extending the generic types from the library, you ensure that your own abstractions maintain full type safety and autocompletion, preventing bugs and improving code maintainability throughout your project.

Developers are entirely free to create their own solutions or helpers for dynamically building their criteria. The important thing is to leverage the library's type system to build robust and maintainable code.

## New Use Case: Efficient Filtering with `withSelect`

In addition to dynamic filtering, a common requirement is to filter a main entity based on its relationships, without needing the data from the related entity. For this, the `withSelect` parameter in the `.join()` method is ideal.

Let's create a new function that finds posts from a specific publisher but only returns the post data, making the query more efficient.

```typescript
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
    false, // withSelect is false
  );

  postCriteria.orderBy('created_at', 'DESC');
  postCriteria.setTake(10);

  return postCriteria;
}
```

This function `buildPostFilterOnlyByPublisherCriteria` creates a `Criteria` object that will generate a query to join with the `user` table solely to filter by `publisherUuid`, but the final `SELECT` statement will not include any fields from the `user` table.

## 5. Conclusion: A Philosophy of Flexibility

This example is not intended to impose or propose any specific architectural pattern. The purpose is to demonstrate how `@nulledexp/translatable-criteria` provides the tools to solve a potentially complex problem in a decoupled and organized way.

The same principles shown here apply equally to simpler or even more complex scenarios. The library gives you the building blocks; how you integrate them into your services, repositories, or use cases is entirely up to your architectural decisions.

---

## Next Steps

- For a detailed reference of all classes and types, consult the [API Reference.](../api-reference/en.md)
- To learn how to convert a `Criteria` object into a native query, see the [Developing Custom Translators guide.](../guides/developing-translators/en.md)
