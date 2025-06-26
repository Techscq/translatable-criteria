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
  joins: [
    {
      alias: 'posts',
      target_source_name: 'posts',
      relation_type: 'one_to_many',
    },
    {
      alias: 'roles',
      target_source_name: 'roles',
      relation_type: 'many_to_many',
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
  joins: [
    {
      alias: 'user',
      target_source_name: 'users',
      relation_type: 'many_to_one',
    },
  ],
});

export const RoleSchema = GetTypedCriteriaSchema({
  source_name: 'roles',
  alias: 'r',
  fields: ['id', 'name'],
  identifier_field: 'id',
  joins: [],
});

export const ProductSchema = GetTypedCriteriaSchema({
  source_name: 'products',
  alias: 'prod',
  fields: ['id', 'name', 'price', 'createdAt'],
  identifier_field: 'id',
  joins: [],
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

Las uniones se añaden con el método `join()`. La firma de este método se ha actualizado para mayor claridad y seguridad de tipos:

`criteria.join(joinAlias, criteriaToJoin, joinParameters)`

- **`joinAlias` (string):** Es el **alias de la relación** tal como se define en el array `joins` dentro del _esquema padre_. Actúa como un identificador único para esa configuración de relación específica. La librería utiliza este `joinAlias` junto con el `source_name` de `criteriaToJoin` (el esquema de la entidad que se está uniendo) para encontrar la definición exacta de la relación en el esquema padre.
- **`criteriaToJoin` (JoinCriteria):** Una instancia de un `Criteria` de join (`InnerJoinCriteria`, `LeftJoinCriteria`, etc.), creada con `CriteriaFactory`.
- **`joinParameters` (object):** Un objeto que define cómo se relacionan las entidades (`parent_field`, `join_field`, etc.).

### Uniones Simples (one-to-many, many-to-one, one-to-one)

Para estas relaciones, los parámetros de join son `parent_field` y `join_field`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './path/to/your/schemas';

const postsWithAuthorCriteria = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema),
  {
    parent_field: 'userId',
    join_field: 'id',
  },
);

const usersWithPostsCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'posts',
  CriteriaFactory.GetLeftJoinCriteria(PostSchema),
  {
    parent_field: 'id',
    join_field: 'userId',
  },
);
```

### Uniones con Tabla Pivote (many-to-many)

Para relaciones `many_to_many`, los parámetros de join requieren un objeto más detallado que incluye `pivot_source_name` y objetos para `parent_field` y `join_field`.

```typescript
import { CriteriaFactory } from '@nulledexp/translatable-criteria';
import { UserSchema, RoleSchema } from './path/to/your/schemas';

const usersWithRolesCriteria = CriteriaFactory.GetCriteria(UserSchema).join(
  'roles',
  CriteriaFactory.GetInnerJoinCriteria(RoleSchema),
  {
    pivot_source_name: 'user_roles',
    parent_field: { pivot_field: 'user_id', reference: 'id' },
    join_field: { pivot_field: 'role_id', reference: 'id' },
  },
);
```

### Filtrando en Entidades Unidas

Puedes aplicar filtros directamente a la instancia del `JoinCriteria` antes de pasarla al método `.join()`.

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
  {
    parent_field: 'userId',
    join_field: 'id',
  },
);
```

Estos filtros en el `JoinCriteria` típicamente se traducen a condiciones en la cláusula `ON` del JOIN.

### Filtrado Eficiente con `withSelect`

Un caso de uso común para las uniones es filtrar los resultados de la entidad principal basándose en las propiedades de una entidad relacionada, sin necesidad de recuperar realmente los datos de la entidad unida.

El método `join()` ahora acepta un último parámetro booleano opcional, `withSelect` (que por defecto es `true`).

- **`withSelect: true` (por defecto):** El join se comporta como de costumbre, y los campos de la entidad unida se incluyen en la sentencia `SELECT` final.
- **`withSelect: false`:** El join se realiza únicamente con fines de filtrado. Los campos de la entidad unida **no** se incluyen en la sentencia `SELECT` final. Esto resulta en una consulta más eficiente y un objeto de resultado más limpio y plano.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

// Encontrar publicaciones de un editor específico, pero solo seleccionar datos de la publicación.
const postsByPublisher = CriteriaFactory.GetCriteria(PostSchema).join(
  'user',
  CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
    field: 'uuid',
    operator: FilterOperator.EQUALS,
    value: 'some-publisher-uuid',
  }),
  {
    join_field: 'uuid',
    parent_field: 'user_uuid',
  },
  false, // withSelect es false
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
import { ProductSchema } => './path/to/your/schemas';

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
  { parent_field: 'userId', join_field: 'id' },
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
).join('user', userJoinCriteria, { parent_field: 'userId', join_field: 'id' });
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

// 1. Define el criteria para el join más interno (Roles)
const roleJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(RoleSchema).where(
  {
    field: 'name',
    operator: FilterOperator.EQUALS,
    value: 'admin',
  },
);

// 2. Define el criteria para el join intermedio (Users) y añádele el join anidado
const userWithRolesJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).join('roles', roleJoinCriteria, {
  pivot_source_name: 'user_roles',
  parent_field: { pivot_field: 'user_id', reference: 'id' },
  join_field: { pivot_field: 'role_id', reference: 'id' },
});

// 3. Construye el criteria principal (Posts)
const complexPostCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .setSelect(['id', 'title', 'createdAt'])
  .where({
    field: 'title',
    operator: FilterOperator.CONTAINS,
    value: 'TypeORM',
  })
  // 4. Añade el join de usuario pre-configurado al criteria principal
  .join('user', userWithRolesJoinCriteria, {
    parent_field: 'userId',
    join_field: 'id',
  })
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
