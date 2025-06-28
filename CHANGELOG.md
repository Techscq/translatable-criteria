# @nulledexp/translatable-criteria

## 2.0.0

### Major Changes

- e52d4df: ### 💥 Breaking Changes

  - **Complete API Refactor for Declarative Joins**: The core API for defining and using joins has been fundamentally redesigned to be declarative, type-safe, and schema-driven.

    - **WHAT CHANGED**: The `Criteria.join()` method signature has been simplified. It no longer accepts a manual object of join keys (`local_field`, `relation_field`). Instead, all relationship logic is now defined once within a new `relations` property in the `CriteriaSchema`. The `.join()` method now only requires the `relationAlias` to look up this predefined configuration.
    - **WHY IT CHANGED**: This centralizes relationship logic, eliminates redundant and error-prone code in business logic, and significantly improves type safety and readability.
    - **OLD API**: `criteria.join('publisher', userJoinCriteria, { parent_field: 'user_uuid', join_field: 'uuid' });`
    - **NEW API**: `criteria.join('publisher', userJoinCriteria);` (where the 'publisher' relation is defined in the schema).

  - **Schema Definition Simplification**: The `CriteriaSchema` definition has been made more explicit and robust.
    - `CriteriaFactory` methods (e.g., `GetCriteria`) no longer take an `alias` argument, as it's inferred directly from the schema's single, canonical `alias` property.
    - The `CriteriaTranslator` interface has been refined, making `translate()` the primary abstract entry point.

  ### ✨ New Features

  - **Performance-Optimized Filter-Only Joins**: The `.join()` method now accepts an optional `withSelect: false` parameter. This allows you to join tables for filtering purposes only, without the performance overhead of selecting and hydrating the related entity's data. This is ideal for "EXISTS" type queries.
  - **Granular `NULLS` Ordering**: The `.orderBy()` method now supports a `nulls_order` option, allowing you to explicitly control whether `NULL` values appear at the beginning (`NULLS FIRST`) or end (`NULLS LAST`) of sorted results.
  - **Massive Expansion of Filter Operators**: A comprehensive suite of new operators has been added to enable more expressive and powerful queries, especially for complex data types.

    - **JSON & Array Operators**: Full support for `JSON_CONTAINS`, `JSON_PATH_VALUE_EQUALS`, `ARRAY_CONTAINS_ELEMENT`, `ARRAY_CONTAINS_ANY_ELEMENT`, `ARRAY_CONTAINS_ALL_ELEMENTS`, `ARRAY_EQUALS`, `ARRAY_EQUALS_STRICT`, and all of their corresponding `NOT_` counterparts.
    - **Set Operators**: Added negation operators `SET_NOT_CONTAINS` and `SET_NOT_CONTAINS_ALL`.

  - **Enhanced Schema Capabilities**:
    - **Identifier Field**: The `identifier_field` is now a mandatory, type-checked property in `CriteriaSchema`, ensuring every entity has a defined unique key. This field is now automatically included in `SELECT` statements for consistency.
    - **Schema Metadata**: A new `metadata` property has been added to `CriteriaSchema` to allow for storing arbitrary, translator-specific configuration.

  ### 📚 Documentation

  - **Complete Documentation Overhaul**: All documentation in `/docs` has been rewritten from the ground up in both English and Spanish. The new documentation is user-centric, focusing on practical "How-To" guides, clear examples, and a comprehensive Filter Operator Reference to reflect the new declarative API.

## 1.2.0

### Minor Changes

- a94a390: - **Schema and Join Metadata**: Introduced optional `metadata` fields to `CriteriaSchema` and `SchemaJoins` (and consequently to resolved `PivotJoin` and `SimpleJoin` types as `parent_schema_metadata` and `join_metadata`). This allows users to define and translators to consume arbitrary data associated with schemas or specific join configurations, enhancing extensibility for custom translation logic.

  - **Cursor Value Flexibility**: The `Cursor` constructor now correctly allows `null` as a valid value for cursor fields. An error will only be thrown if a cursor field's value is `undefined`. This change makes cursor-based pagination more robust, especially when paginating over fields that can legitimately be `null`.
  - **Improved JSDoc and Type Safety**: Significantly expanded JSDoc comments across the core library for better inline documentation and API clarity. Chainable methods in `Criteria` and `ICriteriaBase` now consistently return `this` for improved type inference and developer experience.
  - **API: Join Relation Type Renamed**: The property `join_relation_type` within `SchemaJoins` (and consequently in the resolved `PivotJoin` and `SimpleJoin` types) has been renamed to `relation_type` for better conciseness. Schema definitions and custom logic relying on the old name will need to be updated. While this is a breaking change, given the library's early stage, it is included in a minor release to streamline development.

## 1.1.0

### Minor Changes

- 9644e29: This changeset introduces several new filter operators (SET_CONTAINS_ANY/ALL, BETWEEN/NOT_BETWEEN, MATCHES_REGEX, ILIKE/NOT_ILIKE), enhancing the library's query capabilities. It also refactors the `setCursor` method to support both single and composite field cursors, providing greater flexibility for pagination. Corresponding type definitions, constructor validations, JSDoc, and documentation have been updated. Test coverage has been expanded to include these new features.

## 1.0.4

### Patch Changes

- 0abab7f: feat: Export Filter and FilterGroup classes directly

## 1.0.3

### Patch Changes

- 7b47be0: fix: Ensure Cursor type is exported

## 1.0.2

### Patch Changes

- 9f588b4: fix: Export PrimitiveFilterValue type

## 1.0.1

### Patch Changes

- 0158157: fix: Re-release @nulledexp/typeorm-mysql-criteria-translator with dist folder

## 1.0.0

### Major Changes

- ca8be3f: feat: Initial release of @nulledexp/translatable-criteria, a library for building data-source agnostic, translatable query criteria.
