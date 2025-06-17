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
  - 4.1. [Ordering (`orderBy`)](#41-ordering-orderby)
  - 4.2. [Offset Pagination (`setTake`, `setSkip`)](#42-offset-pagination-settake-setskip)
  - 4.3. [Cursor Pagination (`setCursor`)](#43-cursor-pagination-setcursor)
  - 4.4. [Field Selection (`setSelect`)](#44-field-selection-setselect)
- 5.  [State and Parameter Management](#5-state-and-parameter-management)
- 6.  [Simplified Example: Pseudo-SQL Translator](#6-simplified-example-pseudo-sql-translator)
- 7.  [Additional Considerations](#7-additional-considerations)
- [Next Steps](#next-steps)

---

## 1. Understanding `CriteriaTranslator` and `ICriteriaVisitor`

As mentioned in the Key Concepts, the library uses the Visitor design pattern.

- **`CriteriaTranslator<TranslationContext, TranslationOutput, TFilterVisitorOutput>`**: This is an abstract class that you must extend.

  - `TranslationContext`: The type of the context object passed during the traversal of the `Criteria` (e.g., a query builder like TypeORM's `SelectQueryBuilder`, or an object where you accumulate parts of a MongoDB query).
  - `TranslationOutput`: The type of the final translation result (e.g., the modified `SelectQueryBuilder`, an SQL string, a MongoDB query object).
  - `TFilterVisitorOutput`: The specific output type for the `visitFilter`, `visitAndGroup`, and `visitOrGroup` methods. This allows filters to be processed differently if necessary (e.g., generating a condition string, or a filter object).

- **`ICriteriaVisitor`**: The interface that `CriteriaTranslator` implements. It defines all the `visit...` methods that your translator will need to override to handle each type of node in the `Criteria` tree (filters, filter groups, joins, etc.).

The translation process generally begins by calling the `translate()` method of your translator, which internally calls `criteria.accept(this, initialContext)`.

---

## 2. Creating Your Translator Class

The first step is to create a new class that extends `CriteriaTranslator`. You will need to define the generic types according to what your translator will produce and require.

```typescript
import {
  CriteriaTranslator,
  RootCriteria,
  InnerJoinCriteria,
  // ... other necessary imports
  FilterOperator,
  type CriteriaSchema,
  type SelectedAliasOf,
  type PivotJoin,
  type SimpleJoin,
  type JoinRelationType,
  type Filter,
  type FilterGroup,
} from '@nulledexp/translatable-criteria';

// Define your types for the context and output
// For example, if translating to an SQL query builder:
// type MyQueryBuilder = SomeSQLQueryBuilder;
// type MyFilterConditionOutput = string; // or a condition object

// For this example, we'll use simple types
type MyQueryBuilder = {
  selectFields: string[];
  fromTable?: string;
  joins: string[];
  conditions: string[];
  orderBy: string[];
  limit?: number;
  offset?: number;
  params: any[];
};

type MyFilterConditionOutput = {
  condition: string;
  params: any[];
};

export class MyCustomTranslator extends CriteriaTranslator<
  MyQueryBuilder, // TranslationContext: The object modified during translation
  MyQueryBuilder, // TranslationOutput: The final result of translate()
  MyFilterConditionOutput // TFilterVisitorOutput: The result of visiting filters/groups
> {
  private paramCounter = 0;

  private generateParamPlaceholder(): string {
    // Internal logic can vary based on the type of placeholder you need:
    // If using named placeholders like :p0, :p1 (common in TypeORM, for example)
    // return `:p${this.paramCounter++}`;
    // If using positional placeholders like ? (common in native MySQL, SQLite)
    this.paramCounter++; // Only to count if necessary, placeholder is fixed
    return `?`;
    // Or the specific placeholder for your DB/ORM.
  }

  // Implementation of visit... methods
  // ... (see following sections)
}
```

In this example:

- `MyQueryBuilder`: Would be your class or interface for building the native query.
- `MyFilterConditionOutput`: The output type of the `visitFilter` and `visit...Group` methods, assuming they generate objects containing condition strings and their parameters.

---

## 3. Implementing `visit...` Methods

Now, you must implement the abstract `visit...` methods from `CriteriaTranslator`.

### 3.1. `visitRoot`

This is the main entry point for translating a `RootCriteria`. This is where you will typically initialize your query, process the main filters, joins, ordering, and pagination of the `RootCriteria`.

```typescript
  visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    queryBuilder: MyQueryBuilder, // The initial context
  ): MyQueryBuilder {
    this.paramCounter = 0; // Reset parameter counter for each main translation

    // 1. FROM clause
    queryBuilder.fromTable = `${criteria.sourceName} AS ${criteria.alias}`;

    // 2. SELECT clause
    queryBuilder.selectFields = criteria.select.map(
      (field) => `${criteria.alias}.${String(field)}`,
    );
    if (criteria.selectAll && queryBuilder.selectFields.length === 0) {
        queryBuilder.selectFields.push(`${criteria.alias}.*`);
    }

    // 3. JOINs
    for (const joinDetail of criteria.joins) {
      // The context (queryBuilder) is passed and modified by the visitJoin methods
      joinDetail.criteria.accept(this, joinDetail.parameters, queryBuilder);
    }

    // 4. WHERE clause for RootCriteria
    if (criteria.rootFilterGroup.items.length > 0) {
      const rootFilterResult = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        queryBuilder, // Context here might be different if filters don't directly modify QB
      );
      if (rootFilterResult.condition) {
        queryBuilder.conditions.push(rootFilterResult.condition);
        queryBuilder.params.push(...rootFilterResult.params);
      }
    }

    // 5. Cursor condition (if it exists, add to WHERE)
    if (criteria.cursor) {
        const cursorFilters = criteria.cursor.filters;
        const op = criteria.cursor.operator === FilterOperator.GREATER_THAN ? '>' : '<';
        // const orderDir = criteria.cursor.order; // Not used directly in this simple SQL example

        const primaryCursorFilter = cursorFilters[0]!;
        const primaryParamName = this.generateParamPlaceholder(); // Use a unique parameter name
        queryBuilder.params.push(primaryCursorFilter.value);
        let cursorCondition = `(${criteria.alias}.${String(primaryCursorFilter.field)} ${op} :${primaryParamName}`;

        if (cursorFilters.length === 2) {
            const secondaryCursorFilter = cursorFilters[1]!;
            const secondaryParamName = this.generateParamPlaceholder(); // Use a unique parameter name
            queryBuilder.params.push(secondaryCursorFilter.value);
            cursorCondition += ` OR (${criteria.alias}.${String(primaryCursorFilter.field)} = :${primaryParamName} AND ${criteria.alias}.${String(secondaryCursorFilter.field)} ${op} :${secondaryParamName}))`;
        } else {
            cursorCondition += `)`;
        }
        queryBuilder.conditions.push(cursorCondition);

        // Ensure cursor's orderBy is applied
        // In a real translator, this might need more complex logic to ensure correct order
        // and avoid duplicates if already in criteria.orders.
        // For simplicity, we add them here.
        criteria.orders.forEach(order => { // Assuming cursor orders are in criteria.orders
             queryBuilder.orderBy.push(`${criteria.alias}.${String(order.field)} ${order.direction}`);
        });
    }

    // 6. ORDER BY
    // Ordering logic must be careful, especially with cursors.
    // The translator is responsible for:
    //   a. If a cursor exists, its sort fields MUST take precedence.
    //   b. Then, other `Order`s defined in the `RootCriteria` and `JoinCriteria`s are applied.
    //   c. All `Order`s (after cursor-defined ones) must be globally sorted by their `sequenceId`
    //      before being applied, to maintain deterministic sorting.
    // (See section "4.1. Ordering (orderBy)" and the PseudoSqlTranslator example
    // for a more detailed implementation of this logic).

    // Conceptual simplified example (actual logic is more complex and shown in section 4.1 and the example):
    if (criteria.cursor) {
      // Cursor's orderBy fields are applied first.
      // Example: criteria.cursor.filters.forEach(cf => queryBuilder.orderBy.push(`${criteria.alias}.${String(cf.field)} ${criteria.cursor.order}`));
      // Then, other orders, avoiding duplicates and using sequenceId.
    } else {
      // If no cursor, apply all collected orders, sorted by sequenceId.
      // Example:
      // const allOrders = []; // Collect from criteria.orders and joins
      // allOrders.sort((a, b) => a.order.sequenceId - b.order.sequenceId);
      // allOrders.forEach(({alias, order}) => queryBuilder.orderBy.push(`${alias}.${String(order.field)} ${order.direction}`));
    }

    // 7. LIMIT / OFFSET
    if (criteria.take > 0) {
      queryBuilder.limit = criteria.take;
    }
    if (criteria.skip > 0) {
      queryBuilder.offset = criteria.skip;
    }

    return queryBuilder;
  }
```

**Considerations for `visitRoot`:**

- **Initialization:** Set up the `FROM` part of your query using `criteria.sourceName` and `criteria.alias`.
- **Filters:** Call `criteria.rootFilterGroup.accept(this, criteria.alias, context)` to process the `RootCriteria`'s filters. The `context` here could be your `queryBuilder` or an object where conditions are attached.
- **Joins:** Iterate over `criteria.joins` and call `joinDetail.criteria.accept(this, joinDetail.parameters, context)` for each one.
- **Ordering and Pagination:** Apply the logic for `orderBy`, `take`, `skip`, and `cursor` at the end.
- **Field Selection:** Construct the `SELECT` clause based on `criteria.select`.

### 3.2. `visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin`

These methods handle the different types of joins. They receive the `JoinCriteria` instance, the join `parameters` (which include information about the parent and child of the join), and the `context`.

```typescript
  private applyJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    joinType: 'INNER' | 'LEFT' | 'OUTER',
    criteria: // The current JoinCriteria being visited
      | InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    queryBuilder: MyQueryBuilder, // Context: the main query builder
  ): MyQueryBuilder {
    const joinTable = `${criteria.sourceName} AS ${criteria.alias}`;
    let onCondition = '';

    if ('pivot_source_name' in parameters) {
      // Many-to-many join
      const pivotAlias = `${parameters.parent_alias}_${criteria.alias}_pivot`;
      const pivotTable = `${parameters.pivot_source_name} AS ${pivotAlias}`;

      const firstJoin = `${joinType} JOIN ${pivotTable} ON ${parameters.parent_alias}.${String(parameters.parent_field.reference)} = ${pivotAlias}.${parameters.parent_field.pivot_field}`;
      queryBuilder.joins.push(firstJoin);

      onCondition = `${pivotAlias}.${parameters.join_field.pivot_field} = ${criteria.alias}.${String(parameters.join_field.reference)}`;
      queryBuilder.joins.push(`${joinType} JOIN ${joinTable} ON ${onCondition}`);
    } else {
      // Simple join
      onCondition = `${parameters.parent_alias}.${String(parameters.parent_field)} = ${criteria.alias}.${String(parameters.join_field)}`;
      queryBuilder.joins.push(`${joinType} JOIN ${joinTable} ON ${onCondition}`);
    }

    // Filters on the JOIN (added to ON clause or as AND after)
    if (criteria.rootFilterGroup.items.length > 0) {
      const joinFilterResult = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        queryBuilder,
      );
      if (joinFilterResult.condition) {
        const lastJoinIndex = queryBuilder.joins.length -1;
        if(queryBuilder.joins[lastJoinIndex]) { // Ensure there's a join to append AND to
            queryBuilder.joins[lastJoinIndex] += ` AND (${joinFilterResult.condition})`;
            queryBuilder.params.push(...joinFilterResult.params);
        }
      }
    }

    // Field selection from Join
    criteria.select.forEach((field) => {
      queryBuilder.selectFields.push(`${criteria.alias}.${String(field)}`);
    });
    if (criteria.selectAll && criteria.select.length === 0) {
        queryBuilder.selectFields.push(`${criteria.alias}.*`);
    }

    // Collect OrderBy from join to apply globally
    // (This logic might need refinement to ensure correct global order)
    criteria.orders.forEach(order => {
        // Example: queryBuilder.orderBy.push(`${criteria.alias}.${String(order.field)} ${order.direction}`);
        // Or store them in a class property to apply at the end in visitRoot.
    });

    // ***** START OF MODIFICATION FOR NESTED JOINS *****
    // If this JoinCriteria (the current 'criteria') has its own joins defined,
    // process them recursively.
    for (const subJoinDetail of criteria.joins) {
      // The 'queryBuilder' (context) is passed along and modified.
      subJoinDetail.criteria.accept(this, subJoinDetail.parameters, queryBuilder);
    }
    // ***** END OF MODIFICATION FOR NESTED JOINS *****

    return queryBuilder;
  }

  visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: MyQueryBuilder,
  ): MyQueryBuilder {
    return this.applyJoin('INNER', criteria, parameters, context);
  }

  visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: MyQueryBuilder,
  ): MyQueryBuilder {
    return this.applyJoin('LEFT', criteria, parameters, context);
  }

  visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: MyQueryBuilder,
  ): MyQueryBuilder {
    // Note: FULL OUTER JOIN support can vary and might require special syntax.
    return this.applyJoin('OUTER', criteria, parameters, context);
  }
```

**Considerations for `visitJoin...` methods:**

- **Join Type:** Use the appropriate join type (`INNER JOIN`, `LEFT JOIN`, etc.).
- **Table and Alias:** Use `criteria.sourceName` and `criteria.alias` for the joined table.
- **`ON` Condition:**
  - For `SimpleJoin` (one-to-one, one-to-many, many-to-one): Construct the `ON` condition using `parameters.parent_alias`.`parameters.parent_field` = `criteria.alias`.`parameters.join_field`.
  - For `PivotJoin` (many-to-many): You will need two joins: one from the parent table to the pivot table (`parameters.pivot_source_name`), and another from the pivot table to the target table (`criteria.sourceName`). The `ON` conditions will use the fields defined in `parameters.parent_field.pivot_field`, `parameters.parent_field.reference`, `parameters.join_field.pivot_field`, and `parameters.join_field.reference`.
- **Filters on the Join:** If `criteria.rootFilterGroup` (from the `JoinCriteria`) has filters, these should be applied as additional conditions in the `ON` clause of the join (or as `AND` after the `ON`, depending on the database). Call `criteria.rootFilterGroup.accept(this, criteria.alias, context)` for this.
- **Field Selection from Join:** Add fields from `criteria.select` (from the `JoinCriteria`) to your main selection, usually prefixed with `criteria.alias`.
- **Ordering from Join:** If `criteria.orders` (from the `JoinCriteria`) has orders, store them to be applied globally at the end.
- **Nested Joins:** Crucially, if the `criteria` (the `JoinCriteria` being visited) itself has `criteria.joins` defined, you must iterate over them and recursively call `subJoinDetail.criteria.accept(this, subJoinDetail.parameters, context)` to process these nested joins.

### 3.3. `visitFilter`

This method translates an individual `Filter` into a condition for your query language.

```typescript
  visitFilter<
    FieldType extends string,
    Operator extends FilterOperator,
  >(
    filter: Filter<FieldType, Operator>,
    currentAlias: string,
    // queryBuilder: MyQueryBuilder, // Context might not be needed here if only returning the condition
  ): MyFilterConditionOutput {
    const fieldName = `${currentAlias}.${String(filter.field)}`;
    const paramName = this.generateParamPlaceholder();
    let condition = '';
    const params: any[] = [];

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        condition = `${fieldName} = :${paramName}`;
        params.push(filter.value);
        break;
      case FilterOperator.NOT_EQUALS:
        condition = `${fieldName} != :${paramName}`;
        params.push(filter.value);
        break;
      case FilterOperator.LIKE:
        condition = `${fieldName} LIKE :${paramName}`;
        params.push(filter.value); // Assume value already has '%'
        break;
      case FilterOperator.CONTAINS: // Could be same as LIKE or use a specific function
        condition = `${fieldName} LIKE :${paramName}`;
        params.push(`%${filter.value}%`);
        break;
      case FilterOperator.IN:
        // TypeORM handles arrays for IN, but a manual translator would need to generate placeholders
        condition = `${fieldName} IN (:...${paramName})`; // Placeholder for multiple values
        params.push(filter.value); // Value is an array
        break;
      case FilterOperator.IS_NULL:
        condition = `${fieldName} IS NULL`;
        // No parameters for IS NULL
        break;
      // ... Implement all necessary FilterOperators
      case FilterOperator.JSON_CONTAINS:
        if (typeof filter.value === 'object' && filter.value !== null) {
          const conditions: string[] = [];
          for (const pathKey in filter.value) { // pathKey could be "tags" or "address.city"
            const pathValue = (filter.value as Record<string, any>)[pathKey];
            const currentParamName = this.generateParamPlaceholder(); // Use consistent name
            // Note: JSON path construction (e.g., '$.${pathKey}' vs '${pathKey}')
            // and the exact function (JSON_EXTRACT, JSON_CONTAINS, ->, @>, etc.)
            // varies greatly by database (MySQL, PostgreSQL, etc.).
            // This is a conceptual example for MySQL with JSON_EXTRACT for equality.
            // To search for an element in a JSON array, MySQL would use JSON_CONTAINS(json_doc, candidate, json_path).
            // Example: JSON_CONTAINS(metadata, '"tech"', '$.tags')
            conditions.push(`JSON_EXTRACT(${fieldName}, '$.${pathKey}') = :${currentParamName}`);
            params.push(pathValue);
          }
          condition = conditions.join(' AND '); // Assumes multiple JSON conditions are ANDed
        } else {
          // If value is not an object, it's an invalid condition for JSON_CONTAINS.
          condition = '1=0'; // Condition that is always false
        }
        break;
      case FilterOperator.ARRAY_CONTAINS_ELEMENT:
        const arrayElemParamName = this.generateParamPlaceholder(); // Use consistent name
        if (typeof filter.value === 'object' && filter.value !== null && !Array.isArray(filter.value)) {
          // Assume value is { "path.to.json.array": element_to_find }
          const jsonPath = Object.keys(filter.value)[0]!;
          const elementToFind = (filter.value as Record<string, any>)[jsonPath];
          // Note: Syntax for querying arrays within JSON varies (e.g., MySQL vs PostgreSQL).
          // This is a conceptual example for MySQL:
          // JSON_CONTAINS(json_field, 'casted_element_value_to_json', '$.path.to.json.array')
          condition = `JSON_CONTAINS(${fieldName}, CAST(:${arrayElemParamName} AS JSON), '$.${jsonPath}')`;
          params.push(elementToFind); // Translator might need to cast this to JSON string
        } else {
          // For native array columns (e.g., PostgreSQL `ANY`)
          condition = `:${arrayElemParamName} = ANY(${fieldName})`;
          params.push(filter.value); // filter.value is the element to find
        }
        break;
      default:
        throw new Error(
          `Translator: Unsupported filter operator '${filter.operator}'`,
        );
    }
    return { condition, params: params.map(p => (p === undefined ? null : p)) };
  }
```

**Considerations for `visitFilter`:**

- **Field and Alias:** The `currentAlias` tells you which entity the `filter.field` belongs to.
- **Operator:** Implement the logic for each `FilterOperator` that your data source supports.
- **Value:** The `filter.value` must be formatted or parameterized appropriately. For operators like `IN`, `value` will be an array. For JSON/Array operators, `value` can be an object or an array, and you'll need to interpret the JSON path if applicable.
- **Parameterization:** It is **crucial** to use parameterized queries to prevent SQL injection. Do not directly concatenate `filter.value` into the query string. Instead, use placeholders and pass the values through your query builder's parameter mechanism.

### 3.4. `visitAndGroup`, `visitOrGroup`

These methods handle groups of filters. They receive a `FilterGroup` and must iterate over its `items`, processing them recursively and joining them with the appropriate logical operator (`AND` or `OR`).

```typescript
  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    _context: MyQueryBuilder, // Context may or may not be used/modified here
  ): MyFilterConditionOutput {
    const conditions: string[] = [];
    const allParams: any[] = [];

    group.items.forEach((item) => {
      const result = item.accept(this, currentAlias, _context); // _context is passed
      if (result.condition) {
        conditions.push(result.condition);
        allParams.push(...result.params);
      }
    });

    if (conditions.length === 0) return { condition: '', params: [] };
    return {
      condition: `(${conditions.join(' AND ')})`,
      params: allParams,
    };
  }

  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    _context: MyQueryBuilder,
  ): MyFilterConditionOutput {
    const conditions: string[] = [];
    const allParams: any[] = [];

    group.items.forEach((item) => {
      const result = item.accept(this, currentAlias, _context);
      if (result.condition) {
        conditions.push(result.condition);
        allParams.push(...result.params);
      }
    });

    if (conditions.length === 0) return { condition: '', params: [] };
    return {
      condition: `(${conditions.join(' OR ')})`,
      params: allParams,
    };
  }
```

**Considerations for `visit...Group` methods:**

- **Recursion:** Each `item` in `group.items` can be another `FilterGroup` or a `Filter`. Call `item.accept(this, currentAlias, context)` for each one.
- **Grouping:** Ensure that the generated conditions are correctly grouped with parentheses if necessary, especially when mixing `AND` and `OR`.

---

## 4. Handling Ordering, Pagination, and Selection

These logics are generally applied in `visitRoot` after all main joins and filters have been processed.

### 4.1. Ordering (`orderBy`)

Ordering defines how the query results should be sorted.

- During the visit of each `Criteria` (root or join) via their respective `visit...` methods, your translator should **collect** all `Order` objects defined using `.orderBy()`. Each `Order` object contains the field, direction, and a unique internal `sequenceId`.
- At the end of processing in `visitRoot` (after all joins have been processed and before applying `LIMIT`/`OFFSET`):
  1. If `criteria.cursor` exists, the fields defined in `cursor.filters` must be used to generate the **first** `ORDER BY` clauses, using the direction specified in `cursor.order`.
  2. Then, take all collected `Order`s (from the root and all joins).
  3. Sort this global collection of `Order`s by their `sequenceId`. This ensures that the order in which `orderBy` was defined throughout the `Criteria` construction is respected sequentially.
  4. Convert these `Order`s (now sorted by sequence and following any cursor-defined orders) into the `ORDER BY` clauses of your native query. Ensure you avoid duplicating fields if they were already ordered by the cursor logic.
- The `order.sequenceId` is crucial for maintaining a deterministic and predictable global order when multiple `orderBy` calls are applied in different parts of the `Criteria` (both on the root and in nested joins).

### 4.2. Offset Pagination (`setTake`, `setSkip`)

- If `criteria.take > 0`, apply a limit to the number of results.
- If `criteria.skip > 0`, skip the specified number of results.

### 4.3. Cursor Pagination (`setCursor`)

This is more complex and requires careful coordination with ordering. If `criteria.cursor` is defined:

- `cursor.filters`: Provides one or two `Filter`s (without the `operator`) that define the fields and values of the last item from the previous page.
  - A single `Filter`: For simple pagination over one field (e.g., `created_at`).
  - Two `Filter`s: For composite pagination (e.g., `created_at` and `uuid`).
- `cursor.operator`: Will be `FilterOperator.GREATER_THAN` (for next page) or `FilterOperator.LESS_THAN` (for previous page, if the main order is inverted).
- `cursor.order`: The main `OrderDirection` in which pagination is occurring.

**Translator Responsibilities:**

1.  **Construct the Cursor `WHERE` Condition:**

- For a simple cursor: `WHERE (cursor_field translated_cursor_operator cursor_value)`
- For a composite cursor: `WHERE ( (primary_sort_field translated_op primary_cursor_value) OR (primary_sort_field = primary_cursor_value AND tie_breaker_field translated_op tie_breaker_cursor_value) )`. Adjust operators based on direction.

2.  **Apply Cursor Ordering with Priority:**

- The fields defined in `cursor.filters` **must** be the first in the final `ORDER BY` clause. The direction for these fields comes from `cursor.order`.
- For example, if `cursor.filters` are `[{field: 'created_at', ...}, {field: 'uuid', ...}]` and `cursor.order` is `ASC`, the query must start with `ORDER BY created_at ASC, uuid ASC`.

3.  **Apply Additional Orderings:**

- After the cursor fields, add any other `orderBy` clauses defined in the `Criteria` (root and joins). These should be globally sorted by their `sequenceId` before being added, and should be omitted if the field was already covered by the cursor's ordering.
- **Important:** The `Criteria` **must** have `orderBy()` defined for the same fields used in `cursor.filters` and in the same direction as `cursor.order`. Although the translator prioritizes cursor fields for the `ORDER BY`, this consistency in the `Criteria` definition is crucial for pagination logic.

### 4.4. Field Selection (`setSelect`)

- In `visitRoot`, construct the initial `SELECT` clause using `criteria.select` (from the `RootCriteria`).
- In each `visitJoin...`, if the `joinCriteria.select` has specific fields, add them to the main selection, usually prefixed with the join's alias (e.g., `SELECT root.field1, joined_alias.fieldA`).
- If `criteria.selectAll` is `true` (or `criteria.select` is empty, which is the default behavior), select all fields from the corresponding schema.

---

## 5. State and Parameter Management

Your translator will likely need to manage some state:

- **Query Parameters:** Maintain a list or object for parameterized values. Each time you process a `filter.value` or a pagination value, add it to this collection and use a placeholder in the query.
- **Parameter Counter:** If you use numbered placeholders (e.g., `$1, $2` or `?`), you'll need a counter.
- **Accumulated Clauses:** You might have properties in your translator class to build up the different parts of the query (SELECT, FROM, JOINs, WHERE, ORDER BY, etc.).

```typescript
// (Inside your MyCustomTranslator class)

// Example of simple state management:
// private collectedSelects: string[] = [];
// private collectedFrom: string = '';
// private collectedJoins: string[] = [];
// private collectedWhere: string[] = [];
// private collectedOrderBy: string[] = [];
// private collectedLimit?: number;
// private collectedOffset?: number;
// private queryParams: any[] = [];
// private paramCounter: number = 0;

// constructor() {
//   super();
//   this.resetState();
// }

// private resetState(): void {
//   this.collectedSelects = [];
//   this.collectedFrom = '';
//   // ... reset all others
//   this.queryParams = [];
//   this.paramCounter = 0;
// }

// private addQueryParam(value: any): string {
//   this.queryParams.push(value);
//   return `?`; // Or $1, $2, etc., depending on your DB
// }

// The translate method could then assemble these parts.
// public translate(criteria: RootCriteria<any, any>, initialContext?: any): string {
//   this.resetState();
//   criteria.accept(this, initialContext || {}); // Initial context could be an empty object
//
//   let sql = `SELECT ${this.collectedSelects.join(', ') || '*'}`;
//   sql += ` FROM ${this.collectedFrom}`;
//   if (this.collectedJoins.length > 0) sql += ` ${this.collectedJoins.join(' ')}`;
//   if (this.collectedWhere.length > 0) sql += ` WHERE ${this.collectedWhere.join(' AND ')}`; // Simplified
//   if (this.collectedOrderBy.length > 0) sql += ` ORDER BY ${this.collectedOrderBy.join(', ')}`;
//   if (this.collectedLimit) sql += ` LIMIT ${this.collectedLimit}`;
//   if (this.collectedOffset) sql += ` OFFSET ${this.collectedOffset}`;
//   return sql;
// }
// public getParameters(): any[] {
//    return this.queryParams;
// }
```

---

## 6. Simplified Example: Pseudo-SQL Translator

This very basic example shows the structure, translating to a pseudo-SQL string.

```typescript
import {
  CriteriaTranslator,
  RootCriteria,
  InnerJoinCriteria,
  LeftJoinCriteria,
  OuterJoinCriteria,
  Filter,
  FilterGroup,
  FilterOperator,
  OrderDirection,
  type Order,
  type CriteriaSchema,
  type SelectedAliasOf,
  type PivotJoin,
  type SimpleJoin,
  type JoinRelationType,
} from '@nulledexp/translatable-criteria';

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

type PseudoSqlTranslationResult = {
  query: string;
  params: any[];
};

function escapeField(field: string, alias?: string): string {
  const escape = (str: string) => `\`${str.replace(/`/g, '``')}\``;
  return alias ? `${escape(alias)}.${escape(field)}` : escape(field);
}

class PseudoSqlTranslator extends CriteriaTranslator<
  PseudoSqlParts,
  PseudoSqlTranslationResult,
  PseudoSqlFilterOutput
> {
  private paramCounter = 0;
  private collectedOrders: Array<{ alias: string; order: Order<string> }> = [];

  private generateParamPlaceholder(): string {
    this.paramCounter++;
    return `?`;
  }

  public translate(
    criteria: RootCriteria<any, any>,
  ): PseudoSqlTranslationResult {
    this.paramCounter = 0;
    this.collectedOrders = [];

    const initialSqlParts: PseudoSqlParts = {
      select: [],
      from: '',
      joins: [],
      where: [],
      orderBy: [],
      params: [],
    };

    const finalSqlParts = criteria.accept(this, initialSqlParts);

    let sqlString = `SELECT ${finalSqlParts.select.join(', ') || '*'}`;
    sqlString += ` FROM ${finalSqlParts.from}`;
    if (finalSqlParts.joins.length > 0)
      sqlString += ` ${finalSqlParts.joins.join(' ')}`;
    if (finalSqlParts.where.length > 0)
      sqlString += ` WHERE ${finalSqlParts.where.join(' AND ')}`;
    if (finalSqlParts.orderBy.length > 0)
      sqlString += ` ORDER BY ${finalSqlParts.orderBy.join(', ')}`;
    if (finalSqlParts.limit !== undefined)
      sqlString += ` LIMIT ${finalSqlParts.limit}`;
    if (finalSqlParts.offset !== undefined)
      sqlString += ` OFFSET ${finalSqlParts.offset}`;

    return {
      query: sqlString,
      params: finalSqlParts.params,
    };
  }

  visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    sqlParts: PseudoSqlParts,
  ): PseudoSqlParts {
    sqlParts.from = `${escapeField(criteria.sourceName)} AS ${escapeField(
      criteria.alias,
    )}`;
    sqlParts.select = criteria.select.map((f) =>
      escapeField(String(f), criteria.alias),
    );
    if (criteria.selectAll && sqlParts.select.length === 0) {
      sqlParts.select.push(`${escapeField(criteria.alias)}.*`);
    }

    criteria.orders.forEach((order) =>
      this.collectedOrders.push({ alias: criteria.alias, order }),
    );

    for (const joinDetail of criteria.joins) {
      joinDetail.criteria.accept(this, joinDetail.parameters, sqlParts);
    }

    if (criteria.rootFilterGroup.items.length > 0) {
      const filterResult = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        sqlParts,
      );
      if (filterResult.condition) {
        sqlParts.where.push(filterResult.condition);
        sqlParts.params.push(...filterResult.params);
      }
    }

    const finalOrderByStrings: string[] = [];
    const appliedOrderFieldsForCursor = new Set<string>();

    if (criteria.cursor) {
      const cursorFilters = criteria.cursor.filters;
      const op =
        criteria.cursor.operator === FilterOperator.GREATER_THAN ? '>' : '<';
      let cursorWhereCondition = '';

      if (cursorFilters.length === 1) {
        const primaryFilter = cursorFilters[0]!;
        const primaryPlaceholder = this.generateParamPlaceholder();
        sqlParts.params.push(primaryFilter.value);
        cursorWhereCondition = `(${escapeField(
          String(primaryFilter.field),
          criteria.alias,
        )} ${op} ${primaryPlaceholder})`;
      } else if (cursorFilters.length === 2) {
        const primaryFilter = cursorFilters[0]!;
        const secondaryFilter = cursorFilters[1]!;
        const primaryPlaceholder = this.generateParamPlaceholder();
        const secondaryPlaceholder = this.generateParamPlaceholder();
        sqlParts.params.push(primaryFilter.value, secondaryFilter.value);
        cursorWhereCondition = `((${escapeField(
          String(primaryFilter.field),
          criteria.alias,
        )} ${op} ${primaryPlaceholder}) OR (${escapeField(
          String(primaryFilter.field),
          criteria.alias,
        )} = ${primaryPlaceholder} AND ${escapeField(
          String(secondaryFilter.field),
          criteria.alias,
        )} ${op} ${secondaryPlaceholder}))`;
      }

      if (cursorWhereCondition) {
        sqlParts.where.push(cursorWhereCondition);
      }

      const cursorOrderDirection = criteria.cursor.order;
      cursorFilters.forEach((cf) => {
        const fieldKey = `${criteria.alias}.${String(cf.field)}`;
        finalOrderByStrings.push(
          `${escapeField(
            String(cf.field),
            criteria.alias,
          )} ${cursorOrderDirection}`,
        );
        appliedOrderFieldsForCursor.add(fieldKey);
      });
    }

    this.collectedOrders
      .sort((a, b) => a.order.sequenceId - b.order.sequenceId)
      .forEach(({ alias, order }) => {
        const fieldKey = `${alias}.${String(order.field)}`;
        if (!appliedOrderFieldsForCursor.has(fieldKey)) {
          finalOrderByStrings.push(
            `${escapeField(String(order.field), alias)} ${order.direction}`,
          );
        }
      });

    if (finalOrderByStrings.length > 0) {
      sqlParts.orderBy = finalOrderByStrings;
    }

    if (criteria.take > 0) sqlParts.limit = criteria.take;
    if (criteria.skip > 0) sqlParts.offset = criteria.skip;

    return sqlParts;
  }

  private applyPseudoJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    joinType: string,
    criteria:
      | InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    sqlParts: PseudoSqlParts,
  ): PseudoSqlParts {
    const joinTable = `${escapeField(criteria.sourceName)} AS ${escapeField(
      criteria.alias,
    )}`;
    let onCondition = '';

    if ('pivot_source_name' in parameters) {
      const pivotAlias = `${parameters.parent_alias}_${criteria.alias}_pivot`;
      const pivotTable = `${escapeField(
        parameters.pivot_source_name,
      )} AS ${escapeField(pivotAlias)}`;
      sqlParts.joins.push(
        `${joinType} JOIN ${pivotTable} ON ${escapeField(
          String(parameters.parent_field.reference),
          parameters.parent_alias,
        )} = ${escapeField(parameters.parent_field.pivot_field, pivotAlias)}`,
      );
      onCondition = `${escapeField(
        parameters.join_field.pivot_field,
        pivotAlias,
      )} = ${escapeField(
        String(parameters.join_field.reference),
        criteria.alias,
      )}`;
      sqlParts.joins.push(`${joinType} JOIN ${joinTable} ON ${onCondition}`);
    } else {
      onCondition = `${escapeField(
        String(parameters.parent_field),
        parameters.parent_alias,
      )} = ${escapeField(String(parameters.join_field), criteria.alias)}`;
      sqlParts.joins.push(`${joinType} JOIN ${joinTable} ON ${onCondition}`);
    }

    if (criteria.rootFilterGroup.items.length > 0) {
      const filterResult = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        sqlParts,
      );
      if (filterResult.condition) {
        const lastJoinIndex = sqlParts.joins.length - 1;
        if (sqlParts.joins[lastJoinIndex]) {
          sqlParts.joins[lastJoinIndex] += ` AND (${filterResult.condition})`;
          sqlParts.params.push(...filterResult.params);
        }
      }
    }

    criteria.select.forEach((f) =>
      sqlParts.select.push(escapeField(String(f), criteria.alias)),
    );
    if (criteria.selectAll && criteria.select.length === 0) {
      sqlParts.select.push(`${escapeField(criteria.alias)}.*`);
    }

    criteria.orders.forEach((order) =>
      this.collectedOrders.push({ alias: criteria.alias, order }),
    );

    for (const subJoinDetail of criteria.joins) {
      subJoinDetail.criteria.accept(this, subJoinDetail.parameters, sqlParts);
    }

    return sqlParts;
  }

  visitInnerJoin(
    criteria: InnerJoinCriteria<any, any>,
    parameters: any,
    context: PseudoSqlParts,
  ): PseudoSqlParts {
    return this.applyPseudoJoin('INNER', criteria, parameters, context);
  }
  visitLeftJoin(
    criteria: LeftJoinCriteria<any, any>,
    parameters: any,
    context: PseudoSqlParts,
  ): PseudoSqlParts {
    return this.applyPseudoJoin('LEFT', criteria, parameters, context);
  }
  visitOuterJoin(
    criteria: OuterJoinCriteria<any, any>,
    parameters: any,
    context: PseudoSqlParts,
  ): PseudoSqlParts {
    return this.applyPseudoJoin('FULL OUTER', criteria, parameters, context);
  }

  visitFilter<FieldType extends string, Operator extends FilterOperator>(
    filter: Filter<FieldType, Operator>,
    currentAlias: string,
  ): PseudoSqlFilterOutput {
    const fieldName = escapeField(String(filter.field), currentAlias);
    const params: any[] = [];
    let condition = '';

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        condition = `${fieldName} = ${this.generateParamPlaceholder()}`;
        params.push(filter.value);
        break;
      case FilterOperator.NOT_EQUALS:
        condition = `${fieldName} != ${this.generateParamPlaceholder()}`;
        params.push(filter.value);
        break;
      case FilterOperator.LIKE:
      case FilterOperator.CONTAINS:
      case FilterOperator.STARTS_WITH:
      case FilterOperator.ENDS_WITH:
        let val = String(filter.value);
        if (filter.operator === FilterOperator.CONTAINS) val = `%${val}%`;
        else if (filter.operator === FilterOperator.STARTS_WITH)
          val = `${val}%`;
        else if (filter.operator === FilterOperator.ENDS_WITH) val = `%${val}`;
        condition = `${fieldName} LIKE ${this.generateParamPlaceholder()}`;
        params.push(val);
        break;
      case FilterOperator.IN:
        if (!Array.isArray(filter.value) || filter.value.length === 0) {
          condition = '1=0';
        } else {
          const placeholders = (filter.value as any[])
            .map(() => this.generateParamPlaceholder())
            .join(', ');
          condition = `${fieldName} IN (${placeholders})`;
          params.push(...(filter.value as any[]));
        }
        break;
      case FilterOperator.IS_NULL:
        condition = `${fieldName} IS NULL`;
        break;
      case FilterOperator.IS_NOT_NULL:
        condition = `${fieldName} IS NOT NULL`;
        break;
      case FilterOperator.JSON_CONTAINS:
        if (typeof filter.value === 'object' && filter.value !== null) {
          const jsonConditions: string[] = [];
          for (const path in filter.value) {
            const pathValue = (filter.value as Record<string, any>)[path];
            jsonConditions.push(
              `JSON_CONTAINS(${fieldName}, '${JSON.stringify(
                pathValue,
              )}', '$.${path}')`,
            );
          }
          condition = jsonConditions.join(' AND ');
        } else {
          condition = '1=0';
        }
        break;
      default:
        condition = `${fieldName} ${
          filter.operator
        } ${this.generateParamPlaceholder()}`;
        params.push(filter.value);
    }
    return {
      condition,
      params: params.map((p) => (p === undefined ? null : p)),
    };
  }

  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    sqlParts: PseudoSqlParts,
  ): PseudoSqlFilterOutput {
    const conditions: string[] = [];
    const allParams: any[] = [];
    group.items.forEach((item) => {
      const result = item.accept(this, currentAlias, sqlParts);
      if (result.condition) {
        conditions.push(result.condition);
        allParams.push(...result.params);
      }
    });
    if (conditions.length === 0) return { condition: '', params: [] };
    return { condition: `(${conditions.join(' AND ')})`, params: allParams };
  }

  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    sqlParts: PseudoSqlParts,
  ): PseudoSqlFilterOutput {
    const conditions: string[] = [];
    const allParams: any[] = [];
    group.items.forEach((item) => {
      const result = item.accept(this, currentAlias, sqlParts);
      if (result.condition) {
        conditions.push(result.condition);
        allParams.push(...result.params);
      }
    });
    if (conditions.length === 0) return { condition: '', params: [] };
    return { condition: `(${conditions.join(' OR ')})`, params: allParams };
  }
}
```

```typescript
// Assuming UserSchema and CriteriaFactory are defined
// import { UserSchema } from './path/to/your/schemas';
// import { CriteriaFactory, FilterOperator, OrderDirection } from '@nulledexp/translatable-criteria';

