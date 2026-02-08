# Practical Guide: Building Criteria

Once you have defined your [Schemas](../schema-definitions/en.md), the next step is to use them to construct `Criteria` objects. These objects encapsulate all the logic of your query: what data to select, how to filter it, how to join it with other entities, how to order it, and how to paginate it.

This guide will show you how to use `CriteriaFactory` and the fluent methods of `Criteria` objects to build queries effectively and with type safety.

## Index

- 1. [Creating a `RootCriteria`](#1-creating-a-rootcriteria)
- 2. [Applying Filters](#2-applying-filters)
  - [Basic Filters](#basic-filters)
  - [Logical Grouping (AND/OR)](#logical-grouping-andor)
  - [Advanced Filters (JSON, Array, Set)](#advanced-filters-json-array-set)
    - [Filtering JSON Fields](#filtering-json-fields)
    - [Filtering Array Fields](#filtering-array-fields)
    - [Filtering SET Fields](#filtering-set-fields)
    - [Filtering by Ranges](#filtering-by-ranges)
    - [Filtering with Regular Expressions](#filtering-with-regular-expressions)
    - [Case-Insensitive Pattern Matching](#case-insensitive-pattern-matching)
  - [Filter Operator Reference](#filter-operator-reference)
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

## Example Schemas

To make the examples in this guide self-contained, we will use the following simplified schemas:

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  relations: [
    {
      is_relation_id: false,
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
    {
      is_relation_id: false,
      relation_alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
      pivot_source_name: 'user_roles',
      local_field: { reference: 'id', pivot_field: 'user_id' },
      relation_field: { reference: 'id', pivot_field: 'role_id' },
    },
  ],
});

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'posts',
  alias: 'p',
  fields: [
    'id',
    'title',
    'content',
    'userId',
    'createdAt',
    'categories',
    'metadata',
  ],
  identifier_field: 'id',
  relations: [
    {
      is_relation_id: false,
      relation_alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      local_field: 'userId',
      relation_field: 'id',
    },
  ],
});

export const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  relations: [],
});

export const ProductSchema = GetTypedCriteriaSchema({
  source_name: 'products',
  alias: 'prod',
  fields: ['id', 'name', 'price', 'createdAt'],
  identifier_field: 'id',
  relations: [],
});
```

---

## 1. Creating a `RootCriteria`

Every query starts with a `RootCriteria`, which represents the main entity from which the query will begin. It is created using `CriteriaFactory.GetCriteria()`. The alias is now taken directly from the `alias` property of the provided schema.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
const postCriteria = CriteriaFactory.GetCriteria(PostSchema);
```

---

## 2. Applying Filters

Filters are added using the `where()`, `andWhere()`, and `orWhere()` methods. These methods accept a `FilterPrimitive` object that defines the field, operator, and value.

### Basic Filters

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const userEmailCriteria = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.EQUALS,
  value: 'test@example.com',
});

const postTitleCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.CONTAINS,
  value: 'TypeScript',
});

const postDateCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'createdAt',
  operator: FilterOperator.GREATER_THAN,
  value: new Date('2023-01-01'),
});
```

### Logical Grouping (AND/OR)

- `andWhere()`: Adds a condition that must be met along with the previous ones (logical AND).
- `orWhere()`: Adds a condition that, if met, makes the filter group true, even if previous conditions (grouped by AND) are not (logical OR). The library normalizes this to maintain a structure of `OR ( (cond1 AND cond2), (cond3) )`.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const adminUserCriteria = CriteriaFactory.GetCriteria(UserSchema)
  .where({ field: 'username', operator: FilterOperator.EQUALS, value: 'admin' })
  .andWhere({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  });

const tutorialPostCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  })
  .orWhere({
    field: 'content',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  });

const editorOrGuestCriteria = CriteriaFactory.GetCriteria(UserSchema)
  .where({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'editor',
  })
  .andWhere({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@editor.com',
  })
  .orWhere({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'guest',
  });
```

### Advanced Filters (JSON, Array, Set)

The library supports a wide range of operators for complex data types, including powerful negation capabilities. This section provides a high-level overview of how to filter fields that store structured data. For a comprehensive list of all available filter operators and their detailed usage, please refer to the [Filter Operator Reference](#filter-operator-reference) section below.

#### Filtering JSON Fields

JSON fields can store complex, nested data. The library provides operators to query values at specific paths, check for the containment of JSON fragments, or verify the presence of multiple values.

#### Filtering Array Fields

Fields storing arrays (either native database array types or arrays within JSON documents) can be filtered based on the presence or absence of elements, or by comparing entire array contents.

#### Filtering SET Fields

For fields representing a set of values (e.g., MySQL's `SET` type or a delimited string), you can check for the presence of individual elements or combinations of elements.

#### Filtering by Ranges

These operators allow you to check if a numeric or date value falls within or outside a specific range.

#### Filtering with Regular Expressions

Allows for more powerful pattern matching using regular expressions. The specific syntax of the regular expression may depend on the underlying database.

#### Case-Insensitive Pattern Matching

Similar to `LIKE` and `NOT_LIKE`, but they ensure that pattern comparison is case-insensitive, regardless of the database's default collation.

### Filter Operator Reference

The library provides a comprehensive set of operators for all your filtering needs, from simple equality checks to complex operations on JSON and array fields.

For a detailed list of all available `FilterOperator` values, their purpose, the type of `value` they expect, and a code example for each, please refer to our dedicated guide:

- **[-> Go to the Filter Operator Reference Guide](../filter-operators/en.md)**

---

## 3. Adding Joins

With the new declarative approach, adding joins is simpler and more robust than ever. The logic of how entities connect is now defined **once** in the schema's `relations` property, eliminating the need for manual parameters in each call.

The `join()` method signature is now:

`criteria.join(relationAlias, criteriaToJoin, withSelect?)`

- **`relationAlias` (string):** This is the **alias of the relationship** as defined in the `relations` array within the parent schema (e.g., `'posts'`, `'user'`). It acts as a unique identifier for that specific relationship. The library uses this alias to automatically look up the `local_field`, `relation_field`, and other necessary details from the schema.
- **`criteriaToJoin` (JoinCriteria):** An instance of a join `Criteria` (`InnerJoinCriteria`, `LeftJoinCriteria`, etc.), created with `CriteriaFactory`.
- **`withSelect` (optional boolean, defaults to `true`):** If `false`, the join will only be used for filtering, and its fields will not be included in the final `SELECT` statement.

### Simple Joins (one-to-many, many-to-one, one-to-one)

To join related entities, simply provide the `relationAlias`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

// Find posts and include their author's data
const postsWithAuthorCriteria = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema),
);

// Find users and include their posts
const usersWithPostsCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'posts',
  CriteriaFactory.GetLeftJoinCriteria(PostSchema),
);
```

### Joins with Pivot Table (many-to-many)

The process is identical for `many-to-many` relationships. The library automatically infers the pivot table and fields from the schema definition.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, RoleSchema } from './path/to/your/schemas';

const usersWithRolesCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'roles',
  CriteriaFactory.GetInnerJoinCriteria(RoleSchema),
);
```

