---
'@nulledexp/translatable-criteria': major
---

### 💥 Breaking Changes

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
