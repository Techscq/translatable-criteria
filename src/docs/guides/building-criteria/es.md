# Guía Práctica: Construcción de Criterios

Una vez que has definido tus [Esquemas](../schema-definitions/es.md), el siguiente paso es utilizarlos para construir objetos `Criteria`. Estos objetos encapsulan toda la lógica de tu consulta: qué datos seleccionar, cómo filtrarlos, cómo unirlos con otras entidades, cómo ordenarlos y cómo paginarlos.

Esta guía te mostrará cómo utilizar `CriteriaFactory` y los métodos fluidos de los objetos `Criteria` para construir consultas de manera efectiva y con seguridad de tipos.

## Índice

- 1. [Creando un `RootCriteria`](#1-creando-un-rootcriteria)
- 2. [Aplicando Filtros](#2-aplicando-filtros)
  - [Filtros Básicos](#filtros-básicos)
  - [Agrupación Lógica (AND/OR)](#agrupación-lógica-andor)
  - [Filtros Avanzados (JSON, Array, Set)](#filtros-avanzados-json-array-set)
    - [Filtrando Campos JSON (`JSON_CONTAINS`, `JSON_NOT_CONTAINS`)](#filtrando-campos-json-json_contains-json_not_contains)
    - [Filtrando Campos Array (`ARRAY_CONTAINS_ELEMENT`, etc.)](#filtrando-campos-array-array_contains_element-array_contains_all_elements-array_contains_any_element-array_equals)
    - [Filtrando Campos SET (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)](#filtrando-campos-set-set_contains-set_not_contains-set_contains_any-set_contains_all)
    - [Filtrando por Rangos (`BETWEEN`, `NOT_BETWEEN`)](#filtrando-por-rangos-between-not_between)
    - [Filtrando con Expresiones Regulares (`MATCHES_REGEX`)](#filtrando-con-expresiones-regulares-matches_regex)
    - [Coincidencia de Patrones Insensible a Mayúsculas/Minúsculas (`ILIKE`, `NOT_ILIKE`)](#coincidencia-de-patrones-insensible-a-mayúsculasminúsculas-ilike-not_ilike)
- 3. [Añadiendo Uniones (Joins)](#3-añadiendo-uniones-joins)
  - [Uniones Simples (one-to-many, many-to-one, one-to-one)](#uniones-simples-one-to-many-many-to-one-one-to-one)
  - [Uniones con Tabla Pivote (many-to-many)](#uniones-con-tabla-pivote-many-to-many)
  - [Filtrando en Entidades Unidas](#filtrando-en-entidades-unidas)
- 4. [Ordenando Resultados](#4-ordenando-resultados)
  - [Ordenando por Campos de la Entidad Raíz](#ordenando-por-campos-de-la-entidad-raíz)
  - [Ordenando por Campos de Entidades Unidas](#ordenando-por-campos-de-entidades-unidas)
- 5. [Paginación](#5-paginación)
  - [Paginación Basada en Offset](#paginación-basada-en-offset)
  - [Paginación Basada en Cursor](#paginación-basada-en-cursor)
- 6. [Selección de Campos](#6-selección-de-campos)
  - [Selección en la Entidad Raíz](#selección-en-la-entidad-raíz)
  - [Selección en Entidades Unidas](#selección-en-entidades-unidas)
  - [Volver a Seleccionar Todos los Campos (`resetSelect`)](#volver-a-seleccionar-todos-los-campos-resetselect)
- 7. [Combinando Todo](#7-combinando-todo)
- [Próximos Pasos](#próximos-pasos)

---

## 1. Creando un `RootCriteria`

Toda consulta comienza con un `RootCriteria`, que representa la entidad principal desde la cual se iniciará la consulta. Se crea utilizando `CriteriaFactory.GetCriteria()`:

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas'; // Asegúrate de que la ruta sea correcta

// Crear un Criteria para la entidad User, usando el alias 'users'
const userCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users');

// Crear un Criteria para la entidad Post, usando el alias 'posts'
const postCriteria = CriteriaFactory.GetCriteria(PostSchema, 'posts');
```

- El primer argumento es el esquema de la entidad (`UserSchema`, `PostSchema`).
- El segundo argumento es uno de los alias definidos en el `alias` array de ese esquema. Usar el alias correcto es crucial para la correcta interpretación por parte de los traductores.

## 2. Aplicando Filtros

Los filtros se añaden usando los métodos `where()`, `andWhere()`, y `orWhere()`. Estos métodos aceptan un objeto `FilterPrimitive` que define el campo, el operador y el valor.

### Filtros Básicos

```typescript
import { FilterOperator } from '@nulledexp/translatable-criteria';

// Encontrar usuarios con un email específico
userCriteria.where({
  field: 'email', // Campo del UserSchema
  operator: FilterOperator.EQUALS,
  value: 'test@example.com',
});

// Encontrar posts cuyo título contenga "TypeScript"
postCriteria.where({
  field: 'title', // Campo del PostSchema
  operator: FilterOperator.CONTAINS, // o FilterOperator.LIKE con '%'
  value: '%TypeScript%',
});

// Encontrar posts creados después de una fecha específica
postCriteria.where({
  field: 'created_at',
  operator: FilterOperator.GREATER_THAN,
  value: new Date('2023-01-01'),
});
```

### Agrupación Lógica (AND/OR)

- `andWhere()`: Añade una condición que debe cumplirse junto con las anteriores (AND lógico).
- `orWhere()`: Añade una condición que, si se cumple, hace que el grupo de filtros sea verdadero, incluso si las condiciones previas (agrupadas por AND) no lo son (OR lógico). La librería normaliza esto para mantener una estructura de `OR ( (cond1 AND cond2), (cond3) )`.

```typescript
// Usuarios cuyo username es 'admin' Y su email contiene '@example.com'
userCriteria
  .where({ field: 'username', operator: FilterOperator.EQUALS, value: 'admin' })
  .andWhere({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  });

// Posts que contienen "Tutorial" en el título O en el cuerpo del post
postCriteria
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  })
  .orWhere({
    field: 'body',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  });

// Combinación más compleja:
// (username = 'editor' AND email LIKE '%@editor.com%') OR (username = 'guest')
userCriteria
  .where({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'editor',
  })
  .andWhere({
    field: 'email',
    operator: FilterOperator.LIKE,
    value: '%@editor.com%',
  })
  .orWhere({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'guest',
  });
```

### Filtros Avanzados (JSON, Array, Set)

La librería soporta operadores para tipos de datos más complejos como JSON, arrays y campos tipo SET.

#### Filtrando Campos JSON (`JSON_CONTAINS`, `JSON_NOT_CONTAINS`)

El valor para estos operadores es un objeto donde las claves son rutas JSON (el traductor determinará si necesita `$.` al inicio) y los valores son lo que se busca en esa ruta.

```typescript
// Suponiendo que PostSchema tiene un campo 'metadata' de tipo JSON
// con una estructura como: { tags: ["tech", "code"], views: 100 }

// Encontrar posts donde metadata.tags contenga "tech" Y metadata.views sea 100
postCriteria.where({
  field: 'metadata', // El campo JSON
  operator: FilterOperator.JSON_CONTAINS,
  value: {
    tags: 'tech', // Busca "tech" dentro del array metadata.tags
    views: 100, // Busca que metadata.views sea 100
    // "extra.source": "import" // También puedes anidar rutas
  },
});

// Encontrar posts donde metadata.extra.quality NO sea "low"
postCriteria.where({
  field: 'metadata',
  operator: FilterOperator.JSON_NOT_CONTAINS,
  value: {
    'extra.quality': 'low',
  },
});
```

#### Filtrando Campos Array (`ARRAY_CONTAINS_ELEMENT`, `ARRAY_CONTAINS_ALL_ELEMENTS`, `ARRAY_CONTAINS_ANY_ELEMENT`, `ARRAY_EQUALS`)

Estos operadores pueden usarse para campos que son arrays nativos o arrays dentro de JSON.

- **Para columnas de array nativo:** El `value` es el elemento o array de elementos a buscar.
- **Para arrays dentro de JSON:** El `value` es un objeto con una única clave (la ruta JSON al array) y el valor es el elemento o array de elementos.

```typescript
// 1. Columna de Array Nativo: Encontrar posts que tengan la categoría "TypeScript"
postCriteria.where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
  value: 'TypeScript',
});

// 2. Array dentro de JSON: Encontrar posts donde metadata.tags contenga "typeorm"
postCriteria.where({
  field: 'metadata', // Campo JSON principal
  operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
  value: { tags: 'typeorm' }, // { "ruta.al.array": elemento }
});

// 3. Columna de Array Nativo: Encontrar posts que tengan TODAS las categorías ["nestjs", "api"]
postCriteria.where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
  value: ['nestjs', 'api'],
});

// 4. Array dentro de JSON: Encontrar posts donde metadata.ratings contenga AL MENOS UNO de [4, 5]
postCriteria.where({
  field: 'metadata',
  operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
  value: { ratings: [4, 5] },
});

// 5. Columna de Array Nativo: Encontrar posts cuyas categorías sean EXACTAMENTE ["news", "updates"] (orden importa)
postCriteria.where({
  field: 'categories',
  operator: FilterOperator.ARRAY_EQUALS,
  value: ['news', 'updates'],
});
```

#### Filtrando Campos SET (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)

Similar a `CONTAINS` pero conceptualmente para campos que representan un conjunto de valores (como el tipo `SET` de MySQL o un string delimitado).

```typescript
// Suponiendo un campo 'flags' en UserSchema que es un SET('active', 'verified', 'beta_tester')
// o un campo de texto 'tags' como "typescript,javascript,nodejs"

// Busca usuarios que tengan el flag 'verified'
userCriteria.where({
  field: 'flags',
  operator: FilterOperator.SET_CONTAINS,
  value: 'verified',
});

// Busca usuarios que tengan AL MENOS UNO de los tags "typescript" o "javascript"
userCriteria.where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ANY,
  value: ['typescript', 'javascript'], // Espera un array de valores
});

// Busca usuarios que tengan TODOS los flags "active" Y "beta_tester"
userCriteria.where({
  field: 'flags',
  operator: FilterOperator.SET_CONTAINS_ALL,
  value: ['active', 'beta_tester'], // Espera un array de valores
});
```

#### Filtrando por Rangos (`BETWEEN`, `NOT_BETWEEN`)

Estos operadores permiten verificar si un valor numérico o de fecha se encuentra dentro o fuera de un rango específico.

```typescript
// Encontrar posts creados entre dos fechas
postCriteria.where({
  field: 'created_at',
  operator: FilterOperator.BETWEEN,
  value: [new Date('2023-01-01'), new Date('2023-03-31')], // [min, max]
});

// Encontrar productos cuyo precio NO esté entre 100 y 200
productCriteria.where({
  field: 'price',
  operator: FilterOperator.NOT_BETWEEN,
  value: [100, 200],
});
```

#### Filtrando con Expresiones Regulares (`MATCHES_REGEX`)

Permite realizar búsquedas de patrones más potentes utilizando expresiones regulares. La sintaxis específica de la expresión regular puede depender de la base de datos subyacente.

```typescript
// Encontrar usuarios cuyo username comience con "admin" seguido de números
// (ejemplo conceptual, la sintaxis REGEX varía)
userCriteria.where({
  field: 'username',
  operator: FilterOperator.MATCHES_REGEX,
  value: '^admin[0-9]+', // La expresión regular como string
});
```

#### Coincidencia de Patrones Insensible a Mayúsculas/Minúsculas (`ILIKE`, `NOT_ILIKE`)

Similares a `LIKE` y `NOT_LIKE`, pero garantizan que la comparación de patrones sea insensible a mayúsculas y minúsculas, independientemente de la configuración por defecto de la base de datos.

```typescript
// Encontrar posts cuyo título contenga "typescript" (sin importar mayúsculas/minúsculas)
postCriteria.where({
  field: 'title',
  operator: FilterOperator.ILIKE,
  value: '%typescript%',
});

// Encontrar usuarios cuyo email NO comience con "test" (insensible a mayúsculas/minúsculas)
userCriteria.where({
  field: 'email',
  operator: FilterOperator.NOT_ILIKE,
  value: 'test%',
});
```

## 3. Añadiendo Uniones (Joins)

Las uniones se añaden con el método `join()`. Este método toma dos argumentos:

1.  Una instancia de un `Criteria` de join (`InnerJoinCriteria`, `LeftJoinCriteria`, `OuterJoinCriteria`), creada también con `CriteriaFactory`.
2.  Un objeto de parámetros de join que define cómo se relacionan las entidades.

### Uniones Simples (one-to-many, many-to-one, one-to-one)

Para estas relaciones, los parámetros de join son `parent_field` y `join_field`.

```typescript
// Obtener posts y su autor (publisher)
// PostSchema define un join 'publisher' (many-to-one) con UserSchema
const postsWithAuthorCriteria = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher'), // 'publisher' es un alias en UserSchema
  {
    parent_field: 'user_uuid', // Campo FK en PostSchema
    join_field: 'uuid', // Campo PK en UserSchema (el 'publisher')
  },
);

// Obtener usuarios y sus posts
// UserSchema define un join 'posts' (one-to-many) con PostSchema
const usersWithPostsCriteria = CriteriaFactory.GetCriteria(
  UserSchema,
  'users',
).join(
  CriteriaFactory.GetLeftJoinCriteria(PostSchema, 'posts'), // 'posts' es un alias en PostSchema
  {
    parent_field: 'uuid', // Campo PK en UserSchema
    join_field: 'user_uuid', // Campo FK en PostSchema
  },
);
```

**Nota:** El `alias` usado en `GetInnerJoinCriteria` (ej. `'publisher'`) debe ser uno de los `alias` definidos en el esquema de la entidad a la que se une (en este caso, `UserSchema`). La librería valida esto.

### Uniones con Tabla Pivote (many-to-many)

Para relaciones `many_to_many`, los parámetros de join requieren un objeto más detallado que incluye `pivot_source_name` y objetos para `parent_field` y `join_field` que especifican tanto el campo en la entidad como el campo en la tabla pivote.

```typescript
// Obtener usuarios y sus permisos
// UserSchema define un join 'permissions' (many-to-many) con PermissionSchema
const usersWithPermissionsCriteria = CriteriaFactory.GetCriteria(
  UserSchema,
  'users',
).join(CriteriaFactory.GetInnerJoinCriteria(PermissionSchema, 'permissions'), {
  pivot_source_name: 'user_permission_pivot', // Nombre de tu tabla pivote
  parent_field: {
    pivot_field: 'user_id_in_pivot', // FK del User en la tabla pivote
    reference: 'uuid', // PK del User
  },
  join_field: {
    pivot_field: 'permission_id_in_pivot', // FK del Permission en la tabla pivote
    reference: 'uuid', // PK del Permission
  },
});
```

### Filtrando en Entidades Unidas

Puedes aplicar filtros directamente al `Criteria` de join:

```typescript
// Obtener posts y solo los comentarios que NO contengan "spam"
const postsWithFilteredComments = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetLeftJoinCriteria(PostCommentSchema, 'comments').where({
    // Filtro aplicado al JoinCriteria (comments)
    field: 'comment_text',
    operator: FilterOperator.NOT_CONTAINS,
    value: 'spam',
  }),
  {
    parent_field: 'uuid',
    join_field: 'post_uuid',
  },
);
```

Estos filtros en el `JoinCriteria` típicamente se traducen a condiciones en la cláusula `ON` del JOIN (o `AND` después del `ON` para algunos traductores/bases de datos).

## 4. Ordenando Resultados

El ordenamiento se aplica con el método `orderBy()`, que toma el nombre del campo y la dirección (`OrderDirection.ASC` o `OrderDirection.DESC`).

### Ordenando por Campos de la Entidad Raíz

```typescript
// Obtener usuarios ordenados por email ascendente
userCriteria.orderBy('email', OrderDirection.ASC);

// Obtener posts ordenados por fecha de creación descendente, luego por título ascendente
postCriteria
  .orderBy('created_at', OrderDirection.DESC)
  .orderBy('title', OrderDirection.ASC);
```

### Ordenando por Campos de Entidades Unidas

Para ordenar por un campo de una entidad unida, llama a `orderBy()` en la instancia del `JoinCriteria` correspondiente.

```typescript
// Obtener posts, ordenados por el username del autor (publisher)
const postsOrderedByAuthorUsername = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
    'username',
    OrderDirection.ASC,
  ), // Ordenamiento en el JoinCriteria
  { parent_field: 'user_uuid', join_field: 'uuid' },
);

// También puedes combinar ordenamientos de la raíz y de los joins.
// El traductor se encargará de aplicar el orden global según el `sequenceId` interno de cada `Order`.
postsOrderedByAuthorUsername.orderBy('created_at', OrderDirection.DESC);
```

## 5. Paginación

La librería soporta paginación basada en offset y basada en cursor.

### Paginación Basada en Offset

- `setTake(count)`: Limita el número de resultados (SQL `LIMIT`).
- `setSkip(count)`: Omite un número de resultados (SQL `OFFSET`).

```typescript
// Obtener los primeros 10 posts
postCriteria.setTake(10);

// Obtener posts de la página 3 (asumiendo 10 por página)
postCriteria.setTake(10).setSkip(20); // (3-1) * 10
```

### Paginación Basada en Cursor

Es más eficiente para conjuntos de datos grandes y que cambian frecuentemente. Se usa `setCursor()`.

Requiere:

1.  `cursorFilters`: Un array con uno o dos objetos `FilterPrimitive` (sin el `operator`). Estos definen los valores del último ítem de la página anterior.
    - Si es un solo objeto, se usa para paginación simple sobre un campo único (generalmente un campo ordenado y único, o un timestamp).
    - Si son dos objetos, se usa para paginación compuesta (keyset pagination), típicamente sobre un campo de ordenamiento primario (ej. `created_at`) y un campo de desempate único (ej. `uuid`).
2.  `operator`: `FilterOperator.GREATER_THAN` (para página siguiente) o `FilterOperator.LESS_THAN` (para página anterior, si se invierte el orden).
3.  `order`: La `OrderDirection` principal en la que se está paginando.

**Importante:** Para que la paginación por cursor funcione, el `Criteria` (raíz y/o joins relevantes) **debe** tener `orderBy()` definidos para los mismos campos que se usan en `cursorFilters` y en el mismo orden. El traductor utilizará esta información.

```typescript
// Paginación por cursor simple (ej. sobre 'created_at')
// Asumimos que el último post visto tenía created_at = '2023-05-10T10:00:00.000Z'
// Y estamos ordenando por created_at ASC
postCriteria
  .setCursor(
    [{ field: 'created_at', value: '2023-05-10T10:00:00.000Z' }], // Un solo filtro para cursor simple
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('created_at', OrderDirection.ASC) // El orderBy debe coincidir
  .setTake(10);

// Paginación por cursor compuesta (ej. sobre 'created_at' y 'uuid')
// Asumimos que el último post visto tenía:
// created_at = '2023-05-10T10:00:00.000Z'
// uuid = 'some-last-uuid'
// Y estamos ordenando por created_at ASC, luego uuid ASC
postCriteria
  .setCursor(
    [
      // Dos filtros para cursor compuesto
      { field: 'created_at', value: '2023-05-10T10:00:00.000Z' },
      { field: 'uuid', value: 'some-last-uuid' },
    ],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('created_at', OrderDirection.ASC) // Ordenamientos deben coincidir
  .orderBy('uuid', OrderDirection.ASC)
  .setTake(10);
```

## 6. Selección de Campos

Por defecto, un `Criteria` (raíz o join) seleccionará todos los campos definidos en su esquema. Puedes modificar esto con `setSelect()` y `resetSelect()`.

### Selección en la Entidad Raíz

```typescript
// Seleccionar solo uuid y email del usuario
userCriteria.setSelect(['uuid', 'email']);
```

### Selección en Entidades Unidas

Llama a `setSelect()` en la instancia del `JoinCriteria`.

```typescript
// Obtener posts y solo el username de su autor
const postsWithAuthorUsernameOnly = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
).join(
  CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').setSelect([
    'username',
  ]), // Seleccionar solo 'username' del publisher
  { parent_field: 'user_uuid', join_field: 'uuid' },
);
```

### Volver a Seleccionar Todos los Campos (`resetSelect`)

Si previamente usaste `setSelect()` y quieres volver al comportamiento por defecto de seleccionar todos los campos del esquema para esa instancia de `Criteria` (raíz o join):

```typescript
userCriteria.setSelect(['uuid']); // Selecciona solo uuid
// ... otras operaciones ...
userCriteria.resetSelect(); // Ahora seleccionará todos los campos de UserSchema de nuevo
```

**Nota Importante:** Si usas `orderBy()` o `setCursor()` sobre campos que _no_ están incluidos en tu `setSelect()`, algunos traductores (como el de TypeORM) podrían añadir automáticamente esos campos a la selección para asegurar el correcto funcionamiento de la base de datos.

## 7. Combinando Todo

Puedes encadenar todos estos métodos para construir consultas complejas:

```typescript
// Ejemplo complejo:
// Obtener los 5 posts más recientes (ordenados por created_at DESC)
// que contengan "TypeORM" en el título o en el cuerpo,
// incluyendo el username de su autor (publisher) y solo el texto de sus comentarios (si los tienen),
// y que el autor (publisher) tenga el email "author@example.com".
// Además, paginar usando cursor si 'lastPostCreatedAt' y 'lastPostUuid' están definidos.

let lastPostCreatedAt: string | undefined = undefined; // '2023-10-26T12:00:00.000Z';
let lastPostUuid: string | undefined = undefined; // 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

const complexPostCriteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
  .setSelect(['uuid', 'title', 'created_at']) // Seleccionar campos específicos del post
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  .orWhere({
    field: 'body',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  .join(
    CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher')
      .setSelect(['username']) // Solo el username del autor
      .where({
        field: 'email',
        operator: FilterOperator.EQUALS,
        value: 'author@example.com',
      }),
    { parent_field: 'user_uuid', join_field: 'uuid' },
  )
  .join(
    CriteriaFactory.GetLeftJoinCriteria(
      PostCommentSchema,
      'comments',
    ).setSelect(['comment_text']), // Solo el texto del comentario
    { parent_field: 'uuid', join_field: 'post_uuid' },
  )
  .orderBy('created_at', OrderDirection.DESC) // Orden principal para paginación por cursor
  .orderBy('uuid', OrderDirection.DESC); // Campo de desempate para paginación por cursor

if (lastPostCreatedAt && lastPostUuid) {
  complexPostCriteria.setCursor(
    [
      { field: 'created_at', value: lastPostCreatedAt },
      { field: 'uuid', value: lastPostUuid },
    ],
    FilterOperator.LESS_THAN, // Porque ordenamos DESC para "más recientes"
    OrderDirection.DESC,
  );
}

complexPostCriteria.setTake(5);

// Ahora 'complexPostCriteria' está listo para ser pasado a un traductor.
```

## Próximos Pasos

Con los criterios construidos, el siguiente paso es utilizar un `CriteriaTranslator` para convertir estos objetos `Criteria` en una consulta nativa para tu base de datos. Consulta la guía sobre Desarrollo de Traductores Personalizados o utiliza un traductor existente si está disponible para tu stack.