### Filtering on Joined Entities

You can apply filters directly to the `JoinCriteria` instance before passing it to the `.join()` method. These filters typically translate to conditions in the `ON` clause of the JOIN.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

const activeUserJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).where({
  field: 'isActive',
  operator: FilterOperator.EQUALS,
  value: true,
});

const postsFromActiveUsers = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  activeUserJoinCriteria,
);
```

### Efficient Filtering with `withSelect`

A common use case for joins is to filter the results of the main entity based on the properties of a related entity, without needing to actually retrieve the data from the joined entity.

To achieve this, set the final optional parameter `withSelect` to `false`.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

// Find posts by a specific publisher, but only select post data.
const postsByPublisher = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
    field: 'uuid', // This field is on the UserSchema
    operator: FilterOperator.EQUALS,
    value: 'some-publisher-uuid',
  }),
  false, // withSelect is false
);
```

---

## 4. Ordering Results

Ordering is applied with the `orderBy()` method. It now accepts up to three parameters: the field name, the direction (`OrderDirection.ASC` or `OrderDirection.DESC`), and an optional boolean to control the sorting of `NULL` values.

- `orderBy(field, direction, nullsFirst)`
  - **`field`**: The field to order by.
  - **`direction`**: `OrderDirection.ASC` or `OrderDirection.DESC`.
  - **`nullsFirst` (optional, boolean, defaults to `false`)**:
    - If `true`, `NULL` values will be sorted first (`NULLS FIRST`).
    - If `false` or omitted, `NULL` values will be sorted last (`NULLS LAST`).

### Ordering by Root Entity Fields

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { ProductSchema } from './path/to/your/schemas';

