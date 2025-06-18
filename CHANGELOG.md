# @nulledexp/translatable-criteria

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
