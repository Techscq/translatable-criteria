# Practical Guide: Developing Custom Translators

One of the most powerful features of `@nulledexp/translatable-criteria` is its ability to be extended to different data sources through **Custom Translators**. If you need to interact with a database, search engine, or API for which a predefined translator does not exist, you can create your own.

This guide will show you the key steps and concepts for developing your own `CriteriaTranslator`.

## Index

- 1.  [Understanding `CriteriaTranslator` and `ICriteriaVisitor`](#1-understanding-criteriatranslator-and-icriteriavisitor)
- 2.  [Creating Your Translator Class](#2-creating-your-translator-class)
- 3.  [Implementing `visit...` Methods](#3-implementing-visit-methods)
  - 3.1. [`visitRoot`](#31-visitroot)
  - 3.2. [`visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin`](#32-visitinnerjoin-visitleftjoin-visitouterjoin)
  - 3.3. [`visitFilter`](#33-visitfilter)
  - 3.4. [`visitAndGroup`, `visitOrGroup`](#34-visitandgroup-visitorgroup)
- 4.  [Handling Ordering, Pagination, and Selection](#4-handling-ordering-pagination-and-selection)
- 5.  [State and Parameter Management](#5-state-and-parameter-management)
- 6.  [Complete Example: Pseudo-SQL Translator](#6-complete-example-pseudo-sql-translator)
  - 6.1. [Translator Implementation](#61-translator-implementation)
  - 6.2. [Translator Usage](#62-translator-usage)
- 7.  [Additional Considerations](#7-additional-considerations)
- [Next Steps](#next-steps)

---

## 1. Understanding `CriteriaTranslator` and `ICriteriaVisitor`

The library uses the Visitor design pattern.

- **`CriteriaTranslator<TranslationContext, TranslationOutput, TFilterVisitorOutput>`**: This is an abstract class that you must extend.

  - `TranslationContext`: The type of the mutable context object passed during the traversal of the `Criteria` object graph (e.g., a query builder instance, or an object where you accumulate parts of a query). This object is modified directly by the `visit...` methods.
  - `TranslationOutput` (optional, defaults to `TranslationContext`): The type of the final result returned by the `translate()` method. This is typically the `TranslationContext` itself, but can be a different type if your translator needs to return a processed version of the context (e.g., a final SQL string from a query builder).
  - `TFilterVisitorOutput` (optional, defaults to `any`): The specific output type for the `visitFilter` method. This allows filters to return an intermediate representation (e.g., a condition string and its parameters) that can then be integrated into the main `TranslationContext`. The `visitAndGroup` and `visitOrGroup` methods, however, return `void` and directly modify the `TranslationContext`.

- **`ICriteriaVisitor`**: The interface that `CriteriaTranslator` implements. It defines all the `visit...` methods that your translator will need to override to handle each type of node in the `Criteria` tree (filters, filter groups, joins, etc.).

The translation process is initiated by calling the `translate()` method, which is an **abstract method that you must implement**. Inside your `translate` implementation, you are responsible for starting the visitor traversal by calling `criteria.accept(this, initialContext)`. The `accept` method of each `Criteria` component will then call the appropriate `visit...` method on your translator, passing the component itself and the `TranslationContext`. For instance, a `RootCriteria`'s `accept` method will call `visitor.visitRoot(...)`, while a `Filter`'s `accept` method will call `visitor.visitFilter(...)`. This "double dispatch" mechanism is the core of the Visitor pattern.

---

## 2. Creating Your Translator Class

The first step is to create a new class that extends `CriteriaTranslator`. You will need to define the generic types according to what your translator will produce and require.

For the conceptual examples in this guide, we will use the following types for `TranslationContext` and `TFilterVisitorOutput`, which align with the [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts) example:

Here is the basic structure of your custom translator class, showing only the public method signatures you'll need to implement:

```typescript
type PseudoSqlParts = {
  select: string[];
  from: string;
  joins: string[];
  where: string[];
  orderBy: string[];
  limit?: number;
  offset?: number;
  params: any[];
};

type PseudoSqlFilterOutput = {
  condition: string;
  params: any[];
};

export class MyCustomTranslator extends CriteriaTranslator<
  PseudoSqlParts,
  { query: string; params: any[] },
  PseudoSqlFilterOutput
> {
  public override translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: PseudoSqlParts,
  ): { query: string; params: any[] } {
    return { query: '', params: [] };
  }

  public override visitRoot<RootCSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCSchema>,
    context: PseudoSqlParts,
  ): void {}

  public override visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: InnerJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {}

  public override visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: LeftJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {}

  public override visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {}

  public override visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): PseudoSqlFilterOutput {
    return { condition: '', params: [] };
  }

  public override visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {}

  public override visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {}
}
```

In this example:

- `PseudoSqlParts`: Is our `TranslationContext`, representing the accumulating parts of the SQL query.
- `{ query: string; params: any[] }`: Is our `TranslationOutput`, the final result returned by the `translate()` method.
- `PseudoSqlFilterOutput`: Is our `TFilterVisitorOutput`, the result of visiting individual filters.

---

## Helper: `escapeField`

Many translators will need a utility function to properly escape field names to prevent SQL injection or to conform to the target query language's syntax. This helper is used in the conceptual examples below.

```typescript
function escapeField(field: string, alias?: string): string {
  const escape = (str: string) => `\`${str.replace(/`/g, '``')}\``;
  return alias ? `${escape(alias)}.${escape(field)}` : escape(field);
}
```

This function takes a field name and an optional alias, and returns a string with the field properly escaped and prefixed (e.g., `` `alias`.`field` ``).

---

## 3. Implementing `visit...` Methods

Now, you must implement the abstract `visit...` methods from `CriteriaTranslator`.

### 3.1. `visitRoot`

This is the main entry point for translating a `RootCriteria`. This is where you will typically initialize your query, process the main filters, joins, ordering, and pagination of the `RootCriteria`.

```typescript
public override visitRoot<RootCSchema extends CriteriaSchema>(
  criteria: RootCriteria<RootCSchema>,
  context: PseudoSqlParts,
): void {}
```

**Explanation:**

This method is the starting point of the translation process. It receives the `RootCriteria` object and the `TranslationContext` (our `sqlParts` object). Its primary responsibilities are:

- **Initializing the `FROM` clause:** It uses `criteria.sourceName` and `criteria.alias` to set up the main table for the query.
- **Processing field selection:** It maps `criteria.select` to the `SELECT` clause, ensuring fields are properly qualified with the entity's alias.
- **Handling joins:** It iterates through `criteria.joins` and recursively calls `accept` on each `JoinCriteria` to process nested joins.
- **Processing root filters:** If `criteria.rootFilterGroup` contains filters, it calls `accept` on this group to translate them into `WHERE` conditions.
- **Applying pagination:** It checks `criteria.take` and `criteria.skip` for offset-based pagination, and `criteria.cursor` for cursor-based pagination, adding the corresponding `LIMIT`, `OFFSET`, or complex `WHERE` clauses.
- **Collecting ordering rules:** It gathers `Order` objects from `criteria.orders` to be applied later.

**Available `Criteria` properties:** `criteria.sourceName`, `criteria.alias`, `criteria.select`, `criteria.orders`, `criteria.joins`, `criteria.rootFilterGroup`, `criteria.cursor`, `criteria.take`, `criteria.skip`.

For a complete implementation, refer to the `visitRoot` method in `src/criteria/translator/example/pseudo-sql.translator.ts`.

### 3.2. `visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin`

These methods handle the different types of joins. They receive the `JoinCriteria` instance, the join `parameters` (which include information about the parent and child of the join), and the `context`.

To avoid code repetition, a common practice is to create a private helper method (like `applyJoin` below) that handles the shared logic for all join types.

```typescript
private applyJoin<
  ParentCSchema extends CriteriaSchema,
  JoinCSchema extends CriteriaSchema,
>(
  joinType: 'INNER' | 'LEFT' | 'FULL OUTER',
  criteria:
    | InnerJoinCriteria<JoinCSchema>
    | LeftJoinCriteria<JoinCSchema>
    | OuterJoinCriteria<JoinCSchema>,
  parameters:
    | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
    | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
  sqlParts: PseudoSqlParts,
): void {}
```

```typescript
public override visitInnerJoin<
  ParentCSchema extends CriteriaSchema,
  JoinCSchema extends CriteriaSchema,
>(
  criteria: InnerJoinCriteria<JoinCSchema>,
  parameters:
    | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
    | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
  context: PseudoSqlParts,
): void {}
```

```typescript
public override visitLeftJoin<
  ParentCSchema extends CriteriaSchema,
  JoinCSchema extends CriteriaSchema,
>(
  criteria: LeftJoinCriteria<JoinCSchema>,
  parameters:
    | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
    | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
  context: PseudoSqlParts,
): void {}
```

```typescript
public override visitOuterJoin<
  ParentCSchema extends CriteriaSchema,
  JoinCSchema extends CriteriaSchema,
>(
  criteria: OuterJoinCriteria<JoinCSchema>,
  parameters:
    | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
    | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
  context: PseudoSqlParts,
): void {}
```

**Explanation (for `applyJoin` and the `visit...Join` methods):**

These methods are responsible for translating join conditions into the target query language. Each `visit...Join` method simply calls the `applyJoin` helper, passing the specific `joinType` (e.g., 'INNER', 'LEFT', 'FULL OUTER').

The `applyJoin` helper's responsibilities include:

- **Constructing the `JOIN` clause:** It uses `criteria.sourceName` (the table being joined) and `parameters.join_alias` (its alias in the query) to build the `JOIN` part of the query.
- **Defining the `ON` condition:**
- For `SimpleJoin` (one-to-one, one-to-many, many-to-one relations), it constructs the `ON` condition using `parameters.parent_alias`.`parameters.parent_field` = `parameters.join_alias`.`parameters.join_field`.
- For `PivotJoin` (many-to-many relations), it typically involves two `JOIN` operations: one from the parent to the pivot table, and another from the pivot table to the target joined table. It constructs the `ON` conditions for both.
- **Applying filters on the join:** If `criteria.rootFilterGroup` (from the `JoinCriteria` being visited) has filters, it processes them by calling `criteria.rootFilterGroup.accept(this, parameters.join_alias, context)` and appends their conditions to the `ON` clause using `AND`.
- **Selecting fields from the joined entity:** It maps `criteria.select` (from the `JoinCriteria`) to the main `SELECT` clause, ensuring fields are prefixed with `parameters.join_alias`.
- **Collecting ordering rules:** It adds `criteria.orders` (from the `JoinCriteria`) to a global collection of orders (e.g., `this.collectedOrders` in [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts)) to be processed later in `visitRoot`.
- **Processing nested joins:** Crucially, if the `JoinCriteria` being visited itself has `criteria.joins` defined (i.e., joins chained off a join), it iterates over them and recursively calls `subJoinDetail.criteria.accept(this, subJoinDetail.parameters, context)` to process them.

**Available `Criteria` properties:** `criteria.sourceName`, `criteria.alias`, `criteria.select`, `criteria.orders`, `criteria.joins`, `criteria.rootFilterGroup`.
**Available `parameters` properties:** `parameters.parent_alias`, `parameters.join_alias`, `parameters.parent_field`, `parameters.join_field`, `parameters.pivot_source_name`, `parameters.parent_identifier`, `parameters.parent_schema_metadata`, `parameters.join_metadata`.

For a complete implementation, refer to the `visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin` methods and the `applyPseudoJoin` helper in `src/criteria/translator/example/pseudo-sql.translator.ts`.

### 3.3. `visitFilter`

This method translates an individual `Filter` into a condition for your query language.

```typescript
public override visitFilter<FieldType extends string>(
  filter: Filter<FieldType, FilterOperator>,
  currentAlias: string,
  context: PseudoSqlParts,
): PseudoSqlFilterOutput {
  return { condition: '', params: [] };
}
```

**Explanation:**

This method is responsible for converting a single `Filter` object into a query condition string and collecting any necessary parameters.

- **Generating the field name:** It constructs the fully qualified field name using `currentAlias` and `filter.field` (e.g., `` `alias`.`field` ``).
- **Parameterization:** It is **crucial** to use placeholders (e.g., `?`, `$1`, `:paramName`) for `filter.value` to prevent SQL injection. It adds `filter.value` to the `TranslationContext`'s parameter list.
- **Implementing operator logic:** It uses a `switch` statement or similar to handle each `FilterOperator`. The logic for each operator will vary based on the target query language and the expected type of `filter.value` (e.g., `BETWEEN` expects a tuple, `IN` expects an array, JSON operators expect objects).
- **Returning the condition:** It returns an object containing the generated condition string and the collected parameters.

**Available `Filter` properties:** `filter.field`, `filter.operator`, `filter.value`.
**Available context:** `currentAlias`.

For a complete implementation, refer to the `visitFilter` method in `src/criteria/translator/example/pseudo-sql.translator.ts`.

### 3.4. `visitAndGroup`, `visitOrGroup`

These methods handle groups of filters. They receive a `FilterGroup` and must iterate over its `items`, processing them recursively and joining them with the appropriate logical operator (`AND` or `OR`).

A common pattern is to use a private helper method (like `_buildConditionFromGroup` below) to handle the recursive logic for both `AND` and `OR` groups.

```typescript
private _buildConditionFromGroup(
  group: FilterGroup<any>,
  alias: string,
  context: PseudoSqlParts,
): PseudoSqlFilterOutput | undefined {
  return undefined;
}
```

```typescript
public override visitAndGroup<FieldType extends string>(
  group: FilterGroup<FieldType>,
  currentAlias: string,
  context: PseudoSqlParts,
): void {}
```

```typescript
public override visitOrGroup<FieldType extends string>(
  group: FilterGroup<FieldType>,
  currentAlias: string,
  context: PseudoSqlParts,
): void {}
```

**Explanation (for `_buildConditionFromGroup` and the `visit...Group` methods):**

These methods are responsible for translating `FilterGroup` objects into a combined query condition. The `visitAndGroup` and `visitOrGroup` methods typically call a helper like `_buildConditionFromGroup` and then add the resulting condition to the `TranslationContext`.

The `_buildConditionFromGroup` helper's responsibilities include:

- **Recursive traversal:** It iterates over `group.items`. For each `item` (which can be a `Filter` or another `FilterGroup`), it recursively calls `item.accept(this, currentAlias, context)`.
- **Collecting conditions and parameters:** It accumulates the condition strings and parameters returned by the recursive `accept` calls.
- **Combining conditions:** It joins the collected conditions using the `group.logicalOperator` (`AND` or `OR`).
- **Ensuring grouping:** It wraps the combined conditions in parentheses (e.g., `(condition1 AND condition2)`) to ensure correct logical precedence, especially when mixing `AND` and `OR` groups.
- **Returning the combined condition:** It returns an object containing the combined condition string and all collected parameters.

**Available `FilterGroup` properties:** `group.items`, `group.logicalOperator`.
**Available context:** `currentAlias`.

For a complete implementation, refer to the `visitAndGroup` and `visitOrGroup` methods and the `_buildConditionFromGroup` helper in `src/criteria/translator/example/pseudo-sql.translator.ts`.

---

## 4. Handling Ordering, Pagination, and Selection

These logics are generally applied in `visitRoot` after all main joins and filters have been processed.

- **Ordering (`orderBy`):** Your translator should collect all `Order` objects from the root and all joins. At the end, sort this global collection by `order.sequenceId` to ensure a deterministic sort order, and then apply them to the query.
- **Offset Pagination (`setTake`, `setSkip`):** If `criteria.take > 0` or `criteria.skip > 0`, apply the corresponding `LIMIT` and `OFFSET` to your query.
- **Cursor Pagination (`setCursor`):** This is more complex. The translator must construct a `WHERE` condition based on `cursor.filters` and `cursor.operator`. The fields from `cursor.filters` must also be the first fields in the `ORDER BY` clause, using the direction from `cursor.order`.
- **Field Selection (`setSelect`):** In `visitRoot` and `visit...Join`, construct the `SELECT` clause based on `criteria.select`. If `criteria.selectAll` is `true`, select all fields from the schema.

---

## 5. State and Parameter Management

Since the `translate` method is abstract, you are required to implement it. This implementation is where you manage the entire translation lifecycle, including state and parameter management. The recommended pattern is to encapsulate this logic within the translator class and reset it for each `translate()` call.

The following example shows the required implementation pattern for the `translate` method:

```typescript
class MyTranslatorWithState extends CriteriaTranslator<
  PseudoSqlParts,
  { query: string; params: any[] },
  PseudoSqlFilterOutput
> {
  private paramCounter: number = 0;
  private collectedOrders: Array<{ alias: string; order: Order<string> }> = [];

  public override translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: PseudoSqlParts,
  ): { query: string; params: any[] } {
    this.paramCounter = 0;
    this.collectedOrders = [];

    const queryBuilder = source;

    criteria.accept(this, queryBuilder);

    let sqlString = `SELECT ${queryBuilder.select.join(', ') || '*'}`;
    sqlString += ` FROM ${queryBuilder.from}`;
    if (queryBuilder.joins.length > 0) {
      sqlString += ` ${queryBuilder.joins.join(' ')}`;
    }
    if (queryBuilder.where.length > 0) {
      sqlString += ` WHERE ${queryBuilder.where.join(' AND ')}`;
    }
    if (queryBuilder.orderBy.length > 0) {
      sqlString += ` ORDER BY ${queryBuilder.orderBy.join(', ')}`;
    }
    if (queryBuilder.limit !== undefined) {
      sqlString += ` LIMIT ${queryBuilder.limit}`;
    }
    if (queryBuilder.offset !== undefined) {
      sqlString += ` OFFSET ${queryBuilder.offset}`;
    }

    return {
      query: sqlString,
      params: queryBuilder.params,
    };
  }

  public override visitRoot<RootCSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCSchema>,
    context: PseudoSqlParts,
  ): void {
    // Implementation would go here...
  }

  public override visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: InnerJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {
    // Implementation would go here...
  }

  public override visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: LeftJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {
    // Implementation would go here...
  }

  public override visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
  >(
    criteria: OuterJoinCriteria<JoinCSchema>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: PseudoSqlParts,
  ): void {
    // Implementation would go here...
  }

  public override visitFilter<FieldType extends string>(
    filter: Filter<FieldType, FilterOperator>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): PseudoSqlFilterOutput {
    // Implementation would go here...
    return { condition: '', params: [] };
  }

  public override visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {
    // Implementation would go here...
  }

  public override visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    context: PseudoSqlParts,
  ): void {
    // Implementation would go here...
  }
}
```

**Explanation:**

The `translate` method you implement is the public entry point. It is responsible for:

1.  **Resetting internal state:** Ensures that each translation starts with a clean slate (e.g., `paramCounter` and `collectedOrders` are reset).
2.  **Initializing the `TranslationContext`:** Creates the initial object (e.g., `queryBuilder`) that will be modified by the `visit...` methods.
3.  **Starting the traversal:** This is the crucial step where you call `criteria.accept(this, queryBuilder)` to begin the visitor pattern. All subsequent `visit...` methods will modify the `queryBuilder` object directly.
4.  **Assembling the final query:** After the traversal is complete, it constructs the final query string by combining the accumulated parts from `queryBuilder`.
5.  **Returning the result:** Returns the final query and its parameters.

---

## 6. Complete Example: Pseudo-SQL Translator

### 6.1. Translator Implementation

For a complete, functional example of a `CriteriaTranslator` implementation, please refer to the `src/criteria/translator/example/pseudo-sql.translator.ts` file in the repository. This file contains the full code for the [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts) class, which translates `Criteria` objects into a pseudo-SQL string.

### 6.2. Translator Usage

Here is how you would use the [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts):

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';
import {
  PseudoSqlTranslator,
  type PseudoSqlParts,
} from './path/to/your/pseudo-sql.translator';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema)
  .where({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  })
  .orderBy('username', OrderDirection.ASC)
  .setTake(10);

const pseudoTranslator = new PseudoSqlTranslator();

const initialParts: PseudoSqlParts = {
  select: [],
  from: '',
  joins: [],
  where: [],
  orderBy: [],
  params: [],
};

const { query: generatedSql, params: queryParams } = pseudoTranslator.translate(
  userCriteria,
  initialParts,
);

console.log('Generated SQL:', generatedSql);
console.log('Parameters:', queryParams);
```

---

## 7. Additional Considerations

- **Errors and Validation:** Decide how to handle operators or configurations not supported by your data source. You can throw errors or ignore them.
- **Optimization:** Consider optimizations specific to your data source.
- **Testing:** Write thorough unit and integration tests for your translator. Use `CriteriaFactory` to construct various `Criteria` scenarios and verify that your translator's output is as expected.

---

## Next Steps

With this guide, you have the foundation to start developing your own translators. For a detailed reference of all classes and types, consult the API Reference.
