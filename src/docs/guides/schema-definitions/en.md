# Practical Guide: Defining Schemas

Schemas (`CriteriaSchema`) are the cornerstone of type safety and validation in `@nulledexp/translatable-criteria`. They define the structure of your data entities, allowing the library to understand which fields and relationships are available for building queries.

This guide will show you how to define schemas for your entities using the `GetTypedCriteriaSchema` helper function.

## Why Use `GetTypedCriteriaSchema`?

The `GetTypedCriteriaSchema` function is crucial because:

1.  **Preserves Literal Types:** It maintains the exact types of your `fields` and `alias` (e.g., `'id' | 'email'` instead of `string`). This is fundamental for autocompletion and strict compile-time validation when you build your `Criteria`.

2.  **Structural Validation:** Although `GetTypedCriteriaSchema` is an identity function at runtime (it simply returns the object you pass to it), its typing helps ensure that the structure of your schema (presence of `source_name`, `alias`, `fields`, `identifier_field`, `joins`) is correct.
3.  **Avoids `as const`:** It eliminates the need to use `as const` assertions in your schema definitions to achieve literal type preservation, making the code cleaner.

## Structure of a Schema

A `CriteriaSchema` is defined with the following main fields:

```typescript
{
    source_name: string;
    alias: string;
    fields: readonly string[];
    identifier_field: string;
    joins: readonly {
        alias: string;
        target_source_name: string;
        relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
        metadata?: { [key: string]: any };
    }[];
    metadata?: { [key: string]: any };
}
```

- `source_name`: (string) The actual name of the table or collection in your database.
- `alias`: (string) A **single, canonical alias** you will use to refer to this entity when it's the root of a query.
- `fields`: (readonly string[]) A list of all queryable fields for this entity.
- `identifier_field`: (string) **(Mandatory)** The name of the field that uniquely identifies an entity of this schema (e.g., its primary key). This field **must** be one of the names listed in the `fields` array.
- `joins`: (readonly object[]) Defines the relationships this entity has with others. Each join object specifies:
- `alias`: (string) The alias you will use to refer to this specific **join relation** (e.g., `'posts'`, `'author'`). This is the alias you will pass to the `.join()` method.
- `target_source_name`: (string) The `source_name` of the entity schema you are joining to. This is used for robust validation.
- `relation_type`: (string) The type of relationship, such as `'one_to_many'`, `'many_to_one'`, or `'many_to_many'`.
- `metadata`: (optional object) An optional field to store arbitrary, translator-specific information for this specific join.
- `metadata`: (optional object) An optional field at the root of the schema to store arbitrary, translator-specific information for the entire entity.

## Schema Examples

To ensure consistency across the documentation, we will use a unified set of schemas. These examples define `User`, `Post`, and `Role` entities and their relationships.

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  joins: [
    {
      alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
    },
    {
      alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
    },
  ],
});

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'posts',
  alias: 'p',
  fields: [
    'id',
    'title',
    'content',
    'userId',
    'createdAt',
    'categories',
    'metadata',
  ],
  identifier_field: 'id',
  joins: [
    {
      alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
    },
  ],
});

export const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  joins: [],
});
```

### Breakdown of the `UserSchema` Example

- **`source_name: 'users'`**: Indicates that user data is located in a source (e.g., table) named `users`.
- **`alias: 'u'`**: The canonical alias for the `User` entity is `'u'`. When creating a `RootCriteria` for users, it will be aliased as `u` in the query.
- **`fields: [...]`**: Lists the directly queryable fields of the `User` entity, including fields like `tags` that can be used with advanced operators.
- **`identifier_field: 'id'`**: Specifies `id` as the unique identifier for `User` entities.
- **`joins: [...]`**:
  - The first join defines a relationship named `'posts'`. This is the alias you will use in the `.join('posts', ...)` method. It targets the `posts` source and is a `one_to_many` relation.
  - The second join defines a relationship named `'roles'`, targeting the `roles` source with a `many_to_many` relation.

### Breakdown of the `PostSchema` Example

- **`joins: [...]`**:
  - Defines a relationship named `'user'`. This allows you to join from a `Post` back to its author (`User`) using `.join('user', ...)`.

## Next Steps

Now that you know how to define schemas, the next step is to learn how to [Build Criteria using these schemas.](../building-criteria/en.md)