// Sort products by price, with unpriced (NULL) products appearing first.
const postOrderCriteria = CriteriaFactory.GetCriteria(ProductSchema)
  .orderBy('price', OrderDirection.ASC, true) // -> NULLS FIRST
  .orderBy('createdAt', OrderDirection.DESC); // -> NULLS LAST (default)
```

### Ordering by Joined Entity Fields

To order by a field from a joined entity, call `orderBy()` on the corresponding `JoinCriteria` instance.

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

// Order by the joined user's age, with users without an age appearing last.
const userJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).orderBy('age', OrderDirection.ASC, false); // -> NULLS LAST

const postsOrderedByAuthor = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  userJoinCriteria,
);

postsOrderedByAuthor.orderBy('createdAt', OrderDirection.DESC);
```

---

## 5. Pagination

The library supports offset-based and cursor-based pagination.

### Offset-Based Pagination

- `setTake(count)`: Limits the number of results (SQL `LIMIT`).
- `setSkip(count)`: Skips a number of results (SQL `OFFSET`).

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const firstPageCriteria = CriteriaFactory.GetCriteria(PostSchema).setTake(10);

const thirdPageCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setTake(10)
  .setSkip(20);
```

### Cursor-Based Pagination

This is more efficient for large datasets. Use `setCursor()`.

**Important:** For cursor-based pagination to work, the `Criteria` **must** have `orderBy()` defined for the same fields used in `setCursor()` and in the same order.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const simpleCursorCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setCursor(
    [{ field: 'createdAt', value: '2023-05-10T10:00:00.000Z' }],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('createdAt', OrderDirection.ASC)
  .setTake(10);

const compositeCursorCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setCursor(
    [
      { field: 'createdAt', value: '2023-05-10T10:00:00.000Z' },
      { field: 'id', value: 'some-last-id' },
    ],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('createdAt', OrderDirection.ASC)
  .orderBy('id', OrderDirection.ASC)
  .setTake(10);
```

---

## 6. Field Selection

By default, a `Criteria` will select all fields defined in its schema. You can modify this with `setSelect()` and `resetSelect()`.

### Selection on the Root Entity

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const userSelectCriteria = CriteriaFactory.GetCriteria(UserSchema).setSelect([
  'id',
  'email',
]);
```

**Note:** When `setSelect` is used, the `identifier_field` of the entity is always implicitly included.

### Selection on Joined Entities

Call `setSelect()` on the `JoinCriteria` instance.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

const userJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).setSelect(['username']);

const postsWithAuthorUsernameOnly = CriteriaFactory.GetCriteria(
  PostSchema,
).join('user', userJoinCriteria);
```

### Reverting to Select All Fields (`resetSelect`)

If you previously used `setSelect()` and want to revert to the default behavior:

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
userCriteria.setSelect(['id']);
userCriteria.resetSelect();
```

---

## 7. Combining Everything

You can chain all these methods to build complex queries. The following example demonstrates how to combine multiple features, including nested joins, filtering on both root and joined entities, field selection, and cursor-based pagination, to construct a sophisticated query specification.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema, RoleSchema } from './path/to/your/schemas';

let lastPostCreatedAt: string | undefined = undefined;
let lastPostUuid: string | undefined = undefined;

// 1. Define the criteria for the innermost join (Roles)
const roleJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(RoleSchema).where(
  {
    field: 'name',
    operator: FilterOperator.EQUALS,
    value: 'admin',
  },
);

// 2. Define the criteria for the intermediate join (Users) and add the nested join to it
const userWithRolesJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).join('roles', roleJoinCriteria);

// 3. Build the main criteria (Posts)
const complexPostCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setSelect(['id', 'title', 'createdAt'])
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  // 4. Add the pre-configured user join to the main criteria
  .join('user', userWithRolesJoinCriteria)
  .orderBy('createdAt', OrderDirection.DESC)
  .orderBy('id', OrderDirection.DESC);

if (lastPostCreatedAt && lastPostUuid) {
  complexPostCriteria.setCursor(
    [
      { field: 'createdAt', value: lastPostCreatedAt },
      { field: 'id', value: lastPostUuid },
    ],
    FilterOperator.LESS_THAN,
    OrderDirection.DESC,
  );
}

complexPostCriteria.setTake(5);
```

## Next Steps

With the criteria built, the next step is to use a [`CriteriaTranslator`](../developing-translators/en.md) to convert these
`Criteria` objects into a native query for your database. [Refer to the guide on Developing
Custom Translators](../developing-translators/en.md) or use an existing translator if available for your stack.
