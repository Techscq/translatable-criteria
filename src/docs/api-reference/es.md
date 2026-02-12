# Referencia de la API para @nulledexp/translatable-criteria

Esta sección proporciona una referencia detallada de las clases públicas, interfaces, tipos y enumeraciones exportadas por la librería `@nulledexp/translatable-criteria`.

## Índice

- [**Clases Principales y Factorías**](#clases-principales-y-factorías)
  - [`CriteriaFactory`](#criteriafactory)
  - [`RootCriteria`](#rootcriteria)
  - [`InnerJoinCriteria`](#innerjoincriteria)
  - [`LeftJoinCriteria`](#leftjoincriteria)
  - [`OuterJoinCriteria`](#outerjoincriteria)
  - [`Criteria` (Clase Base Abstracta)](#criteria-clase-base-abstracta)
  - [`Filter`](#filter)
  - [`FilterGroup`](#filtergroup)
  - [`Order`](#order)
  - [`Cursor`](#cursor)
- [**Clases Abstractas (para Extensión)**](#clases-abstractas-para-extensión)
  - [`CriteriaTranslator`](#criteriatranslator)
- [**Enums y Constantes**](#enums-y-constantes)
  - [`FilterOperator`](#filteroperator)
  - [`LogicalOperator`](#logicaloperator)
  - [`OrderDirection`](#orderdirection)
- [**Tipos e Interfaces Principales (para Definición de Esquemas y Tipado)**](#tipos-e-interfaces-principales-para-definición-de-esquemas-y-tipado)
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

## Clases Principales y Factorías

### `CriteriaFactory`

Proporciona métodos estáticos para crear instancias de diferentes tipos de `Criteria`. Simplifica la creación de objetos `Criteria` y asegura que se instancien con el esquema correcto. El alias ahora se infiere directamente del esquema.

**Métodos Estáticos:**

- **`GetCriteria<CSchema extends CriteriaSchema>(schema: CSchema): RootCriteria<CSchema>`**
  - Crea una instancia de `RootCriteria`. Este es el punto de partida para construir una consulta principal.
  - **Parámetros:**
    - `schema`: Una instancia de `CriteriaSchema` que define la estructura de la entidad raíz.
  - **Retorna:** Una instancia de `RootCriteria`.
  - **Ejemplo:**

```typescript
import { CriteriaFactory, UserSchema } from '@nulledexp/translatable-criteria';
const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
```

- **`GetInnerJoinCriteria<CSchema extends CriteriaSchema>(schema: CSchema): InnerJoinCriteria<CSchema>`**
  - Crea una instancia de `InnerJoinCriteria`. Se utiliza para definir un `INNER JOIN` en una consulta.
  - **Parámetros:**
    - `schema`: Una instancia de `CriteriaSchema` para la entidad que se va a unir.
  - **Retorna:** Una instancia de `InnerJoinCriteria`.
  - **Ejemplo:**

```typescript
import { CriteriaFactory, PostSchema } from '@nulledexp/translatable-criteria';
const postJoin = CriteriaFactory.GetInnerJoinCriteria(PostSchema);
```

- **`GetLeftJoinCriteria<CSchema extends CriteriaSchema>(schema: CSchema): LeftJoinCriteria<CSchema>`**
  - Crea una instancia de `LeftJoinCriteria`. Se utiliza para definir un `LEFT JOIN`.
  - **Retorna:** Una instancia de `LeftJoinCriteria`.

- **`GetOuterJoinCriteria<CSchema extends CriteriaSchema>(schema: CSchema): OuterJoinCriteria<CSchema>`**
  - Crea una instancia de `OuterJoinCriteria`. Se utiliza para definir un `FULL OUTER JOIN`.
  - **Retorna:** Una instancia de `OuterJoinCriteria`.

[Volver al Índice](#índice)

### `RootCriteria`

Representa el punto de partida de una consulta, apuntando a una entidad principal. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitRoot()`.
- `resetCriteria()`: Retorna una nueva instancia de `RootCriteria` con la misma configuración de esquema, pero con todos los demás estados (filtros, uniones, etc.) reiniciados.

[Volver al Índice](#índice)

### `InnerJoinCriteria`

Representa un criterio de `INNER JOIN`. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetInnerJoinCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitInnerJoin()`.
- `resetCriteria()`: Retorna una nueva instancia de `InnerJoinCriteria`.

[Volver al Índice](#índice)

### `LeftJoinCriteria`

Representa un criterio de `LEFT JOIN`. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetLeftJoinCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitLeftJoin()`.
- `resetCriteria()`: Retorna una nueva instancia de `LeftJoinCriteria`.

[Volver al Índice](#índice)

### `OuterJoinCriteria`

Representa un criterio de `FULL OUTER JOIN`. Extiende de `Criteria`.
Se instancia a través de `CriteriaFactory.GetOuterJoinCriteria()`.

**Métodos Principales (además de los heredados de `Criteria`):**

- Implementa `accept` para el patrón Visitor, llamando a `visitor.visitOuterJoin()`.
- `resetCriteria()`: Retorna una nueva instancia de `OuterJoinCriteria`.

[Volver al Índice](#índice)

### `Criteria` (Clase Base Abstracta)

Clase base abstracta para todos los tipos de criterios (`RootCriteria`, `InnerJoinCriteria`, etc.). Proporciona la funcionalidad común para construir una consulta. No se instancia directamente.

**Propiedades Principales (accesibles vía getters):**

- `select: FieldOfSchema<TSchema>[]`: Campos seleccionados. Si `selectAll` es `true`, retorna todos los campos del esquema.
- `selectAll: boolean`: Indica si se deben seleccionar todos los campos.
- `take: number`: Número de registros a tomar (LIMIT).
- `skip: number`: Número de registros a omitir (OFFSET).
- `orders: ReadonlyArray<Order<FieldOfSchema<TSchema>>>`: Reglas de ordenamiento.
- `joins: ReadonlyArray<StoredJoinDetails<TSchema>>`: Configuraciones de uniones.
- `rootFilterGroup: FilterGroup`: Grupo de filtros raíz.
- `sourceName: TSchema['source_name']`: Nombre de la fuente desde el esquema.
- `alias: TSchema['alias']`: El alias canónico desde el esquema.
- `cursor: Cursor<...> | undefined`: Configuración del cursor para paginación.
- `identifierField: FieldOfSchema<TSchema>`: El nombre del campo identificador desde el esquema.
- `schemaMetadata: TSchema['metadata']`: El objeto de metadatos desde el esquema.

**Métodos Principales (encadenables):**

- **`resetSelect(): this`**: Configura el criterio para seleccionar todos los campos de su esquema.
- **`setSelect(selectFields: Array<FieldOfSchema<TSchema>>): this`**: Especifica los campos a seleccionar. Desactiva `selectAll`.
- **`setTake(amount: number): this`**: Establece el número de registros a tomar.
- **`setSkip(amount: number): this`**: Establece el número de registros a omitir.
- **`where<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Inicializa el grupo de filtros con una condición.
- **`andWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Añade una condición AND al grupo de filtros actual.
- **`orWhere<Operator extends FilterOperator>(filterPrimitive: FilterPrimitive<...>): this`**: Añade una condición OR, creando un nuevo grupo si es necesario.
- **`setCursor(cursorFilters: [...], operator: ..., order: ...): this`**: Configura la paginación basada en cursor.
- **`orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection, nullsFirst: boolean = false): this`**: Añade una regla de ordenamiento.
  /\*\*

* Añade una unión a otro criterio.
* @param {string} joinAlias - El alias de la relación definida en el esquema.
* @param {JoinCriteriaType<...>} criteriaToJoin - La instancia de criterio para la entidad a unir.
* @param {JoinOptions} [joinOptions] - Configuración opcional para la unión, como la estrategia de selección.
  \*/

- **`join(joinAlias: string, criteriaToJoin: JoinCriteriaType<...>, joinOptions?: JoinOptions): this`**: Añade una condición de unión.

[Volver al Índice](#índice)

### `Filter`

Representa una condición de filtro individual. Se instancia internamente al usar los métodos `where`, `andWhere`, `orWhere` de un `Criteria`.

**Constructor:**

- `constructor(primitive: FilterPrimitive<T, Operator>)`
  - Valida que `primitive.value` sea del tipo correcto según `primitive.operator`.

**Propiedades (getters):**

- `field: T`: El campo al que aplica el filtro.
- `operator: Operator`: El operador del filtro.
- `value: FilterValue<Operator>`: El valor del filtro.

**Métodos:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string, context: ...): TFilterVisitorOutput`: Para el patrón Visitor, llama a `visitor.visitFilter()`.
- `toPrimitive(): FilterPrimitive<T, Operator>`: Retorna la representación primitiva del filtro.

[Volver al Índice](#índice)

### `FilterGroup`

Representa un grupo de filtros (`Filter` o `FilterGroup` anidados) conectados por un `LogicalOperator` (AND/OR). Instanciado y gestionado internamente por `CriteriaFilterManager`.

**Propiedades (getters):**

- `items: ReadonlyArray<Filter<T, FilterOperator> | FilterGroup<T>>`: Los filtros o grupos de filtros dentro de este grupo.
- `logicalOperator: LogicalOperator`: El operador lógico (`AND` u `OR`) que une los `items`.

**Métodos:**

- `accept(visitor: ICriteriaVisitor<...>, currentAlias: string, context: ...): void`: Para el patrón Visitor, llama a `visitor.visitAndGroup()` o `visitor.visitOrGroup()` basado en el `logicalOperator`.
- `toPrimitive(): FilterGroupPrimitive<T>`: Retorna la representación primitiva del grupo de filtros.

[Volver al Índice](#índice)

### `Order`

Representa una regla de ordenamiento. Se instancia internamente al usar el método `orderBy()` de un `Criteria`.

**Propiedades (getters):**

- `sequenceId: number`: ID de secuencia para ordenamiento estable.
- `field: T`: El campo por el cual ordenar.
- `direction: OrderDirection`: La dirección de ordenamiento (`ASC` o `DESC`).
- `nullsFirst: boolean`: Indica si los valores nulos deben ordenarse primero.

**Métodos:**

- `toPrimitive(): OrderByPrimitive<T>`: Retorna la representación primitiva de la regla de orden.

[Volver al Índice](#índice)

### `Cursor`

Representa la configuración para la paginación basada en cursor. Se instancia internamente al usar el método `setCursor()` de un `Criteria`.

**Propiedades (readonly):**

- `filters: [Filter<...>] | [Filter<...>, Filter<...>]`: Los filtros que definen el cursor.
- `order: OrderDirection`: La dirección de ordenamiento del cursor.
- `operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN`: El operador del cursor.

[Volver al Índice](#índice)

---

## Clases Abstractas (para Extensión)

### `CriteriaTranslator`

Clase abstracta que sirve como base para crear traductores específicos para diferentes fuentes de datos. Implementa el patrón Visitor (`ICriteriaVisitor`) para procesar objetos `Criteria`.

- **Genéricos:**
  - `TranslationContext`: El tipo del objeto de contexto mutable (ej. un constructor de consultas) pasado a través del recorrido.
  - `TranslationOutput` (opcional, por defecto `TranslationContext`): El tipo del resultado final de la traducción.
  - `TFilterVisitorOutput` (opcional, por defecto `any`): El tipo de salida específico para el método `visitFilter`.

- **Métodos Abstractos (a implementar por clases hijas):**
  - **`translate(criteria: RootCriteria<...>, source: TranslationContext): TranslationOutput`**: El punto de entrada público principal para iniciar el proceso de traducción.
  - `visitRoot(...): void`: Visita el nodo raíz del árbol de Criteria para inicializar la traducción.
  - `visitInnerJoin(...): void`: Visita un nodo de Inner Join para aplicar su lógica.
  - `visitLeftJoin(...): void`: Visita un nodo de Left Join para aplicar su lógica.
  - `visitOuterJoin(...): void`: Visita un nodo de Outer Join para aplicar su lógica.
  - `visitFilter(...): TFilterVisitorOutput`: Visita un nodo de Filtro individual y retorna una representación intermedia de la condición.
  - `visitAndGroup(...): void`: Visita un grupo de filtros unidos por un AND lógico.
  - `visitOrGroup(...): void`: Visita un grupo de filtros unidos por un OR lógico.

[Volver al Índice](#índice)

---

## Enums y Constantes

### `FilterOperator`

Enumeración que define los operadores de comparación disponibles para los filtros.
Para una explicación detallada de cada operador, su valor esperado y ejemplos de código, por favor consulta la [guía de Referencia de Operadores de Filtro](../guides/filter-operators/es.md).

- **Valores:**
  - `EQUALS` / `NOT_EQUALS`: Comprueba igualdad o desigualdad.
  - `GREATER_THAN` / `GREATER_THAN_OR_EQUALS`: Comprueba si un valor es mayor o mayor o igual a otro.
  - `LESS_THAN` / `LESS_THAN_OR_EQUALS`: Comprueba si un valor es menor o menor o igual a otro.
  - `LIKE` / `NOT_LIKE`: Coincide o no coincide con un patrón (sensibilidad a mayúsculas depende de la BD).
  - `ILIKE` / `NOT_ILIKE`: Versión insensible a mayúsculas de `LIKE` / `NOT_LIKE`.
  - `CONTAINS` / `NOT_CONTAINS`: Comprueba si una cadena contiene o no contiene una subcadena específica.
  - `STARTS_WITH`: Comprueba si una cadena comienza con una subcadena específica.
  - `ENDS_WITH`: Comprueba si una cadena termina con una subcadena específica.
  - `MATCHES_REGEX`: Comprueba si una cadena coincide con un patrón de expresión regular.
  - `IN` / `NOT_IN`: Comprueba si un valor está o no está dentro de un conjunto de valores especificados.
  - `IS_NULL` / `IS_NOT_NULL`: Comprueba si un valor es o no es NULL.
  - `BETWEEN` / `NOT_BETWEEN`: Comprueba si un valor está dentro o fuera de un rango especificado (inclusivo).
  - `JSON_PATH_VALUE_EQUALS` / `JSON_PATH_VALUE_NOT_EQUALS`: Para campos JSON, comprueba si el valor en una ruta JSON específica es igual o no igual a un valor primitivo.
  - `JSON_CONTAINS` / `JSON_NOT_CONTAINS`: Comprueba si un documento JSON contiene o NO contiene un valor JSON especificado.
  - `JSON_CONTAINS_ANY` / `JSON_NOT_CONTAINS_ANY`: Comprueba si un documento JSON contiene AL MENOS UNO o NO contiene AL MENOS UNO de los valores JSON especificados.
  - `JSON_CONTAINS_ALL` / `JSON_NOT_CONTAINS_ALL`: Comprueba si un documento JSON contiene TODOS o NO contiene TODOS los valores JSON especificados.
  - `ARRAY_CONTAINS_ELEMENT` / `ARRAY_NOT_CONTAINS_ELEMENT`: Comprueba si un array contiene o NO contiene un elemento específico.
  - `ARRAY_CONTAINS_ANY_ELEMENT` / `ARRAY_NOT_CONTAINS_ANY_ELEMENT`: Comprueba si un array contiene AL MENOS UNO o NO contiene AL MENOS UN elemento de un array dado.
  - `ARRAY_CONTAINS_ALL_ELEMENTS` / `ARRAY_NOT_CONTAINS_ALL_ELEMENTS`: Comprueba si un array contiene TODOS o NO contiene TODOS los elementos de un array dado.
  - `ARRAY_EQUALS`: Comprueba si un array es igual a un array dado (insensible al orden).
  - `ARRAY_EQUALS_STRICT`: Comprueba si un array es exactamente igual a un array dado (sensible al orden).
  - `SET_CONTAINS` / `SET_NOT_CONTAINS`: Comprueba si un campo de colección contiene o NO contiene un valor específico.
  - `SET_CONTAINS_ANY` / `SET_NOT_CONTAINS_ANY`: Comprueba si un campo de colección contiene AL MENOS UNO o NO contiene AL MENOS UNO de los valores especificados.
  - `SET_CONTAINS_ALL` / `SET_NOT_CONTAINS_ALL`: Comprueba si un campo de colección contiene TODOS o NO contiene TODOS los valores especificados.

[Volver al Índice](#índice)

### `LogicalOperator`

Enumeración que define los operadores lógicos para combinar grupos de filtros.

- **Valores:**
  - `AND` (`AND`): Todas las condiciones deben cumplirse.
  - `OR` (`OR`): Al menos una condición debe cumplirse.

[Volver al Índice](#índice)

### `OrderDirection`

Enumeración que define la dirección del ordenamiento.

- **Valores:**
  - `ASC` (`ASC`): Orden ascendente.
  - `DESC` (`DESC`): Orden descendente.

[Volver al Índice](#índice)

---

## Tipos e Interfaces Principales (para Definición de Esquemas y Tipado)

### `CriteriaSchema`

Interfaz que define la estructura de un esquema de entidad. Los esquemas son cruciales para la seguridad de tipos y la validación.

- **Propiedades:**
  - `source_name: string`: El nombre real de la tabla o colección en la base de datos.
  - `alias: string`: Un alias canónico único para esta entidad.
  - `fields: readonly string[]`: Un array con los nombres de los campos consultables para esta entidad.
  - `identifier_field: string`: **(Obligatorio)** El nombre del campo que identifica unívocamente a una entidad de este esquema. Debe ser uno de los nombres en `fields`.
  - `relations: readonly SchemaJoins<string>[]` (opcional): Un array que define las posibles relaciones de unión con otros esquemas.
  - `metadata?: { [key: string]: any }`: Metadatos opcionales asociados con la definición completa del esquema.

[Volver al Índice](#índice)

### `GetTypedCriteriaSchema`

Función auxiliar para definir esquemas. Preserva los tipos literales de `fields` y `alias`, mejorando el autocompletado y la validación de tipos.

- **Función:** `GetTypedCriteriaSchema<T extends CriteriaSchema>(schema: T): T`
- **Ejemplo:**

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'name', 'email'],
  identifier_field: 'id',
  relations: [
    {
      default_options: {
        select: SelectType.FULL_ENTITY,
      },
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
  ],
});
```

[Volver al Índice](#índice)

### `FieldOfSchema`

Tipo auxiliar que extrae los nombres de campo válidos de un `CriteriaSchema` dado.

- **Tipo:** `FieldOfSchema<T extends CriteriaSchema> = T['fields'][number];`

[Volver al Índice](#índice)

### `JoinRelationType`

Tipo de unión de cadenas que representa los posibles tipos de relaciones de unión.

- **Valores Posibles:** `'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'`

[Volver al Índice](#índice)

### `SchemaJoins`

Interfaz que define la estructura de una configuración de unión dentro de la propiedad `relations` de un `CriteriaSchema`.

- **Propiedades:**
  - `relation_alias: string`: El alias para esta relación de unión específica (ej. `'posts'`, `'author'`).
  - `relation_type: JoinRelationType`: El tipo de relación.
  - `default_options: JoinOptions`: Configuración por defecto para esta relación, incluyendo la estrategia de selección (`select`).
  - `target_source_name: string`: El `source_name` del esquema al que se une.
  - `local_field: string | { pivot_field: string; reference: string }`: El campo en la entidad local para la condición de unión.
  - `relation_field: string | { pivot_field: string; reference: string }`: El campo en la entidad relacionada para la condición de unión.
  - `pivot_source_name?: string`: El nombre de la tabla pivote (para uniones `many_to_many`).
  - `metadata?: { [key: string]: any }`: Metadatos opcionales asociados con esta configuración de unión específica.

[Volver al Índice](#índice)

### `FilterPrimitive`

Interfaz que define la estructura para una condición de filtro individual antes de ser instanciada como un objeto `Filter`.

- **Propiedades:**
  - `field: FieldOfSchema<...>`: El campo al que aplicar el filtro.
  - `operator: FilterOperator`: El operador del filtro.
  - `value: FilterValue<Operator>`: El valor del filtro, cuyo tipo depende del `Operator`.

[Volver al Índice](#índice)

### `FilterGroupPrimitive`

Interfaz que define la estructura para un grupo de filtros antes de ser instanciada como un objeto `FilterGroup`.

- **Propiedades:**
  - `logicalOperator: LogicalOperator`: El operador lógico (`AND` u `OR`) que une los `items`.
  - `items: ReadonlyArray<FilterPrimitive<...> | FilterGroupPrimitive<...>>`: Array de filtros o grupos de filtros anidados.

[Volver al Índice](#índice)

### `FilterValue`

Tipo genérico que representa el valor asociado con un filtro, fuertemente tipado según el `FilterOperator` utilizado.

[Volver al Índice](#índice)

### `OrderByPrimitive`

Tipo que define la estructura para una regla de ordenamiento antes de ser instanciada como un objeto `Order`.

- **Propiedades:**
  - `direction: OrderDirection`: La dirección de ordenamiento.
  - `field: string`: El campo por el cual ordenar.
  - `sequence_id: number`: Un ID único para ordenamiento estable.
  - `nulls_first: boolean`: Si es true, los nulos se ordenan primero.

[Volver al Índice](#índice)

### `ICriteriaBase`

Interfaz base que define la funcionalidad común para todos los tipos de criterios.

[Volver al Índice](#índice)

### `ICriteriaVisitor`

Interfaz para el patrón Visitor, implementada por `CriteriaTranslator`. Define los métodos `visit...` para cada tipo de nodo `Criteria`.

- **Métodos (retornan `void` a menos que se especifique):**
  - `visitRoot(...)`: Visita el nodo raíz del árbol de Criteria para inicializar la traducción.
  - `visitInnerJoin(...)`: Visita un nodo de Inner Join para aplicar su lógica.
  - `visitLeftJoin(...)`: Visita un nodo de Left Join para aplicar su lógica.
  - `visitOuterJoin(...)`: Visita un nodo de Outer Join para aplicar su lógica.
  - `visitFilter(...): TFilterVisitorOutput`: Visita un nodo de Filtro individual y retorna una representación intermedia de la condición.
  - `visitAndGroup(...)`: Visita un grupo de filtros unidos por un AND lógico.
  - `visitOrGroup(...)`: Visita un grupo de filtros unidos por un OR lógico.

[Volver al Índice](#índice)

### `IFilterExpression`

Interfaz implementada por `Filter` y `FilterGroup`.

- **Métodos:**
  - `toPrimitive()`: Retorna la representación primitiva de la expresión de filtro.

[Volver al Índice](#índice)

### `StoredJoinDetails`

Interfaz que define la estructura para almacenar los detalles de una unión configurada internamente.

- **Propiedades:**
  - `parameters: PivotJoin<...> | SimpleJoin<...>`: Los parámetros de unión resueltos.
  - `criteria: AnyJoinCriteria<...>`: La instancia de `Criteria` de la entidad unida.

[Volver al Índice](#índice)

### `AnyJoinCriteria`

Tipo de unión que representa cualquier tipo de `Criteria` de unión (`InnerJoinCriteria`, `LeftJoinCriteria`, `OuterJoinCriteria`).

[Volver al Índice](#índice)

### `JoinCriteriaType`

Tipo auxiliar que determina el tipo del objeto `Criteria` que se pasará al método `.join()`, validando que el `source_name` de la entidad unida esté configurado en el esquema padre.

[Volver al Índice](#índice)

### `SpecificMatchingJoinConfig`

Tipo auxiliar que extrae la configuración de unión específica de un esquema padre que coincide con un `relation_alias` dado.

[Volver al Índice](#índice)

### `PivotJoin`

Tipo que representa los parámetros completamente resueltos para una unión `many-to-many` a través de una tabla pivote, usado internamente.

- **Propiedades:**
  - `join_options: JoinOptions`: Configuración opcional para la unión, como la estrategia de selección. El traductor determinará el comportamiento por defecto si no se proporciona.
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

[Volver al Índice](#índice)

### `SimpleJoin`

Tipo que representa los parámetros completamente resueltos para una unión simple (one-to-one, one-to-many, many-to-one), usado internamente.

- **Propiedades:**
  - `join_options: JoinOptions`: Configuración opcional para la unión, como la estrategia de selección. El traductor determinará el comportamiento por defecto si no se proporciona.
  - `relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one'`
  - `parent_source_name: string`
  - `parent_alias: string`
  - `relation_alias: string`
  - `parent_identifier: string`
  - `local_field: string`
  - `relation_field: string`
  - `parent_schema_metadata: { [key: string]: any }`
  - `join_metadata: { [key: string]: any }`

[Volver al Índice](#índice)
