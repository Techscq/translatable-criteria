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
    - [Filtering Array Fields (`ARRAY_CONTAINS_ELEMENT`, etc.)](#filtering-array-fields-array_contains_element-etc)
    - [Filtering SET Fields (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)](#filtering-set-fields-set_contains-set_not_contains-set_contains_any-set_contains_all)
    - [Filtering by Ranges (`BETWEEN`, `NOT_BETWEEN`)](#filtering-by-ranges-between-not_between)
    - [Filtering with Regular Expressions (`MATCHES_REGEX`)](#filtering-with-regular-expressions-matches_regex)
    - [Case-Insensitive Pattern Matching (`ILIKE`, `NOT_ILIKE`)](#case-insensitive-pattern-matching-ilike-not_ilike)
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
  joins: [
    {
      alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
    },
  ],
});

export const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  joins: [],
});

export const ProductSchema = GetTypedCriteriaSchema({
  source_name: 'products',
  alias: 'prod',
  fields: ['id', 'name', 'price', 'createdAt'],
  identifier_field: 'id',
  joins: [],
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

The library supports a wide range of operators for complex data types. For a full list, see the Core Concepts guide. Here are a few examples:

#### Filtering JSON Fields (`JSON_CONTAINS`, `JSON_NOT_CONTAINS`)

The value for these operators is an object where keys are JSON paths (the translator will determine if it needs `$.` at the beginning) and values are what is being searched for in that path.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const jsonCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS,
  value: {
    tags: 'tech',
    views: 100,
    'extra.source': 'import',
  },
});
```

#### Filtering Array Fields (`ARRAY_CONTAINS_ELEMENT`, etc.)

These operators can be used for fields that are native arrays or arrays within JSON.

- **For native array columns:** The `value` is the element or array of elements to search for.
- **For arrays within JSON:** The `value` is an object with a single key (the JSON path to the array) and the value is the element or array of elements.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const arrayCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
  value: ['nestjs', 'api'],
});
```

#### Filtering SET Fields (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)

Similar to `CONTAINS` but conceptually for fields representing a set of values (like MySQL's `SET` type or a delimited string).

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const setCriteria = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ANY,
  value: ['typescript', 'javascript'],
});
```

#### Filtering by Ranges (`BETWEEN`, `NOT_BETWEEN`)

These operators allow you to check if a numeric or date value falls within or outside a specific range.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, ProductSchema } from './path/to/your/schemas';

const betweenDatesCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'createdAt',
  operator: FilterOperator.BETWEEN,
  value: [new Date('2023-01-01'), new Date('2023-03-31')],
});

const notBetweenPriceCriteria = CriteriaFactory.GetCriteria(
  ProductSchema,
).where({
  field: 'price',
  operator: FilterOperator.NOT_BETWEEN,
  value: [100, 200],
});
```

#### Filtering with Regular Expressions (`MATCHES_REGEX`)

Allows for more powerful pattern matching using regular expressions. The specific syntax of the regular expression may depend on the underlying database.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const regexCriteria = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.MATCHES_REGEX,
  value: '^admin[0-9]+',
});
```

#### Case-Insensitive Pattern Matching (`ILIKE`, `NOT_ILIKE`)

Similar to `LIKE` and `NOT_LIKE`, but they ensure that pattern comparison is case-insensitive, regardless of the database's default collation.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const ilikeCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.ILIKE,
  value: '%typescript%',
});
```

### Filter Operator Reference

Here is a detailed list of the available `FilterOperator` values and the type of `value` they expect.

#### Equality & Comparison

- `EQUALS`: Checks for exact equality. Expects a primitive value (`string`, `number`, `boolean`, `Date`, `null`).
- `NOT_EQUALS`: Checks for inequality. Expects a primitive value.
- `GREATER_THAN`: Checks if a value is greater than the provided one. Expects a `number` or `Date`.
- `GREATER_THAN_OR_EQUALS`: Checks if a value is greater than or equal to the provided one. Expects a `number` or `Date`.
- `LESS_THAN`: Checks if a value is less than the provided one. Expects a `number` or `Date`.
- `LESS_THAN_OR_EQUALS`: Checks if a value is less than or equal to the provided one. Expects a `number` or `Date`.

#### Pattern Matching

- `LIKE`: Matches a pattern (case-sensitivity depends on the database). Expects a `string`. The translator is responsible for handling wildcards (`%`, `_`).
- `NOT_LIKE`: Checks if a value does not match a pattern. Expects a `string`.
- `CONTAINS`: Checks if a string contains a substring. Expects a `string`. The translator will typically wrap the value with wildcards (e.g., `'%value%'`).
- `NOT_CONTAINS`: Checks if a string does not contain a substring. Expects a `string`.
- `STARTS_WITH`: Checks if a string starts with a specific substring. Expects a `string`. The translator will typically append a wildcard (e.g., `'value%'`).
- `ENDS_WITH`: Checks if a string ends with a specific substring. Expects a `string`. The translator will typically prepend a wildcard (e.g., `'%value'`).
- `ILIKE`: Case-insensitive version of `LIKE`. Expects a `string`.
- `NOT_ILIKE`: Case-insensitive version of `NOT_LIKE`. Expects a `string`.

#### Membership & Nullability

- `IN`: Checks if a value is within a given array. Expects an `Array<string | number | boolean | Date>`.
- `NOT_IN`: Checks if a value is not within a given array. Expects an `Array<string | number | boolean | Date>`.
- `IS_NULL`: Checks if a value is `NULL`. The `value` property should be `null` or `undefined`.
- `IS_NOT_NULL`: Checks if a value is not `NULL`. The `value` property should be `null` or `undefined`.

