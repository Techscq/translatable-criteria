# API Reference for @nulledexp/translatable-criteria

This section provides a detailed reference for the public classes, interfaces, types, and enumerations exported by the `@nulledexp/translatable-criteria` library.

## Index

- [**Main Classes and Factories**](#main-classes-and-factories)
  - [`CriteriaFactory`](#criteriafactory)
  - [`RootCriteria`](#rootcriteria)
  - [`InnerJoinCriteria`](#innerjoincriteria)
  - [`LeftJoinCriteria`](#leftjoincriteria)
  - [`OuterJoinCriteria`](#outerjoincriteria)
  - [`Criteria` (Abstract Base Class)](#criteria-abstract-base-class)
  - [`Filter`](#filter)
  - [`FilterGroup`](#filtergroup)
  - [`Order`](#order)
  - [`Cursor`](#cursor)
- [**Abstract Classes (for Extension)**](#abstract-classes-for-extension)
  - [`CriteriaTranslator`](#criteriatranslator)
- [**Enums and Constants**](#enums-and-constants)
  - [`FilterOperator`](#filteroperator)
  - [`LogicalOperator`](#logicaloperator)
  - [`OrderDirection`](#orderdirection)
- [**Main Types and Interfaces (for Schema Definition and Typing)**](#main-types-and-interfaces-for-schema-definition-and-typing)
  - [`CriteriaSchema`](#criteriaschema)
  - [`GetTypedCriteriaSchema`](#gettypedcriteriaschema)
  - [`FieldOfSchema`](#fieldofschema)
  - [`JoinRelationType`](#joinrelationtype)
  - [`SchemaJoins`](#schemajoins)
  - [`FilterPrimitive`](#filterprimitive)
  - [`FilterGroupPrimitive`](#filtergroupprimitive)
  - [`FilterValue`](#filtervalue)
  - [`OrderByPrimitive`](#orderbyprimitive)
  - [`ICriteriaBase`](#icriteriabase)
  - [`ICriteriaVisitor`](#icriteriavisitor)
  - [`IFilterExpression`](#ifilterexpression)
  - [`StoredJoinDetails`](#storedjoindetails)
  - [`AnyJoinCriteria`](#anyjoincriteria)
  - [`JoinCriteriaType`](#joincriteriatype)
  - [`SpecificMatchingJoinConfig`](#specificmatchingjoinconfig)
  - [`PivotJoin`](#pivotjoin)
  - [`SimpleJoin`](#simplejoin)

---

## Main Classes and Factories

### `CriteriaFactory`

Provides static methods for creating instances of different types of `Criteria`. It simplifies the creation of `Criteria` objects and ensures they are instantiated with the correct schema. The alias is now inferred directly from the schema.

**Static Methods:**

- **`GetCriteria<CSchema extends CriteriaSchema>(schema: CSchema): RootCriteria<CSchema>`**
  - Creates an instance of `RootCriteria`. This is the starting point for building a main query.
  - **Parameters:**
    - `schema`: An instance of `CriteriaSchema` that defines the structure of the root entity.
  - **Returns:** An instance of `RootCriteria`.
  - **Example:**

```typescript
import { CriteriaFactory, UserSchema } from '@nulledexp/translatable-criteria';
const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
```

- **`GetInnerJoinCriteria<CSchema extends CriteriaSchema>(schema: CSchema): InnerJoinCriteria<CSchema>`**
  - Creates an instance of `InnerJoinCriteria`. Used to define an `INNER JOIN` in a query.
  - **Parameters:**
    - `schema`: An instance of `CriteriaSchema` for the entity to be joined.
  - **Returns:** An instance of `InnerJoinCriteria`.
  - **Example:**

```typescript
import { CriteriaFactory, PostSchema } from '@nulledexp/translatable-criteria';
const postJoin = CriteriaFactory.GetInnerJoinCriteria(PostSchema);
```

- **`GetLeftJoinCriteria<CSchema extends CriteriaSchema>(schema: CSchema): LeftJoinCriteria<CSchema>`**
  - Creates an instance of `LeftJoinCriteria`. Used to define a `LEFT JOIN`.
  - **Returns:** An instance of `LeftJoinCriteria`.

- **`GetOuterJoinCriteria<CSchema extends CriteriaSchema>(schema: CSchema): OuterJoinCriteria<CSchema>`**
  - Creates an instance of `OuterJoinCriteria`. Used to define a `FULL OUTER JOIN`.
  - **Returns:** An instance of `OuterJoinCriteria`.

[Back to Index](#index)

### `RootCriteria`

Represents the starting point of a query, targeting a main entity. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitRoot()`.
- `resetCriteria()`: Returns a new instance of `RootCriteria` with the same schema configuration, but with all other states (filters, joins, etc.) reset.

[Back to Index](#index)

### `InnerJoinCriteria`

Represents an `INNER JOIN` criterion. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetInnerJoinCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitInnerJoin()`.
- `resetCriteria()`: Returns a new instance of `InnerJoinCriteria`.

[Back to Index](#index)

### `LeftJoinCriteria`

Represents a `LEFT JOIN` criterion. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetLeftJoinCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitLeftJoin()`.
- `resetCriteria()`: Returns a new instance of `LeftJoinCriteria`.

[Back to Index](#index)

### `OuterJoinCriteria`

Represents a `FULL OUTER JOIN` criterion. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetOuterJoinCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitOuterJoin()`.
- `resetCriteria()`: Returns a new instance of `OuterJoinCriteria`.

[Back to Index](#index)

### `Criteria` (Abstract Base Class)

Abstract base class for all criteria types (`RootCriteria`, `InnerJoinCriteria`, etc.). Provides common functionality for building a query. Not instantiated directly.

**Main Properties (accessible via getters):**

- `select: FieldOfSchema<TSchema>[]`: Selected fields. If `selectAll` is `true`, returns all fields from the schema.
- `selectAll: boolean`: Indicates if all fields should be selected.
- `take: number`: Number of records to take (LIMIT).
- `skip: number`: Number of records to skip (OFFSET).
- `orders: ReadonlyArray<Order<FieldOfSchema<TSchema>>>`: Ordering rules.
- `joins: ReadonlyArray<StoredJoinDetails<TSchema>>`: Join configurations.
- `rootFilterGroup: FilterGroup`: Root filter group.
- `sourceName: TSchema['source_name']`: Source name from the schema.
- `alias: TSchema['alias']`: The canonical alias from the schema.
- `cursor: Cursor<...> | undefined`: Cursor configuration for pagination.
- `identifierField: FieldOfSchema<TSchema>`: The name of the identifier field from the schema.
- `schemaMetadata: TSchema['metadata']`: The metadata object from the schema.

**Main Methods (chainable):**

- **`resetSelect(): this`**: Configures the criteria to select all fields from its schema.
- **`setSelect(selectFields: Array<FieldOfSchema<TSchema>>): this`**: Specifies the fields to select. Disables `selectAll`.
- **`setTake(amount: number): this`**: Sets the number of records to take.
- **`setSkip(amount: number): this`**: Sets the number of records to skip.
- **`where<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Initializes the filter group with a condition.
- **`andWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Adds an AND condition to the current filter group.
- **`orWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Adds an OR condition, creating a new group if necessary.
- **`setCursor(cursorFilters: [...], operator: ..., order: ...): this`**: Configures cursor-based pagination.
- **`orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection, nullsFirst: boolean = false): this`**: Adds an ordering rule.
- **`join(joinAlias: string, criteriaToJoin: JoinCriteriaType<...>, withSelect: boolean = true): this`**: Adds a join condition.

[Back to Index](#index)

### `Filter`

Represents an individual filter condition. Instantiated internally when using the `where`, `andWhere`, `orWhere` methods of a `Criteria`.

**Constructor:**

- `constructor(primitive: FilterPrimitive<T, Operator>)`
  - Validates that `primitive.value` is of the correct type according to `primitive.operator`.

**Properties (getters):**

- `field: T`: The field the filter applies to.
- `operator: Operator`: The filter operator.
- `value: FilterValue<Operator>`: The filter value.

**Methods:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string, context: ...): TFilterVisitorOutput`: For the Visitor pattern, calls `visitor.visitFilter()`.
- `toPrimitive(): FilterPrimitive<T, Operator>`: Returns the primitive representation of the filter.

[Back to Index](#index)

### `FilterGroup`

Represents a group of filters (`Filter` or nested `FilterGroup`) connected by a `LogicalOperator` (AND/OR). Instantiated and managed internally by `CriteriaFilterManager`.

**Properties (getters):**

- `items: ReadonlyArray<Filter<T, FilterOperator> | FilterGroup<T>>`: The filters or filter groups within this group.
- `logicalOperator: LogicalOperator`: The logical operator (`AND` or `OR`) joining the `items`.

**Methods:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string, context: ...): void`: For the Visitor pattern, calls `visitor.visitAndGroup()` or `visitor.visitOrGroup()` based on the `logicalOperator`.
- `toPrimitive(): FilterGroupPrimitive<T>`: Returns the primitive representation of the filter group.

[Back to Index](#index)

### `Order`

Represents an ordering rule. Instantiated internally when using the `orderBy()` method of a `Criteria`.

**Properties (getters):**

- `sequenceId: number`: Sequence ID for stable ordering.
- `field: T`: The field to order by.
- `direction: OrderDirection`: The ordering direction (`ASC` or `DESC`).
- `nullsFirst: boolean`: Indicates if null values should be ordered first.

**Methods:**

- `toPrimitive(): OrderByPrimitive<T>`: Returns the primitive representation of the order rule.

[Back to Index](#index)

### `Cursor`

Represents the configuration for cursor-based pagination. Instantiated internally when using the `setCursor()` method of a `Criteria`.

**Properties (readonly):**

- `filters: [Filter<...>] | [Filter<...>, Filter<...>]`: The filters defining the cursor.
- `order: OrderDirection`: The ordering direction of the cursor.
- `operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN`: The cursor operator.

[Back to Index](#index)

---

## Abstract Classes (for Extension)

### `CriteriaTranslator`

Abstract class that serves as the base for creating specific translators for different data sources. It implements the Visitor pattern (`ICriteriaVisitor`) to process `Criteria` objects.

- **Generics:**
  - `TranslationContext`: The type of the mutable context object (e.g., a query builder) passed through the traversal.
  - `TranslationOutput` (optional, defaults to `TranslationContext`): The type of the final translation result.
  - `TFilterVisitorOutput` (optional, defaults to `any`): The specific output type for the `visitFilter` method.

- **Abstract Methods (to be implemented by child classes):**
  - **`translate(criteria: RootCriteria<...>, source: TranslationContext): TranslationOutput`**: The main public entry point to start the translation process.
  - `visitRoot(...): void`: Visits the root node of the Criteria tree to initialize the translation.
  - `visitInnerJoin(...): void`: Visits an Inner Join node to apply its logic.
  - `visitLeftJoin(...): void`: Visits a Left Join node to apply its logic.
  - `visitOuterJoin(...): void`: Visits an Outer Join node to apply its logic.
  - `visitFilter(...): TFilterVisitorOutput`: Visits a single Filter node and returns an intermediate representation of the condition.
  - `visitAndGroup(...): void`: Visits a group of filters joined by a logical AND.
  - `visitOrGroup(...): void`: Visits a group of filters joined by a logical OR.

[Back to Index](#index)

---

## Enums and Constants

### `FilterOperator`

Enumeration defining the available comparison operators for filters.
For a detailed explanation of each operator, its expected value, and code examples, please refer to the [Filter Operator Reference guide](../guides/filter-operators/en.md).

- **Values:**
  - `EQUALS` / `NOT_EQUALS`: Checks for equality or inequality.
  - `GREATER_THAN` / `GREATER_THAN_OR_EQUALS`: Checks if a value is greater than or greater than or equal to another.
  - `LESS_THAN` / `LESS_THAN_OR_EQUALS`: Checks if a value is less than or less than or equal to another.
  - `LIKE` / `NOT_LIKE`: Matches or does not match a pattern (case-sensitivity depends on DB).
  - `ILIKE` / `NOT_ILIKE`: Case-insensitive version of `LIKE` / `NOT_LIKE`.
  - `CONTAINS` / `NOT_CONTAINS`: Checks if a string value contains or does not contain a specific substring.
  - `STARTS_WITH`: Checks if a string value starts with a specific substring.
  - `ENDS_WITH`: Checks if a string value ends with a specific substring.
  - `MATCHES_REGEX`: Checks if a string value matches a regular expression pattern.
  - `IN` / `NOT_IN`: Checks if a value is or is not within a set of specified values.
  - `IS_NULL` / `IS_NOT_NULL`: Checks if a value is or is not NULL.
  - `BETWEEN` / `NOT_BETWEEN`: Checks if a value is within or outside a specified range (inclusive).
  - `JSON_PATH_VALUE_EQUALS` / `JSON_PATH_VALUE_NOT_EQUALS`: For JSON fields, checks if the value at a specific JSON path is equal or not equal to a primitive value.
  - `JSON_CONTAINS` / `JSON_NOT_CONTAINS`: Checks if a JSON document contains or does NOT contain a specified JSON value.
  - `JSON_CONTAINS_ANY` / `JSON_NOT_CONTAINS_ANY`: Checks if a JSON document contains AT LEAST ONE or does NOT contain AT LEAST ONE of the specified JSON values.
  - `JSON_CONTAINS_ALL` / `JSON_NOT_CONTAINS_ALL`: Checks if a JSON document contains ALL or does NOT contain ALL of the specified JSON values.
  - `ARRAY_CONTAINS_ELEMENT` / `ARRAY_NOT_CONTAINS_ELEMENT`: Checks if an array contains or does NOT contain a specific element.
  - `ARRAY_CONTAINS_ANY_ELEMENT` / `ARRAY_NOT_CONTAINS_ANY_ELEMENT`: Checks if an array contains AT LEAST ONE or does NOT contain AT LEAST ONE element from a given array.
  - `ARRAY_CONTAINS_ALL_ELEMENTS` / `ARRAY_NOT_CONTAINS_ALL_ELEMENTS`: Checks if an array contains ALL or does NOT contain ALL elements from a given array.
  - `ARRAY_EQUALS`: Checks if an array is equal to a given array (order-insensitive).
  - `ARRAY_EQUALS_STRICT`: Checks if an array is exactly equal to a given array (order-sensitive).
  - `SET_CONTAINS` / `SET_NOT_CONTAINS`: Checks if a collection field contains or does NOT contain a specific value.
  - `SET_CONTAINS_ANY` / `SET_NOT_CONTAINS_ANY`: Checks if a collection field contains AT LEAST ONE or does NOT contain AT LEAST ONE of the specified values.
  - `SET_CONTAINS_ALL` / `SET_NOT_CONTAINS_ALL`: Checks if a collection field contains ALL or does NOT contain ALL of the specified values.

[Back to Index](#index)

### `LogicalOperator`

Enumeration defining the logical operators for combining filter groups.

- **Values:**
  - `AND` (`AND`): All conditions must be met.
  - `OR` (`OR`): At least one condition must be met.

[Back to Index](#index)

### `OrderDirection`

Enumeration defining the direction of ordering.

- **Values:**
  - `ASC` (`ASC`): Ascending order.
  - `DESC` (`DESC`): Descending order.

[Back to Index](#index)

---

## Main Types and Interfaces (for Schema Definition and Typing)

### `CriteriaSchema`

Interface defining the structure of an entity schema. Schemas are crucial for type safety and validation.

- **Properties:**
  - `source_name: string`: The actual name of the table or collection in the database.
  - `alias: string`: A single, canonical alias for this entity.
  - `fields: readonly string[]`: An array of the names of queryable fields for this entity.
  - `identifier_field: string`: **(Mandatory)** The name of the field that uniquely identifies an entity of this schema. Must be one of the names in `fields`.
  - `relations: readonly SchemaJoins<string>[]` (optional): An array defining possible join relationships with other schemas.
  - `metadata?: { [key: string]: any }`: Optional metadata associated with the entire schema definition.

[Back to Index](#index)

### `GetTypedCriteriaSchema`

Helper function for defining schemas. It preserves the literal types of `fields` and `alias`, improving autocompletion and type validation.

- **Function:** `GetTypedCriteriaSchema<T extends CriteriaSchema>(schema: T): T`
- **Example:**

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'name', 'email'],
  identifier_field: 'id',
  relations: [
    {
      is_relation_id: false,
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
  ],
});
```

[Back to Index](#index)

### `FieldOfSchema`

Helper type that extracts the valid field names from a given `CriteriaSchema`.

- **Type:** `FieldOfSchema<T extends CriteriaSchema> = T['fields'][number];`

[Back to Index](#index)

### `JoinRelationType`

String union type representing the possible types of join relationships.

- **Possible Values:** `'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'`

[Back to Index](#index)

### `SchemaJoins`

Interface defining the structure of a join configuration within the `relations` property of a `CriteriaSchema`.

- **Properties:**
  - `relation_alias: string`: The alias for this specific join relation (e.g., `'posts'`, `'author'`).
  - `is_relation_id: boolean`: Indicates if this relation is purely an ID reference.
  - `relation_type: JoinRelationType`: The type of relationship.
  - `target_source_name: string`: The `source_name` of the schema being joined to.
  - `local_field: string | { pivot_field: string; reference: string }`: The field in the local entity for the join condition.
  - `relation_field: string | { pivot_field: string; reference: string }`: The field in the related entity for the join condition.
  - `pivot_source_name?: string`: The name of the pivot table (for `many_to_many` joins).
  - `metadata?: { [key: string]: any }`: Optional metadata associated with this specific join configuration.

[Back to Index](#index)

### `FilterPrimitive`

Interface defining the structure for an individual filter condition before it's instantiated as a `Filter` object.

- **Properties:**
  - `field: FieldOfSchema<...>`: The field to apply the filter to.
  - `operator: FilterOperator`: The filter operator.
  - `value: FilterValue<Operator>`: The filter value, whose type depends on the `Operator`.

[Back to Index](#index)

### `FilterGroupPrimitive`

Interface defining the structure for a group of filters before it's instantiated as a `FilterGroup` object.

- **Properties:**
  - `logicalOperator: LogicalOperator`: The logical operator (`AND` or `OR`) joining the `items`.
  - `items: ReadonlyArray<FilterPrimitive<...> | FilterGroupPrimitive<...>>`: Array of filters or nested filter groups.

[Back to Index](#index)

### `FilterValue`

Generic type representing the value associated with a filter, strongly typed according to the `FilterOperator` used.

[Back to Index](#index)

### `OrderByPrimitive`

Type defining the structure for an ordering rule before it's instantiated as an `Order` object.

- **Properties:**
  - `direction: OrderDirection`: The ordering direction.
  - `field: string`: The field to order by.
  - `sequence_id: number`: A unique ID for stable sorting.
  - `nulls_first: boolean`: If true, nulls are ordered first.

[Back to Index](#index)

### `ICriteriaBase`

Base interface defining common functionality for all criteria types.

[Back to Index](#index)

### `ICriteriaVisitor`

Interface for the Visitor pattern, implemented by `CriteriaTranslator`. Defines the `visit...` methods for each type of `Criteria` node.

- **Methods (return `void` unless specified):**
  - `visitRoot(...)`: Visits the root node of the Criteria tree to initialize the translation.
  - `visitInnerJoin(...)`: Visits an Inner Join node to apply its logic.
  - `visitLeftJoin(...)`: Visits a Left Join node to apply its logic.
  - `visitOuterJoin(...)`: Visits an Outer Join node to apply its logic.
  - `visitFilter(...): TFilterVisitorOutput`: Visits a single Filter node and returns an intermediate representation of the condition.
  - `visitAndGroup(...)`: Visits a group of filters joined by a logical AND.
  - `visitOrGroup(...)`: Visits a group of filters joined by a logical OR.

[Back to Index](#index)

### `IFilterExpression`

Interface implemented by `Filter` and `FilterGroup`.

- **Methods:**
  - `toPrimitive()`: Returns the primitive representation of the filter expression.

[Back to Index](#index)

### `StoredJoinDetails`

Interface defining the structure for storing the details of a configured join internally.

- **Properties:**
  - `parameters: PivotJoin<...> | SimpleJoin<...>`: The resolved join parameters.
  - `criteria: AnyJoinCriteria<...>`: The `Criteria` instance of the joined entity.

[Back to Index](#index)

### `AnyJoinCriteria`

Union type representing any type of join `Criteria` (`InnerJoinCriteria`, `LeftJoinCriteria`, `OuterJoinCriteria`).

[Back to Index](#index)

### `JoinCriteriaType`

Helper type that determines the type of the `Criteria` object to be passed to the `.join()` method, validating that the joined entity's `source_name` is configured in the parent schema.

[Back to Index](#index)

### `SpecificMatchingJoinConfig`

Helper type that extracts the specific join configuration from a parent schema that matches a given `relation_alias`.

[Back to Index](#index)

### `PivotJoin`

Type representing the fully resolved parameters for a `many-to-many` join via a pivot table, used internally.

- **Properties:**
  - `is_relation_id: boolean`: Indicates if this relation is purely an ID reference.
  - `with_select: boolean`: If true, the joined entity's fields are selected.
  - `relation_type: 'many_to_many'`
  - `parent_source_name: string`
  - `parent_alias: string`
  - `relation_alias: string`
  - `parent_identifier: string`
  - `pivot_source_name: string`
  - `local_field: { pivot_field: string; reference: string }`
  - `relation_field: { pivot_field: string; reference: string }`
  - `parent_schema_metadata: { [key: string]: any }`
  - `join_metadata: { [key: string]: any }`

[Back to Index](#index)

### `SimpleJoin`

Type representing the fully resolved parameters for a simple join (one-to-one, one-to-many, many-to-one), used internally.

- **Properties:**
  - `is_relation_id: boolean`: Indicates if this relation is purely an ID reference.
  - `with_select: boolean`: If true, the joined entity's fields are selected.
  - `relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one'`
  - `parent_source_name: string`
  - `parent_alias: string`
  - `relation_alias: string`
  - `parent_identifier: string`
  - `local_field: string`
  - `relation_field: string`
  - `parent_schema_metadata: { [key: string]: any }`
  - `join_metadata: { [key: string]: any }`

[Back to Index](#index)
