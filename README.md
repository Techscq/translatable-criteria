# @nulledexp/translatable-criteria

[![NPM Version](https://img.shields.io/npm/v/@nulledexp/translatable-criteria.svg)](https://www.npmjs.com/package/@nulledexp/translatable-criteria)
![NPM Downloads](https://img.shields.io/npm/dw/%40nulledexp%2Ftranslatable-criteria)
[![Development Stage](https://img.shields.io/badge/Development-Active%20Development-green)]()
[![Documentation](https://img.shields.io/badge/Documentation-EN-blue)](./src/docs/introduction/en.md)
[![Documentation](https://img.shields.io/badge/Documentation-ES-blue)](./src/docs/introduction/es.md)
[![CI](https://github.com/Techscq/translatable-criteria/actions/workflows/ci.yml/badge.svg)](https://github.com/Techscq/translatable-criteria/actions/workflows/ci.yml)

A TypeScript library for building data-source agnostic, translatable query criteria. Define complex filtering, ordering, and join logic in a structured, type-safe way, then translate it to your specific data source using custom translators.

## Installation

```bash
npm install @nulledexp/translatable-criteria
```

## Overview

This library simplifies the construction of complex data queries by providing a consistent and abstract way to define filtering, ordering, field selection, pagination (offset and cursor-based), and relationship (joins) configurations. The core concept revolves around the `Criteria` object hierarchy, which allows developers to define sophisticated query specifications in a data source-agnostic manner, now with enhanced schema validation (including `identifier_field`) and richer context for translators (like `parent_identifier`). These `Criteria` objects can then be processed by a `CriteriaTranslator` to generate queries for various data sources.

## Key Features

- **Enhanced Type-Safety:** Construct queries with a fluent, strongly-typed interface, benefiting from compile-time and runtime validation of field names (including `identifier_field`), aliases, and join parameters based on your schemas.
- **Powerful Filtering:** Define intricate filtering logic with multiple operators (including for JSON, arrays, sets, ranges, and regex) and grouping. Filter groups are automatically normalized for consistency.
- **Flexible Join System:** Support for various join types (inner, left, full outer) and pivot table configurations. Join parameters now include `parent_identifier` to provide richer context to translators for relationship inference (e.g., for `one_to_one`).
- **Granular Null-Value Sorting:** Explicitly control whether `NULL` values appear first or last in your ordered results.
- **Filter-Only Joins:** Improve query performance by creating joins solely for filtering, without including their fields in the final `SELECT` statement.
- **Field Selection & `identifier_field`:** Specify exactly which fields to retrieve using `setSelect()`. The `identifier_field` of an entity is automatically included when `setSelect()` is used. Use `resetSelect()` to select all fields (default behavior).
- **Pagination:** Supports both offset-based (`setTake()`, `setSkip()`) and cursor-based (`setCursor()`) pagination.
- **Data Source Agnostic:** Design criteria independently of the underlying data source.
- **Translator-Based Architecture:** The core library defines criteria; actual translation is handled by separate translator packages that implement the `CriteriaTranslator` interface.
- **Full TypeScript Support:** Benefit from compile-time validation and autocompletion.

## Core Concepts

The library is built upon a few fundamental concepts. For detailed explanations, please refer to our documentation guides.

- [**`Criteria` Hierarchy:**](./src/docs/core-concepts/en.md#criteria-hierarchy) Abstract base for query specifications (`RootCriteria`, `InnerJoinCriteria`, etc.).
- [**`CriteriaFactory`:**](./src/docs/core-concepts/en.md#criteriafactory) Recommended utility for creating `Criteria` instances.
- [**Schemas (`CriteriaSchema` & `GetTypedCriteriaSchema`):**](./src/docs/guides/schema-definitions/en.md) Define your data entities' structure for type-safe criteria construction.
- [**`CriteriaTranslator`:**](./src/docs/guides/developing-translators/en.md) Abstract class responsible for converting `Criteria` objects into specific data source queries.

## Usage Example (Core Library)

This package provides the tools to define your query criteria. The core philosophy is to define relationship logic **once** in the schema, and then simply reference it when building criteria.

### 1. Define Schemas

First, define your entity schemas using `GetTypedCriteriaSchema`. This is where you declare how entities are related by defining `local_field`, `relation_field`, etc.

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt'],
  identifier_field: 'id',
  relations: [
    {
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
  ],
});

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'posts',
  alias: 'p',
  fields: ['id', 'title', 'content', 'userId', 'createdAt'],
  identifier_field: 'id',
  relations: [
    {
      relation_alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      local_field: 'userId',
      relation_field: 'id',
    },
  ],
});
```

### 2. Create a Simple Criteria

Use `CriteriaFactory` to create a `Criteria` object and apply filters or ordering.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas'; // Adjust path

// Create Criteria for the User entity
const userCriteria = CriteriaFactory.GetCriteria(UserSchema);

// Example: Add a simple filter
userCriteria.where({
  field: 'email', // Type-safe based on UserSchema.fields
  operator: FilterOperator.CONTAINS,
  value: '@example.com',
});

// Example: Add ordering
userCriteria.orderBy('createdAt', OrderDirection.DESC);

// The 'userCriteria' object is now ready to be passed to a translator.
```

### 3. Create Criteria with a Join

To add a join, simply call the `.join()` method with the `relation_alias` you defined in the schema. The library automatically uses the configuration you provided, eliminating the need for manual join parameters.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas'; // Adjust path

// Find posts from active users
const postCriteria = CriteriaFactory.GetCriteria(PostSchema);

const activeUserJoin = CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
  field: 'isActive',
  operator: FilterOperator.EQUALS,
  value: true,
});

// The join is now declarative. Just provide the relation alias.
postCriteria.join('user', activeUserJoin);

// The 'postCriteria' object is now ready to be passed to a translator.
```

---

## Available Translators

To interact with a database, you'll need a translator package. You can either build your own following our Criteria Translator Development Guide or use one from the community.

- **`@nulledexp/typeorm-mysql-criteria-translator`**:
  - A translator for generating TypeORM `SelectQueryBuilder` instances for MySQL.
  - **Author:** Nelson Cabrera
  - **Installation**:

```bash
  npm install @nulledexp/typeorm-mysql-criteria-translator
```

- **Usage:**

  - See the TypeORM Translator Usage Guide for detailed instructions.

- **(More translators coming soon or can be created by the community)**

**Important Note for Translator Developers:** Translators should be updated to handle the new `parent_identifier` in join parameters (especially for inferring `one_to_one` relationships) and to support the new filter operators. Refer to the Developing Custom Translators Guide for details.

## Type Safety Features

- Compile-time validation of field names within criteria based on schemas.
- Validation of `identifier_field` definition within schemas.
- Type-checked join configurations ensuring compatibility between schemas.
- Autocomplete support for schema fields and defined join aliases.
- Validation of alias usage in `Criteria` constructors.
- Robust validation of join parameters based on `join_relation_type`.
- Validation for selected fields, cursor fields, take/skip values.
- Strictly typed filter values based on the `FilterOperator` used.
- Inclusion of `parent_identifier` in resolved join parameters for translator use.

## Roadmap (Core Library)

- [x] Implement cursor pagination.
- [x] Implement field selection (`setSelect`, `resetSelect`).
- [x] Implement `ORDER BY` for root and joined criteria (with `sequenceId` for stable global ordering).
- [x] Implement `LIMIT` and `OFFSET` (take/skip) for pagination.
- [x] Implement `PivotJoin` for many-to-many relationships.
- [x] Strictly typed filter values based on operator.
- [x] New filter operators (JSON, Array, Set, Range, Regex, ILIKE).
- [x] `OuterJoinCriteria` support in the core logic.
- [x] Introduce `identifier_field` in schemas and `parent_identifier` in join parameters.
- [x] Enforce stricter schema validation at type level.
- [x] Implement `NULLS FIRST/LAST` ordering.
- [x] Implement filter-only joins (`withSelect`).
- [x] Enhanced documentation with detailed examples for translator development.
- [ ] Explore utility functions to simplify translator development.
- [ ] Explore utility functions to simplify schema development.
- [ ] Add more comprehensive unit test coverage for criteria construction and edge cases.

## Contributing

This project is in active development. Contributions are welcome! Please feel free to submit a Pull Request on our GitHub repository.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Contact

- **LinkedIn:** [Nelson Cabrera](https://www.linkedin.com/in/nulled-nelsoncabrera/)
- **Email:** [contact@nelsoncabrera.dev](mailto:contact@nelsoncabrera.dev)
- **GitHub:** [github.com/Techscq](https://github.com/Techscq)

## Author

Nelson Cabrera ([@Techscq](https://github.com/Techscq))
