# @nulledexp/translatable-criteria

[![NPM Version](https://img.shields.io/npm/v/@nulledexp/translatable-criteria.svg)](https://www.npmjs.com/package/@nulledexp/translatable-criteria)
![NPM Downloads](https://img.shields.io/npm/dw/%40nulledexp%2Ftranslatable-criteria)
[![Development Stage](https://img.shields.io/badge/Development-Active%20Development-green)]()
[![Documentation](https://img.shields.io/badge/Documentation-EN/ES-blue)](./src/docs/introduction/en.md)
[![CI](https://github.com/Techscq/translatable-criteria/actions/workflows/ci.yml/badge.svg)](https://github.com/Techscq/translatable-criteria/actions/workflows/ci.yml)

A TypeScript library for building data-source agnostic, translatable query criteria. Define complex filtering, ordering, and join logic in a structured, type-safe way, then translate it to your specific data source using custom translators.

## Installation

```bash
npm install @nulledexp/translatable-criteria
```

## Overview

This library simplifies the construction of complex data queries by providing a consistent and abstract way to define filtering, ordering, field selection, pagination (offset and cursor-based), and relationship (joins) configurations. The core concept revolves around the `Criteria` object hierarchy, which allows developers to define sophisticated query specifications in a data source-agnostic manner. These `Criteria` objects can then be processed by a `CriteriaTranslator` (using the Visitor pattern) to generate queries for various data sources.

## Key Features

- **Enhanced Type-Safety:** Construct queries with a fluent, strongly-typed interface, benefiting from compile-time and runtime validation of field names, aliases, and join parameters based on your schemas.
- **Powerful Filtering:** Define intricate filtering logic with multiple operators (including for JSON and arrays) and grouping. Filter groups are automatically normalized for consistency.
- **Flexible Join System:** Support for various join types (inner, left, full outer) and pivot table configurations, with validation of join parameters according to the relation type.
- **Default Join Field Selection:** When a join is added, if `setSelect()` is not explicitly called on the `JoinCriteria`, all fields from the joined schema will be automatically included in the main `SELECT` clause. This can be overridden by using `setSelect()` on the specific `JoinCriteria`.
- **Field Selection:** Specify exactly which fields to retrieve using `setSelect()`. Use `resetSelect()` to select all fields (which is also the default behavior).
- **Pagination:** Supports both offset-based (`setTake()`, `setSkip()`) and cursor-based (`setCursor()`) pagination.
- **Visitor Pattern for Translation:** Criteria objects implement an `accept` method, allowing for clean and extensible translation logic via the Visitor pattern.
- **Data Source Agnostic:** Design criteria independently of the underlying data source.
- **Translator-Based Architecture:** The core library defines criteria; actual translation is handled by separate translator packages that implement the `CriteriaTranslator` interface.
- **Full TypeScript Support:** Benefit from compile-time validation and autocompletion.

## Core Concepts

The library is built upon a few fundamental concepts. For detailed explanations, please refer to our Core Concepts Documentation.

- **`Criteria` Hierarchy:** Abstract base for query specifications (`RootCriteria`, `InnerJoinCriteria`, etc.). Learn more.
- **`CriteriaFactory`:** Recommended utility for creating `Criteria` instances (e.g., `CriteriaFactory.GetCriteria(...)`, `CriteriaFactory.GetInnerJoinCriteria(...)`). Learn more.
- **Schemas (`CriteriaSchema` & `GetTypedCriteriaSchema`):** Define your data entities' structure for type-safe criteria construction. Learn more.
- **`CriteriaTranslator`:** Abstract class for converting `Criteria` objects into specific data source queries using the Visitor pattern. Learn more.

## Usage Example (Core Library)

This package provides the tools to define your query criteria.

### 1. Define Schemas

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: ['users', 'user', 'publisher'],
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    { alias: 'posts', relation_type: 'one_to_many' },
    // other joins like 'permissions', 'addresses' can be defined here
  ],
});
export type UserSchema = typeof UserSchema;

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: [
    'uuid',
    'title',
    'body',
    'user_uuid',
    'created_at',
    'categories', // Example: for array filters
    'metadata', // Example: for JSON filters
  ],
  joins: [
    { alias: 'comments', relation_type: 'one_to_many' },
    { alias: 'publisher', relation_type: 'many_to_one' },
  ],
});
export type PostSchema = typeof PostSchema;

// Define other schemas (PermissionSchema, PostCommentSchema, AddressSchema) as needed for your application.
// See the full documentation for more examples.
```

### 2. Create Criteria

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/criteria/schemas'; // Adjust path

// Create Criteria for the User entity
const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users');

// Example: Add a simple filter
userCriteria.where({
  field: 'email', // Type-safe based on UserSchema.fields
  operator: FilterOperator.CONTAINS,
  value: '@example.com',
});

// Example: Add ordering
userCriteria.orderBy('created_at', 'DESC');

// The 'userCriteria' object is now ready to be passed to a translator.
```

## Available Translators

To interact with a database, you'll need a translator package.

- **`@nulledexp/typeorm-mysql-criteria-translator`**:
  A translator for generating TypeORM `SelectQueryBuilder` instances for MySQL.
  - **Author:** Nelson Cabrera
  - **Installation**:

```bash
  npm install @nulledexp/typeorm-mysql-criteria-translator
```

- **Usage (basic)**:

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { TypeOrmMysqlTranslator } from '@nulledexp/typeorm-mysql-criteria-translator'; // Using new suggested name
import { UserSchema } from './path/to/your/criteria/schemas'; // Your Criteria Schema
// import { YourTypeOrmUserEntity } from './path/to/your/typeorm/entities'; // Your actual TypeORM entity
// import { DbDatasource } from './path-to-your-datasource-config'; // Your initialized TypeORM DataSource instance

// 1. Define your Criteria using @nulledexp/translatable-criteria
const criteria = CriteriaFactory.GetCriteria(UserSchema, 'users') // 'users' is an alias from UserSchema
  .where({
    field: 'username', // Field from UserSchema
    operator: FilterOperator.EQUALS,
    value: 'testuser',
  })
  .setTake(10);

// 2. Use the translator with your TypeORM QueryBuilder
// (Conceptual - assuming DbDatasource and YourTypeOrmUserEntity are set up)

// const queryBuilder = DbDatasource.getRepository(YourTypeOrmUserEntity)
//   .createQueryBuilder(criteria.alias); // Alias must match root criteria alias

// const translator = new TypeOrmMysqlTranslator<YourTypeOrmUserEntity>();
// translator.translate(criteria, queryBuilder);

// Now queryBuilder is populated with the translated criteria
// console.log(queryBuilder.getSql(), queryBuilder.getParameters());
// const results = await queryBuilder.getMany();
```

- **Note:** This translator has been tested with integration tests. Please review its implementation at its repository (replace with actual repo link if different) to ensure it meets your specific project needs and production requirements. Contributions and bug reports are welcome!

- **(More translators coming soon or can be created by the community)**

### Developing Custom Translators

You can create your own translators by extending the abstract `CriteriaTranslator` class. See the Developing Custom Translators Guide for details.

## Type Safety Features

- Compile-time validation of field names within criteria based on schemas.
- Type-checked join configurations ensuring compatibility between schemas.
- Autocomplete support for schema fields and defined join aliases.
- Validation of alias usage in `Criteria` constructors.
- Robust validation of join parameters based on `join_relation_type`.
- Validation for selected fields, cursor fields, take/skip values.
- Strictly typed filter values based on the `FilterOperator` used.

## Roadmap (Core Library)

- [x] Implement cursor pagination.
- [x] Implement field selection (`setSelect`, `resetSelect`).
- [x] Implement `ORDER BY` for root and joined criteria (with `sequenceId` for stable global ordering).
- [x] Implement `LIMIT` and `OFFSET` (take/skip) for pagination.
- [x] Implement `PivotJoin` for many-to-many relationships.
- [x] Strictly typed filter values based on operator.
- [x] New filter operators (JSON, Array, Set).
- [x] Enhanced documentation with detailed examples for translator development.
- [x] `OuterJoinCriteria` support in the core logic.
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
