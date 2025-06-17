# API Reference for @nulledexp/translatable-criteria

This section provides a detailed reference for the public classes, interfaces, types, and enumerations exported by the `@nulledexp/translatable-criteria` library.

## Index

- **Main Classes and Factories**
  - `CriteriaFactory`
  - `RootCriteria`
  - `InnerJoinCriteria`
  - `LeftJoinCriteria`
  - `OuterJoinCriteria`
  - `Criteria` (Abstract Base Class)
  - `Filter`
  - `FilterGroup`
  - `Order`
  - `Cursor`
- **Abstract Classes (for Extension)**
  - `CriteriaTranslator`
- **Enums and Constants**
  - `FilterOperator`
  - `LogicalOperator`
  - `OrderDirection`
- **Main Types and Interfaces (for Schema Definition and Typing)**
  - `CriteriaSchema`
  - `GetTypedCriteriaSchema`
  - `FieldOfSchema`
  - `SelectedAliasOf`
  - `JoinRelationType`
  - `SchemaJoins`
  - `FilterPrimitive`
  - `FilterGroupPrimitive`
  - `FilterValue`
  - `OrderByPrimitive`
  - `PivotJoinInput`
  - `SimpleJoinInput`
  - `ICriteriaBase`
  - `ICriteriaVisitor`
  - `IFilterExpression`
  - `StoredJoinDetails`
  - `AnyJoinCriteria`
  - `JoinCriteriaParameterType`
  - `JoinParameterType`
  - `SpecificMatchingJoinConfig`
  - `PivotJoin`
  - `SimpleJoin`

---

## Main Classes and Factories

### `CriteriaFactory`

Provides static methods for creating instances of different types of `Criteria`. It simplifies the creation of `Criteria` objects and ensures they are instantiated with the correct schema and alias configuration.

**Static Methods:**

- **`GetCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): RootCriteria<CSchema, Alias>`**
  - Creates an instance of `RootCriteria`. This is the starting point for building a main query.
  - **Parameters:**
    - `schema`: An instance of `CriteriaSchema` that defines the structure of the root entity.
    - `alias`: A valid alias (string) for the root entity, defined within the `schema`.
  - **Returns:** An instance of `RootCriteria`.
  - **Example:**

```typescript
import { CriteriaFactory, UserSchema } from '@nulledexp/translatable-criteria';
const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users');
```

- **`GetInnerJoinCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): InnerJoinCriteria<CSchema, Alias>`**
  - Creates an instance of `InnerJoinCriteria`. Used to define an `INNER JOIN` in a query.
  - **Parameters:**
    - `schema`: An instance of `CriteriaSchema` for the entity to be joined.
    - `alias`: A valid alias for the joined entity, defined in its `schema`.
  - **Returns:** An instance of `InnerJoinCriteria`.
  - **Example:**

```typescript
import { CriteriaFactory, PostSchema } from '@nulledexp/translatable-criteria';
const postJoin = CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts');
// userCriteria.join(postJoin, { parent_field: 'id', join_field: 'user_id' });
```

- **`GetLeftJoinCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): LeftJoinCriteria<CSchema, Alias>`**

  - Creates an instance of `LeftJoinCriteria`. Used to define a `LEFT JOIN`.
  - **Returns:** An instance of `LeftJoinCriteria`.

- **`GetOuterJoinCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): OuterJoinCriteria<CSchema, Alias>`**
  - Creates an instance of `OuterJoinCriteria`. Used to define a `FULL OUTER JOIN`.
  - **Returns:** An instance of `OuterJoinCriteria`.

Back to Index

### `RootCriteria`

Represents the starting point of a query, targeting a main entity. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitRoot()`.
- `resetCriteria()`: Returns a new instance of `RootCriteria` with the same schema and alias configuration, but with all other states (filters, joins, etc.) reset.

Back to Index

### `InnerJoinCriteria`

Represents an `INNER JOIN` criterion. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetInnerJoinCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitInnerJoin()`.
- `resetCriteria()`: Returns a new instance of `InnerJoinCriteria`.

Back to Index

### `LeftJoinCriteria`

Represents a `LEFT JOIN` criterion. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetLeftJoinCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitLeftJoin()`.
- `resetCriteria()`: Returns a new instance of `LeftJoinCriteria`.

Back to Index

### `OuterJoinCriteria`

Represents a `FULL OUTER JOIN` criterion. Extends from `Criteria`.
Instantiated via `CriteriaFactory.GetOuterJoinCriteria()`.

**Main Methods (in addition to those inherited from `Criteria`):**

- Implements `accept` for the Visitor pattern, calling `visitor.visitOuterJoin()`.
- `resetCriteria()`: Returns a new instance of `OuterJoinCriteria`.

Back to Index

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
- `alias: CurrentAlias`: Current alias of the criteria.
- `cursor: Cursor<...> | undefined`: Cursor configuration for pagination.

**Main Methods (chainable):**

- **`resetSelect(): this`**: Configures the criteria to select all fields from its schema.
- **`setSelect(selectFields: Array<FieldOfSchema<TSchema>>): this`**: Specifies the fields to select. Disables `selectAll`.
- **`setTake(amount: number): this`**: Sets the number of records to take.
- **`setSkip(amount: number): this`**: Sets the number of records to skip.
- **`orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection): this`**: Adds an ordering rule.
- **`where<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Initializes the filter group with a condition.
- **`andWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Adds an AND condition to the current filter group.
- **`orWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Adds an OR condition, creating a new group if necessary.
- **`join<...>(criteriaToJoin: ..., joinParameter: ...): this`**: Adds a join condition.
- **`setCursor(cursorFilters: [...], operator: ..., order: ...): this`**: Configures cursor-based pagination.
- **`resetCriteria(): ICriteriaBase<TSchema, CurrentAlias>`**: Abstract method that must be implemented by child classes to return a new reset instance.

Back to Index

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

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string): TFilterVisitorOutput`: For the Visitor pattern, calls `visitor.visitFilter()`.
- `toPrimitive(): FilterPrimitive<T, Operator>`: Returns the primitive representation of the filter.

Back to Index

### `FilterGroup`

Represents a group of filters (`Filter` or nested `FilterGroup`) connected by a `LogicalOperator` (AND/OR). Instantiated and managed internally by `CriteriaFilterManager` when using `where`, `andWhere`, `orWhere` methods.

**Constructor:**

- `constructor(filterGroupPrimitive: FilterGroupPrimitive<T>)`
  - Normalizes the primitive filter group (e.g., flattening nested AND groups).

**Properties (getters):**

- `items: ReadonlyArray<Filter<T, FilterOperator> | FilterGroup<T>>`: The filters or filter groups within this group.
- `logicalOperator: LogicalOperator`: The logical operator (`AND` or `OR`) joining the `items`.

**Methods:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string, context: ...): TranslationOutput`: For the Visitor pattern, calls `visitor.visitAndGroup()` or `visitor.visitOrGroup()` based on the `logicalOperator`.
- `toPrimitive(): FilterGroupPrimitive<T>`: Returns the primitive representation of the filter group.

Back to Index

### `Order`

Represents an ordering rule. Instantiated internally when using the `orderBy()` method of a `Criteria`.

**Constructor:**

- `constructor(direction: OrderDirection, field: T)`
  - Assigns a globally unique `sequenceId` to maintain a stable order.

**Properties (getters):**

- `sequenceId: number`: Sequence ID for stable ordering.
- `field: T`: The field to order by.
- `direction: OrderDirection`: The ordering direction (`ASC` or `DESC`).

**Methods:**

- `toPrimitive(): OrderByPrimitive<T>`: Returns the primitive representation of the order rule.

Back to Index

### `Cursor`

Represents the configuration for cursor-based pagination. Instantiated internally when using the `setCursor()` method of a `Criteria`.

**Constructor:**

- `constructor(filterPrimitive: readonly [Omit<FilterPrimitive<...>, 'operator'>] | readonly [Omit<FilterPrimitive<...>, 'operator'>, Omit<FilterPrimitive<...>, 'operator'>], operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN, order: OrderDirection)`
  - Validates that cursor fields and values are defined and valid.
  - Supports 1 or 2 `FilterPrimitive`s for simple or composite cursors.

**Properties (readonly):**

- `filters: [Filter<TFields, Operator>] | [Filter<TFields, Operator>, Filter<TFields, Operator>]`: The filters defining the cursor.
- `order: OrderDirection`: The ordering direction of the cursor.
- `operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN`: The cursor operator.

Back to Index

---

## Abstract Classes (for Extension)

### `CriteriaTranslator`

Abstract class that serves as the base for creating specific translators for different data sources. It implements the Visitor pattern (`ICriteriaVisitor`) to process `Criteria` objects.

- **Generics:**

  - `TranslationContext`: The type of the context object that is passed and modified during translation (e.g., a TypeORM `SelectQueryBuilder`).
  - `TranslationOutput` (optional, defaults to `TranslationContext`): The type of the final translation result.
  - `TFilterVisitorOutput` (optional, defaults to `any`): The specific output type for the `visitFilter`, `visitAndGroup`, and `visitOrGroup` methods.

- **Main Method (for the translator user):**

  - **`translate(criteria: RootCriteria<...>, source: TranslationContext): TranslationOutput`**
    - Main public method to start the translation process.
    - **Parameters:**
      - `criteria`: The `RootCriteria` instance to translate.
      - `source`: The initial context for the translation (e.g., a `SelectQueryBuilder` instance).
    - **Returns:** The `TranslationOutput` (e.g., the modified `SelectQueryBuilder` or an SQL string).

- **Abstract Methods (to be implemented by child classes):**

  - `visitRoot(...)`
  - `visitInnerJoin(...)`
  - `visitLeftJoin(...)`
  - `visitOuterJoin(...)`
  - `visitFilter(...)`
  - `visitAndGroup(...)`
  - `visitOrGroup(...)`

  These methods receive the specific `Criteria` component (e.g., `RootCriteria`, `Filter`), the current alias or join parameters, and the `TranslationContext`. They should return the `TranslationOutput` or `TFilterVisitorOutput` as appropriate.

Back to Index

---

## Enums and Constants

### `FilterOperator`

Enumeration defining the available comparison operators for filters.

- **Values:**
  - `EQUALS` (`=`): Equal to.
  - `NOT_EQUALS` (`!=`): Not equal to.
  - `GREATER_THAN` (`>`): Greater than.
  - `GREATER_THAN_OR_EQUALS` (`>=`): Greater than or equal to.
  - `LESS_THAN` (`<`): Less than.
  - `LESS_THAN_OR_EQUALS` (`<=`): Less than or equal to.
  - `LIKE` (`LIKE`): Matches a pattern (case sensitivity depends on the DB).
  - `NOT_LIKE` (`NOT LIKE`): Does not match a pattern.
  - `IN` (`IN`): The value is within a set of values.
  - `NOT_IN` (`NOT IN`): The value is not within a set of values.
  - `IS_NULL` (`IS NULL`): The value is NULL.
  - `IS_NOT_NULL` (`IS NOT NULL`): The value is not NULL.
  - `CONTAINS` (`CONTAINS`): For substring search (often case-insensitive, depends on the DB).
  - `STARTS_WITH` (`STARTS_WITH`): Starts with a specific substring.
  - `ENDS_WITH` (`ENDS_WITH`): Ends with a specific substring.
  - `NOT_CONTAINS` (`NOT_CONTAINS`): Does not contain a specific substring.
  - `SET_CONTAINS`: For SET-type fields or simple arrays, checks if the set contains a value.
  - `SET_NOT_CONTAINS`: For SET-type fields or simple arrays, checks if the set does NOT contain a value.
  - `JSON_CONTAINS`: For JSON fields, checks if the JSON contains a specific structure or value at a path.
  - `JSON_NOT_CONTAINS`: For JSON fields, checks if the JSON does NOT contain a specific structure or value.
  - `ARRAY_CONTAINS_ELEMENT`: For Array fields (native or JSON), checks if the array contains an element.
  - `ARRAY_CONTAINS_ALL_ELEMENTS`: For Array fields, checks if the array contains all elements from a given array.
  - `ARRAY_CONTAINS_ANY_ELEMENT`: For Array fields, checks if the array contains any of the elements from a given array.
  - `ARRAY_EQUALS`: For Array fields, checks if the array is exactly equal to a given array (order and elements).

Back to Index

### `LogicalOperator`

Enumeration defining the logical operators for combining filter groups.

- **Values:**
  - `AND` (`AND`): All conditions must be met.
  - `OR` (`OR`): At least one condition must be met.

Back to Index

### `OrderDirection`

Enumeration defining the direction of ordering.

- **Values:**
  - `ASC` (`ASC`): Ascending order.
  - `DESC` (`DESC`): Descending order.

Back to Index

---

## Main Types and Interfaces (for Schema Definition and Typing)

### `CriteriaSchema`

Interface defining the structure of an entity schema. Schemas are crucial for type safety and validation.

