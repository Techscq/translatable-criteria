# Guía Práctica: Construcción de Criterios

Una vez que has definido tus [Esquemas](../schema-definitions/es.md), el siguiente paso es utilizarlos para construir objetos `Criteria`. Estos objetos encapsulan toda la lógica de tu consulta: qué datos seleccionar, cómo filtrarlos, cómo unirlos con otras entidades, cómo ordenarlos y cómo paginarlos.

Esta guía te mostrará cómo utilizar `CriteriaFactory` y los métodos fluidos de los objetos `Criteria` para construir consultas de manera efectiva y con seguridad de tipos.

## Índice

- 1. [Creando un `RootCriteria`](#1-creando-un-rootcriteria)
- 2. [Aplicando Filtros](#2-aplicando-filtros)
  - [Filtros Básicos](#filtros-básicos)
  - [Agrupación Lógica (AND/OR)](#agrupación-lógica-andor)
  - [Filtros Avanzados (JSON, Array, Set)](#filtros-avanzados-json-array-set)
    - [Filtrando Campos JSON](#filtrando-campos-json)
    - [Filtrando Campos Array](#filtrando-campos-array)
    - [Filtrando Campos SET](#filtrando-campos-set)
    - [Filtrando por Rangos](#filtrando-por-rangos)
    - [Filtrando con Expresiones Regulares](#filtrando-con-expresiones-regulares)
    - [Coincidencia de Patrones Insensible a Mayúsculas/Minúsculas](#coincidencia-de-patrones-insensible-a-mayúsculasminúsculas)
  - [Referencia de Operadores de Filtro](#referencia-de-operadores-de-filtro)
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

## Esquemas de Ejemplo

Para hacer los ejemplos de esta guía autocontenidos, utilizaremos los siguientes esquemas simplificados:

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'users',
  alias: 'u',
  fields: ['id', 'username', 'email', 'age', 'isActive', 'createdAt', 'tags'],
  identifier_field: 'id',
  relations: [
    {
      relation_alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
      local_field: 'id',
      relation_field: 'userId',
    },
    {
      relation_alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
      pivot_source_name: 'user_roles',
      local_field: { reference: 'id', pivot_field: 'user_id' },
      relation_field: { reference: 'id', pivot_field: 'role_id' },
    },
  ],
});

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
  relations: [
    {
      relation_alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
      local_field: 'userId',
      relation_field: 'id',
    },
  ],
});

export const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  relations: [],
});

export const ProductSchema = GetTypedCriteriaSchema({
  source_name: 'products',
  alias: 'prod',
  fields: ['id', 'name', 'price', 'createdAt'],
  identifier_field: 'id',
  relations: [],
});
```

---

## 1. Creando un `RootCriteria`

Toda consulta comienza con un `RootCriteria`, que representa la entidad principal desde la cual se iniciará la consulta. Se crea utilizando `CriteriaFactory.GetCriteria()`. El alias ahora se toma directamente de la propiedad `alias` del esquema proporcionado.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
const postCriteria = CriteriaFactory.GetCriteria(PostSchema);
```

---

## 2. Aplicando Filtros

Los filtros se añaden usando los métodos `where()`, `andWhere()`, y `orWhere()`. Estos métodos aceptan un objeto `FilterPrimitive` que define el campo, el operador y el valor.

### Filtros Básicos

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const userEmailCriteria = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.EQUALS,
  value: 'test@example.com',
});

const postTitleCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.CONTAINS,
  value: 'TypeScript',
});

const postDateCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'createdAt',
  operator: FilterOperator.GREATER_THAN,
  value: new Date('2023-01-01'),
});
```

### Agrupación Lógica (AND/OR)

- `andWhere()`: Añade una condición que debe cumplirse junto con las anteriores (AND lógico).
- `orWhere()`: Añade una condición que, si se cumple, hace que el grupo de filtros sea verdadero, incluso si las condiciones previas (agrupadas por AND) no lo son (OR lógico). La librería normaliza esto para mantener una estructura de `OR ( (cond1 AND cond2), (cond3) )`.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const adminUserCriteria = CriteriaFactory.GetCriteria(UserSchema)
  .where({ field: 'username', operator: FilterOperator.EQUALS, value: 'admin' })
  .andWhere({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  });

const tutorialPostCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  })
  .orWhere({
    field: 'content',
    operator: FilterOperator.CONTAINS,
    value: 'Tutorial',
  });

const editorOrGuestCriteria = CriteriaFactory.GetCriteria(UserSchema)
  .where({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'editor',
  })
  .andWhere({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@editor.com',
  })
  .orWhere({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'guest',
  });
```

