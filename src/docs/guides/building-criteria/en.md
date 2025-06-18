# Practical Guide: Building Criteria

Once you have defined your [Schemas](../schema-definitions/en.md), the next step is to use them to construct `Criteria` objects. These objects encapsulate all the logic of your query: what data to select, how to filter it, how to join it with other entities, how to order it, and how to paginate it.

This guide will show you how to use `CriteriaFactory` and the fluent methods of `Criteria` objects to build queries effectively and with type safety.

## Index

- 1. [Creating a `RootCriteria`](#1-creating-a-rootcriteria)
- 2. [Applying Filters](#2-applying-filters)
  - [Basic Filters](#basic-filters)
  - [Logical Grouping (AND/OR)](#logical-grouping-andor)
  - [Advanced Filters (JSON, Array, Set)](#advanced-filters-json-array-set)
    - [Filtering JSON Fields (`JSON_CONTAINS`, `JSON_NOT_CONTAINS`)](#filtering-json-fields-json_contains-json_not_contains)
    - [Filtering Array Fields (`ARRAY_CONTAINS_ELEMENT`, etc.)](#filtering-array-fields-array_contains_element-array_contains_all_elements-array_contains_any_element-array_equals)
    - [Filtering SET Fields (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)](#filtering-set-fields-set_contains-set_not_contains-set_contains_any-set_contains_all)
    - [Filtering by Ranges (`BETWEEN`, `NOT_BETWEEN`)](#filtering-by-ranges-between-not_between)
    - [Filtering with Regular Expressions (`MATCHES_REGEX`)](#filtering-with-regular-expressions-matches_regex)
    - [Case-Insensitive Pattern Matching (`ILIKE`, `NOT_ILIKE`)](#case-insensitive-pattern-matching-ilike-not_ilike)
- 3. [Adding Joins](#3-adding-joins)
  - [Simple Joins (one-to-many, many-to-one, one-to-one)](#simple-joins-one-to-many-many-to-one-one-to-one)
  - [Joins with Pivot Table (many-to-many)](#joins-with-pivot-table-many-to-many)
  - [Filtering on Joined Entities](#filtering-on-joined-entities)
- 4. [Ordering Results](#4-ordering-results)
  - [Ordering by Root Entity Fields](#ordering-by-root-entity-fields)
  - [Ordering by Joined Entity Fields](#ordering-by-joined-entity-fields)
- 5. [Pagination](#5-pagination)
  - [Offset-Based Pagination](#offset-based-pagination)
  - [Cursor-Based Pagination](#cursor-based-pagination)
- 6. [Field Selection](#6-field-selection)
  - [Selection on the Root Entity](#selection-on-the-root-entity)
  - [Selection on Joined Entities](#selection-on-joined-entities)
  - [Reverting to Select All Fields (`resetSelect`)](#reverting-to-select-all-fields-resetselect)
- 7. [Combining Everything](#7-combining-everything)
- [Next Steps](#next-steps)

---

## 1. Creating a `RootCriteria`

Every query starts with a `RootCriteria`, which represents the main entity from which the query will begin. It is created using `CriteriaFactory.GetCriteria()`:

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas'; // Ensure the path is correct

// Create Criteria for the User entity, using the 'users' alias
const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users');

// Create Criteria for the Post entity, using the 'posts' alias
const postCriteria = CriteriaFactory.GetCriteria(PostSchema, 'posts');
```

- The first argument is the entity's schema (`UserSchema`, `PostSchema`).
- The second argument is one of the aliases defined in the `alias` array of that schema. Using the correct alias is crucial for proper interpretation by translators.

## 2. Applying Filters

Filters are added using the `where()`, `andWhere()`, and `orWhere()` methods. These methods accept a `FilterPrimitive` object that defines the field, operator, and value.

### Basic Filters

```typescript
import { FilterOperator } from '@nulledexp/translatable-criteria';

// Find users with a specific email
userCriteria.where({
  field: 'email', // Field from UserSchema
  operator: FilterOperator.EQUALS,
  value: 'test@example.com',
});

// Find posts whose title contains "TypeScript"
postCriteria.where({
  field: 'title', // Field from PostSchema
  operator: FilterOperator.CONTAINS, // or FilterOperator.LIKE with '%'
  value: '%TypeScript%',
});

// Find posts created after a specific date
postCriteria.where({
  field: 'created_at',
  operator: FilterOperator.GREATER_THAN,
  value: new Date('2023-01-01'),
});
```

### Logical Grouping (AND/OR)

- `andWhere()`: Adds a condition that must be met along with the previous ones (logical AND).
- `orWhere()`: Adds a condition that, if met, makes the filter group true, even if previous conditions (grouped by AND) are not (logical OR). The library normalizes this to maintain a structure of `OR ( (cond1 AND cond2), (cond3) )`.

```typescript
// Users whose username is 'admin' AND their email contains '@example.com'
userCriteria
  .where({ field: 'username', operator: FilterOperator.EQUALS, value: 'admin' })
  .andWhere({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  });

// Posts that contain "Tutorial" in the title OR in the post body
postCriteria
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  })
  .orWhere({
    field: 'body',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  });

// More complex combination:
// (username = 'editor' AND email LIKE '%@editor.com%') OR (username = 'guest')
userCriteria
  .where({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'editor',
  })
  .andWhere({
    field: 'email',
    operator: FilterOperator.LIKE,
    value: '%@editor.com%',
  })
  .orWhere({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'guest',
  });
```

### Advanced Filters (JSON, Array, Set)

The library supports operators for more complex data types like JSON, arrays, and SET-type fields.

#### Filtering JSON Fields (`JSON_CONTAINS`, `JSON_NOT_CONTAINS`)

The value for these operators is an object where keys are JSON paths (the translator will determine if it needs `$.` at the beginning) and values are what is being searched for in that path.

```typescript
// Assuming PostSchema has a 'metadata' field of JSON type
// with a structure like: { tags: ["tech", "code"], views: 100 }

// Find posts where metadata.tags contains "tech" AND metadata.views is 100
postCriteria.where({
  field: 'metadata', // The JSON field
  operator: FilterOperator.JSON_CONTAINS,
  value: {
    tags: 'tech', // Searches for "tech" within the metadata.tags array
    views: 100, // Searches for metadata.views to be 100
    // "extra.source": "import" // You can also nest paths
  },
});

// Find posts where metadata.extra.quality IS NOT "low"
postCriteria.where({
  field: 'metadata',
  operator: FilterOperator.JSON_NOT_CONTAINS,
  value: {
    'extra.quality': 'low',
  },
});
```

#### Filtering Array Fields (`ARRAY_CONTAINS_ELEMENT`, `ARRAY_CONTAINS_ALL_ELEMENTS`, `ARRAY_CONTAINS_ANY_ELEMENT`, `ARRAY_EQUALS`)

These operators can be used for fields that are native arrays or arrays within JSON.

- **For native array columns:** The `value` is the element or array of elements to search for.
- **For arrays within JSON:** The `value` is an object with a single key (the JSON path to the array) and the value is the element or array of elements.

```typescript
// 1. Native Array Column: Find posts that have the "TypeScript" category
postCriteria.where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
  value: 'TypeScript',
});

// 2. Array within JSON: Find posts where metadata.tags contains "typeorm"
postCriteria.where({
  field: 'metadata', // Main JSON field
  operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
  value: { tags: 'typeorm' }, // { "path.to.array": element }
});

// 3. Native Array Column: Find posts that have ALL categories ["nestjs", "api"]
postCriteria.where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
  value: ['nestjs', 'api'],
});

// 4. Array within JSON: Find posts where metadata.ratings contains AT LEAST ONE of [4, 5]
postCriteria.where({
  field: 'metadata',
  operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
  value: { ratings: [4, 5] },
});

// 5. Native Array Column: Find posts whose categories are EXACTLY ["news", "updates"] (order matters)
postCriteria.where({
  field: 'categories',
  operator: FilterOperator.ARRAY_EQUALS,
  value: ['news', 'updates'],
});
```

#### Filtering SET Fields (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)

Similar to `CONTAINS` but conceptually for fields representing a set of values (like MySQL's `SET` type or a delimited string).

```typescript
// Assuming a 'flags' field in UserSchema which is a SET('active', 'verified', 'beta_tester')
// or a text field 'tags' like "typescript,javascript,nodejs"

// Find users who have the 'verified' flag
userCriteria.where({
  field: 'flags',
  operator: FilterOperator.SET_CONTAINS,
  value: 'verified',
});

// Find users who have AT LEAST ONE of the tags "typescript" or "javascript"
userCriteria.where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ANY,
  value: ['typescript', 'javascript'], // Expects an array of values
});

// Find users who have ALL the flags "active" AND "beta_tester"
userCriteria.where({
  field: 'flags',
  operator: FilterOperator.SET_CONTAINS_ALL,
  value: ['active', 'beta_tester'], // Expects an array of values
});
```

#### Filtering by Ranges (`BETWEEN`, `NOT_BETWEEN`)

These operators allow you to check if a numeric or date value falls within or outside a specific range.

```typescript
// Find posts created between two dates
postCriteria.where({
  field: 'created_at',
  operator: FilterOperator.BETWEEN,
  value: [new Date('2023-01-01'), new Date('2023-03-31')], // [min, max]
});

// Find products whose price IS NOT between 100 and 200
productCriteria.where({
  field: 'price',
  operator: FilterOperator.NOT_BETWEEN,
  value: [100, 200],
});
```

#### Filtering with Regular Expressions (`MATCHES_REGEX`)

Allows for more powerful pattern matching using regular expressions. The specific syntax of the regular expression may depend on the underlying database.

```typescript
// Find users whose username starts with "admin" followed by numbers
// (conceptual example, REGEX syntax varies)
userCriteria.where({
  field: 'username',
  operator: FilterOperator.MATCHES_REGEX,
  value: '^admin[0-9]+', // The regular expression as a string
});
```

#### Case-Insensitive Pattern Matching (`ILIKE`, `NOT_ILIKE`)

Similar to `LIKE` and `NOT_LIKE`, but they ensure that pattern comparison is case-insensitive, regardless of the database's default collation.

```typescript
// Find posts whose title contains "typescript" (case-insensitive)
postCriteria.where({
  field: 'title',
  operator: FilterOperator.ILIKE,
  value: '%typescript%',
});

// Find users whose email DOES NOT start with "test" (case-insensitive)
userCriteria.where({
  field: 'email',
  operator: FilterOperator.NOT_ILIKE,
  value: 'test%',
});
```

## 3. Adding Joins

Joins are added with the `join()` method. This method takes two arguments:

1. An instance of a join `Criteria` (`InnerJoinCriteria`, `LeftJoinCriteria`, `OuterJoinCriteria`), also created with `CriteriaFactory`.
2. A join parameters object that defines how the entities are related.

### Simple Joins (one-to-many, many-to-one, one-to-one)

For these relationships, the join parameters are `parent_field` and `join_field`.

```typescript
// Get posts and their author (publisher)
// PostSchema defines a 'publisher' join (many-to-one) with UserSchema
const postsWithAuthorCriteria = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher'), // 'publisher' is an alias in UserSchema
  {
    parent_field: 'user_uuid', // FK field in PostSchema
    join_field: 'uuid', // PK field in UserSchema (the 'publisher')
  },
);

// Get users and their posts
// UserSchema defines a 'posts' join (one-to-many) with PostSchema
const usersWithPostsCriteria = CriteriaFactory.GetCriteria(
  UserSchema,
  'users',
).join(
  CriteriaFactory.GetLeftJoinCriteria(PostSchema, 'posts'), // 'posts' is an alias in PostSchema
  {
    parent_field: 'uuid', // PK field in UserSchema
    join_field: 'user_uuid', // FK field in PostSchema
  },
);
```

**Note:** The `alias` used in `GetInnerJoinCriteria` (e.g., `'publisher'`) must be one of the `alias` defined in the schema of the entity being joined (in this case, `UserSchema`). The library validates this.

### Joins with Pivot Table (many-to-many)

For `many_to_many` relationships, the join parameters require a more detailed object that includes `pivot_source_name` and objects for `parent_field` and `join_field` specifying both the field in the entity and the field in the pivot table.

```typescript
// Get users and their permissions
// UserSchema defines a 'permissions' join (many-to-many) with PermissionSchema
const usersWithPermissionsCriteria = CriteriaFactory.GetCriteria(
  UserSchema,
  'users',
).join(CriteriaFactory.GetInnerJoinCriteria(PermissionSchema, 'permissions'), {
  pivot_source_name: 'user_permission_pivot', // Name of your pivot table
  parent_field: {
    pivot_field: 'user_id_in_pivot', // FK of User in the pivot table
    reference: 'uuid', // PK of User
  },
  join_field: {
    pivot_field: 'permission_id_in_pivot', // FK of Permission in the pivot table
    reference: 'uuid', // PK of Permission
  },
});
```

### Filtering on Joined Entities

You can apply filters directly to the join `Criteria`:

```typescript
// Get posts and only comments that DO NOT contain "spam"
const postsWithFilteredComments = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetLeftJoinCriteria(PostCommentSchema, 'comments').where({
    // Filter applied to the JoinCriteria (comments)
    field: 'comment_text',
    operator: FilterOperator.NOT_CONTAINS,
    value: 'spam',
  }),
  {
    parent_field: 'uuid',
    join_field: 'post_uuid',
  },
);
```

These filters on the `JoinCriteria` typically translate to conditions in the `ON` clause of the JOIN (or `AND` after the `ON` for some translators/databases).

## 4. Ordering Results

Ordering is applied with the `orderBy()` method, which takes the field name and the direction (`OrderDirection.ASC` or `OrderDirection.DESC`).

### Ordering by Root Entity Fields

```typescript
// Get users ordered by email ascending
userCriteria.orderBy('email', OrderDirection.ASC);

// Get posts ordered by creation date descending, then by title ascending
postCriteria
  .orderBy('created_at', OrderDirection.DESC)
  .orderBy('title', OrderDirection.ASC);
```

### Ordering by Joined Entity Fields

To order by a field from a joined entity, call `orderBy()` on the corresponding `JoinCriteria` instance.

```typescript
// Get posts, ordered by the author's (publisher) username
const postsOrderedByAuthorUsername = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
    'username',
    OrderDirection.ASC,
  ), // Ordering on the JoinCriteria
  { parent_field: 'user_uuid', join_field: 'uuid' },
);

// You can also combine orderings from the root and joins.
// The translator will handle applying the global order based on the internal `sequenceId` of each `Order`.
postsOrderedByAuthorUsername.orderBy('created_at', OrderDirection.DESC);
```

## 5. Pagination

The library supports offset-based and cursor-based pagination.

### Offset-Based Pagination

- `setTake(count)`: Limits the number of results (SQL `LIMIT`).
- `setSkip(count)`: Skips a number of results (SQL `OFFSET`).

```typescript
// Get the first 10 posts
postCriteria.setTake(10);

// Get posts from page 3 (assuming 10 per page)
postCriteria.setTake(10).setSkip(20); // (3-1) * 10
```

### Cursor-Based Pagination

This is more efficient for large and frequently changing datasets. Use `setCursor()`.

Requires:

1. `cursorFilters`: An array with one or two `FilterPrimitive` objects (without the `operator`). These define the values of the last item from the previous page.
   - If it's a single object, it's used for simple pagination over a unique field (usually an ordered and unique field, or a timestamp).
   - If there are two objects, it's used for composite pagination (keyset pagination), typically over a primary sort field (e.g., `created_at`) and a unique tie-breaker field (e.g., `uuid`).
2. `operator`: `FilterOperator.GREATER_THAN` (for next page) or `FilterOperator.LESS_THAN` (for previous page, if order is inverted).
3. `order`: The main `OrderDirection` in which pagination is occurring.

**Important:** For cursor-based pagination to work, the `Criteria` (root and/or relevant joins) **must** have `orderBy()` defined for the same fields used in `cursorFilters` and in the same order. The translator will use this information.

```typescript
// Simple cursor pagination (e.g., on 'created_at')
// Assume the last seen post had created_at = '2023-05-10T10:00:00.000Z'
// And we are ordering by created_at ASC
postCriteria
  .setCursor(
    [{ field: 'created_at', value: '2023-05-10T10:00:00.000Z' }], // Single filter for simple cursor
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('created_at', OrderDirection.ASC) // orderBy must match
  .setTake(10);

// Composite cursor pagination (e.g., on 'created_at' and 'uuid')
// Assume the last seen post had:
// created_at = '2023-05-10T10:00:00.000Z'
// uuid = 'some-last-uuid'
// And we are ordering by created_at ASC, then uuid ASC
postCriteria
  .setCursor(
    [
      // Two filters for composite cursor
      { field: 'created_at', value: '2023-05-10T10:00:00.000Z' },
      { field: 'uuid', value: 'some-last-uuid' },
    ],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('created_at', OrderDirection.ASC) // Orderings must match
  .orderBy('uuid', OrderDirection.ASC)
  .setTake(10);
```

## 6. Field Selection

By default, a `Criteria` (root or join) will select all fields defined in its schema. You can modify this with `setSelect()` and `resetSelect()`.

### Selection on the Root Entity

```typescript
// Select only uuid and email from the user
userCriteria.setSelect(['uuid', 'email']);
```

### Selection on Joined Entities

Call `setSelect()` on the `JoinCriteria` instance.

```typescript
// Get posts and only the username of their author
const postsWithAuthorUsernameOnly = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').setSelect([
    'username',
  ]), // Select only 'username' from the publisher
  { parent_field: 'user_uuid', join_field: 'uuid' },
);
```

### Reverting to Select All Fields (`resetSelect`)

If you previously used `setSelect()` and want to revert to the default behavior of selecting all fields from the schema for that `Criteria` instance (root or join):

```typescript
userCriteria.setSelect(['uuid']); // Selects only uuid
// ... other operations ...
userCriteria.resetSelect(); // Now selects all fields from UserSchema again
```

**Important Note:** If you use `orderBy()` or `setCursor()` on fields that are _not_ included in your `setSelect()`, some translators (like TypeORM's) might automatically add those fields to the selection to ensure correct database operation.

## 7. Combining Everything

You can chain all these methods to build complex queries:

```typescript
// Complex example:
// Get the 5 most recent posts (ordered by created_at DESC)
// that contain "TypeORM" in the title or body,
// including their author's (publisher) username and only the text of their comments (if any),
// and the author (publisher) has the email "author@example.com".
// Also, paginate using cursor if 'lastPostCreatedAt' and 'lastPostUuid' are defined.

let lastPostCreatedAt: string | undefined = undefined; // '2023-10-26T12:00:00.000Z';
let lastPostUuid: string | undefined = undefined; // 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

const complexPostCriteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
  .setSelect(['uuid', 'title', 'created_at']) // Select specific post fields
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  .orWhere({
    field: 'body',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  .join(
    CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher')
      .setSelect(['username']) // Only the author's username
      .where({
        field: 'email',
        operator: FilterOperator.EQUALS,
        value: 'author@example.com',
      }),
    { parent_field: 'user_uuid', join_field: 'uuid' },
  )
  .join(
    CriteriaFactory.GetLeftJoinCriteria(
      PostCommentSchema,
      'comments',
    ).setSelect(['comment_text']), // Only the comment text
    { parent_field: 'uuid', join_field: 'post_uuid' },
  )
  .orderBy('created_at', OrderDirection.DESC) // Main order for cursor pagination
  .orderBy('uuid', OrderDirection.DESC); // Tie-breaker for cursor pagination

if (lastPostCreatedAt && lastPostUuid) {
  complexPostCriteria.setCursor(
    [
      { field: 'created_at', value: lastPostCreatedAt },
      { field: 'uuid', value: lastPostUuid },
    ],
    FilterOperator.LESS_THAN, // Because we order DESC for "most recent"
    OrderDirection.DESC,
  );
}

complexPostCriteria.setTake(5);

// 'complexPostCriteria' is now ready to be passed to a translator.
```

## Next Steps

With the criteria built, the next step is to use a `CriteriaTranslator` to convert these
`Criteria` objects into a native query for your database. Refer to the guide on Developing
Custom Translators or use an existing translator if available for your stack.
