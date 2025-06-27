# Practical Guide: Developing Custom Translators

The `translatable-criteria` library, on its own, is a powerful tool for defining queries, but its true potential is unlocked through a custom **Translator**. The core idea is to provide a robust, type-safe API for building query structures, which can then be translated into the native language of any data source.

This guide aims to provide the necessary information to build these solutions, explaining the tools the library offers to traverse its internal structure in an orderly manner. We will explore the concepts without imposing a specific pattern or paradigm; that decision rests with each developer.

The solutions developed can be private or shared with the community. The library's author has also developed [`TypeOrmMysqlCriteriaTranslator`](https://github.com/Techscq/typeorm-mysql-criteria-translator), an external, open-source translator for TypeORM with MySQL that serves as an excellent real-world case study. We encourage the creation of solutions for other data sources like PostgreSQL, Redis, or even other ORMs. If you decide to use a translator from the community, remember to verify its reliability and implementation, as solutions may have technical limitations in different contexts.

## Core Concepts

### The Visitor Pattern

The entire system is built around the **Visitor** design pattern. This is crucial to understand. The [`Criteria`](../../api-reference/en.md#criteria-abstract-base-class) object (and all its components like filters and joins) acts as the "visitable" structure. It doesn't know how to translate itself. Instead, it has an `accept` method.

When you call `criteria.accept(visitor, ...)`:

1. The `criteria` object receives the `visitor` (your translator).
2. It then calls the appropriate method on the visitor, passing itself as an argument (e.g., `visitor.visitRoot(this, ...)`).

This "double dispatch" mechanism allows your translator to react to each part of the `Criteria` tree without needing to know its internal structure, promoting a clean separation of concerns.

### The `CriteriaTranslator` Abstract Class

To simplify development, we provide an abstract class that you must extend. It already implements the [`ICriteriaVisitor`](../../api-reference/en.md#icriteriavisitor) interface and defines the methods you need to implement.

```typescript
export abstract class CriteriaTranslator<
  TranslationContext,
  TranslationOutput = TranslationContext,
  TFilterVisitorOutput = any,
> implements ICriteriaVisitor<TranslationContext, TFilterVisitorOutput>
{
  public abstract translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: TranslationContext,
  ): TranslationOutput;

  // ... (abstract visit methods)
}
```

- **`TranslationContext`**: This is the most important generic type. It represents a **mutable state object** that is passed through the entire traversal. Think of it as your "canvas" or "query builder" where you will accumulate the parts of the final query (e.g., SELECT clauses, WHERE conditions, parameters). It is the only state your translator should modify.
- **`TranslationOutput`**: The final result type of the `translate()` method. Often, this is the `TranslationContext` itself or a processed version of it (e.g., a final SQL string).
- **`TFilterVisitorOutput`**: The specific type returned only by the `visitFilter` method. This is useful for returning an intermediate representation of a single condition that can then be combined by the `visitAndGroup` or `visitOrGroup` methods, **as filter groups typically consume these outputs to build their combined condition directly into the `TranslationContext`**.

For the conceptual examples in this guide, we will use the following types for `TranslationContext` and `TFilterVisitorOutput`, which align with the `PseudoSqlTranslator` example:

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
```

Here is the basic structure of your custom translator class, showing only the public method signatures you'll need to implement:

```typescript
export class MyCustomTranslator extends CriteriaTranslator<
  PseudoSqlParts,
  { query: string; params: any[] },
  PseudoSqlFilterOutput
> {
  public override translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: PseudoSqlParts,
  ): { query: string; params: any[] } {
    // ...
  }

  public override visitRoot<RootCSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCSchema>,
    context: PseudoSqlParts,
  ): void {
    // ...
  }

  // ... (other visit methods)
}
```

## Internal Translator Design

As a translator grows to support more operators and complex logic, the main `CriteriaTranslator` class can become very large and difficult to maintain (a "God Class"). An effective design strategy is to delegate the construction logic for each part of the query to smaller, focused helper classes.

Consider creating "Builders" or "Helpers" for:

- **`FilterBuilder`**: Handles the logic for `visitFilter`, `visitAndGroup`, and `visitOrGroup`.
- **`JoinBuilder`**: Handles the logic for `visitInnerJoin`, `visitLeftJoin`, and `visitOuterJoin`.
- **`OrderBuilder`**: Consolidates and builds the `ORDER BY` clause.
- **`PaginationBuilder`**: Builds the logic for `LIMIT`/`OFFSET` and cursor-based pagination.

This approach not only makes the code cleaner and easier to test but also allows for more effective reuse of the construction logic. The example [`PseudoSqlTranslator`](./example/pseudo-sql.translator.ts) in the library follows this pattern.

**Concrete Examples of Modularity (Based on `TypeOrmMysqlTranslator`)**

The `TypeOrmMysqlTranslator` is an excellent example of how to apply this modular design. It uses several helper classes, each with a clear responsibility, that interact through a centralized `QueryState`:

- **`TypeOrmParameterManager`**: Encapsulates the logic for managing and generating unique query parameters, crucial for security and correct query execution.
- **`TypeOrmFilterFragmentBuilder`**: Implements the Strategy pattern to handle the translation of each `FilterOperator` into a specific SQL fragment, delegating to individual `IFilterOperatorHandler`s.
- **`TypeOrmConditionBuilder`**: Is responsible for building and grouping `WHERE` and `ON` conditions (including the use of parentheses for logical precedence) and for applying complex cursor pagination logic.
- **`TypeOrmJoinApplier`**: Manages the construction and application of `JOIN` clauses, including their `ON` conditions and the collection of selections and orders from joined entities.
- **`QueryApplier`**: Is the final component that takes all the information collected in the `QueryState` and applies it to TypeORM's `SelectQueryBuilder` to construct the final query.
- **`QueryState`**: Acts as the central `TranslationContext`, a mutable object that accumulates all necessary information (selections, orders, cursors, WHERE clause state) as the translator traverses the `Criteria` tree.

This level of modularity allows each part of the translator to be developed, tested, and maintained independently.

## The Translator's Toolkit

When implementing the `visit...` methods, you will receive various objects that serve as your toolkit, providing all the necessary information for the translation. These include `criteria` objects (or their parts), `parameters` for joins, and filter details.

**Important Note on Validation:** The `translatable-criteria` library performs internal validations before your translator receives the data (e.g., `assetFieldOnSchema`). This gives you confidence that the data you receive in the `visit...` methods is structurally valid, allowing you to focus on the translation logic.

### `Criteria` Properties

Properties available on the `RootCriteria` and `JoinCriteria` objects:

- **`get schemaMetadata()`**:

  - **Explanation**: Provides access to the `metadata` object defined in the root of the [`CriteriaSchema`](../../api-reference/en.md#criteriaschema). This is a "free-form" space for you to attach translator-specific information to an entity's schema, such as custom table quoting, ORM hints, or any other relevant data your translator might need. The library itself does not use this information.

- **`get select()` and `get selectAll()`**:

  - **Explanation**: `select` returns an array of the field names to be selected. If `setSelect()` was not called, `selectAll` will be `true`, and `select` will return all fields defined in the schema. If `setSelect()` was used, `selectAll` is `false`, and `select` returns only the specified fields (plus the `identifier_field`, which is always included).

- **`get cursor()`**:

  - **Explanation**: If cursor-based pagination is used, this property returns the [`Cursor`](../../api-reference/en.md#cursor) object. This object encapsulates the state needed to fetch the next or previous page, including the field(s), their value(s) from the last record of the previous page, the comparison operator (`GREATER_THAN` or `LESS_THAN`), and a `sequenceId` to maintain stable ordering when combining cursor logic from multiple `Criteria` instances.

- **`get joins()`**:

  - **Explanation**: Returns a `ReadonlyArray` of `StoredJoinDetails` objects. This is the entry point for translating all configured joins. For each `StoredJoinDetails`, you will find the `criteria` of the join to be "visited" and the `parameters` that describe the relationship.

- **`get rootFilterGroup()`**:

  - **Explanation**: This is the root node of the filter tree. It's a `FilterGroup` that contains all the top-level filters and filter groups added via `.where()`, `.andWhere()`, `.orWhere()`, etc. Your translation should start by visiting this group.

- **`get alias()` and `get sourceName()`**:

  - **Explanation**: `sourceName` is the name of the entity's source (e.g., the table name 'users_table'). `alias` is the short alias used to refer to this entity in the query (e.g., 'u'). Both are taken directly from the `CriteriaSchema`.

- **`get take()` and `get skip()`**:

  - **Explanation**: These properties provide the values for offset-based pagination, corresponding to `LIMIT` and `OFFSET` in SQL.

- **`get orders()`**:
  - **Explanation**: Returns a `readonly` array of [`Order`](../../api-reference/en.md#order) objects. Each object contains the `field` to sort by, the `direction` (`ASC` or `DESC`), and a `sequenceId` to ensure stable sorting when combining orders from different `Criteria` instances (e.g., from root and joins) **or to maintain deterministic pagination in cursor-based scenarios where field values might not be unique**. Each `Order` object now also contains a `nullsFirst` boolean property, which your translator should use to append `NULLS FIRST` or `NULLS LAST` to the ordering clause.

### `Filter` and `FilterGroup` Properties

Properties available when visiting filters:

- **`filter.field`, `filter.operator`, `filter.value`**:

  - **Explanation**: These three properties define a single condition. `field` is the name of the column, `operator` is the comparison to perform, and `value` is the data to compare against. The type of `value` is strongly-typed based on the `operator`. For a comprehensive reference of all operators and their expected `value` types, refer to the [Filter Operator Reference](../filter-operators/en.md). For example:
    - For `EQUALS`, `value` can be a string, number, boolean, Date, or null.
    - For `IN`, `value` is an array of primitives.
    - For `BETWEEN`, `value` is a tuple `[min, max]`.
    - For JSON operators like `JSON_CONTAINS`, `value` is an object where keys are JSON paths and values are the JSON data to find.

- **`filterGroup.items`, `filterGroup.logicalOperator`**:
  - **Explanation**: `items` is an array that can contain other `Filter` objects or nested `FilterGroup` objects. `logicalOperator` specifies how to combine these items (`AND` or `OR`).

### Join Parameters (SimpleJoin and PivotJoin)

Properties available when visiting a join:

- **`parent_alias`, `relation_alias`**:

  - **Explanation**: The aliases for the parent and joined entities, essential for qualifying field names in the `ON` and `SELECT` clauses.

- **`local_field`, `relation_field`**:

  - **Explanation**: For a `SimpleJoin` (one-to-one, many-to-one), these are the names of the columns to be used in the `ON` condition (e.g., `ON parent.id = child.parent_id`). For a `PivotJoin`, these properties are objects containing the `pivot_field` (the field in the pivot table) and the `reference` field (the field in the source/target entity that the pivot field links to).

- **`parent_identifier`**:

  - **Explanation**: The name of the field that uniquely identifies the parent entity (e.g., its primary key). This is distinct from `local_field`, which is the field used in the join condition. `parent_identifier` is useful for complex join strategies or for constructing specific `ON` clauses.

- **`pivot_source_name`**:

  - **Explanation**: For a `PivotJoin` (many-to-many), this is the name of the intermediary pivot table.

- **`parent_schema_metadata`, `join_metadata`**:

  - **Explanation**: Similar to the schema-level metadata, these provide access to any custom metadata you defined. `parent_schema_metadata` comes from the parent entity's schema, while `join_metadata` is specific to the join definition itself, allowing for highly specific translator hints (e.g., database-specific join hints).

- **`with_select`**:
  - **Explanation**: A boolean property indicating whether the fields from the joined entity should be included in the final `SELECT` statement. If `false`, the translator should generate a join clause (e.g., `INNER JOIN`) but not a join-and-select clause (e.g., `INNER JOIN ... SELECT`).

## Implementing the `visit...` Methods

This is the core of your translator. Here’s a conceptual guide for each method, enriched with practical considerations.

### `visitRoot`

- **Purpose**: To initialize the query and orchestrate the translation of all its main parts.
- **Approach**:

  1. Use `criteria.sourceName` and `criteria.alias` to build the `FROM` clause.
  2. Iterate `criteria.select` to build the `SELECT` clause.
  3. Iterate `criteria.joins` and call `accept` on each join's `criteria` to trigger their translation.
  4. Call `accept` on `criteria.rootFilterGroup` to build the `WHERE` clause.
  5. **Final Orchestration**: After visiting all nodes, consolidate and apply the ordering and pagination logic.

- **Key Considerations**:
  - **Collection and Consolidation**: Ordering rules (`orders`) and cursor rules (`cursor`) can be defined on both the root `Criteria` and any `JoinCriteria`. Your translator must collect all these rules during the traversal (e.g., into an array within your `TranslationContext` or a class property) and then, at the end of `visitRoot`, process them in a consolidated manner (using `sequenceId` for deterministic order) to build the final `ORDER BY` and pagination clauses.

The signature for the `visitRoot` method is:

```typescript
public abstract visitRoot<RootCSchema extends CriteriaSchema>(
  criteria: RootCriteria<RootCSchema>,
  context: TranslationContext,
): void;
```

### visitInnerJoin, visitLeftJoin, visitOuterJoin

- **Purpose**: To build the specific `JOIN` clause and its `ON` condition.
- **Approach**: It's highly recommended to delegate to a common private helper or a `JoinBuilder`.

  1. Use `parameters.relation_alias` and the join's `criteria.sourceName` to build the `JOIN ... ON ...` statement.
  2. For `SimpleJoin`, the `ON` condition uses `parameters.local_field` and `parameters.relation_field`.
  3. For `PivotJoin`, this will likely involve two `JOIN` statements.
  4. Process the join's `select` and collect its `orders`.
  5. Recursively visit any nested joins.

- **Key Considerations**:
  - **Filters on the Join**: If the `JoinCriteria` has its own `rootFilterGroup`, you must visit it and append the resulting conditions to the join's `ON` clause, typically with an `AND`. This enables filters like `LEFT JOIN posts p ON u.id = p.userId AND p.published = true`.
  - **Recursion**: The design allows for chained joins (`criteria.join(...).join(...)`). Your logic must handle this by calling `accept` on the `subJoinDetail.criteria` found within the current join's `criteria`.
  - **Selection Control**: Check the `parameters.with_select` boolean. If it's `true`, add the joined entity's fields to the main `SELECT` clause. If it's `false`, only perform the join for filtering and do not add its fields to the selection.

The signatures for the `visitInnerJoin`, `visitLeftJoin`, and `visitOuterJoin` methods are:

```typescript
    public abstract visitInnerJoin<
      ParentCSchema extends CriteriaSchema,
      JoinCSchema extends CriteriaSchema,
    >(
      criteria: InnerJoinCriteria<JoinCSchema>,
      parameters:
        | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
        | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
      context: TranslationContext,
    ): void;

    public abstract visitLeftJoin<
      ParentCSchema extends CriteriaSchema,
      JoinCSchema extends CriteriaSchema,
    >(
      criteria: LeftJoinCriteria<JoinCSchema>,
      parameters:
        | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
        | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
      context: TranslationContext,
    ): void;

    public abstract visitOuterJoin<
      ParentCSchema extends CriteriaSchema,
      JoinCSchema extends CriteriaSchema,
    >(
      criteria: OuterJoinCriteria<JoinCSchema>,
      parameters:
        | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
        | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
      context: TranslationContext,
    ): void;