### Filtros Avanzados (JSON, Array, Set)

La librería soporta una amplia gama de operadores para tipos de datos complejos, incluyendo potentes capacidades de negación. Esta sección proporciona una visión general de alto nivel sobre cómo filtrar campos que almacenan datos estructurados. Para una lista completa de todos los operadores de filtro disponibles y su uso detallado, por favor consulta la sección [Referencia de Operadores de Filtro](#referencia-de-operadores-de-filtro) a continuación.

#### Filtrando Campos JSON

Los campos JSON pueden almacenar datos complejos y anidados. La librería proporciona operadores para consultar valores en rutas específicas, comprobar la contención de fragmentos JSON o verificar la presencia de múltiples valores.

#### Filtrando Campos Array

Los campos que almacenan arrays (ya sean tipos de array nativos de la base de datos o arrays dentro de documentos JSON) pueden filtrarse según la presencia o ausencia de elementos, o comparando el contenido completo de los arrays.

#### Filtrando Campos SET

Para campos que representan un conjunto de valores (por ejemplo, el tipo `SET` de MySQL o una cadena delimitada), puedes comprobar la presencia de elementos individuales o combinaciones de elementos.

#### Filtrando por Rangos

Estos operadores permiten verificar si un valor numérico o de fecha se encuentra dentro o fuera de un rango específico.

#### Filtrando con Expresiones Regulares

Permite realizar búsquedas de patrones más potentes utilizando expresiones regulares. La sintaxis específica de la expresión regular puede depender de la base de datos subyacente.

#### Coincidencia de Patrones Insensible a Mayúsculas/Minúsculas

Similares a `LIKE` y `NOT_LIKE`, pero garantizan que la comparación de patrones sea insensible a mayúsculas y minúsculas, independientemente de la configuración por defecto de la base de datos.

### Referencia de Operadores de Filtro

La librería proporciona un conjunto completo de operadores para todas tus necesidades de filtrado, desde simples comprobaciones de igualdad hasta operaciones complejas en campos JSON y de tipo array.

Para una lista detallada de todos los valores de `FilterOperator` disponibles, su propósito, el tipo de `value` que esperan, y un ejemplo de código para cada uno, por favor consulta nuestra guía dedicada:

- **[-> Ir a la Guía de Referencia de Operadores de Filtro](../filter-operators/es.md)**

---

## 3. Añadiendo Uniones (Joins)

Con el nuevo enfoque declarativo, añadir uniones es más simple y robusto que nunca. La lógica de cómo se conectan las entidades ahora se define **una sola vez** en la propiedad `relations` del esquema, eliminando la necesidad de parámetros manuales en cada llamada.

La firma del método `join()` ahora es:

`criteria.join(relationAlias, criteriaToJoin, withSelect?)`

- **`relationAlias` (string):** Es el **alias de la relación** tal como se define en el array `relations` dentro del esquema padre (ej. `'posts'`, `'user'`). Actúa como un identificador único para esa relación específica. La librería utiliza este alias para buscar automáticamente el `local_field`, `relation_field` y otros detalles necesarios del esquema.
- **`criteriaToJoin` (JoinCriteria):** Una instancia de un `Criteria` de join (`InnerJoinCriteria`, `LeftJoinCriteria`, etc.), creada con `CriteriaFactory`.
- **`withSelect` (booleano opcional, por defecto `true`):** Si es `false`, la unión solo se usará para filtrar, y sus campos no se incluirán en la sentencia `SELECT` final.

### Uniones Simples (one-to-many, many-to-one, one-to-one)

Para unir entidades relacionadas, simplemente proporciona el `relationAlias`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

// Find posts and include their author's data
const postsWithAuthorCriteria = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema),
);

