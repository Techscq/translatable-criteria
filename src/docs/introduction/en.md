# Introduction to @nulledexp/translatable-criteria

Welcome to the documentation for `@nulledexp/translatable-criteria`. This library has been
designed to simplify and standardize the way you build and manage complex data queries
in your TypeScript applications.

## What is `@nulledexp/translatable-criteria`?

`@nulledexp/translatable-criteria` is a library that allows you to define query criteria
(filtering, ordering, joins, pagination, etc.) in an abstract, data-source-agnostic manner.

With `@nulledexp/translatable-criteria`, you define these criteria as structured, type-safe
objects. The library has evolved to offer even more robust schema validation and provide
richer contextual information to translators, further simplifying the development of
sophisticated data source integrations.
This contrasts with writing SQL directly, using a specific ORM's syntax directly
in your use cases, or developing multiple methods with convoluted and tightly coupled logic
in your repositories.

The core idea is that these "translatable criteria" can then be processed by a specific
**Translator** (which you or the community can implement) to generate the native query
for your particular database or data source (e.g., SQL for TypeORM, queries for MongoDB, etc.).

- **[TypeOrm(MySql) Translator](https://www.npmjs.com/package/@nulledexp/typeorm-mysql-criteria-translator)**
  - Author: [Nelson Cabrera](https://github.com/Techscq)

## What Problem Does It Solve?

Many applications face the challenge of creating flexible and reusable data access logic. A common symptom is the **proliferation of specialized query methods** like `getUserByUuid`, `getUserByEmail`, or `getPostByUuidAndTitleAndCategories`. This approach quickly becomes a maintenance bottleneck.

This problem is compounded because the "context" of a query can change. For example, fetching a post for a regular user is not the same as fetching it for its author, a moderator, or an analytics service. Each context may require different fields, joins, or filters. This leads to:

- **Method Explosion:** A constant need to write new methods for every minor variation in filtering, coupling the data access layer to specific use cases.
- **Maintenance Burden:** New business requirements often force developers to create more and more methods, increasing complexity and the risk of bugs.
- **Tight Coupling:** The application logic becomes tightly coupled to a specific data source or ORM, making future migrations or changes difficult.
- **Contextual Complexity:** The logic to handle different access contexts (e.g., user vs. admin) gets scattered and duplicated.

`@nulledexp/translatable-criteria` provides a more abstract and ideal solution. By allowing you to build query specifications dynamically, it addresses these issues by:

- **Decoupling query definition from execution:** Define _what_ data you need, not _how_ to get it.
- **Promoting reusability:** A single query method can handle countless variations by accepting a `Criteria` object.
- **Improving type safety:** Build criteria with strong compile-time validation.
- **Facilitating testing:** Test query construction logic independently of the database.

While adopting any library introduces a degree of coupling, `@nulledexp/translatable-criteria` offers a strategic trade-off. You couple your application to a predictable and maintainable query-building flow in exchange for **decoupling your business logic from the underlying data source and its specific implementation**. This results in a more manageable, predictable, and adaptable architecture in the long run.

## Who Is This Library For?

This library is ideal for developers and teams who:

- Seek a more structured and maintainable way to handle data queries.
- Work on projects where flexibility to change or interact with multiple data sources is important.
- Value type safety and want to reduce runtime errors related to queries.
- Want to keep their business logic clean and separate from specific data access implementations.
- Develop clean architectures, like DDD (Domain-Driven Design), where repositories can benefit from an agnostic way of defining criteria.

## Key Benefits

- **[Enhanced Type Safety](../guides/schema-definitions/en.md):** Build queries with a fluent, strongly-typed interface, including robust schema validation and type-checked filter values.
- **[Powerful Filtering](../guides/building-criteria/en.md#2-applying-filters):** Define intricate filtering logic with a wide array of operators (including for JSON, arrays, sets, ranges, and regex) and logical grouping.
- **[Declarative Join System](../guides/building-criteria/en.md#3-adding-joins):** Define relationship logic once in the schema and reuse it with simple, type-safe join calls.
- **[Advanced Pagination](../guides/building-criteria/en.md#5-pagination):** Support for offset-based and cursor-based pagination.
- **[Extensible Architecture](../guides/developing-translators/en.md):** Create your own translators for any data source, aided by more comprehensive join information.

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
