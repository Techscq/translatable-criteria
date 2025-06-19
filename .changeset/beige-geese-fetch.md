---
'@nulledexp/translatable-criteria': minor
---

- **Schema and Join Metadata**: Introduced optional `metadata` fields to `CriteriaSchema` and `SchemaJoins` (and consequently to resolved `PivotJoin` and `SimpleJoin` types as `parent_schema_metadata` and `join_metadata`). This allows users to define and translators to consume arbitrary data associated with schemas or specific join configurations, enhancing extensibility for custom translation logic.
- **Cursor Value Flexibility**: The `Cursor` constructor now correctly allows `null` as a valid value for cursor fields. An error will only be thrown if a cursor field's value is `undefined`. This change makes cursor-based pagination more robust, especially when paginating over fields that can legitimately be `null`.
- **Improved JSDoc and Type Safety**: Significantly expanded JSDoc comments across the core library for better inline documentation and API clarity. Chainable methods in `Criteria` and `ICriteriaBase` now consistently return `this` for improved type inference and developer experience.

- **API: Join Relation Type Renamed**: The property `join_relation_type` within `SchemaJoins` (and consequently in the resolved `PivotJoin` and `SimpleJoin` types) has been renamed to `relation_type` for better conciseness. Schema definitions and custom logic relying on the old name will need to be updated. While this is a breaking change, given the library's early stage, it is included in a minor release to streamline development.