// Find users and include their posts
const usersWithPostsCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'posts',
  CriteriaFactory.GetLeftJoinCriteria(PostSchema),
);
```

### Uniones con Tabla Pivote (many-to-many)

El proceso es idéntico para las relaciones `many-to-many`. La librería infiere automáticamente la tabla pivote y los campos a partir de la definición del esquema.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, RoleSchema } from './path/to/your/schemas';

const usersWithRolesCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'roles',
  CriteriaFactory.GetInnerJoinCriteria(RoleSchema),
);
```

### Filtrando en Entidades Unidas

Puedes aplicar filtros directamente a la instancia del `JoinCriteria` antes de pasarla al método `.join()`. Estos filtros típicamente se traducen a condiciones en la cláusula `ON` del JOIN.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

const activeUserJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).where({
  field: 'isActive',
  operator: FilterOperator.EQUALS,
  value: true,
});

const postsFromActiveUsers = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  activeUserJoinCriteria,
);
```

### Filtrado Eficiente con `withSelect`

Un caso de uso común para las uniones es filtrar los resultados de la entidad principal basándose en las propiedades de una entidad relacionada, sin necesidad de recuperar realmente los datos de la entidad unida.

Para lograr esto, establece el último parámetro opcional `withSelect` en `false`.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

// Find posts by a specific publisher, but only select post data.
const postsByPublisher = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
    field: 'uuid', // This field is on the UserSchema
    operator: FilterOperator.EQUALS,
    value: 'some-publisher-uuid',
  }),
  false, // withSelect is false
);
```

---

## 4. Ordenando Resultados

El ordenamiento se aplica con el método `orderBy()`. Ahora acepta hasta tres parámetros: el nombre del campo, la dirección (`OrderDirection.ASC` o `OrderDirection.DESC`), y un booleano opcional para controlar el ordenamiento de los valores `NULL`.

- `orderBy(field, direction, nullsFirst)`
  - **`field`**: El campo por el cual ordenar.
  - **`direction`**: `OrderDirection.ASC` o `OrderDirection.DESC`.
  - **`nullsFirst` (opcional, booleano, por defecto `false`)**:
    - Si es `true`, los valores `NULL` se ordenarán primero (`NULLS FIRST`).
    - Si es `false` u omitido, los valores `NULL` se ordenarán al final (`NULLS LAST`).

### Ordenando por Campos de la Entidad Raíz

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { ProductSchema } from './path/to/your/schemas';

// Ordenar productos por precio, con los productos sin precio (NULL) apareciendo primero.
const postOrderCriteria = CriteriaFactory.GetCriteria(ProductSchema)
  .orderBy('price', OrderDirection.ASC, true) // -> NULLS FIRST
  .orderBy('createdAt', OrderDirection.DESC); // -> NULLS LAST (por defecto)
```

### Ordenando por Campos de Entidades Unidas

Para ordenar por un campo de una entidad unida, llama a `orderBy()` en la instancia del `JoinCriteria` correspondiente.

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

// Ordenar por la edad del usuario unido, con los usuarios sin edad apareciendo al final.
const userJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).orderBy('age', OrderDirection.ASC, false); // -> NULLS LAST

const postsOrderedByAuthor = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  userJoinCriteria,
);

postsOrderedByAuthor.orderBy('createdAt', OrderDirection.DESC);
```

---

## 5. Paginación

La librería soporta paginación basada en offset y basada en cursor.

### Paginación Basada en Offset

- `setTake(count)`: Limita el número de resultados (SQL `LIMIT`).
- `setSkip(count)`: Omite un número de resultados (SQL `OFFSET`).

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const firstPageCriteria = CriteriaFactory.GetCriteria(PostSchema).setTake(10);

const thirdPageCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setTake(10)
  .setSkip(20);
```

### Paginación Basada en Cursor

Es más eficiente para grandes conjuntos de datos. Se usa `setCursor()`.

**Importante:** Para que la paginación por cursor funcione, el `Criteria` **debe** tener `orderBy()` definidos para los mismos campos que se usan en `setCursor()` y en el mismo orden.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const simpleCursorCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setCursor(
    [{ field: 'createdAt', value: '2023-05-10T10:00:00.000Z' }],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('createdAt', OrderDirection.ASC)
  .setTake(10);

const compositeCursorCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setCursor(
    [
      { field: 'createdAt', value: '2023-05-10T10:00:00.000Z' },
      { field: 'id', value: 'some-last-id' },
    ],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('createdAt', OrderDirection.ASC)
  .orderBy('id', OrderDirection.ASC)
  .setTake(10);
```

---

## 6. Selección de Campos

Por defecto, un `Criteria` seleccionará todos los campos definidos en su esquema. Puedes modificar esto con `setSelect()` y `resetSelect()`.

### Selección en la Entidad Raíz

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const userSelectCriteria = CriteriaFactory.GetCriteria(UserSchema).setSelect([
  'id',
  'email',
]);
```

**Nota:** Cuando se usa `setSelect`, el `identifier_field` de la entidad siempre se incluye implícitamente.

### Selección en Entidades Unidas

Llama a `setSelect()` en la instancia del `JoinCriteria`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

const userJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).setSelect(['username']);

const postsWithAuthorUsernameOnly = CriteriaFactory.GetCriteria(
  PostSchema,
).join('user', userJoinCriteria);
```

### Volver a Seleccionar Todos los Campos (`resetSelect`)

Si previamente usaste `setSelect()` y quieres volver al comportamiento por defecto:

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const userCriteria = CriteriaFactory.GetCriteria(UserSchema);
userCriteria.setSelect(['id']);
userCriteria.resetSelect();
```

---

## 7. Combinando Todo

Puedes encadenar todos estos métodos para construir consultas complejas. El siguiente ejemplo demuestra cómo combinar múltiples características, incluyendo uniones anidadas, filtrado en entidades raíz y unidas, selección de campos y paginación basada en cursor, para construir una especificación de consulta sofisticada.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema, RoleSchema } from './path/to/your/schemas';

let lastPostCreatedAt: string | undefined = undefined;
let lastPostUuid: string | undefined = undefined;

// 1. Define the criteria for the innermost join (Roles)
const roleJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(RoleSchema).where(
  {
    field: 'name',
    operator: FilterOperator.EQUALS,
    value: 'admin',
  },
);

// 2. Define the criteria for the intermediate join (Users) and add the nested join to it
const userWithRolesJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).join('roles', roleJoinCriteria);

// 3. Build the main criteria (Posts)
const complexPostCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setSelect(['id', 'title', 'createdAt'])
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  // 4. Add the pre-configured user join to the main criteria
  .join('user', userWithRolesJoinCriteria)
  .orderBy('createdAt', OrderDirection.DESC)
  .orderBy('id', OrderDirection.DESC);

if (lastPostCreatedAt && lastPostUuid) {
  complexPostCriteria.setCursor(
    [
      { field: 'createdAt', value: lastPostCreatedAt },
      { field: 'id', value: lastPostUuid },
    ],
    FilterOperator.LESS_THAN,
    OrderDirection.DESC,
  );
}

complexPostCriteria.setTake(5);
```

## Próximos Pasos

Con los criterios construidos, el siguiente paso es utilizar un [`CriteriaTranslator`](../developing-translators/es.md) para convertir estos objetos `Criteria` en una consulta nativa para tu base de datos. [Consulta la guía sobre Desarrollo de Traductores Personalizados](../developing-translators/es.md) o utiliza un traductor existente si está disponible para tu stack.
