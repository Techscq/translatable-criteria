# Guía Práctica: Desarrollo de Traductores Personalizados

Una de las características más potentes de `@nulledexp/translatable-criteria` es su capacidad para ser extendido a diferentes fuentes de datos mediante **Traductores Personalizados**. Si necesitas interactuar con una base de datos, motor de búsqueda o API para la cual no existe un traductor predefinido, puedes crear el tuyo.

Esta guía te mostrará los pasos y conceptos clave para desarrollar tu propio `CriteriaTranslator`.

## Índice

- 1. [Entendiendo `CriteriaTranslator` y `ICriteriaVisitor`](#1-entendiendo-criteriatranslator-y-icriteriavisitor)
- 2. [Creando tu Clase Traductora](#2-creando-tu-clase-traductora)
- 3. [Implementando Métodos `visit...`](#3-implementando-métodos-visit)
  - 3.1. [`visitRoot`](#31-visitroot)
  - 3.2. [`visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin`](#32-visitinnerjoin-visitleftjoin-visitouterjoin)
  - 3.3. [`visitFilter`](#33-visitfilter)
  - 3.4. [`visitAndGroup`, `visitOrGroup`](#34-visitandgroup-visitorgroup)
- 4. [Manejando Ordenamiento, Paginación y Selección](#4-manejando-ordenamiento-paginación-y-selección)
- 5. [Gestión de Estado y Parámetros](#5-gestión-de-estado-y-parámetros)
- 6. [Ejemplo Completo: Traductor a Pseudo-SQL](#6-ejemplo-completo-traductor-a-pseudo-sql)
  - 6.1. [Implementación del Traductor](#61-implementación-del-traductor)
  - 6.2. [Uso del Traductor](#62-uso-del-traductor)
- 7. [Consideraciones Adicionales](#7-consideraciones-adicionales)
- [Próximos Pasos](#próximos-pasos)

---

## 1. Entendiendo `CriteriaTranslator` y `ICriteriaVisitor`

La librería utiliza el patrón de diseño Visitor.

- **`CriteriaTranslator<TranslationContext, TranslationOutput, TFilterVisitorOutput>`**: Es una clase abstracta que debes extender.

  - `TranslationContext`: El tipo del objeto de contexto mutable que se pasa durante el recorrido del grafo de objetos `Criteria` (ej. una instancia de un constructor de consultas, o un objeto donde acumulas partes de una consulta). Este objeto es modificado directamente por los métodos `visit...`.
  - `TranslationOutput` (opcional, por defecto `TranslationContext`): El tipo del resultado final devuelto por el método `translate()`. Típicamente es el mismo `TranslationContext`, pero puede ser un tipo diferente si tu traductor necesita devolver una versión procesada del contexto (ej. una cadena SQL final a partir de un constructor de consultas).
  - `TFilterVisitorOutput` (opcional, por defecto `any`): El tipo de salida específico para el método `visitFilter`. Esto permite que los filtros devuelvan una representación intermedia (ej. una cadena de condición y sus parámetros) que luego puede ser integrada en el `TranslationContext` principal. Los métodos `visitAndGroup` y `visitOrGroup`, sin embargo, devuelven `void` y modifican directamente el `TranslationContext`.

- **`ICriteriaVisitor`**: La interfaz que `CriteriaTranslator` implementa. Define todos los métodos `visit...` que tu traductor necesitará sobreescribir para manejar cada tipo de nodo en el árbol de `Criteria` (filtros, grupos de filtros, joins, etc.).

El proceso de traducción se inicia llamando al método `translate()`, que es un **método abstracto que debes implementar**. Dentro de tu implementación de `translate`, eres responsable de iniciar el recorrido del visitor llamando a `criteria.accept(this, initialContext)`. El método `accept` de cada componente de `Criteria` llamará entonces al método `visit...` apropiado en tu traductor, pasándole el componente mismo y el `TranslationContext`. Por ejemplo, el método `accept` de un `RootCriteria` llamará a `visitor.visitRoot(...)`, mientras que el `accept` de un `Filter` llamará a `visitor.visitFilter(...)`. Este mecanismo de "doble despacho" es el núcleo del patrón Visitor.

---

## 2. Creando tu Clase Traductora

El primer paso es crear una nueva clase que extienda `CriteriaTranslator`. Deberás definir los tipos genéricos según lo que tu traductor vaya a producir y necesitar.

Para los ejemplos conceptuales en esta guía, utilizaremos los siguientes tipos para `TranslationContext` y `TFilterVisitorOutput`, que se alinean con el [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts) ejemplo:

Aquí está la estructura básica de tu clase traductora personalizada, mostrando solo las firmas de los métodos públicos que necesitarás implementar:

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

En este ejemplo:

- `PseudoSqlParts`: Es nuestro `TranslationContext`, representando las partes acumuladas de la consulta SQL.
- `{ query: string; params: any[] }`: Es nuestro `TranslationOutput`, el resultado final devuelto por el método `translate()`.
- `PseudoSqlFilterOutput`: Es nuestro `TFilterVisitorOutput`, el resultado de visitar filtros individuales.

---

## Helper: `escapeField`

Muchos traductores necesitarán una función de utilidad para escapar correctamente los nombres de campo y prevenir la inyección SQL o para ajustarse a la sintaxis del lenguaje de consulta objetivo. Este helper se utiliza en los ejemplos conceptuales a continuación.

```typescript
function escapeField(field: string, alias?: string): string {
  const escape = (str: string) => `\`${str.replace(/`/g, '``')}\``;
  return alias ? `${escape(alias)}.${escape(field)}` : escape(field);
}
```

Esta función toma un nombre de campo y un alias opcional, y devuelve una cadena con el campo correctamente escapado y prefijado (ej. `` `alias`.`campo` ``).

---

## 3. Implementando Métodos `visit...`

Ahora, debes implementar los métodos abstractos `visit...` de `CriteriaTranslator`.

### 3.1. `visitRoot`

Este es el punto de entrada principal para la traducción de un `RootCriteria`. Aquí es donde típicamente iniciarás tu consulta, procesarás los filtros principales, uniones, ordenamiento y paginación del `RootCriteria`.

```typescript
public override visitRoot<RootCSchema extends CriteriaSchema>(
  criteria: RootCriteria<RootCSchema>,
  context: PseudoSqlParts,
): void {}
```

**Explicación:**

Este método es el punto de partida del proceso de traducción. Recibe el objeto `RootCriteria` y el `TranslationContext` (nuestro objeto `sqlParts`). Sus responsabilidades principales son:

- **Inicializar la cláusula `FROM`:** Utiliza `criteria.sourceName` y `criteria.alias` para configurar la tabla principal de la consulta.
- **Procesar la selección de campos:** Mapea `criteria.select` a la cláusula `SELECT`, asegurándose de que los campos estén correctamente cualificados con el alias de la entidad.
- **Manejar uniones:** Itera a través de `criteria.joins` y llama recursivamente a `accept` en cada `JoinCriteria` para procesar las uniones anidadas.
- **Procesar filtros raíz:** Si `criteria.rootFilterGroup` contiene filtros, llama a `accept` en este grupo para traducirlos en condiciones `WHERE`.
- **Aplicar paginación:** Comprueba `criteria.take` y `criteria.skip` para la paginación basada en offset, y `criteria.cursor` para la paginación basada en cursor, añadiendo las cláusulas `LIMIT`, `OFFSET` o `WHERE` complejas correspondientes.
- **Recolectar reglas de ordenamiento:** Reúne los objetos `Order` de `criteria.orders` para ser aplicados más tarde.

**Propiedades `Criteria` disponibles:** `criteria.sourceName`, `criteria.alias`, `criteria.select`, `criteria.orders`, `criteria.joins`, `criteria.rootFilterGroup`, `criteria.cursor`, `criteria.take`, `criteria.skip`.

Para una implementación completa, consulta el método `visitRoot` en `src/criteria/translator/example/pseudo-sql.translator.ts`.

### 3.2. `visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin`

Estos métodos manejan los diferentes tipos de uniones. Reciben la instancia del `JoinCriteria`, los `parameters` del join (que incluyen información del padre y del hijo del join), y el `context`.

Para evitar la repetición de código, una práctica común es crear un método auxiliar privado (como `applyJoin` a continuación) que maneje la lógica compartida para todos los tipos de unión.

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

**Explicación (para `applyJoin` y los métodos `visit...Join`):**

Estos métodos son responsables de traducir las condiciones de unión al lenguaje de consulta objetivo. Cada método `visit...Join` simplemente llama al auxiliar `applyJoin`, pasando el `joinType` específico (ej. 'INNER', 'LEFT', 'FULL OUTER').

Las responsabilidades del auxiliar `applyJoin` incluyen:

- **Construir la cláusula `JOIN`:** Utiliza `criteria.sourceName` (la tabla que se está uniendo) y `parameters.join_alias` (su alias en la consulta) para construir la parte `JOIN` de la consulta.
- **Definir la condición `ON`:**
- Para `SimpleJoin` (relaciones uno a uno, uno a muchos, muchos a uno), construye la condición `ON` utilizando `parameters.parent_alias`.`parameters.parent_field` = `parameters.join_alias`.`parameters.join_field`.
- Para `PivotJoin` (relaciones muchos a muchos), típicamente implica dos operaciones `JOIN`: una desde el padre a la tabla pivote, y otra desde la tabla pivote a la tabla destino unida. Construye las condiciones `ON` para ambas.
- **Aplicar filtros en la unión:** Si `criteria.rootFilterGroup` (del `JoinCriteria` que se está visitando) tiene filtros, los procesa llamando a `criteria.rootFilterGroup.accept(this, parameters.join_alias, context)` y añade sus condiciones a la cláusula `ON` utilizando `AND`.
- **Seleccionar campos de la entidad unida:** Mapea `criteria.select` (del `JoinCriteria`) a la cláusula `SELECT` principal, asegurándose de que los campos estén prefijados con `parameters.join_alias`.
- **Recolectar reglas de ordenamiento:** Añade `criteria.orders` (del `JoinCriteria`) a una colección global de órdenes (ej. `this.collectedOrders` en [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts)) para ser procesadas más tarde en `visitRoot`.
- **Procesar uniones anidadas:** Crucialmente, si el `JoinCriteria` que se está visitando tiene `criteria.joins` definidos (es decir, uniones encadenadas a partir de una unión), itera sobre ellos y llama recursivamente a `subJoinDetail.criteria.accept(this, subJoinDetail.parameters, context)` para procesarlos.

**Propiedades `Criteria` disponibles:** `criteria.sourceName`, `criteria.alias`, `criteria.select`, `criteria.orders`, `criteria.joins`, `criteria.rootFilterGroup`.
**Propiedades `parameters` disponibles:** `parameters.parent_alias`, `parameters.join_alias`, `parameters.parent_field`, `parameters.join_field`, `parameters.pivot_source_name`, `parameters.parent_identifier`, `parameters.parent_schema_metadata`, `parameters.join_metadata`.

Para una implementación completa, consulta los métodos `visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin` y el auxiliar `applyPseudoJoin` en `src/criteria/translator/example/pseudo-sql.translator.ts`.

### 3.3. `visitFilter`

Este método traduce un `Filter` individual a una condición para tu lenguaje de consulta.

```typescript
public override visitFilter<FieldType extends string>(
  filter: Filter<FieldType, FilterOperator>,
  currentAlias: string,
  context: PseudoSqlParts,
): PseudoSqlFilterOutput {
  return { condition: '', params: [] };
}
```

**Explicación:**

Este método es responsable de convertir un objeto `Filter` individual en una cadena de condición de consulta y de recolectar los parámetros necesarios.

- **Generar el nombre de campo:** Construye el nombre de campo completamente cualificado utilizando `currentAlias` y `filter.field` (ej. `` `alias`.`campo` ``).
- **Parametrización:** Es **crucial** utilizar placeholders (ej. `?`, `$1`, `:nombreParam`) para `filter.value` para prevenir la inyección SQL. Añade `filter.value` a la lista de parámetros de tu `TranslationContext`.
- **Implementar la lógica del operador:** Utiliza una sentencia `switch` o similar para manejar cada `FilterOperator`. La lógica para cada operador variará según el lenguaje de consulta objetivo y el tipo esperado de `filter.value` (ej. `BETWEEN` espera una tupla, `IN` espera un array, los operadores JSON esperan objetos).
- **Devolver la condición:** Devuelve un objeto que contiene la cadena de condición generada y los parámetros recolectados.

**Propiedades `Filter` disponibles:** `filter.field`, `filter.operator`, `filter.value`.
**Contexto disponible:** `currentAlias`.

Para una implementación completa, consulta el método `visitFilter` en `src/criteria/translator/example/pseudo-sql.translator.ts`.

### 3.4. `visitAndGroup`, `visitOrGroup`

Estos métodos manejan grupos de filtros. Reciben un `FilterGroup` y deben iterar sobre sus `items`, procesándolos recursivamente y uniéndolos con el operador lógico apropiado (`AND` u `OR`).

Un patrón común es utilizar un método auxiliar privado (como `_buildConditionFromGroup` a continuación) para manejar la lógica recursiva tanto para grupos `AND` como `OR`.

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

**Explicación (para `_buildConditionFromGroup` y los métodos `visit...Group`):**

Estos métodos son responsables de traducir los objetos `FilterGroup` en una condición de consulta combinada. Los métodos `visitAndGroup` y `visitOrGroup` típicamente llaman a un auxiliar como `_buildConditionFromGroup` y luego añaden la condición resultante al `TranslationContext`.

Las responsabilidades del auxiliar `_buildConditionFromGroup` incluyen:

- **Recorrido recursivo:** Itera sobre `group.items`. Para cada `item` (que puede ser un `Filter` o otro `FilterGroup`), llama recursivamente a `item.accept(this, currentAlias, context)`.
- **Recolectar condiciones y parámetros:** Acumula las cadenas de condición y los parámetros devueltos por las llamadas recursivas a `accept`.
- **Combinar condiciones:** Une las condiciones recolectadas utilizando el `group.logicalOperator` (`AND` u `OR`).
- **Asegurar el agrupamiento:** Envuelve las condiciones combinadas entre paréntesis (ej. `(condicion1 AND condicion2)`) para asegurar la precedencia lógica correcta, especialmente al mezclar grupos `AND` y `OR`.
- **Añadir al contexto:** Añade la condición final combinada y sus parámetros a la cláusula `where` del `TranslationContext`.

**Propiedades `FilterGroup` disponibles:** `group.items`, `group.logicalOperator`.
**Contexto disponible:** `currentAlias`.

Para una implementación completa, consulta los métodos `visitAndGroup` y `visitOrGroup` y el auxiliar `_buildConditionFromGroup` en `src/criteria/translator/example/pseudo-sql.translator.ts`.

---

## 4. Manejando Ordenamiento, Paginación y Selección

Estas lógicas generalmente se aplican en `visitRoot` después de que todas las uniones y filtros principales se hayan procesado.

- **Ordenamiento (`orderBy`):** Tu traductor debe recolectar todos los objetos `Order` de la raíz y de todos los joins. Al final, ordena esta colección global por `order.sequenceId` para asegurar un orden de clasificación determinista, y luego aplícalos a la consulta.
- **Paginación Offset (`setTake`, `setSkip`):** Si `criteria.take > 0` o `criteria.skip > 0`, aplica los correspondientes `LIMIT` y `OFFSET` a tu consulta.
- **Paginación por Cursor (`setCursor`):** Esta es más compleja. El traductor debe construir una condición `WHERE` basada en `cursor.filters` y `cursor.operator`. Los campos de `cursor.filters` también deben ser los primeros campos en la cláusula `ORDER BY`, usando la dirección de `cursor.order`.
- **Selección de Campos (`setSelect`):** En `visitRoot` y `visit...Join`, construye la cláusula `SELECT` basada en `criteria.select`. Si `criteria.selectAll` es `true`, selecciona todos los campos del esquema.

---

## 5. Gestión de Estado y Parámetros

Dado que el método `translate` es abstracto, estás obligado a implementarlo. Esta implementación es donde gestionas todo el ciclo de vida de la traducción, incluyendo el estado y los parámetros. El patrón recomendado es encapsular esta lógica dentro de la clase del traductor y reiniciarla para cada llamada a `translate()`.

El siguiente ejemplo muestra el patrón de implementación requerido para el método `translate`:

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

**Explicación:**

El método `translate` que implementas es el punto de entrada público. Es responsable de:

1.  **Reiniciar el estado interno:** Asegura que cada traducción comience con un estado limpio (ej. `paramCounter` y `collectedOrders` se reinician).
2.  **Inicializar el `TranslationContext`:** Crea el objeto inicial (ej. `queryBuilder`) que será modificado por los métodos `visit...`.
3.  **Iniciar el recorrido:** Este es el paso crucial donde llamas a `criteria.accept(this, queryBuilder)` para comenzar el patrón Visitor. Todos los métodos `visit...` posteriores modificarán el objeto `queryBuilder` directamente.
4.  **Ensamblar la consulta final:** Después de que el recorrido se complete, construye la cadena de consulta final (ej. SQL) combinando las partes acumuladas de `queryBuilder`.
5.  **Devolver el resultado:** Devuelve la consulta final y sus parámetros.

---

## 6. Ejemplo Completo: Traductor a Pseudo-SQL

### 6.1. Implementación del Traductor

Para un ejemplo completo y funcional de una implementación de `CriteriaTranslator`, por favor consulta el archivo [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts) en el repositorio. Este archivo contiene el código completo de la clase [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts), que traduce objetos `Criteria` a una cadena de pseudo-SQL.

### 6.2. Uso del Traductor

Así es como usarías el [`PseudoSqlTranslator`](../../../criteria/translator/example/pseudo-sql.translator.ts):

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

## 7. Consideraciones Adicionales

- **Errores y Validación:** Decide cómo manejar operadores o configuraciones no soportadas por tu fuente de datos. Puedes lanzar errores o ignorarlos.
- **Optimización:** Considera las optimizaciones específicas de tu fuente de datos.
- **Pruebas:** Escribe pruebas unitarias y de integración exhaustivas para tu traductor. Usa `CriteriaFactory` para construir diversos escenarios de `Criteria` y verifica que la salida de tu traductor sea la esperada.

---

## Próximos Pasos

Con esta guía, tienes las bases para empezar a desarrollar tus propios traductores. Para una referencia detallada de todas las clases y tipos, consulta la Referencia de API.