```

### `visitFilter`

- **Purpose**: To translate a single filter primitive into a condition string and its parameters.
- **Approach**:
  1. A simple implementation can use a `switch` statement based on `filter.operator`. For more complex translators, organizing this logic into a handler map (a form of the Strategy pattern) where each operator has its own builder function can greatly improve maintainability.
  2. **Crucially, use parameterization**. Never inject `filter.value` directly into the query string.
  3. Handle the specific type and structure of `filter.value` based on `filter.operator`.
  4. Return an intermediate object like `{ condition: 'u.age > ?', params: [30] }`.

The signature for the `visitFilter` method is:

```typescript
public abstract visitFilter<FieldType extends string>(
  filter: Filter<FieldType, FilterOperator>,
  currentAlias: string,
  context: TranslationContext,
): TFilterVisitorOutput;
```

### `visitAndGroup`, `visitOrGroup`

- **Purpose**: To combine multiple filter conditions.
- **Approach**:

  1. Iterate through `group.items`.
  2. For each `item`, call `item.accept(this, ...)` to recursively get its translation.
  3. Join the collected condition strings with the `group.logicalOperator` (`AND` or `OR`).
  4. Add the final grouped condition to your main `WHERE` clause.

- **Key Considerations**:
  - **Logical Precedence**: It is **absolutely crucial** to wrap the combined string of each group in parentheses `()` to ensure correct logical precedence, especially when nesting `AND` and `OR` groups. A mistake here can lead to completely incorrect query results.

The signatures for the `visitAndGroup` and `visitOrGroup` methods are:

```typescript
public abstract visitAndGroup<FieldType extends string>(
  group: FilterGroup<FieldType>,
  currentAlias: string,
  context: TranslationContext,
): void;

