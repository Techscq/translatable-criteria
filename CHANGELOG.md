# @nulledexp/translatable-criteria

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
