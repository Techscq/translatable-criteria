# Guía Práctica: Desarrollo de Traductores Personalizados

La librería `translatable-criteria`, por sí sola, es una potente herramienta para definir consultas, pero su verdadero potencial se desbloquea a través de un **Traductor** personalizado. La idea central es proporcionar una API robusta y tipada para construir estructuras de consulta, que luego pueden ser traducidas al lenguaje nativo de cualquier fuente de datos.

Esta guía tiene como objetivo proporcionar la información necesaria para construir estas soluciones, explicando las herramientas que la librería ofrece para recorrer su estructura interna de manera ordenada. Exploraremos los conceptos sin imponer un patrón o paradigma específico; esa decisión recae en cada desarrollador.

Las soluciones desarrolladas pueden ser privadas o compartidas con la comunidad. El autor de la librería también ha desarrollado [`TypeOrmMysqlCriteriaTranslator`](https://github.com/Techscq/typeorm-mysql-criteria-translator), un traductor externo y de código abierto para TypeORM con MySQL que sirve como un excelente caso de estudio del mundo real. Alentamos la creación de soluciones para otras fuentes de datos como PostgreSQL, Redis, o incluso otros ORMs. Si decides usar un traductor de la comunidad, recuerda verificar su fiabilidad e implementación, ya que las soluciones pueden tener limitaciones técnicas en diferentes contextos.

## Conceptos Fundamentales

### El Patrón Visitor

Todo el sistema está construido alrededor del patrón de diseño **Visitor**. Es crucial entender esto. El objeto [`Criteria`](../../api-reference/es.md#anyjoincriteria) (y todos sus componentes como filtros y uniones) actúa como la estructura "visitable". No sabe cómo traducirse a sí mismo. En su lugar, tiene un método `accept`.

Cuando llamas a `criteria.accept(visitor, ...)`:

1. El objeto `criteria` recibe el `visitor` (tu traductor).
2. Luego, llama al método apropiado en el visitor, pasándose a sí mismo como argumento (ej. `visitor.visitRoot(this, ...)`).

Este mecanismo de "doble despacho" permite a tu traductor reaccionar a cada parte del árbol `Criteria` sin necesidad de conocer su estructura interna, promoviendo una clara separación de responsabilidades.

### La Clase Abstracta `CriteriaTranslator`

Para simplificar el desarrollo, proporcionamos una clase abstracta que debes extender. Ya implementa la interfaz [`ICriteriaVisitor`](../../api-reference/es.md#icriteriavisitor) y define los métodos que necesitas implementar.

```typescript
export abstract class CriteriaTranslator<
  TranslationContext,
  TranslationOutput = TranslationContext,
  TFilterVisitorOutput = any,
> implements ICriteriaVisitor<TranslationContext, TFilterVisitorOutput> {
  public abstract translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<RootCriteriaSchema>,
    source: TranslationContext,
  ): TranslationOutput;

  // ... (abstract visit methods)
}
```

- **`TranslationContext`**: Este es el tipo genérico más importante. Representa un **objeto de estado mutable** que se pasa a través de todo el recorrido. Piénsalo como tu "lienzo" o "constructor de consultas" donde acumularás las partes de la consulta final (ej. cláusulas SELECT, condiciones WHERE, parámetros). Es el único estado que tu traductor debería modificar.
- **`TranslationOutput`**: El tipo del resultado final del método `translate()`. A menudo, es el mismo `TranslationContext` o una versión procesada de él (ej. una cadena SQL final).
- **`TFilterVisitorOutput`**: El tipo específico devuelto únicamente por el método `visitFilter`. Es útil para devolver una representación intermedia de una única condición que luego puede ser combinada por los métodos `visitAndGroup` o `visitOrGroup`, **ya que los grupos de filtros típicamente consumen estas salidas para construir su condición combinada directamente en el `TranslationContext`**.

Para los ejemplos conceptuales en esta guía, utilizaremos los siguientes tipos para `TranslationContext` y `TFilterVisitorOutput`, que se alinean con el `PseudoSqlTranslator` ejemplo:

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

Aquí está la estructura básica de tu clase traductora personalizada, mostrando solo las firmas de los métodos públicos que necesitarás implementar:

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

## Diseño Interno del Traductor

A medida que un traductor crece para soportar más operadores y lógicas complejas, la clase principal `CriteriaTranslator` puede volverse muy grande y difícil de mantener (un "God Class"). Una estrategia de diseño eficaz es delegar la lógica de construcción de cada parte de la consulta a clases auxiliares más pequeñas y enfocadas.

Considera la creación de "Builders" o "Helpers" para:

- **`FilterBuilder`**: Maneja la lógica de `visitFilter`, `visitAndGroup` y `visitOrGroup`.
- **`JoinBuilder`**: Maneja la lógica de `visitInnerJoin`, `visitLeftJoin` y `visitOuterJoin`.
- **`OrderBuilder`**: Consolida y construye la cláusula `ORDER BY`.
- **`PaginationBuilder`**: Construye la lógica para `LIMIT`/`OFFSET` y para la paginación por cursor.

Este enfoque no solo hace que el código sea más limpio y fácil de probar, sino que también permite reutilizar la lógica de construcción de manera más efectiva. El [`PseudoSqlTranslator`](./example/pseudo-sql.translator.ts) de ejemplo en la librería sigue este patrón.

**Ejemplos Concretos de Modularidad (Basado en `TypeOrmMysqlTranslator`)**

El `TypeOrmMysqlTranslator` es un excelente ejemplo de cómo aplicar este diseño modular. Utiliza varias clases auxiliares, cada una con una responsabilidad clara, que interactúan a través de un `QueryState` centralizado:

- **`TypeOrmParameterManager`**: Encapsula la lógica para gestionar y generar parámetros de consulta únicos, crucial para la seguridad y la correcta ejecución de la consulta.
- **`TypeOrmFilterFragmentBuilder`**: Implementa el patrón Strategy para manejar la traducción de cada `FilterOperator` a un fragmento SQL específico, delegando a `IFilterOperatorHandler`s individuales.
- **`TypeOrmConditionBuilder`**: Se encarga de construir y agrupar condiciones `WHERE` y `ON` (incluyendo el uso de paréntesis para la precedencia lógica) y de aplicar la lógica compleja de paginación por cursor.
- **`TypeOrmJoinApplier`**: Gestiona la construcción y aplicación de las cláusulas `JOIN`, incluyendo sus condiciones `ON` y la recolección de selecciones y órdenes de las entidades unidas.
- **`QueryApplier`**: Es el componente final que toma toda la información recolectada en el `QueryState` y la aplica al `SelectQueryBuilder` de TypeORM para construir la consulta final.
- **`QueryState`**: Actúa como el `TranslationContext` central, un objeto mutable que acumula toda la información necesaria (selecciones, órdenes, cursores, estado de la cláusula WHERE) a medida que el traductor recorre el árbol `Criteria`.

Este nivel de modularidad permite que cada parte del traductor sea desarrollada, probada y mantenida de forma independiente.

## El Kit de Herramientas del Traductor

Al implementar los métodos `visit...`, recibirás varios objetos que servirán como tu kit de herramientas, proporcionando toda la información necesaria para la traducción. Estos incluyen objetos `criteria` (o sus partes), `parameters` para las uniones, y detalles de los filtros.

**Nota Importante sobre la Validación:** La librería `translatable-criteria` realiza validaciones internas antes de que tu traductor reciba los datos. Por ejemplo, se asegura de que los campos usados en filtros u ordenamiento existan en el `CriteriaSchema` (`assetFieldOnSchema`). Esto te da la confianza de que los datos que recibes en los métodos `visit...` son estructuralmente válidos, permitiéndote centrarte en la lógica de traducción.

### Propiedades de `Criteria`

Propiedades disponibles en los objetos `RootCriteria` y `JoinCriteria`:

- **`get schemaMetadata()`**:
  - **Explicación**: Proporciona acceso al objeto `metadata` definido en la raíz del [`CriteriaSchema`](../../api-reference/es.md#criteriaschema). Este es un espacio de "formato libre" para que adjuntes información específica del traductor al esquema de una entidad, como el entrecomillado de tablas personalizado, pistas para el ORM, o cualquier otro dato relevante que tu traductor pueda necesitar. La librería en sí no utiliza esta información.

- **`get select()` y `get selectAll()`**:
  - **Explicación**: `select` devuelve un array con los nombres de los campos a seleccionar. Si no se llamó a `setSelect()`, `selectAll` será `true`, y `select` devolverá todos los campos definidos en el esquema. Si se usó `setSelect()`, `selectAll` es `false`, y `select` devuelve solo los campos especificados (además del `identifier_field`, que siempre se incluye).

- **`get cursor()`**:
  - **Explicación**: Si se utiliza paginación basada en cursor, esta propiedad devuelve el objeto [`Cursor`](../../api-reference/es.md#cursor). Este objeto encapsula el estado necesario para obtener la página siguiente o anterior, incluyendo el/los campo(s), su(s) valor(es) del último registro de la página anterior, el operador de comparación (`GREATER_THAN` o `LESS_THAN`), y un `sequenceId` para mantener un orden estable al combinar la lógica del cursor de múltiples instancias de `Criteria`.

- **`get joins()`**:
  - **Explicación**: Devuelve un `ReadonlyArray` de objetos `StoredJoinDetails`. Este es el punto de entrada para traducir todas las uniones configuradas. Para cada `StoredJoinDetails`, encontrarás el `criteria` de la unión que debe ser "visitado" y los `parameters` que describen la relación.

- **`get rootFilterGroup()`**:
  - **Explicación**: Este es el nodo raíz del árbol de filtros. Es un `FilterGroup` que contiene todos los filtros y grupos de filtros de nivel superior añadidos mediante `.where()`, `.andWhere()`, `.orWhere()`, etc. Tu traducción debe comenzar visitando este grupo.

- **`get alias()` y `get sourceName()`**:
  - **Explicación**: `sourceName` es el nombre de la fuente de la entidad (ej. el nombre de la tabla 'users_table'). `alias` es el alias corto usado para referirse a esta entidad en la consulta (ej. 'u'). Ambos se toman directamente del `CriteriaSchema`.

- **`get take()` y `get skip()`**:
  - **Explicación**: Estas propiedades proporcionan los valores para la paginación basada en offset, correspondiendo a `LIMIT` y `OFFSET` en SQL.

- **`get orders()`**:
  - **Explicación**: Devuelve un array `readonly` de objetos [`Order`](../../api-reference/es.md#order). Cada objeto contiene el `field` por el cual ordenar, la `direction` (`ASC` o `DESC`), y un `sequenceId` para asegurar un ordenamiento estable al combinar órdenes de diferentes instancias de `Criteria` (ej. de la raíz y las uniones) **o para mantener una paginación determinista en escenarios basados en cursor donde los valores de los campos podrían no ser únicos**. Cada objeto `Order` ahora también contiene una propiedad booleana `nullsFirst`, que tu traductor debe usar para añadir `NULLS FIRST` o `NULLS LAST` a la cláusula de ordenamiento.

### Propiedades de `Filter` y `FilterGroup`

Propiedades disponibles al visitar filtros:

- **`filter.field`, `filter.operator`, `filter.value`**:
  - **Explicación**: Estas tres propiedades definen una única condición. `field` es el nombre de la columna, `operator` es la comparación a realizar, y `value` es el dato contra el cual comparar. El tipo de `value` está fuertemente tipado en función del `operator`. Para una referencia completa de todos los operadores y sus tipos de `value` esperados, consulta la [Referencia de Operadores de Filtro](../filter-operators/es.md). Por ejemplo:
    - Para `EQUALS`, `value` puede ser una cadena, número, booleano, Fecha o nulo.
    - Para `IN`, `value` es un array de primitivos.
    - Para `BETWEEN`, `value` es una tupla `[min, max]`.
    - Para operadores JSON como `JSON_CONTAINS`, `value` es un objeto donde las claves son rutas JSON y los valores son los datos JSON a encontrar.

- **`filterGroup.items`, `filterGroup.logicalOperator`**:
  - **Explicación**: `items` es un array que puede contener otros objetos `Filter` o `FilterGroup` anidados. `logicalOperator` especifica cómo combinar estos ítems (`AND` u `OR`).

### Parámetros de Join (SimpleJoin y PivotJoin)

Propiedades disponibles al visitar una unión:

- **`parent_alias`, `relation_alias`**:
  - **Explicación**: Los alias para las entidades padre y unida, esenciales para cualificar los nombres de los campos en las cláusulas `ON` y `SELECT`.

- **`is_relation_id`**:
  - **Explicación**: Un booleano que indica si esta relación es puramente una referencia de ID.

- **`local_field`, `relation_field`**:
  - **Explicación**: Para un `SimpleJoin` (uno a uno, muchos a uno), estos son los nombres de las columnas a usar en la condición `ON` (ej. `ON padre.id = hijo.padre_id`). Para un `PivotJoin`, estas propiedades son objetos que contienen el `pivot_field` (el campo en la tabla pivote) y el campo `reference` (el campo en la entidad de origen/destino al que el campo pivote se vincula).

- **`parent_identifier`**:
  - **Explicación**: El nombre del campo que identifica unívocamente a la entidad padre (ej. su clave primaria). Es distinto de `local_field`, que es el campo usado en la condición de la unión. `parent_identifier` es útil para estrategias de unión complejas o para construir cláusulas `ON` específicas.

- **`pivot_source_name`**:
  - **Explicación**: Para un `PivotJoin` (muchos a muchos), este es el nombre de la tabla pivote intermediaria.

- **`parent_schema_metadata`, `join_metadata`**:
  - **Explicación**: Similar a la metadata a nivel de esquema, estos proporcionan acceso a cualquier metadato personalizado que hayas definido. `parent_schema_metadata` proviene del esquema de la entidad padre, mientras que `join_metadata` es específico de la definición de la unión en sí, permitiendo pistas para el traductor muy específicas (ej. pistas de unión específicas de la base de datos).

- **`with_select`**:
  - **Explicación**: Una propiedad booleana que indica si los campos de la entidad unida deben incluirse en la sentencia `SELECT` final. Si es `false`, el traductor debe generar una cláusula de unión (ej. `INNER JOIN`) pero no una cláusula de unión y selección (ej. `INNER JOIN ... SELECT`).

## Implementando los Métodos `visit...`

Este es el núcleo de tu traductor. Aquí tienes una guía conceptual para cada método, enriquecida con consideraciones prácticas.

### `visitRoot`

- **Propósito**: Inicializar la consulta y orquestar la traducción de todas sus partes principales.
- **Enfoque**:
  1. Usa `criteria.sourceName` y `criteria.alias` para construir la cláusula `FROM`.
  2. Itera `criteria.select` para construir la cláusula `SELECT`.
  3. Itera `criteria.joins` y llama a `accept` en el `criteria` de cada unión para disparar su traducción.
  4. Llama a `accept` en `criteria.rootFilterGroup` para construir la cláusula `WHERE`.
  5. **Orquestación Final**: Después de visitar todos los nodos, consolida y aplica la lógica de ordenamiento y paginación.

- **Consideraciones Clave**:
  - **Recolección y Consolidación**: Las reglas de ordenamiento (`orders`) y de cursor (`cursor`) pueden estar definidas tanto en el `Criteria` raíz como en los `JoinCriteria`. Tu traductor debe recolectar todas estas reglas durante el recorrido (por ejemplo, en un array dentro de tu `TranslationContext` o en una propiedad de la clase) y luego, al final de `visitRoot`, procesarlas de forma consolidada (usando `sequenceId` para un orden determinista) para construir las cláusulas `ORDER BY` y de paginación finales.

La firma del método `visitRoot` es la siguiente:

```typescript
public abstract visitRoot<RootCSchema extends CriteriaSchema>(
  criteria: RootCriteria<RootCSchema>,
  context: TranslationContext,
): void;
```

### visitInnerJoin, visitLeftJoin, visitOuterJoin

- **Propósito**: Construir la cláusula `JOIN` específica y su condición `ON`.
- **Enfoque**: Es muy recomendable delegar a un auxiliar privado común o a un `JoinBuilder`.
  1. Usa `parameters.relation_alias` y el `criteria.sourceName` de la unión para construir la sentencia `JOIN ... ON ...`.
  2. Para `SimpleJoin`, la condición `ON` usa `parameters.local_field` y `parameters.relation_field`.
  3. Para `PivotJoin`, esto probablemente implicará dos sentencias `JOIN`.
  4. Procesa el `select` y recolecta los `orders` de la unión.
  5. Recursivamente visita cualquier unión anidada.

- **Consideraciones Clave**:
  - **Filtros en el Join**: Si el `JoinCriteria` tiene su propio `rootFilterGroup`, debes visitarlo y añadir las condiciones resultantes a la cláusula `ON` de la unión, típicamente con un `AND`. Esto permite filtros como `LEFT JOIN posts p ON u.id = p.userId AND p.published = true`.
  - **Recursión**: El diseño permite uniones encadenadas (`criteria.join(...).join(...)`). Tu lógica debe manejar esto llamando a `accept` en los `subJoinDetail.criteria` que se encuentren dentro del `criteria` de la unión actual.
  - **Control de Selección**: Comprueba el booleano `parameters.with_select`. Si es `true`, añade los campos de la entidad unida a la cláusula `SELECT` principal. Si es `false`, realiza la unión solo para filtrar y no añadas sus campos a la selección.

Las firmas de los métodos `visitInnerJoin`, `visitLeftJoin`, y `visitOuterJoin` son las siguientes:

```typescript
    public abstract visitInnerJoin<
      ParentCSchema extends CriteriaSchema,
      JoinCSchema extends CriteriaSchema,
    >(
      criteria: InnerJoinCriteria<JoinCSchema>,
      parameters:
        | PivotJoin<ParentCSchema, JoinCSchema>
        | SimpleJoin<ParentCSchema, JoinCSchema>,
      context: TranslationContext,
    ): void;

    public abstract visitLeftJoin<
      ParentCSchema extends CriteriaSchema,
      JoinCSchema extends CriteriaSchema,
    >(
      criteria: LeftJoinCriteria<JoinCSchema>,
      parameters:
        | PivotJoin<ParentCSchema, JoinCSchema>
        | SimpleJoin<ParentCSchema, JoinCSchema>,
      context: TranslationContext,
    ): void;

    public abstract visitOuterJoin<
      ParentCSchema extends CriteriaSchema,
      JoinCSchema extends CriteriaSchema,
    >(
      criteria: OuterJoinCriteria<JoinCSchema>,
      parameters:
        | PivotJoin<ParentCSchema, JoinCSchema>
        | SimpleJoin<ParentCSchema, JoinCSchema>,
      context: TranslationContext,
    ): void;

```

### `visitFilter`

- **Propósito**: Traducir un único filtro primitivo a una cadena de condición y sus parámetros.
- **Enfoque**:
  1. Una implementación simple puede usar una sentencia `switch` basada en `filter.operator`. Para traductores más complejos, organizar esta lógica en un mapa de manejadores (una forma del patrón Strategy) donde cada operador tiene su propia función de construcción, puede mejorar enormemente la mantenibilidad.
  2. **Crucialmente, usa parametrización**. Nunca inyectes `filter.value` directamente en la cadena de consulta.
  3. Maneja el tipo y la estructura específicos de `filter.value` según `filter.operator`.
  4. Devuelve un objeto intermedio como `{ condition: 'u.edad > ?', params: [30] }`.

La firma del método `visitFilter` es la siguiente:

```typescript
public abstract visitFilter<FieldType extends string>(
  filter: Filter<FieldType, FilterOperator>,
  currentAlias: string,
  context: TranslationContext,
): TFilterVisitorOutput;
```

### `visitAndGroup`, `visitOrGroup`

- **Propósito**: Combinar múltiples condiciones de filtro.
- **Enfoque**:
  1. Itera a través de `group.items`.
  2. Para cada `item`, llama a `item.accept(this, ...)` para obtener recursivamente su traducción.
  3. Une las cadenas de condición recolectadas con el `group.logicalOperator` (`AND` u `OR`).
  4. Añade la condición agrupada final a tu cláusula `WHERE` principal.

- **Consideraciones Clave**:
  - **Precedencia Lógica**: Es **absolutamente crucial** envolver la cadena combinada de cada grupo entre paréntesis `()` para asegurar la precedencia lógica correcta, especialmente al anidar grupos `AND` y `OR`. Un error aquí puede llevar a resultados de consulta completamente incorrectos.

Las firmas de los métodos `visitAndGroup` y `visitOrGroup` son las siguientes:

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

## Flujo de Ejecución Detallado del Traductor

Comprender el flujo de ejecución es fundamental para implementar y depurar un traductor. El patrón Visitor orquesta una travesía del árbol `Criteria`, delegando la lógica de traducción a los métodos `visit...` de tu traductor.

Aquí se describe el viaje de una llamada a `translate()`:

1.  **Inicio de la Traducción (`translate()`):**

- El método `translate()` es el punto de entrada público.
- **Reinicia el estado interno** del traductor (o de tu `TranslationContext`/`QueryState`). Esto es crucial para asegurar que cada traducción sea independiente.
- **Crea una instancia de `TranslationContext`** (o tu `QueryState` personalizado), que será el lienzo mutable donde se construirá la consulta.
- **Inicia la travesía del árbol `Criteria`** llamando a `criteria.accept(this, initialContext)`. Aquí, `this` es tu instancia del traductor (el `visitor`), y `initialContext` es el estado mutable que se pasará a lo largo de todo el recorrido.

2.  **Visita a la Raíz (`visitRoot()`):**

- La primera llamada `accept()` en el [`RootCriteria`](../../api-reference/es.md#rootcriteria) resultará en la invocación de `visitRoot()` en tu traductor.
- En `visitRoot()`, tu traductor:
- Extrae información de alto nivel del `RootCriteria` (ej. `sourceName`, `alias`, `select`, `take`, `skip`, `orders`, `cursor`).
- **Inicia la construcción de las partes principales de la consulta** (ej. la cláusula `FROM`).
- **Delega la traducción de los filtros principales**: Llama a `criteria.rootFilterGroup.accept(this, context)` para iniciar la traducción de la cláusula `WHERE`.
- **Delega la traducción de las uniones**: Itera sobre `criteria.joins` y, para cada `StoredJoinDetails`, llama a `joinDetail.criteria.accept(this, joinDetail.parameters, context)`. Esto desencadenará las llamadas a `visitInnerJoin`, `visitLeftJoin`, o `visitOuterJoin`.

3.  **Visita a Grupos de Filtros (`visitAndGroup()`, `visitOrGroup()`):**

- Cuando un [`FilterGroup`](../../api-reference/es.md#filtergroup) es visitado (ya sea el `rootFilterGroup` o un grupo anidado), se invoca `visitAndGroup()` o `visitOrGroup()`.
- Estos métodos iteran sobre `group.items` (que pueden ser `Filter`s individuales o `FilterGroup`s anidados).
- Para cada `item`, se llama recursivamente a `item.accept(this, context)`.
- **Consolidan los resultados** de sus ítems con el operador lógico (`AND` u `OR`) y, **crucialmente, los envuelven en paréntesis** para mantener la precedencia lógica.

4.  **Visita a Filtros Individuales (`visitFilter()`):**

- Cuando un [`Filter`](../../api-reference/es.md#filter) individual es visitado, se invoca `visitFilter()`.
- Este método es responsable de traducir un único `filter.field`, `filter.operator`, y `filter.value` a un fragmento de condición SQL.
- **Utiliza parametrización** para el `filter.value` para prevenir inyección SQL.
- Devuelve un resultado intermedio (`TFilterVisitorOutput`) que será utilizado por el grupo de filtros que lo contiene.

5.  **Visita a Uniones (`visitInnerJoin()`, `visitLeftJoin()`, `visitOuterJoin()`):**

- Cuando un [`JoinCriteria`](../../api-reference/es.md#anyjoincriteria) es visitado, se invoca el método `visit...Join()` correspondiente.
- Estos métodos:
- Construyen la cláusula `JOIN` y su condición `ON`.
- Pueden delegar la traducción de filtros específicos de la unión (si el `JoinCriteria` tiene su propio `rootFilterGroup`) llamando a `joinCriteria.rootFilterGroup.accept(this, context)`.
- **Manejan la recursividad de uniones anidadas** llamando a `accept()` en cualquier `JoinCriteria` que se encuentre dentro de la unión actual.
- Recolectan selecciones y órdenes de las entidades unidas.

6.  **Finalización del Ensamblaje de la Consulta (`translate()` - Fase Final):**

- Una vez que la travesía del árbol `Criteria` ha finalizado (es decir, todas las llamadas `accept()` han regresado), el control vuelve al método `translate()`.
- En esta fase final, el traductor toma toda la información recolectada en el `TranslationContext` (ej. selecciones, condiciones WHERE, cláusulas JOIN, órdenes, lógica de paginación) y la **ensambla en la consulta final**.
- Finalmente, devuelve la consulta generada y sus parámetros.

Este flujo iterativo y delegativo, facilitado por el patrón Visitor y la modularidad de los "Builders", permite construir consultas complejas de manera estructurada y mantenible.

La estructura general del método `translate` es la siguiente:

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

Muchos traductores necesitarán una función de utilidad para escapar correctamente los nombres de campo y prevenir la inyección SQL o para ajustarse a la sintaxis del lenguaje de consulta objetivo. Este helper se utiliza en los ejemplos conceptuales a continuación.

Por ejemplo, dentro de un método `visitFilter`, podrías usarlo así: `const escapedField = escapeField(filter.field, currentAlias);`

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

## Consideraciones Adicionales

### Manejo de Operadores no Soportados

No todas las fuentes de datos soportan todos los `FilterOperator`. Tu traductor debe decidir cómo manejar un operador para el que no tiene una implementación:

- **Lanzar un error**: Es la opción más segura. Falla rápido e informa al desarrollador que la operación no es compatible.
- **Ignorar el filtro**: Menos seguro, ya que puede llevar a resultados inesperados, pero podría ser una opción en ciertos casos.
- **Registrar una advertencia**: Informa al desarrollador sin detener la ejecución.

### Consejos de Depuración

Al desarrollar tu traductor, es invaluable inspeccionar el `TranslationContext` en diferentes etapas del recorrido del Visitor. Registrar la consulta generada (SQL, etc.) y sus parámetros en la consola (`console.log`) también es una práctica común para verificar la salida y diagnosticar problemas.

### Pruebas y Fiabilidad

Dado que un traductor es el puente entre la lógica abstracta de `Criteria` y un sistema de datos real, su fiabilidad es crítica. Es **altamente recomendable** escribir un conjunto exhaustivo de pruebas unitarias y de integración para tu traductor. Usa `CriteriaFactory` para construir diversos escenarios (filtros complejos, uniones anidadas, paginación por cursor, etc.) y verifica que la salida generada sea correcta y segura.

## Casos de Estudio

Para una implementación completa y del mundo real, el proyecto [`TypeOrmMysqlCriteriaTranslator`](https://github.com/Techscq/typeorm-mysql-criteria-translator) (desarrollado por el mismo autor pero externo a esta librería) sirve como un excelente caso de estudio de código abierto. Demuestra cómo manejar las especificidades de un ORM popular y un dialecto de SQL. El [`PseudoSqlTranslator`](./example/pseudo-sql.translator.ts) incluido en los ejemplos de esta librería es también una valiosa referencia simplificada.

Aquí tienes un ejemplo de cómo usar un traductor:

[`CriteriaFactory`](../../api-reference/es.md#criteriafactory)

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
