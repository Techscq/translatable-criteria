# Conceptos Clave de @nulledexp/translatable-criteria

Esta sección profundiza en los componentes fundamentales que conforman la librería
`@nulledexp/translatable-criteria`. Comprender estos conceptos es esencial para utilizar
eficazmente la librería y extender su funcionalidad.

## Índice de Conceptos Clave

- **_[Jerarquía de Criteria](#jerarquía-de-criteria)_**
- **_[CriteriaFactory](#criteriafactory)_**
- **_[Esquemas `CriteriaSchema` y `GetTypedCriteriaSchema`](#esquemas-criteriaschema-y-gettypedcriteriaschema)_**
- **_[CriteriaTranslator (`Clase Abstracta` y `Patrón Visitor`)](#criteriatranslator-clase-abstracta-y-patrón-visitor)_**
- **_[Filtros (`Filter`, `FilterGroup`, `FilterOperator`)](#filtros-filter-filtergroup-filteroperator)_**
- **_[Ordenamiento (`Order`, `OrderDirection`)](#ordenamiento-order-orderdirection)_**
- **_[Paginación](#paginación)_**
- **_[Selección de Campos (`setSelect`, `resetSelect`)](#selección-de-campos-setselect-resetselect)_**

---

## Jerarquía de `Criteria`

La clase abstracta `Criteria` es la base para definir las especificaciones de una consulta.
Representa un conjunto de condiciones, ordenamientos, uniones y configuraciones de paginación
para una entidad o un conjunto de entidades relacionadas.

Existen varias implementaciones concretas de `Criteria`:

- **`RootCriteria`**: Representa el punto de partida de una consulta, dirigido a una entidad
  principal.
- **`InnerJoinCriteria`**: Define una unión interna (INNER JOIN) con otra entidad.
- **`LeftJoinCriteria`**: Define una unión externa izquierda (LEFT JOIN) con otra entidad.
- **`OuterJoinCriteria`**: Define una unión externa completa (FULL OUTER JOIN) con otra
  entidad (su disponibilidad puede depender del traductor específico).

Cada instancia de `Criteria` encapsula:

- El esquema (`CriteriaSchema`) de la entidad a la que se aplica.
- Un alias único para referenciar esta entidad en la consulta.
- Gestores internos para filtros, uniones, ordenamiento y selección de campos.

[Volver al Índice](#índice-de-conceptos-clave)

---

## `CriteriaFactory`

`CriteriaFactory` es una clase de utilidad que proporciona métodos estáticos para crear
instancias de los diferentes tipos de `Criteria` (`RootCriteria`, `InnerJoinCriteria`, etc.).

**Propósito:**

- **Simplificar la creación:** Abstrae la complejidad de la instanciación directa.
- **Asegurar la correcta inicialización:** Garantiza que los criterios se creen con los
  parámetros necesarios y las validaciones iniciales.
- **Mejorar la legibilidad:** Hace que el código de construcción de criterios sea más claro y
  conciso.

**Uso recomendado:**
Se recomienda utilizar `CriteriaFactory` en lugar de instanciar las clases de
`Criteria` directamente.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Esquemas (`CriteriaSchema` y `GetTypedCriteriaSchema`)

Los esquemas son fundamentales para la seguridad de tipos y la validación en  
`@nulledexp/translatable-criteria`. Un `CriteriaSchema` define la "forma" de tus entidades de datos tal como la librería las entiende.

**¿Qué define un Esquema?**

- `source_name`: El nombre real de la tabla o colección en la base de datos.
- `alias`: Un array de posibles alias que se pueden usar para referirse a esta entidad en las
  consultas.
- `fields`: Un array con los nombres de los campos disponibles para esta entidad.
- `joins`: Un array que define las posibles relaciones de unión con otros esquemas, incluyendo
  el `alias` del join y el `join_relation_type` (ej. `one_to_many`, `many_to_one`,
  `many_to_many`).

**`GetTypedCriteriaSchema`:**
Es una función helper que se utiliza para definir esquemas. Su principal ventaja es que preserva los
tipos literales de los `fields` y `alias`, lo que permite un autocompletado y una validación de
tipos más robusta al construir los criterios. Esto evita la necesidad de usar aserciones de tipo
(como as const) en la definición del esquema, al tiempo que asegura que la estructura del esquema sea válida.
Los esquemas se proporcionan al `CriteriaFactory` al crear instancias de `Criteria`, permitiendo
que la librería valide que los campos, alias y uniones utilizados sean correctos.

[Volver al Índice](#índice-de-conceptos-clave)

---

## `CriteriaTranslator` (Clase Abstracta y Patrón Visitor)

El `CriteriaTranslator` es el corazón del mecanismo de traducción. Es una clase abstracta
diseñada para ser extendida por implementaciones concretas que convertirán un objeto `Criteria`
(agnóstico a la fuente de datos) en una consulta específica para una base de datos o motor de  
búsqueda particular (ej. SQL, una query de TypeORM, una consulta de MongoDB, etc.).

**Rol Principal:**

- Procesar un objeto `Criteria` (comenzando típicamente por un `RootCriteria`).
- "Visitar" cada parte del `Criteria` (filtros, joins, ordenamiento, etc.).
- Generar la sintaxis de consulta nativa correspondiente.

**Patrón Visitor:**
La librería utiliza el patrón de diseño Visitor.

- Cada clase de `Criteria` (y sus componentes como `FilterGroup`, `Filter`) tiene un método `accept(visitor, ...args)`.
- El `CriteriaTranslator` implementa la interfaz `ICriteriaVisitor`, que define métodos `visit...
` para cada tipo de elemento que puede encontrar (ej. `visitRootCriteria`, `visitInnerJoinCriteria`, `visitFilter`, `visitAndGroup`).

Cuando se llama a `criteria.accept(translator, ...)`:

1.  El `criteria` invoca el método `visit...` apropiado en el `translator`, pasándose a sí mismo como argumento.
2.  El `translator` ejecuta la lógica específica para traducir ese tipo de `criteria` o componente.

Esto permite una arquitectura limpia y extensible: la lógica de construcción de `Criteria` está
separada de la lógica de traducción. Para soportar una nueva base de datos, solo necesitas crear
un nuevo traductor que extienda `CriteriaTranslator`.

Los traductores concretos (como `@nulledexp/typeorm-mysql-translator`) se proporcionan como
paquetes separados.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Filtros (`Filter`, `FilterGroup`, `FilterOperator`)

Los filtros permiten especificar las condiciones que deben cumplir los datos para ser seleccionados.

- **`Filter`**: Representa una condición de filtro individual. Se compone de:

  - `field`: El campo sobre el que se aplica el filtro. Este campo está fuertemente tipado con
    los campos válidos definidos en el esquema de cada Criteria.
  - `operator`: El operador de comparación (ver `FilterOperator`).
  - `value`: El valor con el que se compara el campo. El tipo de este valor está estrictamente tipado según el `operator` utilizado.

- **`FilterOperator`**: Es una enumeración que define los diversos operadores de comparación disponibles, tales como:

  - Igualdad: `EQUALS`, `NOT_EQUALS`
  - Comparación: `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_OR_EQUALS`, `LESS_THAN_OR_EQUALS`
  - Patrones: `LIKE`, `NOT_LIKE`, `CONTAINS`, `NOT_CONTAINS`, `STARTS_WITH`, `ENDS_WITH`
  - Pertenencia: `IN`, `NOT_IN`
  - Nulidad: `IS_NULL`, `IS_NOT_NULL`
  - Para campos tipo SET (o equivalentes): `SET_CONTAINS`, `SET_NOT_CONTAINS`
  - Para campos JSON: `JSON_CONTAINS`, `JSON_NOT_CONTAINS`
  - Para campos Array: `ARRAY_CONTAINS_ELEMENT`, `ARRAY_CONTAINS_ALL_ELEMENTS`, `ARRAY_CONTAINS_ANY_ELEMENT`, `ARRAY_EQUALS`

- **`FilterGroup`**: Permite agrupar múltiples `Filter` o incluso otros `FilterGroup` utilizando operadores lógicos:
  - `LogicalOperator.AND`: Todas las condiciones dentro del grupo deben cumplirse.
  - `LogicalOperator.OR`: Al menos una de las condiciones dentro del grupo debe cumplirse.

Los filtros se añaden a un `Criteria` usando los métodos `where()`, `andWhere()`, y `orWhere()`. La librería normaliza automáticamente la estructura de los `FilterGroup` para mantener la consistencia.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Ordenamiento (`Order`, `OrderDirection`)

El ordenamiento define cómo se deben clasificar los resultados de la consulta.

- **`Order`**: Representa una regla de ordenamiento individual. Se compone de:

  - `field`: El campo por el cual se ordenarán los resultados. Este campo está fuertemente
    tipado con los campos válidos definidos en el esquema de cada Criteria.
  - `direction`: La dirección del ordenamiento (ver `OrderDirection`).

- **`OrderDirection`**: Es una enumeración con dos posibles valores:
  - `ASC`: Orden ascendente.
  - `DESC`: Orden descendente.

Se pueden añadir múltiples reglas de ordenamiento a un `Criteria` usando el método `orderBy()`. El orden en que se añaden es significativo, ya que define la prioridad del ordenamiento. Cada `Order` también tiene un `sequenceId` interno que los traductores pueden usar para mantener un orden estable si es necesario.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Paginación

La paginación permite recuperar subconjuntos de resultados, lo cual es crucial para manejar grandes cantidades de datos. La librería soporta dos tipos de paginación:

- **Paginación basada en Offset:**

  - `setTake(count)`: Especifica el número máximo de registros a devolver (equivalente a `LIMIT`).
  - `setSkip(count)`: Especifica el número de registros a omitir antes de empezar a devolver resultados (equivalente a `OFFSET`).

- **Paginación basada en Cursor:**
  - `setCursor(cursorFilters, operator, order)`: Permite una paginación más eficiente y estable, especialmente con conjuntos de datos que cambian frecuentemente.
    - `cursorFilters`: Un array de uno o dos objetos `FilterPrimitive` (sin el `operator`) que definen los valores del cursor (ej. el `created_at` y el `uuid` del último ítem de la página anterior).
    - `operator`: Debe ser `FilterOperator.GREATER_THAN` o `FilterOperator.LESS_THAN`, dependiendo de la dirección de paginación.
    - `order`: La dirección (`OrderDirection`) en la que se está ordenando, que debe coincidir con el ordenamiento principal del `Criteria`.
  - Para que la paginación por cursor funcione correctamente, el traductor es responsable de
    procesar la información del cursor (cursorFilters, operator y order) y asegurar que los
    orderBy necesarios se apliquen a la consulta final con la prioridad adecuada, utilizando los
    campos definidos en el cursor.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Selección de Campos (setSelect, resetSelect)

Por defecto, cuando se crea un `Criteria` (ya sea `RootCriteria` o un `JoinCriteria`), se seleccionarán todos los campos definidos en su esquema asociado. Este comportamiento se puede modificar:

- **`setSelect(fields: FieldOfSchema<TSchema>[])`**: Permite especificar explícitamente un array
  de campos que se deben seleccionar tipado con los field
  validos del esquema de esa instancia de `Criteria`. Si se llama a `setSelect()`, solo se seleccionarán los campos
  proporcionados.

  - Es importante notar que si se utiliza `orderBy()` o `setCursor()` sobre campos que no están incluidos en `setSelect()`, algunos traductores (como el de TypeORM) podrían añadir automáticamente esos campos a la selección para asegurar el correcto funcionamiento de la base de datos.

- **`resetSelect()`**: Revierte al comportamiento por defecto de seleccionar todos los campos del esquema para esa instancia de `Criteria`. Esto es útil si previamente se usó `setSelect()` y se desea volver a seleccionar todo.

- **Comportamiento en Joins:**
  - Si un `JoinCriteria` no tiene `setSelect()` llamado explícitamente, todos sus campos se incluirán en la cláusula `SELECT` principal de la consulta, prefijados con el alias del join.
  - Si se llama a `setSelect()` en un `JoinCriteria`, solo esos campos seleccionados del join se incluirán.

Esta flexibilidad permite optimizar las consultas para recuperar solo los datos necesarios.

[Volver al Índice](#índice-de-conceptos-clave)
