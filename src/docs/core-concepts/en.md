# Core Concepts of @nulledexp/translatable-criteria

This section delves into the fundamental components that make up the `@nulledexp/translatable-criteria` library. Understanding these concepts is essential for effectively using the library and extending its functionality.

## Index of Core Concepts

- **_[Hierarchy of Criteria](#hierarchy-of-criteria)_**
- **_[CriteriaFactory](#criteriafactory)_**
- **_[Schemas (`CriteriaSchema` and `GetTypedCriteriaSchema`)](#schemas-criteriaschema-and-gettypedcriteriaschema)_**
- **_[`CriteriaTranslator` (Abstract Class and Visitor Pattern)](#criteriatranslator-abstract-class-and-visitor-pattern)_**
- **_[Filters (`Filter`, `FilterGroup`, `FilterOperator`)](#filters-filter-filtergroup-filteroperator)_**
- **_[Ordering (`Order`, `OrderDirection`)](#ordering-order-orderdirection)_**
- **_[Pagination](#pagination)_**
- **_[Field Selection (`setSelect`, `resetSelect`)](#field-selection-setselect-resetselect)_**

---

## Hierarchy of `Criteria`

The abstract `Criteria` class is the base for defining query specifications. It represents a set of conditions, orderings, joins, and pagination configurations for an entity or a set of related entities.

There are several concrete implementations of `Criteria`:

- **`RootCriteria`**: Represents the starting point of a query, targeting a main entity.
- **`InnerJoinCriteria`**: Defines an INNER JOIN with another entity.
- **`LeftJoinCriteria`**: Defines a LEFT OUTER JOIN with another entity.
- **`OuterJoinCriteria`**: Defines a FULL OUTER JOIN with another entity (its availability may depend on the specific translator).

Each `Criteria` instance encapsulates:

- The schema (`CriteriaSchema`) of the entity it applies to.
- A unique alias to reference this entity in the query.
- Internal managers for filters, joins, ordering, and field selection.

[Back to Index](#index-of-core-concepts)

---

## `CriteriaFactory`

`CriteriaFactory` is a utility class that provides static methods for creating instances of the different types of `Criteria` (`RootCriteria`, `InnerJoinCriteria`, etc.).

**Purpose:**

- **Simplify Creation:** Abstracts the complexity of direct instantiation.
- **Ensure Correct Initialization:** Guarantees that criteria are created with the necessary parameters and initial validations.
- **Improve Readability:** Makes criteria building code clearer and more concise.

**Recommended Usage:**
It is strongly recommended to use `CriteriaFactory` instead of instantiating `Criteria` classes directly.

[Back to Index](#index-of-core-concepts)

---

## Schemas (`CriteriaSchema` and `GetTypedCriteriaSchema`)

Schemas are fundamental for type safety and validation in `@nulledexp/translatable-criteria`. A `CriteriaSchema` defines the "shape" of your data entities as the library understands them.

**What Defines a Schema?**

- `source_name`: The actual name of the table or collection in the database.
- `alias`: An array of possible aliases that can be used to refer to this entity in queries.
- `fields`: An array with the names of the available fields for this entity.
- `joins`: An array that defines possible join relationships with other schemas, including the `alias` of the join and the `join_relation_type` (e.g., `one_to_many`, `many_to_one`, `many_to_many`).

**`GetTypedCriteriaSchema`:**
This is a helper function used to define schemas. Its main advantage is that it preserves the literal types of the `fields` and `alias`, which allows for more robust autocompletion and type validation when building criteria. This avoids the need to use type assertions (like as const) in the schema definition, while also ensuring the schema structure is valid.
Schemas are provided to the `CriteriaFactory` when creating `Criteria` instances, allowing the library to validate that the fields, aliases, and joins used are correct.

[Back to Index](#index-of-core-concepts)

---

## `CriteriaTranslator` (Abstract Class and Visitor Pattern)

The `CriteriaTranslator` is the heart of the translation mechanism. It is an abstract class designed to be extended by concrete implementations that will convert a `Criteria` object (data source agnostic) into a specific query for a particular database or search engine (e.g., SQL, a TypeORM query, a MongoDB query, etc.).

**Main Role:**

- Process a `Criteria` object (typically starting with a `RootCriteria`).
- "Visit" each part of the `Criteria` (filters, joins, ordering, etc.).
- Generate the corresponding native query syntax.

**Visitor Pattern:**
The library uses the Visitor design pattern.

- Each `Criteria` class (and its components like `FilterGroup`, `Filter`) has an `accept(visitor, ...args)` method.
- The `CriteriaTranslator` implements the `ICriteriaVisitor` interface, which defines `visit...` methods for each type of element it can encounter (e.g., `visitRootCriteria`, `visitInnerJoinCriteria`, `visitFilter`, `visitAndGroup`).

When `criteria.accept(translator, ...)` is called:

1.  The `criteria` invokes the appropriate `visit...` method on the `translator`, passing itself as an argument.
2.  The `translator` executes the specific logic to translate that type of `criteria` or component.

This allows for a clean and extensible architecture: the logic for building `Criteria` is separated from the translation logic. To support a new database, you only need to create a new translator that extends `CriteriaTranslator`.

Concrete translators (like `@nulledexp/typeorm-mysql-translator`) are provided as separate packages.

[Back to Index](#index-of-core-concepts)

---

## Filters (`Filter`, `FilterGroup`, `FilterOperator`)

Filters allow you to specify the conditions that data must meet to be selected.

- **`Filter`**: Represents a single filter condition. It consists of:

  - `field`: The field the filter is applied to. This field is strongly typed with the valid fields defined in the schema of each Criteria.
  - `operator`: The comparison operator (see `FilterOperator`).
  - `value`: The value the field is compared against. The type of this value is strictly typed based on the `operator` used.

- **`FilterOperator`**: This is an enumeration that defines the various comparison operators available, such as:

  - Equality: `EQUALS`, `NOT_EQUALS`
  - Comparison: `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_OR_EQUALS`, `LESS_THAN_OR_EQUALS`
  - Patterns: `LIKE`, `NOT_LIKE`, `CONTAINS`, `NOT_CONTAINS`, `STARTS_WITH`, `ENDS_WITH`
  - Membership: `IN`, `NOT_IN`
  - Nullability: `IS_NULL`, `IS_NOT_NULL`
  - For ranges: `BETWEEN`, `NOT_BETWEEN`
  - For regular expressions: `MATCHES_REGEX`
  - For case-insensitive pattern matching: `ILIKE`, `NOT_ILIKE`
  - For SET-like fields (or equivalents): `SET_CONTAINS`, `SET_NOT_CONTAINS`
  - For SET-like fields (or equivalents) with multiple values: `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`
  - For JSON fields: `JSON_CONTAINS`, `JSON_NOT_CONTAINS`
  - For Array fields: `ARRAY_CONTAINS_ELEMENT`, `ARRAY_CONTAINS_ALL_ELEMENTS`, `ARRAY_CONTAINS_ANY_ELEMENT`, `ARRAY_EQUALS`

- **`FilterGroup`**: Allows grouping multiple `Filter` or even other `FilterGroup` instances using logical operators:
  - `LogicalOperator.AND`: All conditions within the group must be met.
  - `LogicalOperator.OR`: At least one condition within the group must be met.

Filters are added to a `Criteria` using the `where()`, `andWhere()`, and `orWhere()` methods. The library automatically normalizes the structure of `FilterGroup` instances to maintain consistency.

[Back to Index](#index-of-core-concepts)

---

## Ordering (`Order`, `OrderDirection`)

Ordering defines how the query results should be sorted.

- **`Order`**: Represents a single ordering rule. It consists of:

  - `field`: The field by which the results will be ordered. This field is strongly typed with the valid fields defined in the schema of each Criteria.
  - `direction`: The ordering direction (see `OrderDirection`).

- **`OrderDirection`**: This is an enumeration with two possible values:
  - `ASC`: Ascending order.
  - `DESC`: Descending order.

Multiple ordering rules can be added to a `Criteria` using the `orderBy()` method. The order in which they are added is significant, as it defines the sorting priority. Each `Order` also has an internal `sequenceId` that translators can use to maintain a stable order if necessary.

[Back to Index](#index-of-core-concepts)

---

## Pagination

Pagination allows retrieving subsets of results, which is crucial for handling large amounts of data. The library supports two types of pagination:

- **Offset-based Pagination:**

  - `setTake(count)`: Specifies the maximum number of records to return (equivalent to `LIMIT`).
  - `setSkip(count)`: Specifies the number of records to skip before starting to return results (equivalent to `OFFSET`).

- **Cursor-based Pagination:**
  - `setCursor(cursorFilters, operator, order)`: Allows for more efficient and stable pagination, especially with frequently changing datasets.
    - `cursorFilters`: An array of one or two `FilterPrimitive` objects (without the `operator`) that define the cursor values (e.g., the `created_at` and `uuid` of the last item from the previous page).
    - `operator`: Must be `FilterOperator.GREATER_THAN` or `FilterOperator.LESS_THAN`, depending on the pagination direction.
    - `order`: The direction (`OrderDirection`) in which the data is being ordered, which must match the main ordering of the `Criteria`.
  - For cursor-based pagination to work correctly, the translator is responsible for
    processing the cursor information (cursorFilters, operator, and order) and ensuring that the
    necessary orderBy clauses are applied to the final query with appropriate priority, using the
    fields defined in the cursor.

[Back to Index](#index-of-core-concepts)

---

## Field Selection (setSelect, resetSelect)

By default, when a `Criteria` is created (whether `RootCriteria` or a `JoinCriteria`), all fields defined in its associated schema will be selected. This behavior can be modified:

- **`setSelect(fields: FieldOfSchema<TSchema>[])`**: Allows explicitly specifying an array
  of fields to be selected, typed with the valid fields of that `Criteria` instance's schema. If `setSelect()` is called, only the provided fields will be selected.

  - It is important to note that if `orderBy()` or `setCursor()` is used on fields not included in `setSelect()`, some translators (like the TypeORM translator) might automatically add those fields to the selection to ensure correct database functionality.

- **`resetSelect()`**: Reverts to the default behavior of selecting all fields from the schema for that `Criteria` instance. This is useful if `setSelect()` was previously used and you want to select everything again.

- **Behavior in Joins:**
  - If a `JoinCriteria` does not have `setSelect()` explicitly called, all its fields will be included in the main `SELECT` clause of the query, prefixed with the join's alias.
  - If `setSelect()` is called on a `JoinCriteria`, only those selected fields from the join will be included.

This flexibility allows optimizing queries to retrieve only the necessary data.

[Back to Index](#index-of-core-concepts)
