---
'@nulledexp/translatable-criteria': minor
---

This changeset introduces several new filter operators (SET_CONTAINS_ANY/ALL, BETWEEN/NOT_BETWEEN, MATCHES_REGEX, ILIKE/NOT_ILIKE), enhancing the library's query capabilities. It also refactors the `setCursor` method to support both single and composite field cursors, providing greater flexibility for pagination. Corresponding type definitions, constructor validations, JSDoc, and documentation have been updated. Test coverage has been expanded to include these new features.
