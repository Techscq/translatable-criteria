# Practical Guide: Defining Schemas

Schemas (`CriteriaSchema`) are the cornerstone of type safety and validation in `@nulledexp/translatable-criteria`. They define the structure of your data entities, allowing the library to understand which fields and relationships are available for building queries.

This guide will show you how to define schemas for your entities using the `GetTypedCriteriaSchema` helper function.

## Why Use `GetTypedCriteriaSchema`?

The `GetTypedCriteriaSchema` function is crucial because:

1.  **Preserves Literal Types:** It maintains the exact types of your `fields` and `alias` (e.g., `'id' | 'email'` instead of `string`). This is fundamental for autocompletion and strict compile-time validation when you build your `Criteria`.
2.  **Structural Validation:** Although `GetTypedCriteriaSchema` is an identity function at runtime (it simply returns the object you pass to it), its typing helps ensure that the structure of your schema (presence of `source_name`, `alias`, `fields`, `identifier_field`, `relations`) is correct..
3.  **Avoids `as const`:** It eliminates the need to use `as const` assertions in your schema definitions to achieve literal type preservation, making the code cleaner.

## Structure of a Schema

A `CriteriaSchema` is defined with the following main fields:

```typescript
    {
        source_name: string;
        alias: string;
        fields: readonly string[];
        identifier_field: string;
        relations: readonly SchemaJoins<string>[];
        metadata?: { [key: string]: any };
    }
```

- `source_name`: (string) The actual name of the table or collection in your database.
- `alias`: (string) A **single, canonical alias** you will use to refer to this entity when it's the root of a query.
- `fields`: (readonly string[]) A list of all queryable fields for this entity.
- `identifier_field`: (string) **(Mandatory)** The name of the field that uniquely identifies an entity of this schema (e.g., its primary key). This field **must** be one of the names listed in the `fields` array.
- `relations`: (readonly object[]) Defines the relationships this entity has with others. Each object in this array describes a single, complete relationship.
- `metadata`: (optional object) An optional field at the root of the schema to store arbitrary, translator-specific information for the entire entity.

### The `relations` Property

This is the core of the declarative join system. Each object in the `relations` array defines a complete relationship, including the fields to join on.

#### For Simple Joins (one-to-one, one-to-many, many-to-one)

```typescript
    {
      relation_alias: string;
      relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one';
      target_source_name: string;
      local_field: string;
      relation_field: string;
      metadata?: { [key: string]: any };
    }
```

- `relation_alias`: The unique name for this relationship (e.g., `'posts'`, `'author'`). This is the alias you will pass to the `.join()` method.
- `relation_type`: The type of relationship.
- `target_source_name`: The `source_name` of the entity schema you are joining to.
- `local_field`: The name of the field **in the current schema** used for the join condition.
- `relation_field`: The name of the field **in the target schema** used for the join condition.

#### For `many-to-many` Joins

```typescript
    {
      relation_alias: string;
      relation_type: 'many_to_many';
      target_source_name: string;
      pivot_source_name: string;
      local_field: { pivot_field: string; reference: string };
      relation_field: { pivot_field: string; reference: string };
      metadata?: { [key: string]: any };
    }
```

- `pivot_source_name`: The name of the intermediary pivot table.
- `local_field`: An object specifying the `reference` field in the current schema and the `pivot_field` it connects to in the pivot table.
- `relation_field`: An object specifying the `reference` field in the target schema and the `pivot_field` it connects to in the pivot table.

## Schema Examples

To ensure consistency across the documentation, we will use a unified set of schemas. These examples define `User`, `Post`, and `Role` entities and their relationships using the new declarative structure.

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  relations: [
    {
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
    {
      relation_alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
      pivot_source_name: 'user_roles',
      local_field: { reference: 'id', pivot_field: 'user_id' },
      relation_field: { reference: 'id', pivot_field: 'role_id' },
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
  relations: [
    {
      relation_alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      local_field: 'userId',
      relation_field: 'id',
    },
  ],
});

export const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  relations: [],
});
```

### Breakdown of the `UserSchema` Example

- **`source_name: 'users'`**: Indicates that user data is located in a source (e.g., table) named `users`.
- **`alias: 'u'`**: The canonical alias for the `User` entity is `'u'`.
- **`identifier_field: 'id'`**: Specifies `id` as the unique identifier for `User` entities.
- **`relations: [...]`**:
  - The first relation defines a `one_to_many` relationship named `'posts'`. It specifies that the `users.id` field (`local_field`) connects to the `posts.userId` field (`relation_field`).
  - The second relation defines a `many_to_many` relationship named `'roles'` through the `user_roles` pivot table. It maps `users.id` to `user_roles.user_id` and `roles.id` to `user_roles.role_id`.

### Breakdown of the `PostSchema` Example

- **`relations: [...]`**:
  - Defines a `many_to_one` relationship named `'user'`. This allows you to join from a `Post` back to its author (`User`) by connecting `posts.userId` (`local_field`) to `users.id` (`relation_field`).

## Next Steps

Now that you know how to define schemas, the next step is to learn how to [Build Criteria using these schemas.](../building-criteria/en.md)