public abstract visitOrGroup<FieldType extends string>(
  group: FilterGroup<FieldType>,
  currentAlias: string,
  context: TranslationContext,
): void;
```

## Detailed Translator Execution Flow

Understanding the execution flow is fundamental to implementing and debugging a translator. The Visitor pattern orchestrates a traversal of the `Criteria` tree, delegating the translation logic to your translator's `visit...` methods.

Here's a breakdown of the journey from a `translate()` call:

1.  **Translation Start (`translate()`):**

- The `translate()` method is the public entry point.
- It **resets the internal state** of the translator (or your `TranslationContext`/`QueryState`). This is crucial to ensure each translation is independent.
- It **creates an instance of `TranslationContext`** (or your custom `QueryState`), which will be the mutable canvas where the query is built.
- It **initiates the `Criteria` tree traversal** by calling `criteria.accept(this, initialContext)`. Here, `this` is your translator instance (the `visitor`), and `initialContext` is the mutable state that will be passed throughout the entire journey.

2.  **Visiting the Root (`visitRoot()`):**

- The first `accept()` call on the [`RootCriteria`](../../api-reference/en.md#rootcriteria) will result in the invocation of `visitRoot()` on your translator.
- In `visitRoot()`, your translator:
- Extracts high-level information from the `RootCriteria` (e.g., `sourceName`, `alias`, `select`, `take`, `skip`, `orders`, `cursor`).
- **Starts building the main parts of the query** (e.g., the `FROM` clause).
- **Delegates the translation of the main filters**: It calls `criteria.rootFilterGroup.accept(this, context)` to start translating the `WHERE` clause.
- **Delegates the translation of joins**: It iterates over `criteria.joins` and, for each `StoredJoinDetails`, calls `joinDetail.criteria.accept(this, joinDetail.parameters, context)`. This will trigger calls to `visitInnerJoin`, `visitLeftJoin`, or `visitOuterJoin`.

3.  **Visiting Filter Groups (`visitAndGroup()`, `visitOrGroup()`):**

- When a [`FilterGroup`](../../api-reference/en.md#filtergroup) is visited (either the `rootFilterGroup` or a nested one), `visitAndGroup()` or `visitOrGroup()` is invoked.
- These methods iterate over `group.items` (which can be individual `Filter`s or nested `FilterGroup`s).
- For each `item`, they recursively call `item.accept(this, context)`.
- They **consolidate the results** of their items with the logical operator (`AND` or `OR`) and, **crucially, wrap them in parentheses** to maintain logical precedence.

4.  **Visiting Individual Filters (`visitFilter()`):**

- When an individual [`Filter`](../../api-reference/en.md#filter) is visited, `visitFilter()` is invoked.
- This method is responsible for translating a single `filter.field`, `filter.operator`, and `filter.value` into an SQL condition fragment.
- It **uses parameterization** for the `filter.value` to prevent SQL injection.
- It returns an intermediate result (`TFilterVisitorOutput`) to be used by its parent filter group.

5.  **Visiting Joins (`visitInnerJoin()`, `visitLeftJoin()`, `visitOuterJoin()`):**

- When a [`JoinCriteria`](../../api-reference/en.md#anyjoincriteria) is visited, the corresponding `visit...Join()` method is invoked.
- These methods:
- Build the `JOIN` clause and its `ON` condition.
- May delegate the translation of join-specific filters (if the `JoinCriteria` has its own `rootFilterGroup`) by calling `joinCriteria.rootFilterGroup.accept(this, context)`.
- **Handle the recursion of nested joins** by calling `accept()` on any `JoinCriteria` found within the current join.
- Collect selections and orders from the joined entities.

6.  **Finalizing the Query Assembly (`translate()` - Final Phase):**

- Once the `Criteria` tree traversal is complete (i.e., all `accept()` calls have returned), control returns to the `translate()` method.
- In this final phase, the translator takes all the information collected in the `TranslationContext` (e.g., selections, WHERE conditions, JOIN clauses, orders, pagination logic) and **assembles it into the final query**.
- Finally, it returns the generated query and its parameters.

This iterative and delegative flow, facilitated by the Visitor pattern and the modularity of "Builders," allows for the structured and maintainable construction of complex queries.

The general structure of the `translate` method is:

```typescript
public override translate<RootCriteriaSchema extends CriteriaSchema>(
  criteria: RootCriteria<RootCriteriaSchema>,
  source: PseudoSqlParts,
): { query: string; params: any[] } {
  // 1. Reset internal state

  // 2. Initialize the TranslationContext
  const queryBuilder: PseudoSqlParts = { ...source };

  // 3. Start the traversal
  criteria.accept(this, queryBuilder);

  // 4. Assemble the final query
  const finalQuery = '...'; // build from queryBuilder parts

  // 5. Return the result
  return {
    query: finalQuery,
    params: queryBuilder.params,
  };
}
```

## Helper: `escapeField`

Many translators will need a utility function to properly escape field names to prevent SQL injection or to conform to the target query language's syntax. This helper is used in the conceptual examples below.

For example, within a `visitFilter` method, you might use it like this: `const escapedField = escapeField(filter.field, currentAlias);`

```typescript
function escapeField(field: string, alias?: string): string {
  // Example for SQL: `alias`.`field`
  // Actual implementation might vary based on target language.
  // For PseudoSqlTranslator, it uses backticks:
  // const escape = (str: string) => `\`${str.replace(/`/g, '``')}\``;
  // return alias ? `${escape(alias)}.${escape(field)}` : escape(field);
  return alias ? `${alias}.${field}` : field; // Simplified for conceptual guide
}
```

## Additional Considerations

### Handling Unsupported Operators

Not all data sources support every `FilterOperator`. Your translator must decide how to handle an operator for which it has no implementation:

- **Throw an error**: This is the safest option. It fails fast and informs the developer that the operation is not supported.
- **Ignore the filter**: Less safe, as it can lead to unexpected results, but might be an option in certain cases.
- **Log a warning**: Informs the developer without stopping execution.

### Debugging Tips

When developing your translator, it is invaluable to inspect the `TranslationContext` at different stages of the Visitor's traversal. Logging the generated query (SQL, etc.) and its parameters to the console (`console.log`) is also a common practice to verify the output and diagnose issues.

### Testing and Reliability

Since a translator is the bridge between the abstract `Criteria` logic and a real data system, its reliability is critical. It is **highly recommended** to write a comprehensive suite of unit and integration tests for your translator. Use `CriteriaFactory` to build diverse scenarios (complex filters, nested joins, cursor pagination, etc.) and verify that the generated output is correct and secure.

## Case Studies

For a complete, real-world implementation, the [`TypeOrmMysqlCriteriaTranslator`](https://github.com/Techscq/typeorm-mysql-criteria-translator) project (developed by the same author but external to this library) serves as an excellent open-source case study. It demonstrates how to handle the specifics of a popular ORM and SQL dialect. The [`PseudoSqlTranslator`](./example/pseudo-sql.translator.ts) included in this library's examples is also a valuable, simplified reference.

Here's an example of how to use a translator:

[`CriteriaFactory`](../../api-reference/en.md#criteriafactory)

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';
import { MyCustomTranslator } from './path/to/your/translator';

const criteria = CriteriaFactory.GetCriteria(UserSchema)
  .where(/*...*/)
  .orderBy(/*...*/);

const translator = new MyCustomTranslator();
const initialContext = {
  /* ... */
};

const { query, params } = translator.translate(criteria, initialContext);

console.log(query, params);
```