#### Ranges & Regex

- `BETWEEN`: Checks if a value is within a specified range (inclusive). Expects a tuple of two values: `[min, max]`.
- `NOT_BETWEEN`: Checks if a value is outside a specified range. Expects a tuple of two values: `[min, max]`.
- `MATCHES_REGEX`: Checks if a string value matches a regular expression. Expects a `string` representing the regex pattern.

#### Complex Types (JSON, Array, SET)

- **JSON Operators**
- `JSON_CONTAINS`: Checks if a JSON document contains a specific structure or value at a given path. Expects an object where keys are JSON paths and values are the data to find (e.g., `{ "tags": "tech", "views": 100 }`).
- `JSON_NOT_CONTAINS`: The inverse of `JSON_CONTAINS`.
- **Array Operators**
- `ARRAY_CONTAINS_ELEMENT`: Checks if an array contains a specific element. For native array columns, expects a primitive value. For JSON arrays, expects an object like `{ "path.to.array": elementValue }`.
- `ARRAY_CONTAINS_ALL_ELEMENTS`: Checks if an array contains all elements from a given array. Expects an `Array<primitive>` or `{ "path.to.array": [elements] }`.
- `ARRAY_CONTAINS_ANY_ELEMENT`: Checks if an array contains at least one element from a given array. Expects an `Array<primitive>` or `{ "path.to.array": [elements] }`.
- `ARRAY_EQUALS`: Checks if an array is exactly equal to a given array (order and elements). Expects an `Array<primitive>` or `{ "path.to.array": [elements] }`.
- **SET Operators** (Conceptually for sets, often used on string or array fields)
- `SET_CONTAINS`: Checks if a set contains a specific value. Expects a `string`.
- `SET_NOT_CONTAINS`: The inverse of `SET_CONTAINS`.
- `SET_CONTAINS_ANY`: Checks if a set contains at least one of the specified values. Expects an `Array<string>`.
- `SET_CONTAINS_ALL`: Checks if a set contains all of the specified values. Expects an `Array<string>`.

---

## 3. Adding Joins

Joins are added with the `join()` method. This method's signature has been updated for clarity and type safety:

`criteria.join(joinAlias, criteriaToJoin, joinParameters)`

- **`joinAlias` (string):** This is the **alias of the relationship** as defined in the `joins` array within the _parent schema_. It acts as a unique identifier for that specific relationship configuration. The library uses this `joinAlias` along with the `source_name` of the `criteriaToJoin` (the schema of the entity being joined) to find the exact relationship definition in the parent schema.
- **`criteriaToJoin` (JoinCriteria):** An instance of a join `Criteria` (`InnerJoinCriteria`, `LeftJoinCriteria`, etc.), created with `CriteriaFactory`.
- **`joinParameters` (object):** An object that defines how the entities are related (`parent_field`, `join_field`, etc.).

### Simple Joins (one-to-many, many-to-one, one-to-one)

For these relationships, the join parameters are `parent_field` and `join_field`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const postsWithAuthorCriteria = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema),
  {
    parent_field: 'userId',
    join_field: 'id',
  },
);

const usersWithPostsCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'posts',
  CriteriaFactory.GetLeftJoinCriteria(PostSchema),
  {
    parent_field: 'id',
    join_field: 'userId',
  },
);
```

### Joins with Pivot Table (many-to-many)

For `many_to_many` relationships, the join parameters require a more detailed object that includes `pivot_source_name` and objects for `parent_field` and `join_field`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, RoleSchema } from './path/to/your/schemas';

const usersWithRolesCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'roles',
  CriteriaFactory.GetInnerJoinCriteria(RoleSchema),
  {
    pivot_source_name: 'user_roles',
    parent_field: { pivot_field: 'user_id', reference: 'id' },
    join_field: { pivot_field: 'role_id', reference: 'id' },
  },
);
```

### Filtering on Joined Entities

You can apply filters directly to the `JoinCriteria` instance before passing it to the `.join()` method.

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
  {
    parent_field: 'userId',
    join_field: 'id',
  },
);
```

These filters on the `JoinCriteria` typically translate to conditions in the `ON` clause of the JOIN.

---

## 4. Ordering Results

Ordering is applied with the `orderBy()` method, which takes the field name and the direction (`OrderDirection.ASC` or `OrderDirection.DESC`).

### Ordering by Root Entity Fields

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const postOrderCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .orderBy('createdAt', OrderDirection.DESC)
  .orderBy('title', OrderDirection.ASC);
```

### Ordering by Joined Entity Fields

To order by a field from a joined entity, call `orderBy()` on the corresponding `JoinCriteria` instance.

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

const userJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).orderBy('username', OrderDirection.ASC);

const postsOrderedByAuthor = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  userJoinCriteria,
  { parent_field: 'userId', join_field: 'id' },
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
).join('user', userJoinCriteria, { parent_field: 'userId', join_field: 'id' });
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
).join('roles', roleJoinCriteria, {
  pivot_source_name: 'user_roles',
  parent_field: { pivot_field: 'user_id', reference: 'id' },
  join_field: { pivot_field: 'role_id', reference: 'id' },
});

// 3. Build the main criteria (Posts)
const complexPostCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setSelect(['id', 'title', 'createdAt'])
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  // 4. Add the pre-configured user join to the main criteria
  .join('user', userWithRolesJoinCriteria, {
    parent_field: 'userId',
    join_field: 'id',
  })
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
