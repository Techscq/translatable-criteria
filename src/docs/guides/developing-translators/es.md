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
  - 4.1. [Ordenamiento (`orderBy`)](#41-ordenamiento-orderby)
  - 4.2. [Paginación Offset (`setTake`, `setSkip`)](#42-paginación-offset-settake-setskip)
  - 4.3. [Paginación por Cursor (`setCursor`)](#43-paginación-por-cursor-setcursor)
  - 4.4. [Selección de Campos (`setSelect`)](#44-selección-de-campos-setselect)
- 5. [Gestión de Estado y Parámetros](#5-gestión-de-estado-y-parámetros)
- 6. [Ejemplo Simplificado: Traductor a Pseudo-SQL](#6-ejemplo-simplificado-traductor-a-pseudo-sql)
- 7. [Consideraciones Adicionales](#7-consideraciones-adicionales)
- [Próximos Pasos](#próximos-pasos-traductores)

---

## 1. Entendiendo `CriteriaTranslator` y `ICriteriaVisitor`

Como se mencionó en los Conceptos Clave, la librería utiliza el patrón de diseño Visitor.

- **`CriteriaTranslator<TranslationContext, TranslationOutput, TFilterVisitorOutput>`**: Es una clase abstracta que debes extender.

  - `TranslationContext`: El tipo del objeto de contexto que se pasa durante el recorrido del `Criteria` (ej. un constructor de consultas como el `SelectQueryBuilder` de TypeORM, o un objeto donde acumulas partes de una consulta MongoDB).
  - `TranslationOutput`: El tipo del resultado final de la traducción (ej. el `SelectQueryBuilder` modificado, una cadena SQL, un objeto de consulta MongoDB).
  - `TFilterVisitorOutput`: El tipo de salida específico para los métodos `visitFilter`, `visitAndGroup` y `visitOrGroup`. Esto permite que los filtros se procesen de manera diferente si es necesario (ej. generando una cadena de condición, o un objeto de filtro).

- **`ICriteriaVisitor`**: La interfaz que `CriteriaTranslator` implementa. Define todos los métodos `visit...` que tu traductor necesitará sobreescribir para manejar cada tipo de nodo en el árbol de `Criteria` (filtros, grupos de filtros, joins, etc.).

El proceso de traducción generalmente comienza llamando al método `translate()` de tu traductor, el cual internamente llama a `criteria.accept(this, initialContext)`.

---

## 2. Creando tu Clase Traductora

El primer paso es crear una nueva clase que extienda `CriteriaTranslator`. Deberás definir los tipos genéricos según lo que tu traductor vaya a producir y necesitar.

```typescript
import {
  CriteriaTranslator,
  RootCriteria,
  InnerJoinCriteria,
  // ... otros imports necesarios
  FilterOperator,
  type CriteriaSchema,
  type SelectedAliasOf,
  type PivotJoin,
  type SimpleJoin,
  type JoinRelationType,
  type Filter,
  type FilterGroup,
} from '@nulledexp/translatable-criteria';

// Define tus tipos para el contexto y la salida
// Por ejemplo, si traduces a un constructor de consultas SQL:
// type MyQueryBuilder = SomeSQLQueryBuilder;
// type MyFilterCondition = string; // o un objeto de condición

// Para este ejemplo, usaremos tipos simples
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
  MyQueryBuilder, // TranslationContext: El objeto que se modifica durante la traducción
  MyQueryBuilder, // TranslationOutput: El resultado final de translate()
  MyFilterConditionOutput // TFilterVisitorOutput: El resultado de visitar filtros/grupos
> {
  private paramCounter = 0;

  private generateParamPlaceholder(): string {
    // La lógica interna puede variar según el tipo de placeholder que necesites:
    // Si usas placeholders nombrados como :p0, :p1 (común en TypeORM, por ejemplo)
    // return `:p${this.paramCounter++}`;
    // Si usas placeholders posicionales como ? (común en MySQL nativo, SQLite)
    this.paramCounter++; // Solo para contar si es necesario, el placeholder es fijo
    return `?`;
    // O el placeholder específico de tu BD/ORM.
  }

  // Implementación de los métodos visit...
  // ... (ver secciones siguientes)
}
```

En este ejemplo:

- `MyQueryBuilder`: Sería tu clase o interfaz para construir la consulta nativa.
- `string`: El tipo de salida de los métodos `visitFilter` y `visitGroup`, asumiendo que generan fragmentos de condición SQL.

---

## 3. Implementando Métodos `visit...`

Ahora, debes implementar los métodos abstractos `visit...` de `CriteriaTranslator`.

### 3.1. `visitRoot`

Este es el punto de entrada principal para la traducción de un `RootCriteria`. Aquí es donde típicamente iniciarás tu consulta, procesarás los filtros principales, uniones, ordenamiento y paginación del `RootCriteria`.

```typescript
  visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    queryBuilder: MyQueryBuilder, // El contexto inicial
  ): MyQueryBuilder {
    this.paramCounter = 0; // Reiniciar contador de parámetros para cada traducción principal

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
      // El contexto (queryBuilder) se pasa y se modifica por los métodos visitJoin
      joinDetail.criteria.accept(this, joinDetail.parameters, queryBuilder);
    }

    // 4. WHERE clause for RootCriteria
    if (criteria.rootFilterGroup.items.length > 0) {
      const rootFilterResult = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        queryBuilder, // El contexto aquí podría ser diferente si los filtros no modifican directamente el QB
      );
      if (rootFilterResult.condition) {
        queryBuilder.conditions.push(rootFilterResult.condition);
        queryBuilder.params.push(...rootFilterResult.params);
      }
    }

    // 5. Cursor condition (si existe, se añade al WHERE)
    if (criteria.cursor) {
        const cursorFilters = criteria.cursor.filters;
        const op = criteria.cursor.operator === FilterOperator.GREATER_THAN ? '>' : '<';
        // const orderDir = criteria.cursor.order; // No usado directamente en este ejemplo de SQL simple

        const primaryCursorFilter = cursorFilters[0]!;
        const primaryParamName = this.generateParamPlaceholder(); // Usar un nombre de parámetro único
        queryBuilder.params.push(primaryCursorFilter.value);
        let cursorCondition = `(${criteria.alias}.${String(primaryCursorFilter.field)} ${op} :${primaryParamName}`;

        if (cursorFilters.length === 2) {
            const secondaryCursorFilter = cursorFilters[1]!;
            const secondaryParamName = this.generateParamPlaceholder(); // Usar un nombre de parámetro único
            queryBuilder.params.push(secondaryCursorFilter.value);
            cursorCondition += ` OR (${criteria.alias}.${String(primaryCursorFilter.field)} = :${primaryParamName} AND ${criteria.alias}.${String(secondaryCursorFilter.field)} ${op} :${secondaryParamName}))`;
        } else {
            cursorCondition += `)`;
        }
        queryBuilder.conditions.push(cursorCondition);

        // Asegurar que el orderBy del cursor se aplique
        // En un traductor real, esto podría necesitar lógica más compleja para asegurar el orden correcto
        // y evitar duplicados si ya están en criteria.orders.
        // Por simplicidad, aquí los añadimos.
        criteria.orders.forEach(order => { // Asumimos que los orders del cursor están en criteria.orders
             queryBuilder.orderBy.push(`${criteria.alias}.${String(order.field)} ${order.direction}`);
        });
    }


  // 6. ORDER BY
  // La lógica de ordenamiento debe ser cuidadosa, especialmente con cursores.
  // El traductor es responsable de:
  //   a. Si hay un cursor, sus campos de ordenamiento DEBEN tener prioridad.
  //   b. Luego, se aplican los demás `Order`s definidos en el `RootCriteria` y en los `JoinCriteria`s.
  //   c. Todos los `Order`s (después de los del cursor) deben ser ordenados globalmente por su `sequenceId`
  //      antes de ser aplicados, para mantener un ordenamiento determinista.
  // (Ver la sección "4.1. Ordenamiento (orderBy)" y el ejemplo del PseudoSqlTranslator
  // para una implementación más detallada de esta lógica).

  // Ejemplo conceptual simplificado (la lógica real es más compleja y se muestra en la sección 4.1 y el ejemplo):
  if (criteria.cursor) {
    // Los orderBy del cursor se aplican primero.
    // Ejemplo: criteria.cursor.filters.forEach(cf => queryBuilder.orderBy.push(`${criteria.alias}.${String(cf.field)} ${criteria.cursor.order}`));
    // Luego, los demás orders, evitando duplicados y usando sequenceId.
  } else {
    // Si no hay cursor, aplicar todos los orders recolectados, ordenados por sequenceId.
    // Ejemplo:
    // const allOrders = []; // Recolectar de criteria.orders y de los joins
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

**Consideraciones para `visitRoot`:**

- **Inicialización:** Configura la parte `FROM` de tu consulta usando `criteria.sourceName` y `criteria.alias`.
- **Filtros:** Llama a `criteria.rootFilterGroup.accept(this, criteria.alias, context)` para procesar los filtros del `RootCriteria`. El `context` aquí podría ser tu `queryBuilder` o un objeto donde adjuntar las condiciones.
- **Joins:** Itera sobre `criteria.joins` y llama a `joinDetail.criteria.accept(this, joinDetail.parameters, context)` para cada uno.
- **Ordenamiento y Paginación:** Aplica la lógica de `orderBy`, `take`, `skip` y `cursor` al final.
- **Selección de Campos:** Construye la cláusula `SELECT` basada en `criteria.select`.

### 3.2. `visitInnerJoin`, `visitLeftJoin`, `visitOuterJoin`

Estos métodos manejan los diferentes tipos de uniones. Reciben la instancia del `JoinCriteria`, los `parameters` del join (que incluyen información del padre y del hijo del join), y el `context`.

```typescript
  private applyJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    joinType: 'INNER' | 'LEFT' | 'OUTER',
    criteria: // El JoinCriteria actual que se está visitando
      | InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    queryBuilder: MyQueryBuilder, // Contexto: el query builder principal
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

    // Filtros en el JOIN (se añaden a la cláusula ON o como AND después)
    if (criteria.rootFilterGroup.items.length > 0) {
      const joinFilterResult = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        queryBuilder,
      );
      if (joinFilterResult.condition) {
        const lastJoinIndex = queryBuilder.joins.length -1;
        if(queryBuilder.joins[lastJoinIndex]) {
            queryBuilder.joins[lastJoinIndex] += ` AND (${joinFilterResult.condition})`;
            queryBuilder.params.push(...joinFilterResult.params);
        }
      }
    }

    // Selección de campos del Join
    criteria.select.forEach((field) => {
      queryBuilder.selectFields.push(`${criteria.alias}.${String(field)}`);
    });
    if (criteria.selectAll && criteria.select.length === 0) {
        queryBuilder.selectFields.push(`${criteria.alias}.*`);
    }

    // Recolectar OrderBy del join para aplicarlos globalmente
    // (Esta lógica podría necesitar refinamiento para asegurar el orden global correcto)
    criteria.orders.forEach(order => {
        // Ejemplo: queryBuilder.orderBy.push(`${criteria.alias}.${String(order.field)} ${order.direction}`);
        // O almacenarlos en una propiedad de la clase para aplicarlos al final en visitRoot.
    });

    // ***** INICIO DE LA MODIFICACIÓN PARA JOINS ANIDADOS *****
    // Si este JoinCriteria (el 'criteria' actual) tiene sus propios joins definidos,
    // los procesamos recursivamente.
    for (const subJoinDetail of criteria.joins) {
      // El 'queryBuilder' (contexto) se sigue pasando y modificando.
      subJoinDetail.criteria.accept(this, subJoinDetail.parameters, queryBuilder);
    }
    // ***** FIN DE LA MODIFICACIÓN PARA JOINS ANIDADOS *****

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
    return this.applyJoin('OUTER', criteria, parameters, context);
  }
```

**Consideraciones para los `visitJoin...`:**

- **Tipo de Join:** Usa el tipo de join (`INNER JOIN`, `LEFT JOIN`, etc.) apropiado.
- **Tabla y Alias:** Usa `criteria.sourceName` y `criteria.alias` para la tabla unida.
- **Condición `ON`:**
  - Para `SimpleJoin` (one-to-one, one-to-many, many-to-one): Construye la condición `ON` usando `parameters.parent_alias`.`parameters.parent_field` = `criteria.alias`.`parameters.join_field`.
  - Para `PivotJoin` (many-to-many): Necesitarás dos uniones: una desde la tabla padre a la tabla pivote (`parameters.pivot_source_name`), y otra desde la tabla pivote a la tabla destino (`criteria.sourceName`). Las condiciones `ON` usarán los campos definidos en `parameters.parent_field.pivot_field`, `parameters.parent_field.reference`, `parameters.join_field.pivot_field`, y `parameters.join_field.reference`.
- **Filtros en el Join:** Si `criteria.rootFilterGroup` (del `JoinCriteria`) tiene filtros, estos deben aplicarse como condiciones adicionales en la cláusula `ON` del join (o como `AND` después del `ON`, dependiendo de la base de datos). Llama a `criteria.rootFilterGroup.accept(this, criteria.alias, context)` para esto.
- **Selección de Campos del Join:** Añade los campos de `criteria.select` (del `JoinCriteria`) a tu selección principal, usualmente prefijados con `criteria.alias`.
- **Ordenamiento del Join:** Si `criteria.orders` (del `JoinCriteria`) tiene órdenes, almacénalos para aplicarlos globalmente al final.

### 3.3. `visitFilter`

Este método traduce un `Filter` individual a una condición de tu lenguaje de consulta.

```typescript
  visitFilter<
    FieldType extends string,
    Operator extends FilterOperator,
  >(
    filter: Filter<FieldType, Operator>,
    currentAlias: string,
    // queryBuilder: MyQueryBuilder, // El contexto puede no ser necesario aquí si solo devolvemos la condición
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
        params.push(filter.value); // Asume que el valor ya tiene '%'
        break;
      case FilterOperator.CONTAINS: // Podría ser igual que LIKE o usar una función específica
        condition = `${fieldName} LIKE :${paramName}`;
        params.push(`%${filter.value}%`);
        break;
      case FilterOperator.IN:
        // TypeORM maneja arrays para IN, pero un traductor manual necesitaría generar placeholders
        condition = `${fieldName} IN (:...${paramName})`; // Placeholder para múltiples valores
        params.push(filter.value); // El valor es un array
        break;
      case FilterOperator.IS_NULL:
        condition = `${fieldName} IS NULL`;
        // No hay parámetros para IS NULL
        break;
      // ... Implementar todos los FilterOperator necesarios
      case FilterOperator.JSON_CONTAINS:
        if (typeof filter.value === 'object' && filter.value !== null) {
          const conditions: string[] = [];
          for (const pathKey in filter.value) {
            const pathValue = (filter.value as Record<string, any>)[pathKey];
            const currentParamName = this.generateParamPlaceholder();
            // Nota: La construcción de la ruta JSON (ej. '$.${pathKey}' vs '${pathKey}')
            // y la función exacta (JSON_EXTRACT, JSON_CONTAINS, ->, @>, etc.)
            // varía enormemente según la base de datos (MySQL, PostgreSQL, etc.).
            // Este es un ejemplo conceptual para MySQL con JSON_EXTRACT para igualdad.
            conditions.push(`JSON_EXTRACT(${fieldName}, '$.${pathKey}') = :${currentParamName}`);
            params.push(pathValue);
          }
          condition = conditions.join(' AND ');
        } else {
          condition = '1=0'; // Condición que siempre es falsa
        }
        break;
      case FilterOperator.ARRAY_CONTAINS_ELEMENT:
        const arrayElemParamName = this.generateParamPlaceholder();
        if (typeof filter.value === 'object' && filter.value !== null && !Array.isArray(filter.value)) {
          // Asume value es { "ruta.al.array.json": elemento_a_buscar }
          const jsonPath = Object.keys(filter.value)[0]!;
          const elementToFind = (filter.value as Record<string, any>)[jsonPath];
          // Nota: La sintaxis para consultar arrays dentro de JSON varía (ej. MySQL vs PostgreSQL).
          // Este es un ejemplo conceptual para MySQL:
          condition = `JSON_CONTAINS(${fieldName}, CAST(:${arrayElemParamName} AS JSON), '$.${jsonPath}')`;
          params.push(elementToFind);
        } else {
          // Para columnas de array nativo (ej. PostgreSQL `ANY`)
          condition = `:${arrayElemParamName} = ANY(${fieldName})`;
          params.push(filter.value);
        }
        break;
      default:
        throw new Error(
          `Traductor: Operador de filtro no soportado '${filter.operator}'`,
        );
    }
    return { condition, params: params.map(p => (p === undefined ? null : p)) };
  }
```

**Consideraciones para `visitFilter`:**

- **Campo y Alias:** El `currentAlias` te indica a qué entidad pertenece el `filter.field`.
- **Operador:** Implementa la lógica para cada `FilterOperator` que tu fuente de datos soporte.
- **Valor:** El `filter.value` debe ser formateado o parametrizado adecuadamente. Para operadores como `IN`, `value` será un array. Para operadores JSON/Array, `value` puede ser un objeto o un array, y necesitarás interpretar la ruta JSON si aplica.
- **Parametrización:** Es **crucial** usar consultas parametrizadas para prevenir inyección SQL. No concatenes directamente `filter.value` en la cadena de consulta. En su lugar, usa placeholders y pasa los valores a través del mecanismo de parámetros de tu constructor de consultas.

### 3.4. `visitAndGroup`, `visitOrGroup`

Estos métodos manejan grupos de filtros. Reciben un `FilterGroup` y deben iterar sobre sus `items`, procesándolos recursivamente y uniéndolos con el operador lógico apropiado (`AND` u `OR`).

```typescript
  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    _context: MyQueryBuilder, // El contexto puede o no ser usado/modificado aquí
  ): MyFilterConditionOutput {
    const conditions: string[] = [];
    const allParams: any[] = [];

    group.items.forEach((item) => {
      const result = item.accept(this, currentAlias, _context); // _context se pasa
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

**Consideraciones para los `visit...Group`:**

- **Recursión:** Cada `item` en `group.items` puede ser otro `FilterGroup` o un `Filter`. Llama a `item.accept(this, currentAlias, context)` para cada uno.
- **Agrupación:** Asegúrate de que las condiciones generadas estén correctamente agrupadas con paréntesis si es necesario, especialmente al mezclar `AND` y `OR`.

---

## 4. Manejando Ordenamiento, Paginación y Selección

Estas lógicas generalmente se aplican en `visitRoot` después de que todas las uniones y filtros principales se hayan procesado.

### 4.1. Ordenamiento (`orderBy`)

El ordenamiento define cómo se deben clasificar los resultados de la consulta.

- Durante la visita de cada `Criteria` (raíz o join) mediante sus respectivos métodos `visit...`, tu traductor debe **recolectar** todos los objetos `Order` que se hayan definido usando `.orderBy()`. Cada objeto `Order` contiene el campo, la dirección y un `sequenceId` interno único.
- Al final del procesamiento en `visitRoot` (después de haber procesado todos los joins y antes de aplicar `LIMIT`/`OFFSET`):
  1. Si existe un `criteria.cursor`, los campos definidos en `cursor.filters` deben usarse para generar las **primeras** cláusulas de `ORDER BY`, utilizando la dirección especificada en `cursor.order`.
  2. Luego, toma todos los `Order` recolectados (de la raíz y de todos los joins).
  3. Ordena esta colección global de `Order`s por su `sequenceId`. Esto asegura que el orden en que se definieron los `orderBy` a lo largo de la construcción del `Criteria` se respete secuencialmente.
  4. Convierte estos `Order`s (ya ordenados por secuencia y después de los del cursor) en las cláusulas `ORDER BY` de tu consulta nativa. Asegúrate de evitar duplicar campos si ya fueron ordenados por la lógica del cursor.
- El `order.sequenceId` es crucial para mantener un ordenamiento global determinista y predecible cuando se aplican múltiples `orderBy` en diferentes partes del `Criteria` (tanto en la raíz como en los joins anidados).
-

### 4.2. Paginación Offset (`setTake`, `setSkip`)

- Si `criteria.take > 0`, aplica un límite al número de resultados.
- Si `criteria.skip > 0`, omite el número especificado de resultados.

### 4.3. Paginación por Cursor (`setCursor`)

Esta es más compleja y requiere una coordinación cuidadosa con el ordenamiento. Si `criteria.cursor` está definido:

- `cursor.filters`: Proporciona uno o dos `Filter`s (sin el `operator`) que definen los campos y valores del último ítem de la página anterior.
  - Un solo `Filter`: Para paginación simple sobre un campo (ej. `created_at`).
  - Dos `Filter`s: Para paginación compuesta (ej. `created_at` y `uuid`).
- `cursor.operator`: Será `FilterOperator.GREATER_THAN` (para página siguiente) o `FilterOperator.LESS_THAN` (para página anterior, si se invierte el orden principal).
- `cursor.order`: La `OrderDirection` principal en la que se está paginando.

**Responsabilidades del Traductor:**

1.  **Construir la Condición `WHERE` del Cursor:**

- Para un cursor simple: `WHERE (campo_cursor operador_cursor_traducido valor_cursor)`
- Para un cursor compuesto: `WHERE ( (campo_orden_primario op_traducido valor_primario_cursor) OR (campo_orden_primario = valor_primario_cursor AND campo_desempate op_traducido valor_desempate_cursor) )`. Ajusta los operadores según la dirección.

2.  **Aplicar Ordenamiento del Cursor con Prioridad:**

- Los campos definidos en `cursor.filters` **deben** ser los primeros en la cláusula `ORDER BY` final. La dirección para estos campos viene de `cursor.order`.
- Por ejemplo, si `cursor.filters` son `[{field: 'created_at', ...}, {field: 'uuid', ...}]` y `cursor.order` es `ASC`, la consulta debe empezar con `ORDER BY created_at ASC, uuid ASC`.

3.  **Aplicar Ordenamientos Adicionales:**

- Después de los campos del cursor, añade los demás `orderBy` que se hayan definido en el `Criteria` (raíz y joins). Estos deben ser ordenados globalmente por su `sequenceId` antes de ser añadidos, y se deben omitir si el campo ya fue cubierto por el ordenamiento del cursor.
- **Importante:** El `Criteria` **debe** tener `orderBy()` definidos para los mismos campos que se usan en `cursor.filters` y en la misma dirección que `cursor.order`. Aunque el traductor prioriza los campos del cursor para el `ORDER BY`, esta consistencia en la definición del `Criteria` es crucial para la lógica de paginación.

### 4.4. Selección de Campos (`setSelect`)

- En `visitRoot`, construye la cláusula `SELECT` inicial usando `criteria.select` (del `RootCriteria`).
- En cada `visitJoin...`, si el `joinCriteria.select` tiene campos específicos, añádelos a la selección principal, usualmente prefijados con el alias del join (ej. `SELECT root.field1, joined_alias.fieldA`).
- Si `criteria.selectAll` es `true` (o `criteria.select` está vacío y es el comportamiento por defecto), selecciona todos los campos del esquema correspondiente.

---

## 5. Gestión de Estado y Parámetros

Tu traductor probablemente necesitará gestionar algún estado:

- **Parámetros de Consulta:** Mantén una lista o un objeto para los valores parametrizados. Cada vez que proceses un `filter.value` o un valor de paginación, añádelo a esta colección y usa un placeholder en la consulta.
- **Contador de Parámetros:** Si usas placeholders numerados (ej. `$1, $2` o `?`), necesitarás un contador.
- **Cláusulas Acumuladas:** Puedes tener propiedades en tu clase traductora para ir construyendo las diferentes partes de la consulta (SELECT, FROM, JOINs, WHERE, ORDER BY, etc.).

```typescript
// (Dentro de tu clase MyCustomTranslator)

// Ejemplo de gestión de estado simple:
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
//   // ... resetear todos los demás
//   this.queryParams = [];
//   this.paramCounter = 0;
// }

// private addQueryParam(value: any): string {
//   this.queryParams.push(value);
//   return `?`; // O $1, $2, etc., según tu DB
// }

// El método translate podría entonces ensamblar estas partes.
// public translate(criteria: RootCriteria<any, any>, initialContext?: any): string {
//   this.resetState();
//   criteria.accept(this, initialContext || {}); // El contexto inicial podría ser un objeto vacío
//
//   let sql = `SELECT ${this.collectedSelects.join(', ') || '*'}`;
//   sql += ` FROM ${this.collectedFrom}`;
//   if (this.collectedJoins.length > 0) sql += ` ${this.collectedJoins.join(' ')}`;
//   if (this.collectedWhere.length > 0) sql += ` WHERE ${this.collectedWhere.join(' AND ')}`; // Simplificado
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

## 6. Ejemplo Simplificado: Traductor a Pseudo-SQL

Este ejemplo muy básico muestra la estructura, traduciendo a una cadena de pseudo-SQL.

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
// ... (definición de UserSchema, CriteriaFactory, etc.)

// const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
//   .where({ field: 'email', operator: FilterOperator.CONTAINS, value: '@example.com' })
//   .orderBy('username', OrderDirection.ASC)
//   .setTake(10);

// const pseudoTranslator = new PseudoSqlTranslator();
// const { query: generatedSql, params: queryParams } = pseudoTranslator.translate(userCriteria);

// console.log('Generated SQL:', generatedSql);
// console.log('Parameters:', queryParams);

// Salida esperada (ejemplo):
// Generated SQL: SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`created_at` FROM `user` AS `users` WHERE (`users`.`email` LIKE ?) ORDER BY `users`.`username` ASC LIMIT ? OFFSET ?;
// Parameters: [ '%@example.com%', 10, 0 ]
```

---

## 7. Consideraciones Adicionales

- **Errores y Validación:** Decide cómo manejar operadores o configuraciones no soportadas por tu fuente de datos. Puedes lanzar errores o ignorarlos.
- **Optimización:** Considera las optimizaciones específicas de tu fuente de datos.
- **Pruebas:** Escribe pruebas unitarias y de integración exhaustivas para tu traductor. Usa `CriteriaFactory` para construir diversos escenarios de `Criteria` y verifica que la salida de tu traductor sea la esperada.
- **Documentación:** Si compartes tu traductor, documenta claramente qué características soporta y cómo usarlo.

---

## Próximos Pasos Traductores

Con esta guía, tienes las bases para empezar a desarrollar tus propios traductores. Revisa los traductores existentes (si los hay) como referencia y no dudes en experimentar.
