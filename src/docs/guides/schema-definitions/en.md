# Practical Guide: Defining Schemas

Schemas (`CriteriaSchema`) are the cornerstone of type safety and validation in `@nulledexp/translatable-criteria`. They define the structure of your data entities, allowing the library to understand which fields and relationships are available for building queries.

This guide will show you how to define schemas for your entities using the `GetTypedCriteriaSchema` helper function.

## Why Use `GetTypedCriteriaSchema`?

The `GetTypedCriteriaSchema` function is crucial because:

1.  **Preserves Literal Types:** It maintains the exact types of your `fields` and `alias` (e.g., `'uuid' | 'email'` instead of `string`). This is fundamental for autocompletion and strict compile-time validation when you build your `Criteria`.
2.  **Structural Validation:** Although `GetTypedCriteriaSchema` is an identity function at runtime (it simply returns the object you pass to it), its typing helps ensure that the structure of your schema (presence of `source_name`, `alias`, `fields`, `joins`) is correct.
3.  **Avoids `as const`:** It eliminates the need to use `as const` assertions in your schema definitions to achieve literal type preservation, making the code cleaner.

## Structure of a Schema

A `CriteriaSchema` is defined with the following main fields:

- `source_name`: (string) The actual name of the table or collection in your database.
- `alias`: (array of strings) A list of aliases you can use to refer to this entity when building `Criteria`. The first alias is usually the primary or most descriptive one.
- `fields`: (array of strings) A list of all queryable fields for this entity.
- `joins`: (array of objects) Defines the relationships this entity has with others. Each join object specifies:
  - `alias`: (string) The alias you will use to refer to the joined entity (must match one of the `alias` defined in the joined entity's schema).
  - `join_relation_type`: (string) The type of relationship, such as `'one_to_many'`, `'many_to_one'`, `'one_to_one'`, or `'many_to_many'`.
  - `metadata`: (optional object) An optional field to store arbitrary, translator-specific information or hints directly within the schema definition for this specific join.
- `metadata`: (optional object) An optional field at the root of the schema to store arbitrary, translator-specific information or configuration relevant to the entire entity this schema represents.

## Example: Defining the `UserSchema`

Based on a `User` entity that might have fields like `uuid`, `email`, `username`, `created_at` and relationships with `Address`, `Permission`, and `Post`, here's how we would define its schema:

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user', // Table name in the database
  alias: ['users', 'user', 'publisher'], // Possible aliases for this entity
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    {
      alias: 'permissions', // Alias for the Permission entity
      join_relation_type: 'many_to_many',
    },
    {
      alias: 'addresses', // Alias for the Address entity
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'posts', // Alias for the Post entity
      join_relation_type: 'one_to_many',
    },
  ],
});

// Export the type for use in your application
export type UserSchema = typeof UserSchema;
```

**Breakdown of the `UserSchema` Example:**

- `source_name: 'user'`: Indicates that user data is located in a table/collection named `user`.
- `alias: ['users', 'user', 'publisher']`: We can refer to the `User` entity as `users`, `user`, or `publisher` when creating `Criteria`.
- `fields: [...]`: Lists the directly queryable fields of the `User` entity.
- `joins: [...]`:
  - Defines a `many_to_many` relationship with an entity whose alias is `permissions`.
  - Defines a `one_to_many` relationship with an entity whose alias is `addresses`.
  - Defines a `one_to_many` relationship with an entity whose alias is `posts`.

## Example: Defining the `PostSchema`

Similarly, for a `Post` entity:

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: [
    'uuid',
    'categories',
    'title',
    'body',
    'user_uuid', // Foreign key to the User (publisher)
    'created_at',
    'metadata', // Example of a JSON field
  ],
  joins: [
    {
      alias: 'comments', // Alias for the Comment entity
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'publisher', // Alias for the User entity (the post author)
      join_relation_type: 'many_to_one',
    },
  ],
});

export type PostSchema = typeof PostSchema;
```

**Key Points of the `PostSchema`:**

- `fields`: Includes fields like `categories` and `metadata`. These fields might be of complex types (arrays, JSON) in your database, and the library allows filtering them using specific operators (see the guide on building criteria).
- `user_uuid`: This field likely represents the foreign key to the `User` entity. Although the relationship is defined in `joins`, listing the FK field in `fields` allows direct filtering by it if needed.
- `joins`:
  - `comments`: A post can have many comments (`one_to_many`).
  - `publisher`: A post belongs to one user (`many_to_one`). Note how the `alias` `publisher` here matches one of the `alias` defined in `UserSchema`.

## Exporting the Schema Type

It is a recommended practice to also export the inferred type of your schema:
