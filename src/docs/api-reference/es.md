# Referencia de API de @nulledexp/translatable-criteria

Esta sección proporciona una referencia detallada de las clases, interfaces, tipos y enumeraciones públicas exportadas por la librería `@nulledexp/translatable-criteria`.

## Índice

- **Clases Principales y Factorías**
  - `CriteriaFactory`
  - `RootCriteria`
  - `InnerJoinCriteria`
  - `LeftJoinCriteria`
  - `OuterJoinCriteria`
  - `Criteria` (Clase Abstracta Base)
  - `Filter`
  - `FilterGroup`
  - `Order`
  - `Cursor`
- **Clases Abstractas (para Extensión)**
  - `CriteriaTranslator`
- **Enumeraciones y Constantes**
  - `FilterOperator`
  - `LogicalOperator`
  - `OrderDirection`
- **Tipos e Interfaces Principales (para Definición de Esquemas y Tipado)**
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

## Clases Principales y Factorías

### `CriteriaFactory`

Proporciona métodos estáticos para crear instancias de diferentes tipos de `Criteria`. Simplifica la creación de objetos `Criteria` y asegura que se instancien con la configuración correcta de esquema y alias.

**Métodos Estáticos:**

- **`GetCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): RootCriteria<CSchema, Alias>`**
  - Crea una instancia de `RootCriteria`. Es el punto de partida para construir una consulta principal.
  - **Parámetros:**
    - `schema`: Una instancia de `CriteriaSchema` que define la estructura de la entidad raíz.
    - `alias`: Un alias válido (string) para la entidad raíz, definido dentro del `schema`.
  - **Retorna:** Una instancia de `RootCriteria`.
  - **Ejemplo:**

```typescript
import { CriteriaFactory, UserSchema } from '@nulledexp/translatable-criteria';
const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users');
```

- **`GetInnerJoinCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): InnerJoinCriteria<CSchema, Alias>`**
  - Crea una instancia de `InnerJoinCriteria`. Usado para definir un `INNER JOIN` en una consulta.
  - **Parámetros:**
    - `schema`: Una instancia de `CriteriaSchema` para la entidad a unir.
    - `alias`: Un alias válido para la entidad unida, definido en su `schema`.
  - **Retorna:** Una instancia de `InnerJoinCriteria`.
  - **Ejemplo:**

```typescript
import { CriteriaFactory, PostSchema } from '@nulledexp/translatable-criteria';
const postJoin = CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts');
// userCriteria.join(postJoin, { parent_field: 'id', join_field: 'user_id' });
```

- **`GetLeftJoinCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): LeftJoinCriteria<CSchema, Alias>`**

  - Crea una instancia de `LeftJoinCriteria`. Usado para definir un `LEFT JOIN`.
  - **Retorna:** Una instancia de `LeftJoinCriteria`.

- **`GetOuterJoinCriteria<CSchema extends CriteriaSchema, Alias extends SelectedAliasOf<CSchema>>(schema: CSchema, alias: Alias): OuterJoinCriteria<CSchema, Alias>`**
  - Crea una instancia de `OuterJoinCriteria`. Usado para definir un `FULL OUTER JOIN`.
  - **Retorna:** Una instancia de `OuterJoinCriteria`.

Volver al Índice

### `RootCriteria`

Representa el punto de partida de una consulta, dirigido a una entidad principal. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitRoot()`.
- `resetCriteria()`: Devuelve una nueva instancia de `RootCriteria` con la misma configuración de esquema y alias, pero con todos los demás estados (filtros, joins, etc.) reiniciados.

Volver al Índice

### `InnerJoinCriteria`

Representa un criterio de `INNER JOIN`. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetInnerJoinCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitInnerJoin()`.
- `resetCriteria()`: Devuelve una nueva instancia de `InnerJoinCriteria`.

Volver al Índice

### `LeftJoinCriteria`

Representa un criterio de `LEFT JOIN`. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetLeftJoinCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitLeftJoin()`.
- `resetCriteria()`: Devuelve una nueva instancia de `LeftJoinCriteria`.

Volver al Índice

### `OuterJoinCriteria`

Representa un criterio de `FULL OUTER JOIN`. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetOuterJoinCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitOuterJoin()`.
- `resetCriteria()`: Devuelve una nueva instancia de `OuterJoinCriteria`.

Volver al Índice

### `Criteria` (Clase Abstracta Base)

Clase base abstracta para todos los tipos de criterios (`RootCriteria`, `InnerJoinCriteria`, etc.). Proporciona la funcionalidad común para construir una consulta. No se instancia directamente.

**Propiedades Principales (accesibles a través de getters):**

- `select: FieldOfSchema<TSchema>[]`: Campos seleccionados. Si `selectAll` es `true`, devuelve todos los campos del esquema.
- `selectAll: boolean`: Indica si se deben seleccionar todos los campos.
- `take: number`: Número de registros a tomar (LIMIT).
- `skip: number`: Número de registros a omitir (OFFSET).
- `orders: ReadonlyArray<Order<FieldOfSchema<TSchema>>>`: Reglas de ordenamiento.
- `joins: ReadonlyArray<StoredJoinDetails<TSchema>>`: Configuraciones de join.
- `rootFilterGroup: FilterGroup`: Grupo de filtros raíz.
- `sourceName: TSchema['source_name']`: Nombre de la fuente del esquema.
- `alias: CurrentAlias`: Alias actual del criteria.
- `cursor: Cursor<...> | undefined`: Configuración del cursor para paginación.

**Métodos Principales (encadenables):**

- **`resetSelect(): this`**: Configura el criteria para seleccionar todos los campos de su esquema.
- **`setSelect(selectFields: Array<FieldOfSchema<TSchema>>): this`**: Especifica los campos a seleccionar. Desactiva `selectAll`.
- **`setTake(amount: number): this`**: Establece el número de registros a tomar.
- **`setSkip(amount: number): this`**: Establece el número de registros a omitir.
- **`orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection): this`**: Añade una regla de ordenamiento.
- **`where<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Inicia el grupo de filtros con una condición.
- **`andWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Añade una condición AND al grupo de filtros actual.
- **`orWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Añade una condición OR, creando un nuevo grupo si es necesario.
- **`join<...>(criteriaToJoin: ..., joinParameter: ...): this`**: Añade una condición de join.
- **`setCursor(cursorFilters: [...], operator: ..., order: ...): this`**: Configura la paginación basada en cursor.
- **`resetCriteria(): ICriteriaBase<TSchema, CurrentAlias>`**: Método abstracto que debe ser implementado por las clases hijas para devolver una nueva instancia reseteada.

Volver al Índice

### `Filter`

Representa una condición de filtro individual. Se instancia internamente al usar los métodos `where`, `andWhere`, `orWhere` de un `Criteria`.

**Constructor:**

- `constructor(primitive: FilterPrimitive<T, Operator>)`
  - Valida que el `primitive.value` sea del tipo correcto según el `primitive.operator`.

**Propiedades (getters):**

- `field: T`: El campo al que se aplica el filtro.
- `operator: Operator`: El operador de filtro.
- `value: FilterValue<Operator>`: El valor del filtro.

**Métodos:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string): TFilterVisitorOutput`: Para el patrón Visitor, llama a `visitor.visitFilter()`.
- `toPrimitive(): FilterPrimitive<T, Operator>`: Devuelve la representación primitiva del filtro.

Volver al Índice

### `FilterGroup`

Representa un grupo de filtros (`Filter` o anidados `FilterGroup`) conectados por un `LogicalOperator` (AND/OR). Se instancia y gestiona internamente por `CriteriaFilterManager` al usar los métodos `where`, `andWhere`, `orWhere`.

**Constructor:**

- `constructor(filterGroupPrimitive: FilterGroupPrimitive<T>)`
  - Normaliza el grupo de filtros primitivo (ej. aplanando grupos AND anidados).

**Propiedades (getters):**

- `items: ReadonlyArray<Filter<T, FilterOperator> | FilterGroup<T>>`: Los filtros o grupos de filtros dentro de este grupo.
- `logicalOperator: LogicalOperator`: El operador lógico (`AND` o `OR`) que une los `items`.

**Métodos:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string, context: ...): TranslationOutput`: Para el patrón Visitor, llama a `visitor.visitAndGroup()` o `visitor.visitOrGroup()` según el `logicalOperator`.
- `toPrimitive(): FilterGroupPrimitive<T>`: Devuelve la representación primitiva del grupo de filtros.

Volver al Índice

### `Order`

Representa una regla de ordenamiento. Se instancia internamente al usar el método `orderBy()` de un `Criteria`.

**Constructor:**

- `constructor(direction: OrderDirection, field: T)`
  - Asigna un `sequenceId` único globalmente para mantener un orden estable.

**Propiedades (getters):**

- `sequenceId: number`: ID de secuencia para ordenamiento estable.
- `field: T`: El campo por el cual ordenar.
- `direction: OrderDirection`: La dirección del ordenamiento (`ASC` o `DESC`).

**Métodos:**

- `toPrimitive(): OrderByPrimitive<T>`: Devuelve la representación primitiva de la regla de orden.

Volver al Índice

### `Cursor`

Representa la configuración para la paginación basada en cursor. Se instancia internamente al usar el método `setCursor()` de un `Criteria`.

**Constructor:**

- `constructor(filterPrimitive: readonly [Omit<FilterPrimitive<...>, 'operator'>] | readonly [Omit<FilterPrimitive<...>, 'operator'>, Omit<FilterPrimitive<...>, 'operator'>], operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN, order: OrderDirection)`
  - Valida que los campos y valores del cursor estén definidos y sean válidos.
  - Soporta 1 o 2 `FilterPrimitive` para cursores simples o compuestos.

**Propiedades (readonly):**

- `filters: [Filter<TFields, Operator>] | [Filter<TFields, Operator>, Filter<TFields, Operator>]`: Los filtros que definen el cursor.
- `order: OrderDirection`: La dirección de ordenamiento del cursor.
- `operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN`: El operador del cursor.

Volver al Índice

---

## Clases Abstractas (para Extensión)

### `CriteriaTranslator`

Clase abstracta que sirve como base para crear traductores específicos para diferentes fuentes de datos. Implementa el patrón Visitor (`ICriteriaVisitor`) para procesar los objetos `Criteria`.

- **Genéricos:**

  - `TranslationContext`: El tipo del objeto de contexto que se pasa y se modifica durante la traducción (ej. un `SelectQueryBuilder` de TypeORM).
  - `TranslationOutput` (opcional, por defecto es `TranslationContext`): El tipo del resultado final de la traducción.
  - `TFilterVisitorOutput` (opcional, por defecto es `any`): El tipo de salida específico para los métodos `visitFilter`, `visitAndGroup` y `visitOrGroup`.

- **Método Principal (para el usuario del traductor):**

  - **`translate(criteria: RootCriteria<...>, source: TranslationContext): TranslationOutput`**
    - Método público principal para iniciar el proceso de traducción.
    - **Parámetros:**
      - `criteria`: La instancia de `RootCriteria` a traducir.
      - `source`: El contexto inicial para la traducción (ej. una instancia de `SelectQueryBuilder`).
    - **Retorna:** El `TranslationOutput` (ej. el `SelectQueryBuilder` modificado o una cadena SQL).

- **Métodos Abstractos (a implementar por las clases hijas):**

  - `visitRoot(...)`
  - `visitInnerJoin(...)`
  - `visitLeftJoin(...)`
  - `visitOuterJoin(...)`
  - `visitFilter(...)`
  - `visitAndGroup(...)`
  - `visitOrGroup(...)`

  Estos métodos reciben el componente específico del `Criteria` (ej. `RootCriteria`, `Filter`), el alias actual o parámetros de join, y el `TranslationContext`. Deben devolver el `TranslationOutput` o el `TFilterVisitorOutput` según corresponda.

Volver al Índice

---

## Enumeraciones y Constantes

### `FilterOperator`

Enumeración que define los operadores de comparación disponibles para los filtros.

- **Valores:**
  - `EQUALS` (`=`): Igual a.
  - `NOT_EQUALS` (`!=`): No igual a.
  - `GREATER_THAN` (`>`): Mayor que.
  - `GREATER_THAN_OR_EQUALS` (`>=`): Mayor o igual que.
  - `LESS_THAN` (`<`): Menor que.
  - `LESS_THAN_OR_EQUALS` (`<=`): Menor o igual que.
  - `LIKE` (`LIKE`): Coincide con un patrón (sensible a mayúsculas/minúsculas según la BD).
  - `NOT_LIKE` (`NOT LIKE`): No coincide con un patrón.
  - `IN` (`IN`): El valor está dentro de un conjunto de valores.
  - `NOT_IN` (`NOT IN`): El valor no está dentro de un conjunto de valores.
  - `IS_NULL` (`IS NULL`): El valor es NULL.
  - `IS_NOT_NULL` (`IS NOT NULL`): El valor no es NULL.
  - `CONTAINS` (`CONTAINS`): Para búsqueda de subcadenas (a menudo insensible a mayúsculas/minúsculas según la BD).
  - `STARTS_WITH` (`STARTS_WITH`): Comienza con una subcadena específica.
  - `ENDS_WITH` (`ENDS_WITH`): Termina con una subcadena específica.
  - `NOT_CONTAINS` (`NOT_CONTAINS`): No contiene una subcadena específica.
  - `SET_CONTAINS`: Para campos tipo SET o arrays simples, busca si el conjunto contiene un valor.
  - `SET_NOT_CONTAINS`: Para campos tipo SET o arrays simples, busca si el conjunto NO contiene un valor.
  - `JSON_CONTAINS`: Para campos JSON, busca si el JSON contiene una estructura o valor específico en una ruta.
  - `JSON_NOT_CONTAINS`: Para campos JSON, busca si el JSON NO contiene una estructura o valor específico.
  - `ARRAY_CONTAINS_ELEMENT`: Para campos Array (nativo o JSON), busca si el array contiene un elemento.
  - `ARRAY_CONTAINS_ALL_ELEMENTS`: Para campos Array, busca si el array contiene todos los elementos de un array dado.
  - `ARRAY_CONTAINS_ANY_ELEMENT`: Para campos Array, busca si el array contiene alguno de los elementos de un array dado.
  - `ARRAY_EQUALS`: Para campos Array, busca si el array es exactamente igual a un array dado (orden y elementos).

Volver al Índice

### `LogicalOperator`

Enumeración que define los operadores lógicos para combinar grupos de filtros.

- **Valores:**
  - `AND` (`AND`): Todas las condiciones deben cumplirse.
  - `OR` (`OR`): Al menos una condición debe cumplirse.

Volver al Índice

### `OrderDirection`

Enumeración que define la dirección del ordenamiento.

- **Valores:**
  - `ASC` (`ASC`): Orden ascendente.
  - `DESC` (`DESC`): Orden descendente.

Volver al Índice

---

## Tipos e Interfaces Principales (para Definición de Esquemas y Tipado)

### `CriteriaSchema`

Interfaz que define la estructura de un esquema de entidad. Los esquemas son cruciales para la seguridad de tipos y la validación.

- **Propiedades:**
  - `source_name: string`: El nombre real de la tabla o colección en la base de datos.
  - `alias: readonly string[]`: Un array de posibles alias para esta entidad. El primero es usualmente el principal.
  - `fields: readonly string[]`: Un array de los nombres de los campos consultables de esta entidad.
  - `joins: readonly SchemaJoins<string>[]` (opcional): Un array que define las posibles relaciones de unión con otros esquemas.
    - `SchemaJoins<AliasUnion extends string>`:
      - `alias: AliasUnion`: El alias de la entidad unida (debe coincidir con un alias en el esquema de la entidad unida).
      - `join_relation_type: JoinRelationType`: El tipo de relación (ej. `'one_to_many'`).

Volver al Índice

### `GetTypedCriteriaSchema`

Función helper para definir esquemas. Preserva los tipos literales de `fields` y `alias`, mejorando el autocompletado y la validación de tipos.

- **Función:** `GetTypedCriteriaSchema<T extends MinimalCriteriaSchema>(schema: T): T`
  - **Parámetros:**
    - `schema`: Un objeto que se ajusta a la estructura `MinimalCriteriaSchema` (una versión más laxa de `CriteriaSchema` para la entrada).
  - **Retorna:** El mismo objeto `schema` de entrada, pero con sus tipos literales preservados.
  - **Ejemplo:**

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

const MiEsquemaUsuario = GetTypedCriteriaSchema({
  source_name: 'usuarios_tabla',
  alias: ['usuario', 'u'],
  fields: ['id', 'nombre', 'email'],
  joins: [{ alias: 'pedidos', join_relation_type: 'one_to_many' }],
});
// MiEsquemaUsuario ahora tiene tipos literales para alias y fields.
```

Volver al Índice

### `FieldOfSchema`

Tipo helper que extrae los nombres de los campos válidos de un `CriteriaSchema` dado.

- **Tipo:** `FieldOfSchema<T extends CriteriaSchema> = T['fields'][number];`

Volver al Índice

### `SelectedAliasOf`

Tipo helper que extrae los alias válidos de un `CriteriaSchema` dado.

- **Tipo:** `SelectedAliasOf<T extends CriteriaSchema> = T['alias'][number];`

Volver al Índice

### `JoinRelationType`

Tipo unión de strings que representa los tipos de relaciones de join posibles.

- **Valores Posibles:** `'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'`

Volver al Índice

### `SchemaJoins`

Interfaz que define la estructura de una configuración de join dentro de la propiedad `joins` de un `CriteriaSchema`.

- **Propiedades:**
  - `alias: AliasUnion`: El alias de la entidad con la que se une.
  - `join_relation_type: JoinRelationType`: El tipo de relación.

Volver al Índice

### `FilterPrimitive`

Interfaz que define la estructura para una condición de filtro individual antes de ser instanciada como un objeto `Filter`.

- **Genéricos:**
  - `Field extends FieldOfSchema<CriteriaSchema>`: El tipo de los campos válidos.
  - `Operator extends FilterOperator`: El operador de filtro específico.
- **Propiedades:**
  - `field: Field`: El campo al que se aplica el filtro.
  - `operator: Operator`: El operador de filtro.
  - `value: FilterValue<Operator>`: El valor del filtro, cuyo tipo depende del `Operator`.

Volver al Índice

### `FilterGroupPrimitive`

Interfaz que define la estructura para un grupo de filtros antes de ser instanciado como un objeto `FilterGroup`.

- **Genéricos:**
  - `Field extends string`: El tipo de los campos válidos.
- **Propiedades:**
  - `logicalOperator: LogicalOperator`: El operador lógico (`AND` o `OR`) que une los `items`.
  - `items: ReadonlyArray<FilterPrimitive<Field, FilterOperator> | FilterGroupPrimitive<Field>>`: Array de filtros o grupos de filtros anidados.

Volver al Índice

### `FilterValue`

Tipo genérico que representa el valor asociado con un filtro, fuertemente tipado según el `FilterOperator` utilizado.

- **Definición (conceptual):**
  - Si `Operator` es `LIKE`, `CONTAINS`, etc. => `string`
  - Si `Operator` es `EQUALS`, `GREATER_THAN`, etc. => `PrimitiveFilterValue` (string | number | boolean | Date | null)
  - Si `Operator` es `IN`, `NOT_IN` => `Array<Exclude<PrimitiveFilterValue, null | undefined>>`
  - Si `Operator` es `ARRAY_CONTAINS_ELEMENT` => `PrimitiveFilterValue | { [jsonPath: string]: PrimitiveFilterValue }`
  - Si `Operator` es `ARRAY_CONTAINS_ALL_ELEMENTS`, etc. => `Array<...> | { [jsonPath: string]: Array<...> }`
  - Si `Operator` es `IS_NULL`, `IS_NOT_NULL` => `null | undefined`
  - Si `Operator` es `JSON_CONTAINS`, etc. => `{ [jsonPath: string]: PrimitiveFilterValue | Array<any> | Record<string, any> }`

Volver al Índice

### `OrderByPrimitive`

Tipo que define la estructura para una regla de ordenamiento antes de ser instanciada como un objeto `Order`.

- **Genéricos:**
  - `T extends string`: El tipo de los campos válidos.
- **Propiedades:**
  - `direction: OrderDirection`: La dirección del ordenamiento.
  - `field: T`: El campo por el cual ordenar.

Volver al Índice

### `PivotJoinInput`

Tipo que representa los parámetros de entrada para una unión `many-to-many` a través de una tabla pivote, tal como los proporciona el usuario al método `.join()`.

- **Genéricos:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
- **Propiedades:**
  - `pivot_source_name: string`: Nombre de la tabla pivote.
  - `parent_field: { pivot_field: string; reference: FieldOfSchema<ParentSchema> }`: Configuración del campo de la entidad padre que referencia la tabla pivote.
  - `join_field: { pivot_field: string; reference: FieldOfSchema<JoinSchema> }`: Configuración del campo de la entidad unida que referencia la tabla pivote.

Volver al Índice

### `SimpleJoinInput`

Tipo que representa los parámetros de entrada para una unión simple (one-to-one, one-to-many, many-to-one), tal como los proporciona el usuario al método `.join()`.

- **Genéricos:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
- **Propiedades:**
  - `parent_field: FieldOfSchema<ParentSchema>`: Campo en la entidad padre para la condición de join.
  - `join_field: FieldOfSchema<JoinSchema>`: Campo en la entidad unida para la condición de join.

Volver al Índice

### `ICriteriaBase`

Interfaz base que define la funcionalidad común para todos los tipos de criterios.

- **Genéricos:**
  - `TSchema extends CriteriaSchema`
  - `CurrentAlias extends SelectedAliasOf<TSchema>`
- **Métodos Principales (ver `Criteria` para detalles):**
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
- **Propiedades (getters):** `select`, `selectAll`, `take`, `skip`, `orders`, `joins`, `rootFilterGroup`, `sourceName`, `alias`, `cursor`.

Volver al Índice

### `ICriteriaVisitor`

Interfaz para el patrón Visitor, implementada por `CriteriaTranslator`. Define los métodos `visit...` para cada tipo de nodo del `Criteria`.

- **Genéricos:**
  - `TranslationContext`
  - `TranslationOutput`
  - `TFilterVisitorOutput`
- **Métodos (ver `CriteriaTranslator` para detalles):**
  - `visitRoot(...)`
  - `visitInnerJoin(...)`
  - `visitLeftJoin(...)`
  - `visitOuterJoin(...)`
  - `visitFilter(...)`
  - `visitAndGroup(...)`
  - `visitOrGroup(...)`

Volver al Índice

### `IFilterExpression`

Interfaz implementada por `Filter` y `FilterGroup`.

- **Métodos:**
  - `toPrimitive(): FilterPrimitive<...> | FilterGroupPrimitive<...>`: Devuelve la representación primitiva de la expresión de filtro.

Volver al Índice

### `StoredJoinDetails`

Interfaz que define la estructura para almacenar los detalles de una unión configurada internamente.

- **Genéricos:**
  - `ParentSchema extends CriteriaSchema`
- **Propiedades:**
  - `parameters: PivotJoin<...> | SimpleJoin<...>`: Los parámetros resueltos del join.
  - `criteria: AnyJoinCriteria<...>`: La instancia del `Criteria` de la entidad unida.

Volver al Índice

### `AnyJoinCriteria`

Tipo unión que representa cualquier tipo de `Criteria` de join (`InnerJoinCriteria`, `LeftJoinCriteria`, `OuterJoinCriteria`).

Volver al Índice

### `JoinCriteriaParameterType`

Tipo helper que determina el tipo del objeto `Criteria` que se debe pasar al método `.join()`, validando que el alias de la entidad unida esté configurado en el esquema padre.

Volver al Índice

### `JoinParameterType`

Tipo helper que determina la forma esperada del objeto de parámetros de join para el método `.join()`, basándose en el `join_relation_type` definido en el esquema padre.

Volver al Índice

### `SpecificMatchingJoinConfig`

Tipo helper que extrae la configuración de join específica de un esquema padre que coincide con un alias de entidad unida dado.

Volver al Índice

### `PivotJoin`

Tipo que representa los parámetros completamente resueltos para una unión `many-to-many` a través de una tabla pivote, usado internamente.

- **Genéricos:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
  - `TJoinRelationType extends JoinRelationType`
- **Propiedades:**
  - `parent_to_join_relation_type: TJoinRelationType`
  - `parent_source_name: ParentSchema['source_name']`
  - `parent_alias: ParentSchema['alias'][number]`
  - `pivot_source_name: string`
  - `parent_field: { pivot_field: string; reference: FieldOfSchema<ParentSchema> }`
  - `join_field: { pivot_field: string; reference: FieldOfSchema<JoinSchema> }`

Volver al Índice

### `SimpleJoin`

Tipo que representa los parámetros completamente resueltos para una unión simple (one-to-one, one-to-many, many-to-one), usado internamente.

- **Genéricos:**
  - `ParentSchema extends CriteriaSchema`
  - `JoinSchema extends CriteriaSchema`
  - `TJoinRelationType extends JoinRelationType`
- **Propiedades:**
  - `parent_to_join_relation_type: TJoinRelationType`
  - `parent_source_name: ParentSchema['source_name']`
  - `parent_alias: ParentSchema['alias'][number]`
  - `parent_field: FieldOfSchema<ParentSchema>`
  - `join_field: FieldOfSchema<JoinSchema>`

Volver al Índice

---
