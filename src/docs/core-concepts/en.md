# Core Concepts of @nulledexp/translatable-criteria

This section delves into the fundamental components that make up the `@nulledexp/translatable-criteria` library. Understanding these concepts is essential for effectively using the library and extending its functionality.

## Index of Core Concepts

- **_[Hierarchy of Criteria](#criteria-hierarchy)_**
- **_[CriteriaFactory](#criteriafactory)_**
- **_[Schemas (`CriteriaSchema` and `GetTypedCriteriaSchema`)](#schemas-criteriaschema-and-gettypedcriteriaschema)_**
  - [_Identifier Field (`identifier_field`)_](#identifier-field-identifier_field)
  - [_Schema and Join Metadata_](#schema-and-join-metadata)
- **_[`CriteriaTranslator` (Abstract Class)](#criteriatranslator-abstract-class)_**
- **_[Filters (`Filter`, `FilterGroup`, `FilterOperator`)](#filters-filter-filtergroup-filteroperator)_**
- **_[Ordering (`Order`, `OrderDirection`)](#ordering-order-orderdirection)_**
- **_[Pagination](#pagination)_**
  - [_Offset-based Pagination_](#offset-based-pagination)
  - [_Cursor-based Pagination_](#cursor-based-pagination)
- **_[Field Selection (`setSelect`, `resetSelect`)](#field-selection-setselect-resetselect)_**

---

## `Criteria` Hierarchy

The abstract `Criteria` class is the base for defining query specifications. It represents a set of conditions, orderings, joins, and pagination configurations for an entity or a set of related entities.

There are several concrete implementations of `Criteria`:

- **`RootCriteria`**: Represents the starting point of a query, targeting a main entity.
- **`InnerJoinCriteria`**: Defines an INNER JOIN with another entity.
- **`LeftJoinCriteria`**: Defines a LEFT OUTER JOIN with another entity.
- **`OuterJoinCriteria`**: Defines a FULL OUTER JOIN with another entity (its availability may depend on the specific translator).

Each `Criteria` instance encapsulates:

- The schema (`CriteriaSchema`) of the entity it applies to.
- A unique, canonical alias to reference this entity in the query.
- Internal managers for filters, joins, ordering, and field selection.

[Back to Index](#index-of-core-concepts)

---

## `CriteriaFactory`

`CriteriaFactory` is a utility class that provides static methods for creating instances of the different types of `Criteria`.

**Purpose:**

- **Simplify Creation:** Abstracts the complexity of direct instantiation.
- **Ensure Correct Initialization:** Guarantees that criteria are created with the necessary schema and validations.
- **Improve Readability:** Makes criteria building code clearer and more concise.

**Recommended Usage:**
It is strongly recommended to use `CriteriaFactory` instead of instantiating `Criteria` classes directly. The factory methods no longer require an alias parameter, as the canonical alias is now taken directly from the schema.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(PostSchema);
```

[Back to Index](#index-of-core-concepts)

---

## Schemas (`CriteriaSchema` and `GetTypedCriteriaSchema`)

Schemas are fundamental for type safety and validation. A `CriteriaSchema` defines the "shape" of your data entities as the library understands them. For a complete guide, see **Defining Schemas**.

**What Defines a Schema?**

- `source_name`: The actual name of the table or collection in the database.
- `alias`: A **single, canonical alias** for the entity.
- `fields`: An array with the names of the available fields.
- `identifier_field`: A **mandatory** field that uniquely identifies an entity.
- `relations`: An array defining possible join relationships, including the fields to join on (`local_field`, `relation_field`, etc.).
- `metadata`: (Optional) An object to store arbitrary, translator-specific information or configuration relevant to the entire entity this schema represents.

**`GetTypedCriteriaSchema`:**
This is a helper function used to define schemas. Its main advantage is that it preserves the literal types of the `fields`, `alias`, and `identifier_field`, which allows for more robust autocompletion and type validation when building criteria. This avoids the need to use type assertions (like `as const`) in the schema definition, while also ensuring the schema structure (including `identifier_field` validity) is correct.

Schemas are provided to the `CriteriaFactory` when creating `Criteria` instances, allowing the library to validate that the fields and relation aliases used are correct.

### Identifier Field (`identifier_field`)

The `identifier_field` is a **mandatory** property in your `CriteriaSchema`. It specifies which field in your `fields` array serves as the unique identifier (primary key) for that entity.

**Purpose:**

- **Unique Identification:** Clearly designates the primary key field.
- **Enhanced Validation:** The library validates at compile-time (and runtime) that the `identifier_field` you specify is indeed one of the `fields` defined in the schema.
- **Automatic Selection:** When using `setSelect()` to choose specific fields, the `identifier_field` of the entity is **always implicitly included** in the selection, ensuring that the entity can always be uniquely identified.
- **Context for Translators:** The identifier of a parent entity is passed to the translator during join operations (`parent_identifier`), which can be used for more advanced relationship inference.

```typescript
import {
  GetTypedCriteriaSchema,
  SelectType,
} from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  relations: [
    {
      default_options: {
        select: SelectType.FULL_ENTITY,
      },
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
  ],
});
```

### Schema and Join Metadata

Both the root of a `CriteriaSchema` and the individual relationship configurations within the `relations` array can have an optional `metadata` property.

- **`CriteriaSchema.metadata`**: For information relevant to the entire entity.
- **`SchemaJoins.metadata`**: For information specific to a particular join relationship.

**Purpose for the User:**
This `metadata` field is a flexible, open object (`{ [key: string]: any }`) designed to hold arbitrary information that might be needed by a specific `CriteriaTranslator` you are using.

**How to Use:**
You can add any key-value pairs to the `metadata` object. The specific keys and values that are meaningful depend entirely on the `CriteriaTranslator` you are using. Consult the documentation of your translator to understand what, if any, `metadata` it recognizes and utilizes.

```typescript
import {
  GetTypedCriteriaSchema,
  SelectType,
} from '@nulledexp/translatable-criteria';

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
  metadata: {
    custom_handler: 'specialPostHandler',
    versioning_enabled: true,
  },
  relations: [
    {
      default_options: {
        select: SelectType.FULL_ENTITY,
      },
      relation_alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      local_field: 'userId',
      relation_field: 'id',
      metadata: {
        typeorm_lazy_load: false,
        custom_on_clause_template: 'user.id = post.userId_custom_fk',
      },
    },
  ],
});
```

[Back to Index](#index-of-core-concepts)

---

## `CriteriaTranslator` (Abstract Class)

The `CriteriaTranslator` is the component responsible for converting a `Criteria` object (which is data-source agnostic) into a specific query for a particular database or search engine (e.g., SQL, a TypeORM query, a MongoDB query, etc.).

**Main Role:**

- Process a `Criteria` object (typically starting with a `RootCriteria`).
- Interpret the filters, joins, ordering, pagination, and selection defined in the `Criteria`.
- Generate the corresponding native query syntax.

This allows for a clean and extensible architecture: the logic for building `Criteria` is separated from the translation logic. To support a new database, you only need to create a new translator that extends `CriteriaTranslator`.

[Back to Index](#index-of-core-concepts)

---

## Filters (`Filter`, `FilterGroup`, `FilterOperator`)

Filters allow you to specify the conditions that data must meet to be selected.

- **`Filter`**: Represents a single filter condition (`field`, `operator`, `value`).
- **`FilterGroup`**: Allows grouping multiple `Filter` or even other `FilterGroup` instances using logical operators (`AND` or `OR`).
- **`FilterOperator`**: An enumeration that defines the various comparison operators available, which can be broadly categorized:
  - **Equality & Comparison:** `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, etc.
  - **Pattern Matching:** `LIKE`, `CONTAINS`, `STARTS_WITH`, `ILIKE` (case-insensitive version of LIKE).
  - **Membership & Nullability:** `IN`, `NOT_IN`, `IS_NULL`, `IS_NOT_NULL`.
  - **Ranges & Regex:** `BETWEEN`, `NOT_BETWEEN`, `MATCHES_REGEX`.
  - **Complex Types:** A rich set of operators for `JSON`, `ARRAY`, and `SET` data types (e.g., `JSON_CONTAINS`, `ARRAY_NOT_CONTAINS_ELEMENT`, `SET_CONTAINS_ANY`).

For a detailed explanation of each operator, its expected value, and code examples, please refer to the [Filter Operator Reference](../guides/filter-operators/en.md).

Filters are added to a `Criteria` using the `where()`, `andWhere()`, and `orWhere()` methods. The library automatically normalizes the `FilterGroup` structure to maintain consistency.

[Back to Index](#index-of-core-concepts)

---

## Ordering (`Order`, `OrderDirection`)

Ordering defines how the query results should be sorted.

- **`Order`**: Represents a single ordering rule. It consists of:
  - `field`: The field by which the results will be ordered. This field is strongly typed with the valid fields defined in the schema of each Criteria.
  - `direction`: The ordering direction (see `OrderDirection`).
  - `sequenceId`: (Internal) A unique, globally incrementing ID.
  - `nullsFirst`: A boolean indicating whether `NULL` values should be sorted first.

- **`OrderDirection`**: An enumeration with two possible values:
  - `ASC`: Ascending order.
  - `DESC`: Descending order.

Multiple ordering rules can be added to a `Criteria` using the `orderBy()` method.

[Back to Index](#index-of-core-concepts)

---

## Pagination

Pagination allows retrieving subsets of results, which is crucial for handling large amounts of data.

### Offset-based Pagination

This is the traditional way of paginating results.

- **`setTake(count)`**: Specifies the maximum number of records to return (equivalent to SQL `LIMIT`).
- **`setSkip(count)`**: Specifies the number of records to skip before starting to return results (equivalent to SQL `OFFSET`).

### Cursor-based Pagination

This method is generally more efficient and stable for large datasets, especially those that change frequently.

- **`setCursor(cursorFilters, operator, order)`**: Configures cursor-based pagination.
- `cursorFilters`: An array of one or two `FilterPrimitive` objects (without the `operator` property). These define the field(s) and value(s) of the last item from the previous page, which serve as the "cursor".
- A single `FilterPrimitive` is used for simple cursor pagination (e.g., based on `created_at`).
- Two `FilterPrimitive`s are used for composite cursor pagination (e.g., based on `created_at` and `uuid` as a tie-breaker).
- `operator`: Must be `FilterOperator.GREATER_THAN` (for "next page" when ordering ASC) or `FilterOperator.LESS_THAN` (for "next page" when ordering DESC, or "previous page" when ordering ASC).
- `order`: The `OrderDirection` that matches the primary sort order of the query.

[Back to Index](#index-of-core-concepts)

---

## Field Selection (`setSelect`, `resetSelect`)

By default, when a `Criteria` is created (whether `RootCriteria` or a `JoinCriteria`), all fields defined in its associated schema will be selected (`selectAll` is `true`). This behavior can be modified:

- **`setSelect(fields: FieldOfSchema<TSchema>[])`**:
- Allows you to explicitly specify an array of fields to be selected. These fields must be valid according to the `Criteria`'s schema.
- When `setSelect()` is called, `selectAll` becomes `false`.
- **Important:** The `identifier_field` of the entity is **always implicitly included** in the selection if it's not already specified in the `fields` array. This ensures that the entity can always be uniquely identified. If an empty array `[]` is passed to `setSelect`, only the `identifier_field` will be selected.

- **`resetSelect()`**:
- Reverts the selection behavior to the default: all fields from the schema for that `Criteria` instance will be selected (`selectAll` becomes `true`).

**Behavior in Joins:**

- If a `JoinCriteria` does not have `setSelect()` explicitly called, all its fields (as defined in its schema) will be included in the main `SELECT` clause of the query, typically prefixed with the join's alias.
- If `setSelect()` is called on a `JoinCriteria`, only those selected fields (plus its `identifier_field`) from the joined entity will be included.

This flexibility allows optimizing queries to retrieve only the necessary data, reducing data transfer and processing overhead.

[Back to Index](#index-of-core-concepts)
