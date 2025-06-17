# Practical Guide: Usage Examples

The previous guides have shown you how to [Define Schemas](../guides/schema-definitions/en.md) and [Build Criteria](../guides/building-criteria/en.md). Now, let's see how these pieces fit together in a more realistic application scenario.

This guide presents a complete example demonstrating the construction of a complex `Criteria` and how it could be used by a repository to query data.

## Index

- 1. [The Example Scenario](#1-the-example-scenario)
- 2. [Schema Definition (Reminder)](#2-schema-definition-reminder)
- 3. [Building the Complex Criteria](#3-building-the-complex-criteria)
- 4. [Using Criteria in a Repository](#4-using-criteria-in-a-repository)
  - 4.1. [Repository Interface](#41-repository-interface)
  - 4.1.1. [Optimizing Read Models with `setSelect`](#411-optimizing-read-models-with-setselect)
  - 4.2. [Repository Implementation (Conceptual)](#42-repository-implementation-conceptual)
  - 4.3. [Repository Usage](#43-repository-usage)
- 5. [Translation (Brief Mention)](#5-translation-brief-mention)
- 6. [Conclusion](#6-conclusion)

---

## 1. The Example Scenario

Imagine you need to implement a paginated user search functionality. The specific requirement is:

> Obtain a paginated list of users whose email contains "@example.com" AND whose username starts with "user\_", who have also published posts containing the word "TypeScript" in their title and were created in the last 6 months. The results should be ordered first by username (ascending) and then by post creation date (descending).

This scenario requires:

- Filtering on the root entity (`User`).
- A join (`JOIN`) to the `Post` entity.
- Filtering on the joined entity (`Post`).
- Ordering by fields from both entities (root and joined).
- Offset-based pagination (`LIMIT`/`OFFSET`).

## 2. Schema Definition (Reminder)

For this example, we will use the `UserSchema` and `PostSchema` schemas that we defined in the Schema Definition guide. We assume these schemas are available in your project.

```typescript
// The location of your schemas will depend on your project's architecture.
// For example, in a hexagonal architecture:
// - src/user/application/criteria/user-criteria.schema.ts
// - src/post/application/criteria/post-criteria.schema.ts
// Below, they are shown as if in a common directory for simplicity of the example.

import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: ['users', 'user', 'publisher'],
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    {
      alias: 'posts', // Alias for the Post entity
      join_relation_type: 'one_to_many',
    },
    // ... other joins if they exist (e.g., with PermissionSchema, AddressSchema)
  ],
});
export type UserSchema = typeof UserSchema;

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: [
    'uuid',
    'title',
    'body',
    'user_uuid', // Foreign key to the User (publisher)
    'created_at',
    'categories', // Could be an array of strings
    'metadata', // Could be a JSON field
  ],
  joins: [
    {
      alias: 'publisher', // Alias for the User entity (the post's author)
      join_relation_type: 'many_to_one',
    },
    // ... other joins if they exist (e.g., with PostCommentSchema)
  ],
});
export type PostSchema = typeof PostSchema;

// You might have other schemas here if needed for the example,
// such as PostCommentSchema, PermissionSchema, etc.
// For simplicity, we will focus on User and Post for this main example.
```

## 3. Building the Complex Criteria

Now, let's build the `Criteria` object that represents the query described in the scenario. We will use `CriteriaFactory` and fluent methods.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
// Assuming UserSchema and PostSchema are defined as in #CODIGOAQUI_EJEMPLO_SCHEMAS_EN
import { UserSchema, PostSchema } from './domain/criteria/schemas'; // Adjust path to your project

// Calculate the date 6 months ago
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const userSearchCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
  // Filters on the root entity (User)
  .where({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  })
  .andWhere({
    field: 'username',
    operator: FilterOperator.STARTS_WITH,
    value: 'user_',
  })
  // Join with Post and apply orderBy directly to the JoinCriteria
  .join(
    CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts')
      // Filters on the joined entity (Post)
      .where({
        field: 'title',
        operator: FilterOperator.CONTAINS,
        value: 'TypeScript',
      })
      .andWhere({
        field: 'created_at',
        operator: FilterOperator.GREATER_THAN_OR_EQUALS,
        value: sixMonthsAgo,
      })
      // Specific ordering for posts, applied right here
      .orderBy('created_at', OrderDirection.DESC), // <--- orderBy on the JoinCriteria
    // Join parameters (User.uuid = Post.user_uuid)
    { parent_field: 'uuid', join_field: 'user_uuid' },
  )
  // Ordering for the root entity (User)
  .orderBy('username', OrderDirection.ASC)
  // Pagination
  .setTake(10)
  .setSkip(10);

// 'userSearchCriteria' is now a complete Criteria object ready to be translated.
```

**Criteria Breakdown:**

- `CriteriaFactory.GetCriteria(UserSchema, 'users')`: We start the query from the `User` entity, using the `users` alias.
- `.where(...)`, `.andWhere(...)`: We apply initial filters on the `email` and `username` fields of the root entity (`User`).
- `.join(...)`: We add a join to the `Post` entity.
  - `CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts')`: We create the `Criteria` for the join, specifying the `PostSchema` and the `posts` alias. We use `InnerJoin` because we only want users who _have_ posts that meet the conditions.
  - `.where(...)`, `.andWhere(...)`: We apply filters on the `title` and `created_at` fields _of the joined entity (`Post`)_.
  - `{ parent_field: 'uuid', join_field: 'user_uuid' }`: We define how `User` (parent) and `Post` (child) are related.
- `.orderBy(...)`: We define the ordering. First by `username` (root entity field) ascending, then by `created_at` (joined entity field) descending.
- `.setTake(...)`, `.setSkip(...)`: We apply pagination.

This `userSearchCriteria` object now encapsulates all the query logic in a database-agnostic way.

## 4. Using Criteria in a Repository

A repository is a design pattern that mediates between the domain and data mapping layers, using a collection-like interface to access domain objects. A repository could have methods that accept a `Criteria` to decouple query logic from the specific ORM/database.

### 4.1. Repository Interface

You could define an implementation-agnostic repository interface:

```typescript
import { RootCriteria } from '@nulledexp/translatable-criteria';
import { UserSchema } from './domain/criteria/schemas'; // Adjust path to your project
import { UserReadModel } from './domain/user.read-model'; // Adjust path to your Read Model

// Define the read repository interface for Users
export interface IUserRepository {
  /**
   * Finds multiple users matching the provided Criteria.
   * @param criteria The RootCriteria defining the query.
   * @returns A promise that resolves to an array of UserReadModel.
   */
  matchingMany(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel[]>;

  /**
   * Finds a single user matching the provided Criteria.
   * The Criteria is expected to be configured to return a single result or none.
   * @param criteria The RootCriteria defining the query.
   * @returns A promise that resolves to a UserReadModel or null if not found.
   */
  matchingOne(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel | null>;

  // You could add other common repository methods if needed,
  // for example, for counting results:
  // count(criteria: RootCriteria<UserSchema, any>): Promise<number>;
}
```

- `UserReadModel`: This would be the interface or type representing the data structure your application layer expects to receive.
- `RootCriteria<UserSchema, any>`: Indicates that the methods expect a `Criteria` whose root entity is `UserSchema`.

### 4.1.1. Optimizing Read Models with `setSelect`

While the `IUserRepository` interface defines methods returning `UserReadModel`, you can further optimize data retrieval by specifying exactly which fields are needed using the `setSelect()` method on your `Criteria` object.

When you use `setSelect()`, you instruct the `CriteriaTranslator` (and subsequently the ORM or database driver) to fetch only those specified fields. This can significantly improve performance by reducing the amount of data transferred from the database and processed by your application.

For example, if you only need a user's `uuid` and `email` for a particular list view, you could construct your `Criteria` like this:

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './domain/criteria/schemas'; // Adjust path

const lightweightUserCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
  .setSelect(['uuid', 'email']) // Select only uuid and email
  .where({
    field: 'username',
    operator: FilterOperator.STARTS_WITH,
    value: 'user_',
  })
  .setTake(10);
```

In this scenario, your `UserReadModel` might still define more fields, but the data actually populated for instances returned by `matchingMany(lightweightUserCriteria)` would ideally only contain `uuid` and `email` (plus any fields essential for ORM hydration, if applicable).

Alternatively, you could define more specific read models, like a `UserEmailListReadModel`:

```typescript
// Conceptual: A more specific read model
interface UserEmailListReadModel {
  uuid: string;
  email: string;
}
```

The repository implementation, when processing `lightweightUserCriteria`, would then aim to return an array of objects matching `UserEmailListReadModel` (or `UserReadModel` instances sparsely populated). This minimizes data overhead and aligns the fetched data precisely with the use case's requirements.

This approach is particularly beneficial when dealing with entities with many fields or when fetching large lists of data.

### 4.2. Repository Implementation (Conceptual)

The concrete implementation of this repository (e.g., using TypeORM, Sequelize, or a NoSQL database) would be responsible for using a `CriteriaTranslator` to convert the `Criteria` into a native query. The repository would receive necessary dependencies, such as an ORM's query builder and a translator instance, in its constructor.

```typescript
import { RootCriteria } from '@nulledexp/translatable-criteria';
import { UserSchema } from './domain/criteria/schemas'; // Adjust path
import { UserReadModel } from './domain/user.read-model'; // Adjust path
import { IUserRepository } from './user.repository.interface'; // The interface defined above

// --- Implementation-Specific Dependencies (Example with TypeORM) ---
// import { DataSource, SelectQueryBuilder } from 'typeorm';
// import { UserEntity } from './infrastructure/typeorm/entities/user.entity'; // Your TypeORM entity
// import { TypeOrmMysqlTranslator } from '@nulledexp/typeorm-mysql-translator'; // Your translator

export class TypeOrmUserRepository implements IUserRepository {
  // private readonly translator: TypeOrmMysqlTranslator<UserReadModel>; // Or the entity type TypeORM returns

  // constructor(
  //   private readonly dataSource: DataSource,
  //   // You could instantiate the translator here or inject it
  // ) {
  //   this.translator = new TypeOrmMysqlTranslator<UserReadModel>();
  // }

  async matchingMany(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel[]> {
    // Conceptual example with TypeORM:
    // const alias = criteria.alias;
    // const queryBuilder = this.dataSource
    //   .getRepository(UserEntity) // DB entity repository
    //   .createQueryBuilder(alias); // Alias must match the RootCriteria's alias

    // // The translator modifies the queryBuilder based on the Criteria
    // this.translator.translate(criteria, queryBuilder);

    // // Execute the query
    // const results = await queryBuilder.getMany();

    // // Map DB entity results to UserReadModel if necessary
    // return results.map(userEntity => ({
    //   uuid: userEntity.uuid,
    //   email: userEntity.email,
    //   username: userEntity.username,
    //   // ... other fields needed for UserReadModel
    // }));

    // Simplified example without a real ORM for the guide:
    console.log(
      'Simulating execution of matchingMany with Criteria:',
      criteria, // Pass the criteria object directly
    );
    // Real translation and execution logic would go here
    // which could return UserReadModel instances directly
    // if the translator and ORM allow (by selecting only necessary fields).
    return Promise.resolve([]); // Return an empty array as a placeholder
  }

  async matchingOne(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel | null> {
    // Conceptual example with TypeORM:
    // const alias = criteria.alias;
    // const queryBuilder = this.dataSource
    //   .getRepository(UserEntity)
    //   .createQueryBuilder(alias);

    // this.translator.translate(criteria, queryBuilder);

    // const result = await queryBuilder.getOne();

    // if (!result) {
    //   return null;
    // }
    // // Map the result to UserReadModel
    // return {
    //   uuid: result.uuid,
    //   email: result.email,
    //   username: result.username,
    //   // ...
    // };

    // Simplified example without a real ORM for the guide:
    console.log(
      'Simulating execution of matchingOne with Criteria:',
      criteria, // Pass the criteria object directly
    );
    return Promise.resolve(null); // Return null as a placeholder
  }

  // async count(criteria: RootCriteria<UserSchema, any>): Promise<number> {
  //   // Conceptual example with TypeORM:
  //   // const alias = criteria.alias;
  //   // const queryBuilder = this.dataSource
  //   //   .getRepository(UserEntity)
  //   //   .createQueryBuilder(alias);
  //   //
  //   // // For count, you usually don't need complex joins or specific selects,
  //   // // unless the criteria filters require them.
  //   // // You might have a simplified version of translate for count,
  //   // // or the translator could be smart enough.
  //   // this.translator.translate(criteria, queryBuilder); // Apply necessary filters and joins
  //   //
  //   // return await queryBuilder.getCount();
  //
  //   console.log("Simulating execution of count with Criteria:", criteria);
  //   return Promise.resolve(0);
  // }
}
```

**Note:** This is a conceptual example. The actual implementation will depend on your specific ORM and translator. The key point is that the `Criteria` is passed to the translator, and the translator modifies a native query builder (`queryBuilder`) or generates the query in some other way.

### 4.3. Repository Usage

From your service or application layer, you would instantiate the repository with its dependencies and then call its methods, passing them the constructed `Criteria`.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
  type RootCriteria,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './domain/criteria/schemas'; // Adjust path to your project
import type { IUserRepository } from './user.repository.interface'; // Adjust path
import type { UserReadModel } from './domain/user.read-model'; // Adjust path

async function demonstrateRepositoryUsage() {
  // 1. Criteria Construction (similar to #CODIGOAQUI_EJEMPLO_1_EN)
  // In a real application, this Criteria might be built by a service
  // or a dedicated class for constructing specific queries.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
    PostSchema,
    'posts',
  )
    .where({
      field: 'title',
      operator: FilterOperator.CONTAINS,
      value: 'TypeScript',
    })
    .andWhere({
      field: 'created_at',
      operator: FilterOperator.GREATER_THAN_OR_EQUALS,
      value: sixMonthsAgo,
    })
    .orderBy('created_at', OrderDirection.DESC);

  const userSearchCriteria: RootCriteria<typeof UserSchema, 'users'> =
    CriteriaFactory.GetCriteria(UserSchema, 'users')
      .where({
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: '@example.com',
      })
      .andWhere({
        field: 'username',
        operator: FilterOperator.STARTS_WITH,
        value: 'user_',
      })
      .join(postJoinCriteria, { parent_field: 'uuid', join_field: 'user_uuid' })
      .orderBy('username', OrderDirection.ASC)
      .setTake(10)
      .setSkip(10);

  // 2. Repository Instantiation and Usage (Conceptual)
  // In a real application, `userRepository` would be an injected instance
  // of a class implementing `IUserRepository` (e.g., TypeOrmUserRepository).
  // Such a class would receive a `DataSource` and a `CriteriaTranslator` in its constructor.

  // const userRepository: IUserRepository = new ConcreteUserRepository(dataSource, translator);
  // const users: UserReadModel[] = await userRepository.matchingMany(userSearchCriteria);
  // console.log(`Users found (simulated):`, users.length);

  // For the purpose of this guide, we illustrate the concept:
  console.log(
    'The `userSearchCriteria` object (just constructed) would be passed to the `matchingMany` method of an `IUserRepository` instance.',
  );
  console.log(
    'The concrete repository implementation (e.g., TypeOrmUserRepository) would use a `CriteriaTranslator` to convert the `Criteria` into a native query and execute it against the database.',
  );
  console.log(
    'Finally, the repository method would return the results (e.g., UserReadModel[]).',
  );
}

demonstrateRepositoryUsage();
```

In this flow:

1.  The `Criteria` defining the desired query is constructed.
2.  The repository (e.g., `TypeOrmUserRepository`) is instantiated with its dependencies (e.g., a TypeORM `DataSource` and a `TypeOrmMysqlTranslator` instance).
3.  The appropriate repository method (`matchingMany` or `matchingOne`) is called, passing it the `Criteria`.
4.  The repository internally uses the `CriteriaTranslator` to execute the query against the database.
5.  The repository returns the data in the expected format (e.g., `UserReadModel[]`).

This keeps the query construction logic separate from the data access logic.

## 5. Translation (Brief Mention)

As detailed in the Developing Custom Translators guide, the step of converting the `Criteria` object into a native query is handled by a concrete implementation of `CriteriaTranslator`.

For example, a `TypeOrmMysqlTranslator` would take the `userSearchCriteria` and a TypeORM `SelectQueryBuilder` (which the repository would have available), and would modify the `queryBuilder` by adding the corresponding `WHERE`, `JOIN`, `ORDER BY`, `LIMIT`, `OFFSET` clauses.

The beauty of this pattern is that the `Criteria` definition doesn't need to know _how_ the query will be translated, only that it can be translated.

## 6. Conclusion

This example demonstrates how `@nulledexp/translatable-criteria` allows you to build complex query specifications in a structured, typed, and data-source-agnostic manner. By integrating this library with the Repository pattern, you can achieve a cleaner, more maintainable, and testable data access architecture.

---

## Next Steps

With an understanding of the concepts, criteria construction, and translator development, you now have the tools to start using `@nulledexp/translatable-criteria` in your own projects.

For a detailed reference of all classes and types, consult the [API Reference.](../api-reference/en.md)
