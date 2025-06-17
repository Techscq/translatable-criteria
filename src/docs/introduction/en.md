# Introduction to @nulledexp/translatable-criteria

Welcome to the documentation for `@nulledexp/translatable-criteria`. This library has been
designed to simplify and standardize the way you build and manage complex data queries
in your TypeScript applications.

## What is `@nulledexp/translatable-criteria`?

`@nulledexp/translatable-criteria` is a library that allows you to define query criteria
(filtering, ordering, joins, pagination, etc.) in an abstract, data-source-agnostic manner.

With `@nulledexp/translatable-criteria`, you define these criteria as structured, type-safe
objects. This contrasts with writing SQL directly, using a specific ORM's syntax directly
in your use cases, or developing multiple methods with convoluted and tightly coupled logic
in your repositories.

The core idea is that these "translatable criteria" can then be processed by a specific
**Translator** (which you or the community can implement) to generate the native query
for your particular database or data source (e.g., SQL for TypeORM, queries for MongoDB, etc.).

- **[TypeOrm(MySql) Translator](https://www.npmjs.com/package/@nulledexp/typeorm-mysql-criteria-translator)**
  - Author: [Nelson Cabrera](https://github.com/Techscq)

## What Problem Does It Solve?

In many applications, the logic for querying data is mixed with business code or tightly
coupled to a specific ORM or database. This can lead to:

- **Difficulty changing databases or ORMs:** If you decide to migrate, much of your query
  code needs to be rewritten.
- **Complexity in business logic:** Complex queries can become difficult to read, maintain,
  and test.
- **Code repetition:** Similar filtering or pagination logic might be duplicated in
  different parts of the application.
- **Reduced testability:** Testing query logic in isolation becomes complicated.

`@nulledexp/translatable-criteria` addresses these problems by:

- **Decoupling query definition from execution:** Define _what_ data you need, not _how_ to get it from a specific source.
- **Promoting reusability:** Criteria can be built, combined, and reused.
- **Improving type safety:** Thanks to schemas, you can build criteria with compile-time and runtime validation.
- **Facilitating testing:** You can test criteria construction logic independently.

## Who Is This Library For?

This library is ideal for developers and teams who:

- Seek a more structured and maintainable way to handle data queries.
- Work on projects where flexibility to change or interact with multiple data sources is important.
- Value type safety and want to reduce runtime errors related to queries.
- Want to keep their business logic clean and separate from specific data access implementations.
- Develop clean architectures, like DDD (Domain-Driven Design), where repositories can benefit from an agnostic way of defining criteria.

## Key Benefits

- **Enhanced Type Safety:** Build queries with a fluent, strongly-typed interface.
- **Powerful Filtering:** Define intricate filtering logic with multiple operators and grouping.
- **Flexible Join System:** Support for various join types and pivot table configurations.
- **Advanced Pagination:** Support for offset-based and cursor-based pagination.
- **Extensible Architecture:** Create your own translators for any data source.

## How Is This Documentation Structured?

To help you get the most out of `@nulledexp/translatable-criteria`, we have organized the documentation as follows:

- **Introduction (this page):** An overview of the library.
- [**Core Concepts:**](../core-concepts/en.md) Detailed explanation of fundamental components
  like
  `Criteria`,
  `CriteriaFactory`, `Schemas`, and the `CriteriaTranslator` interface.
- [**Practical Guides:**](../guides)
  - [Defining Schemas.](../guides/schema-definitions/en.md)
  - [Building Criteria (filters, joins, ordering, pagination).](../guides/building-criteria/en.md)
  - [Developing Custom Translators.](../guides/developing-translators/en.md)
- [**Examples:**](../use-cases/en.md)
- [**API Reference:**](../api-reference/en.md)

We hope you find this library very useful!