- **Properties:**
  - `source_name: string`: The actual name of the table or collection in the database.
  - `alias: readonly string[]`: An array of possible aliases for this entity. The first is usually the primary one.
  - `fields: readonly string[]`: An array of the names of queryable fields for this entity.
  - `joins: readonly SchemaJoins<string>[]` (optional): An array defining possible join relationships with other schemas.
    - `SchemaJoins<AliasUnion extends string>`:
      - `alias: AliasUnion`: The alias of the joined entity (must match an alias in the joined entity's schema).
      - `join_relation_type: JoinRelationType`: The type of relationship (e.g., `'one_to_many'`).

Back to Index

### `GetTypedCriteriaSchema`

Helper function for defining schemas. It preserves the literal types of `fields` and `alias`, improving autocompletion and type validation.

- **Function:** `GetTypedCriteriaSchema<T extends MinimalCriteriaSchema>(schema: T): T`
  - **Parameters:**
    - `schema`: An object conforming to the `MinimalCriteriaSchema` structure (a looser version of `CriteriaSchema` for input).
  - **Returns:** The same input `schema` object, but with its literal types preserved.
  - **Example:**

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

const MyUserSchema = GetTypedCriteriaSchema({
  source_name: 'user_table',
  alias: ['user', 'u'],
  fields: ['id', 'name', 'email'],
  joins: [{ alias: 'orders', join_relation_type: 'one_to_many' }],
});
// MyUserSchema now has literal types for alias and fields.
```

Back to Index

### `FieldOfSchema`

Helper type that extracts the valid field names from a given `CriteriaSchema`.

- **Type:** `FieldOfSchema<T extends CriteriaSchema> = T['fields'][number];`

Back to Index

### `SelectedAliasOf`

Helper type that extracts the valid aliases from a given `CriteriaSchema`.

- **Type:** `SelectedAliasOf<T extends CriteriaSchema> = T['alias'][number];`

Back to Index

### `JoinRelationType`

String union type representing the possible types of join relationships.

- **Possible Values:** `'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'`

Back to Index

### `SchemaJoins`

Interface defining the structure of a join configuration within the `joins` property of a `CriteriaSchema`.

- **Properties:**
  - `alias: AliasUnion`: The alias of the entity being joined to.
  - `join_relation_type: JoinRelationType`: The type of relationship.

Back to Index

### `FilterPrimitive`

Interface defining the structure for an individual filter condition before it's instantiated as a `Filter` object.

- **Generics:**
  - `Field extends FieldOfSchema<CriteriaSchema>`: The type of valid fields.
  - `Operator extends FilterOperator`: The specific filter operator.
- **Properties:**
  - `field: Field`: The field to apply the filter to.
  - `operator: Operator`: The filter operator.
  - `value: FilterValue<Operator>`: The filter value, whose type depends on the `Operator`.

Back to Index

### `FilterGroupPrimitive`

Interface defining the structure for a group of filters before it's instantiated as a `FilterGroup` object.

- **Generics:**
  - `Field extends string`: The type of valid fields.
- **Properties:**
  - `logicalOperator: LogicalOperator`: The logical operator (`AND` or `OR`) joining the `items`.
  - `items: ReadonlyArray<FilterPrimitive<Field, FilterOperator> | FilterGroupPrimitive<Field>>`: Array of filters or nested filter groups.

Back to Index

### `FilterValue`

Generic type representing the value associated with a filter, strongly typed according to the `FilterOperator` used.

- **Definition (conceptual):**
  - If `Operator` is `LIKE`, `CONTAINS`, etc. => `string`
  - If `Operator` is `EQUALS`, `GREATER_THAN`, etc. => `PrimitiveFilterValue` (string | number | boolean | Date | null)
  - If `Operator` is `IN`, `NOT_IN` => `Array<Exclude<PrimitiveFilterValue, null | undefined>>`
  - If `Operator` is `ARRAY_CONTAINS_ELEMENT` => `PrimitiveFilterValue | { [jsonPath: string]: PrimitiveFilterValue }`
  - If `Operator` is `ARRAY_CONTAINS_ALL_ELEMENTS`, etc. => `Array<...> | { [jsonPath: string]: Array<...> }`
  - If `Operator` is `IS_NULL`, `IS_NOT_NULL` => `null | undefined`
  - If `Operator` is `JSON_CONTAINS`, etc. => `{ [jsonPath: string]: PrimitiveFilterValue | Array<any> | Record<string, any> }`

Back to Index

### `OrderByPrimitive`

Type defining the structure for an ordering rule before it's instantiated as an `Order` object.

- **Generics:**
  - `T extends string`: The type of valid fields.
- **Properties:**
  - `direction: OrderDirection`: The ordering direction.
  - `field: T`: The field to order by.

Back to Index

### `PivotJoinInput`

Type representing the input parameters for a `many-to-many` join via a pivot table, as provided by the user to the `.join()` method.

- **Generics:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
- **Properties:**
  - `pivot_source_name: string`: Name of the pivot table.
  - `parent_field: { pivot_field: string; reference: FieldOfSchema<ParentSchema> }`: Configuration of the parent entity's field referencing the pivot table.
  - `join_field: { pivot_field: string; reference: FieldOfSchema<JoinSchema> }`: Configuration of the joined entity's field referencing the pivot table.

Back to Index

### `SimpleJoinInput`

Type representing the input parameters for a simple join (one-to-one, one-to-many, many-to-one), as provided by the user to the `.join()` method.

- **Generics:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
- **Properties:**
  - `parent_field: FieldOfSchema<ParentSchema>`: Field in the parent entity for the join condition.
  - `join_field: FieldOfSchema<JoinSchema>`: Field in the joined entity for the join condition.

Back to Index

### `ICriteriaBase`

Base interface defining common functionality for all criteria types.

- **Generics:**
  - `TSchema extends CriteriaSchema`
  - `CurrentAlias extends SelectedAliasOf<TSchema>`
- **Main Methods (see `Criteria` for details):**
  - `resetSelect()`
  - `setSelect(...)`
  - `setTake(...)`
  - `setSkip(...)`
  - `orderBy(...)`
  - `where(...)`
  - `andWhere(...)`
  - `orWhere(...)`
  - `join(...)`
  - `setCursor(...)`
  - `resetCriteria()`
- **Properties (getters):** `select`, `selectAll`, `take`, `skip`, `orders`, `joins`, `rootFilterGroup`, `sourceName`, `alias`, `cursor`.

Back to Index

### `ICriteriaVisitor`

Interface for the Visitor pattern, implemented by `CriteriaTranslator`. Defines the `visit...` methods for each type of `Criteria` node.

- **Generics:**
  - `TranslationContext`
  - `TranslationOutput`
  - `TFilterVisitorOutput`
- **Methods (see `CriteriaTranslator` for details):**
  - `visitRoot(...)`
  - `visitInnerJoin(...)`
  - `visitLeftJoin(...)`
  - `visitOuterJoin(...)`
  - `visitFilter(...)`
  - `visitAndGroup(...)`
  - `visitOrGroup(...)`

Back to Index

### `IFilterExpression`

Interface implemented by `Filter` and `FilterGroup`.

- **Methods:**
  - `toPrimitive(): FilterPrimitive<...> | FilterGroupPrimitive<...>`: Returns the primitive representation of the filter expression.

Back to Index

### `StoredJoinDetails`

Interface defining the structure for storing the details of a configured join internally.

- **Generics:**
  - `ParentSchema extends CriteriaSchema`
- **Properties:**
  - `parameters: PivotJoin<...> | SimpleJoin<...>`: The resolved join parameters.
  - `criteria: AnyJoinCriteria<...>`: The `Criteria` instance of the joined entity.

Back to Index

### `AnyJoinCriteria`

Union type representing any type of join `Criteria` (`InnerJoinCriteria`, `LeftJoinCriteria`, `OuterJoinCriteria`).

Back to Index

### `JoinCriteriaParameterType`

Helper type that determines the type of the `Criteria` object to be passed to the `.join()` method, validating that the joined entity's alias is configured in the parent schema.

Back to Index

### `JoinParameterType`

Helper type that determines the expected shape of the join parameters object for the `.join()` method, based on the `join_relation_type` defined in the parent schema.

Back to Index

### `SpecificMatchingJoinConfig`

Helper type that extracts the specific join configuration from a parent schema that matches a given joined entity alias.

Back to Index

### `PivotJoin`

Type representing the fully resolved parameters for a `many-to-many` join via a pivot table, used internally.

- **Generics:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
  - `TJoinRelationType extends JoinRelationType`
- **Properties:**
  - `parent_to_join_relation_type: TJoinRelationType`
  - `parent_source_name: ParentSchema['source_name']`
  - `parent_alias: ParentSchema['alias'][number]`
  - `pivot_source_name: string`
  - `parent_field: { pivot_field: string; reference: FieldOfSchema<ParentSchema> }`
  - `join_field: { pivot_field: string; reference: FieldOfSchema<JoinSchema> }`

Back to Index

### `SimpleJoin`

Type representing the fully resolved parameters for a simple join (one-to-one, one-to-many, many-to-one), used internally.

- **Generics:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
  - `TJoinRelationType extends JoinRelationType`
- **Properties:**
  - `parent_to_join_relation_type: TJoinRelationType`
  - `parent_source_name: ParentSchema['source_name']`
  - `parent_alias: ParentSchema['alias'][number]`
  - `parent_field: FieldOfSchema<ParentSchema>`
  - `join_field: FieldOfSchema<JoinSchema>`

Back to Index

---
