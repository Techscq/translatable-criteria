# Conceptos Clave de @nulledexp/translatable-criteria

Esta sección profundiza en los componentes fundamentales que conforman la librería `@nulledexp/translatable-criteria`. Comprender estos conceptos es esencial para utilizar eficazmente la librería y extender su funcionalidad.

## Índice de Conceptos Clave

- **_[Jerarquía de Criteria](#jerarquía-de-criteria)_**
- **_[CriteriaFactory](#criteriafactory)_**
- **_[Esquemas `CriteriaSchema` y `GetTypedCriteriaSchema`](#esquemas-criteriaschema-y-gettypedcriteriaschema)_**
  - [_Campo Identificador (`identifier_field`)_](#campo-identificador-identifier_field)
  - [_Metadatos de Esquema y Join_](#metadatos-de-esquema-y-join)
- **_[CriteriaTranslator (`Clase Abstracta`)](#criteriatranslator-clase-abstracta)_**
- **_[Filtros (`Filter`, `FilterGroup`, `FilterOperator`)](#filtros-filter-filtergroup-filteroperator)_**
- **_[Ordenamiento (`Order`, `OrderDirection`)](#ordenamiento-order-orderdirection)_**
- **_[Paginación](#paginación)_**
  - [_Paginación Basada en Offset_](#paginación-basada-en-offset)
  - [_Paginación Basada en Cursor_](#paginación-basada-en-cursor)
- **_[Selección de Campos (`setSelect`, `resetSelect`)](#selección-de-campos-setselect-resetselect)_**

---

## Jerarquía de `Criteria`

La clase abstracta `Criteria` es la base para definir las especificaciones de una consulta. Representa un conjunto de condiciones, ordenamientos, uniones y configuraciones de paginación para una entidad o un conjunto de entidades relacionadas.

Existen varias implementaciones concretas de `Criteria`:

- **`RootCriteria`**: Representa el punto de partida de una consulta, dirigido a una entidad principal.
- **`InnerJoinCriteria`**: Define una unión interna (INNER JOIN) con otra entidad.
- **`LeftJoinCriteria`**: Define una unión externa izquierda (LEFT JOIN) con otra entidad.
- **`OuterJoinCriteria`**: Define una unión externa completa (FULL OUTER JOIN) con otra entidad (su disponibilidad puede depender del traductor específico).

Cada instancia de `Criteria` encapsula:

- El esquema (`CriteriaSchema`) de la entidad a la que se aplica.
- Un alias único y canónico para referenciar esta entidad en la consulta.
- Gestores internos para filtros, uniones, ordenamiento y selección de campos.

[Volver al Índice](#índice-de-conceptos-clave)

---

## `CriteriaFactory`

`CriteriaFactory` es una clase de utilidad que proporciona métodos estáticos para crear instancias de los diferentes tipos de `Criteria`.

**Propósito:**

- **Simplificar la creación:** Abstrae la complejidad de la instanciación directa.
- **Asegurar la correcta inicialización:** Garantiza que los criterios se creen con los parámetros necesarios y las validaciones iniciales.
- **Mejorar la legibilidad:** Hace que el código de construcción de criterios sea más claro y conciso.

**Uso recomendado:**
Se recomienda encarecidamente utilizar `CriteriaFactory` en lugar de instanciar las clases de `Criteria` directamente. Los métodos de fábrica ya no requieren un parámetro de alias, ya que el alias canónico ahora se toma directamente del esquema.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(PostSchema);
```

[Volver al Índice](#índice-de-conceptos-clave)

---

## Esquemas (`CriteriaSchema` y `GetTypedCriteriaSchema`)

Los esquemas son fundamentales para la seguridad de tipos y la validación. Un `CriteriaSchema` define la "forma" de tus entidades de datos tal como la librería las entiende. Para una guía completa, consulta **Definición de Esquemas**.

**¿Qué define un Esquema?**

- `source_name`: El nombre real de la tabla o colección en la base de datos.
- `alias`: Un **único alias canónico** para la entidad.
- `fields`: Un array con los nombres de los campos disponibles.
- `identifier_field`: Un campo **obligatorio** que identifica unívocamente una entidad.
- `joins`: Un array que define las posibles relaciones de unión, cada una con su propio `alias` y `target_source_name`.
- `metadata`: (Opcional) Un objeto para almacenar información arbitraria, específica del traductor o configuración relevante para toda la entidad que este esquema representa.

**`GetTypedCriteriaSchema`:**
Es una función helper que se utiliza para definir esquemas. Su principal ventaja es que preserva los tipos literales de los `fields`, `alias` e `identifier_field`, lo que permite un autocompletado y una validación de tipos más robusta al construir los criterios. Esto evita la necesidad de usar aserciones de tipo (como `as const`) en la definición del esquema, al tiempo que asegura que la estructura del esquema (incluyendo la validez de `identifier_field`) sea correcta.

Los esquemas se proporcionan al `CriteriaFactory` al crear instancias de `Criteria`, permitiendo que la librería valide que los campos, alias y uniones utilizados sean correctos.

### Campo Identificador (`identifier_field`)

El `identifier_field` es una propiedad **obligatoria** en tu `CriteriaSchema`. Especifica qué campo de tu array `fields` sirve como identificador único (clave primaria) para esa entidad.

**Propósito:**

- **Identificación Única:** Designa claramente el campo de clave primaria.
- **Validación Mejorada:** La librería valida en tiempo de compilación (y ejecución) que el `identifier_field` que especificas es realmente uno de los `fields` definidos en el esquema.
- **Selección Automática:** Al usar `setSelect()` para elegir campos específicos, el `identifier_field` de la entidad **siempre se incluye implícitamente** en la selección, asegurando que la entidad siempre pueda ser identificada unívocamente.
- **Contexto para Traductores:** El identificador de una entidad padre se pasa al traductor durante las operaciones de unión (`parent_identifier`), lo que puede usarse para una inferencia de relaciones más avanzada.

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  joins: [
    {
      alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
    },
  ],
});
```

### Metadatos de Esquema y Join

Tanto la raíz de un `CriteriaSchema` como las configuraciones individuales de join dentro del array `joins` pueden tener una propiedad `metadata` opcional.

- **`CriteriaSchema.metadata`**: Para información relevante para toda la entidad.
- **`SchemaJoins.metadata`**: Para información específica de una relación de join particular.

**Propósito para el Usuario:**
Este campo `metadata` es un objeto flexible y abierto (`{ [key: string]: any }`) diseñado para contener información arbitraria que podría ser necesaria para un `CriteriaTranslator` específico que estés utilizando.

**Cómo Usar:**
Puedes añadir cualquier par clave-valor al objeto `metadata`. Las claves y valores específicos que son significativos dependen enteramente del `CriteriaTranslator` que estés usando. Consulta la documentación de tu traductor para entender qué `metadata` (si alguna) reconoce y utiliza.

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'posts',
  alias: 'p',
  fields: [
    'id',
    'title',
    'content',
    'userId',
    'createdAt',
    'categories',
    'metadata',
  ],
  identifier_field: 'id',
  metadata: {
    custom_handler: 'specialPostHandler',
    versioning_enabled: true,
  },
  joins: [
    {
      alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      metadata: {
        typeorm_lazy_load: false,
        custom_on_clause_template: 'user.id = post.userId_custom_fk',
      },
    },
  ],
});
```

[Volver al Índice](#índice-de-conceptos-clave)

---

## `CriteriaTranslator` (Clase Abstracta)

El `CriteriaTranslator` es el componente responsable de convertir un objeto `Criteria` (agnóstico a la fuente de datos) en una consulta específica para una base de datos o motor de búsqueda particular (ej. SQL, una query de TypeORM, una consulta de MongoDB, etc.).

**Rol Principal:**

- Procesar un objeto `Criteria` (comenzando típicamente por un `RootCriteria`).
- Interpretar los filtros, uniones, ordenamiento, paginación y selección definidos en el `Criteria`.
- Generar la sintaxis de consulta nativa correspondiente.

Esto permite una arquitectura limpia y extensible: la lógica de construcción de `Criteria` está separada de la lógica de traducción. Para soportar una nueva base de datos, solo necesitas crear un nuevo traductor que extienda `CriteriaTranslator`.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Filtros (`Filter`, `FilterGroup`, `FilterOperator`)

Los filtros permiten especificar las condiciones que deben cumplir los datos para ser seleccionados.

- **`Filter`**: Representa una condición de filtro individual (`field`, `operator`, `value`).
- **`FilterGroup`**: Permite agrupar múltiples `Filter` o incluso otros `FilterGroup` utilizando operadores lógicos (`AND` u `OR`).
- **`FilterOperator`**: Es una enumeración que define los diversos operadores de comparación disponibles, que se pueden clasificar a grandes rasgos:
  - **Igualdad y Comparación:** `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, etc.
  - **Coincidencia de Patrones:** `LIKE`, `CONTAINS`, `STARTS_WITH`, `ILIKE` (versión de LIKE insensible a mayúsculas/minúsculas).
  - **Pertenencia y Nulidad:** `IN`, `NOT_IN`, `IS_NULL`, `IS_NOT_NULL`.
  - **Rangos y Regex:** `BETWEEN`, `NOT_BETWEEN`, `MATCHES_REGEX`.
  - **Tipos Complejos:** Un amplio conjunto de operadores para tipos de datos `JSON`, `ARRAY` y `SET` (ej. `JSON_CONTAINS`, `ARRAY_NOT_CONTAINS_ELEMENT`, `SET_CONTAINS_ANY`).

Para una explicación detallada de cada operador, su valor esperado y ejemplos de código, por favor consulta la [Referencia de Operadores de Filtro](../guides/filter-operators/es.md).

Los filtros se añaden a un `Criteria` usando los métodos `where()`, `andWhere()`, y `orWhere()`. La librería normaliza automáticamente la estructura de los `FilterGroup` para mantener la consistencia.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Ordenamiento (`Order`, `OrderDirection`)

El ordenamiento define cómo se deben clasificar los resultados de la consulta.

- **`Order`**: Representa una regla de ordenamiento individual. Se compone de:
- `field`: El campo por el cual se ordenarán los resultados. Este campo está fuertemente tipado con los campos válidos definidos en el esquema de cada Criteria.
- `direction`: La dirección del ordenamiento (ver `OrderDirection`).
- `sequenceId`: (Interno) Un ID único e incremental globalmente.

- **`OrderDirection`**: Es una enumeración con dos posibles valores:
- `ASC`: Orden ascendente.
- `DESC`: Orden descendente.

Se pueden añadir múltiples reglas de ordenamiento a un `Criteria` usando el método `orderBy()`.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Paginación

La paginación permite recuperar subconjuntos de resultados, lo cual es crucial para manejar grandes cantidades de datos.

### Paginación Basada en Offset

Esta es la forma tradicional de paginar resultados.

- **`setTake(count)`**: Especifica el número máximo de registros a devolver (equivalente a SQL `LIMIT`).
- **`setSkip(count)`**: Especifica el número de registros a omitir antes de empezar a devolver resultados (equivalente a SQL `OFFSET`).

### Paginación Basada en Cursor

Este método es generalmente más eficiente y estable para grandes conjuntos de datos, especialmente aquellos que cambian frecuentemente.

- **`setCursor(cursorFilters, operator, order)`**: Configura la paginación basada en cursor.
- `cursorFilters`: Un array de uno o dos objetos `FilterPrimitive` (sin la propiedad `operator`). Estos definen el/los campo(s) y valor(es) del último ítem de la página anterior, que sirven como "cursor".
- Un solo `FilterPrimitive` se usa para paginación por cursor simple (ej., basada en `created_at`).
- Dos `FilterPrimitive` se usan para paginación por cursor compuesta (ej., basada en `created_at` y `uuid` como desempate).
- `operator`: Debe ser `FilterOperator.GREATER_THAN` (para "página siguiente" al ordenar ASC) o `FilterOperator.LESS_THAN` (para "página siguiente" al ordenar DESC, o "página anterior" al ordenar ASC).
- `order`: La `OrderDirection` que coincide con el orden de clasificación principal de la consulta.

[Volver al Índice](#índice-de-conceptos-clave)

---

## Selección de Campos (`setSelect`, `resetSelect`)

Por defecto, cuando se crea un `Criteria` (ya sea `RootCriteria` o un `JoinCriteria`), se seleccionarán todos los campos definidos en su esquema asociado (`selectAll` es `true`). Este comportamiento se puede modificar:

- **`setSelect(fields: FieldOfSchema<TSchema>[])`**:
- Permite especificar explícitamente un array de campos que se deben seleccionar. Estos campos deben ser válidos según el esquema del `Criteria`.
- Cuando se llama a `setSelect()`, `selectAll` se vuelve `false`.
- **Importante:** El `identifier_field` de la entidad **siempre se incluye implícitamente** en la selección si no está ya especificado en el array `fields`. Esto asegura que la entidad siempre pueda ser identificada unívocamente. Si se pasa un array vacío `[]` a `setSelect`, solo se seleccionará el `identifier_field`.

- **`resetSelect()`**:
- Revierte el comportamiento de selección al predeterminado: se seleccionarán todos los campos del esquema para esa instancia de `Criteria` (`selectAll` se vuelve `true`).

**Comportamiento en Joins:**

- Si un `JoinCriteria` no tiene `setSelect()` llamado explícitamente, todos sus campos (definidos en su esquema) se incluirán en la cláusula `SELECT` principal de la consulta, típicamente prefijados con el alias del join.
- Si se llama a `setSelect()` en un `JoinCriteria`, solo esos campos seleccionados (más su `identifier_field`) de la entidad unida se incluirán.

Esta flexibilidad permite optimizar las consultas para recuperar solo los datos necesarios, reduciendo la transferencia de datos y la sobrecarga de procesamiento.

[Volver al Índice](#índice-de-conceptos-clave)