// const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
//   .where({ field: 'email', operator: FilterOperator.CONTAINS, value: '@example.com' })
//   .orderBy('username', OrderDirection.ASC)
//   .setTake(10);

// const pseudoTranslator = new PseudoSqlTranslator();
// const { query: generatedSql, params: queryParams } = pseudoTranslator.translate(userCriteria);

// console.log('Generated SQL:', generatedSql);
// console.log('Parameters:', queryParams);

// Expected output (example):
// Generated SQL: SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`created_at` FROM `user` AS `users` WHERE (`users`.`email` LIKE ?) ORDER BY `users`.`username` ASC LIMIT ? OFFSET ?;
// Parameters: [ '%@example.com%', 10, 0 ]
```

---

## 7. Additional Considerations

- **Errors and Validation:** Decide how to handle operators or configurations not supported by your data source. You can throw errors or ignore them.
- **Optimization:** Consider optimizations specific to your data source.
- **Testing:** Write thorough unit and integration tests for your translator. Use `CriteriaFactory` to construct various `Criteria` scenarios and verify that your translator's output is as expected.
- **Documentation:** If you share your translator, clearly document what features it supports and how to use it.

---

## Next Steps

With this guide, you have the foundation to start developing your own translators. Review existing translators (if any) for reference and don't hesitate to experiment.
