# Filter Operator Reference

This guide provides a detailed list of all available `FilterOperator` values, their purpose, the type of `value` they expect, and a code example for each.

## Index

- [Equality & Comparison](#equality--comparison)
- [Pattern Matching](#pattern-matching)
- [Membership & Nullability](#membership--nullability)
- [Ranges & Regex](#ranges--regex)
- [Complex Types (JSON, Array, SET)](#complex-types-json-array-set)

---

### Filter Operator Reference

Here is a detailed list of all available `FilterOperator` values, their purpose, the type of `value` they expect, and a code example for each.

#### Equality & Comparison

- `EQUALS` / `NOT_EQUALS`: Checks for exact equality or inequality between the field's value and the provided value.

  - **Expected Value:** A primitive value (`string`, `number`, `boolean`, `Date`, `null`).
  - **Example:**

```typescript
const activeUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'isActive',
  operator: FilterOperator.EQUALS,
  value: true,
});

const nonAdminUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.NOT_EQUALS,
  value: 'admin',
});
```

- `GREATER_THAN` / `GREATER_THAN_OR_EQUALS`: Checks if a value is strictly greater than, or greater than or equal to the provided one.

  - **Expected Value:** A `number` or `Date`.
  - **Example:**

```typescript
const recentPost = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'createdAt',
  operator: FilterOperator.GREATER_THAN,
  value: new Date('2023-01-01'),
});
```

- `LESS_THAN` / `LESS_THAN_OR_EQUALS`: Checks if a value is strictly less than, or less than or equal to the provided one.
  - **Expected Value:** A `number` or `Date`.
  - **Example:**

```typescript
const cheapProduct = CriteriaFactory.GetCriteria(ProductSchema).where({
  field: 'price',
  operator: FilterOperator.LESS_THAN_OR_EQUALS,
  value: 10.0,
});
```

#### Pattern Matching

- `LIKE` / `NOT_LIKE`: Matches or does not match a pattern. Case-sensitivity depends on the database's collation. The translator is responsible for handling wildcards (`%`, `_`).

  - **Expected Value:** A `string`.
  - **Example:**

```typescript
const userWithDomain = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.LIKE,
  value: '%@example.com',
});
```

- `ILIKE` / `NOT_ILIKE`: Case-insensitive version of `LIKE` and `NOT_LIKE`. Behavior may vary slightly depending on the database.

  - **Expected Value:** A `string`.
  - **Example:**

```typescript
const postWithTerm = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.ILIKE,
  value: '%typescript%',
});
```

- `CONTAINS` / `NOT_CONTAINS`: Checks if a string contains or does not contain a substring. The translator will typically wrap the value with wildcards (e.g., `'%value%'`).

  - **Expected Value:** A `string`.
  - **Example:**

```typescript
const postWithKeyword = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'content',
  operator: FilterOperator.CONTAINS,
  value: 'important keyword',
});

const postWithoutDraft = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.NOT_CONTAINS,
  value: 'Draft',
});
```

- `STARTS_WITH`: Checks if a string starts with a specific substring. The translator will typically append a wildcard (e.g., `'value%'`).

  - **Expected Value:** A `string`.
  - **Example:**

```typescript
const devUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.STARTS_WITH,
  value: 'dev',
});
```

- `ENDS_WITH`: Checks if a string ends with a specific substring. The translator will typically prepend a wildcard (e.g., `'%value'`).
  - **Expected Value:** A `string`.
  - **Example:**

```typescript
const orgUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.ENDS_WITH,
  value: '.org',
});
```

#### Membership & Nullability

- `IN` / `NOT_IN`: Checks if a field's value is present or not present within a given array of values.

  - **Expected Value:** An `Array<string | number | boolean | Date>`.
  - **Example:**

```typescript
const specificUsers = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'id',
  operator: FilterOperator.IN,
  value: [1, 5, 10],
});

const postsFromOtherUsers = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'userId',
  operator: FilterOperator.NOT_IN,
  value: [100, 200],
});
```

- `IS_NULL` / `IS_NOT_NULL`: Checks if a field's value is or is not `NULL`.
  - **Expected Value:** `null` or `undefined`. The actual value is often ignored by the translator.
  - **Example:**

```typescript
const postsWithoutContent = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'content',
  operator: FilterOperator.IS_NULL,
  value: null,
});

const usersWithEmail = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.IS_NOT_NULL,
  value: undefined,
});
```

#### Ranges & Regex

- `BETWEEN` / `NOT_BETWEEN`: Checks if a field's value falls within or outside a specified range (inclusive).

  - **Expected Value:** A tuple of two primitive values `[min, max]` (e.g., `[number, number]`, `[Date, Date]`).
  - **Example:**

```typescript
const midRangeProducts = CriteriaFactory.GetCriteria(ProductSchema).where({
  field: 'price',
  operator: FilterOperator.BETWEEN,
  value: [10.0, 50.0],
});
```

- `MATCHES_REGEX`: Checks if a string value matches a regular expression pattern. The specific regex syntax may vary depending on the underlying database.
  - **Expected Value:** A `string` representing the regular expression.
  - **Example:**

```typescript
const userWithNumericId = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.MATCHES_REGEX,
  value: '^user[0-9]{3}$',
});
```

#### Complex Types (JSON, Array, SET)

- `JSON_PATH_VALUE_EQUALS` / `JSON_PATH_VALUE_NOT_EQUALS`: Checks if the value at a specific JSON path is equal or not equal to a given primitive value.

  - **Expected Value:** An object where keys are JSON paths and values are the primitive data to match.
  - **Example:**

```typescript
const publishedPosts = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_PATH_VALUE_EQUALS,
  value: { status: 'published', 'extra.source': 'import' },
});
```

- `JSON_CONTAINS` / `JSON_NOT_CONTAINS`: Checks if a JSON document (or a value at a specific path within it) contains or does NOT contain a specified JSON value.

  - **Expected Value:** An object where keys are JSON paths and values are the JSON data (scalar, array, or object) to find.
  - **Example:**

```typescript
const postsWithSpecificTag = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS,
  value: { 'tags[0]': 'tech' },
});
```

- `JSON_CONTAINS_ANY` / `JSON_NOT_CONTAINS_ANY`: Checks if a JSON document contains AT LEAST ONE of the specified values, or if it contains NONE of them.

  - **Expected Value:** An object where keys are JSON paths and values are arrays of JSON data.
  - **Example:**

```typescript
const postsWithTechOrNews = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS_ANY,
  value: { tags: ['tech', 'news'] },
});

const postsWithoutSpam = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_NOT_CONTAINS_ANY,
  value: { tags: ['spam', 'ad'] },
});
```

- `JSON_CONTAINS_ALL` / `JSON_NOT_CONTAINS_ALL`: Checks if a JSON document contains ALL of the specified values, or if it is missing AT LEAST ONE of them.

  - **Expected Value:** An object where keys are JSON paths and values are arrays of JSON data.
  - **Example:**

```typescript
const postsWithRequiredTags = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS_ALL,
  value: { tags: ['tech', 'important'] },
});
```

- `ARRAY_CONTAINS_ELEMENT` / `ARRAY_NOT_CONTAINS_ELEMENT`: Checks if an array contains or does NOT contain a specific element.

  - **Expected Value:** A primitive value (for native array columns) OR an object like `{ "path.to.array": elementValue }` (for arrays within JSON).
  - **Example:**

```typescript
const postsInCategory = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
  value: 'nestjs',
});

const postsNotInLegacy = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT,
  value: 'legacy',
});
```

- `ARRAY_CONTAINS_ANY_ELEMENT` / `ARRAY_NOT_CONTAINS_ANY_ELEMENT`: Checks if an array contains AT LEAST ONE element from a given array, or if it contains NONE of them.

  - **Expected Value:** An `Array<primitive>` (for native array columns) OR an object like `{ "path.to.array": [elements] }` (for arrays within JSON).
  - **Example:**

```typescript
const postsInAnyCategory = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
  value: ['nestjs', 'api'],
});

const postsWithoutBanned = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
  value: ['banned1', 'banned2'],
});
```

- `ARRAY_CONTAINS_ALL_ELEMENTS` / `ARRAY_NOT_CONTAINS_ALL_ELEMENTS`: Checks if an array contains ALL elements from a given array, or if it is missing AT LEAST ONE of them.

  - **Expected Value:** An `Array<primitive>` (for native array columns) OR an object like `{ "path.to.array": [elements] }` (for arrays within JSON).
  - **Example:**

```typescript
const postsWithAllCategories = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
  value: ['nestjs', 'api'],
});
```

- `ARRAY_EQUALS`: Checks if an array is exactly equal to a given array (order-insensitive).

  - **Expected Value:** An `Array<primitive>` (for native array columns) OR an object like `{ "path.to.array": [elements] }` (for arrays within JSON).
  - **Example:**

```typescript
const postsWithExactCategories = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_EQUALS,
  value: ['news', 'tech'],
});
```

- `ARRAY_EQUALS_STRICT`: Checks if an array is exactly equal to a given array (order-sensitive).

  - **Expected Value:** An `Array<primitive>` (for native array columns) OR an object like `{ "path.to.array": [elements] }` (for arrays within JSON).
  - **Example:**

```typescript
const postsWithOrderedCategories = CriteriaFactory.GetCriteria(
  PostSchema,
).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_EQUALS_STRICT,
  value: ['nestjs', 'api', 'typeorm'],
});
```

- `SET_CONTAINS` / `SET_NOT_CONTAINS`: Checks if a collection field (like MySQL's `SET` type) contains or does NOT contain a specific value.

  - **Expected Value:** A `string`.
  - **Example:**

```typescript
const userWithTag = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS,
  value: 'typescript',
});
```

- `SET_CONTAINS_ANY` / `SET_NOT_CONTAINS_ANY`: Checks if a collection field contains AT LEAST ONE of the specified values, or if it contains NONE of them.

  - **Expected Value:** An `Array<string>`.
  - **Example:**

```typescript
const userWithAnyTag = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ANY,
  value: ['typescript', 'javascript'],
});
```

- `SET_CONTAINS_ALL` / `SET_NOT_CONTAINS_ALL`: Checks if a collection field contains ALL of the specified values, or if it is missing AT LEAST ONE of them.
  - **Expected Value:** An `Array<string>`.
  - **Example:**

```typescript
const userWithAllTags = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ALL,
  value: ['typescript', 'backend'],
});
```
