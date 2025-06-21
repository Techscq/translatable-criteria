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
    - [Filtrando Campos Array (`ARRAY_CONTAINS_ELEMENT`, etc.)](#filtrando-campos-array-array_contains_element-etc)
    - [Filtrando Campos SET (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)](#filtrando-campos-set-set_contains-set_not_contains-set_contains_any-set_contains_all)
    - [Filtrando por Rangos (`BETWEEN`, `NOT_BETWEEN`)](#filtrando-por-rangos-between-not_between)
    - [Filtrando con Expresiones Regulares (`MATCHES_REGEX`)](#filtrando-con-expresiones-regulares-matches_regex)
    - [Coincidencia de Patrones Insensible a Mayúsculas/Minúsculas (`ILIKE`, `NOT_ILIKE`)](#coincidencia-de-patrones-insensible-a-mayúsculasminúsculas-ilike-not_ilike)
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

La librería soporta una amplia gama de operadores para tipos de datos complejos. Para una lista completa, consulta la guía de Conceptos Clave. Aquí tienes algunos ejemplos:

#### Filtrando Campos JSON (`JSON_CONTAINS`, `JSON_NOT_CONTAINS`)

El valor para estos operadores es un objeto donde las claves son rutas JSON (el traductor determinará si necesita `$.` al inicio) y los valores son lo que se busca en esa ruta.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const jsonCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS,
  value: {
    tags: 'tech',
    views: 100,
    'extra.source': 'import',
  },
});
```

#### Filtrando Campos Array (`ARRAY_CONTAINS_ELEMENT`, etc.)

Estos operadores pueden usarse para campos que son arrays nativos o arrays dentro de JSON.

- **Para columnas de array nativo:** El `value` es el elemento o array de elementos a buscar.
- **Para arrays dentro de JSON:** El `value` es un objeto con una única clave (la ruta JSON al array) y el valor es el elemento o array de elementos.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const arrayCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
  value: ['nestjs', 'api'],
});
```

#### Filtrando Campos SET (`SET_CONTAINS`, `SET_NOT_CONTAINS`, `SET_CONTAINS_ANY`, `SET_CONTAINS_ALL`)

Similar a `CONTAINS` pero conceptualmente para campos que representan un conjunto de valores (como el tipo `SET` de MySQL o un string delimitado).

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const setCriteria = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ANY,
  value: ['typescript', 'javascript'],
});
```

#### Filtrando por Rangos (`BETWEEN`, `NOT_BETWEEN`)

Estos operadores permiten verificar si un valor numérico o de fecha se encuentra dentro o fuera de un rango específico.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema, ProductSchema } from './path/to/your/schemas';

const betweenDatesCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'createdAt',
  operator: FilterOperator.BETWEEN,
  value: [new Date('2023-01-01'), new Date('2023-03-31')],
});

const notBetweenPriceCriteria = CriteriaFactory.GetCriteria(
  ProductSchema,
).where({
  field: 'price',
  operator: FilterOperator.NOT_BETWEEN,
  value: [100, 200],
});
```

#### Filtrando con Expresiones Regulares (`MATCHES_REGEX`)

Permite realizar búsquedas de patrones más potentes utilizando expresiones regulares. La sintaxis específica de la expresión regular puede depender de la base de datos subyacente.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './path/to/your/schemas';

const regexCriteria = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.MATCHES_REGEX,
  value: '^admin[0-9]+',
});
```

#### Coincidencia de Patrones Insensible a Mayúsculas/Minúsculas (`ILIKE`, `NOT_ILIKE`)

Similares a `LIKE` y `NOT_LIKE`, pero garantizan que la comparación de patrones sea insensible a mayúsculas y minúsculas, independientemente de la configuración por defecto de la base de datos.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const ilikeCriteria = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.ILIKE,
  value: '%typescript%',
});
```

### Referencia de Operadores de Filtro

Aquí tienes una lista detallada de los valores de `FilterOperator` disponibles y el tipo de `value` que esperan.

#### Igualdad y Comparación

- `EQUALS`: Comprueba la igualdad exacta. Espera un valor primitivo (`string`, `number`, `boolean`, `Date`, `null`).
- `NOT_EQUALS`: Comprueba la desigualdad. Espera un valor primitivo.
- `GREATER_THAN`: Comprueba si un valor es mayor que el proporcionado. Espera un `number` o `Date`.
- `GREATER_THAN_OR_EQUALS`: Comprueba si un valor es mayor o igual que el proporcionado. Espera un `number` o `Date`.
- `LESS_THAN`: Comprueba si un valor es menor que el proporcionado. Espera un `number` o `Date`.
- `LESS_THAN_OR_EQUALS`: Comprueba si un valor es menor o igual que el proporcionado. Espera un `number` o `Date`.

#### Coincidencia de Patrones

- `LIKE`: Coincide con un patrón (la sensibilidad a mayúsculas/minúsculas depende de la base de datos). Espera un `string`. El traductor es responsable de manejar los comodines (`%`, `_`).
- `NOT_LIKE`: Comprueba si un valor no coincide con un patrón. Espera un `string`.
- `CONTAINS`: Comprueba si una cadena contiene una subcadena. Espera un `string`. El traductor típicamente envolverá el valor con comodines (ej. `'%valor%'`).
- `NOT_CONTAINS`: Comprueba si una cadena no contiene una subcadena. Espera un `string`.
- `STARTS_WITH`: Comprueba si una cadena comienza con una subcadena específica. Espera un `string`. El traductor típicamente añadirá un comodín al final (ej. `'valor%'`).
- `ENDS_WITH`: Comprueba si una cadena termina con una subcadena específica. Espera un `string`. El traductor típicamente añadirá un comodín al principio (ej. `'%valor'`).
- `ILIKE`: Versión de `LIKE` insensible a mayúsculas/minúsculas. Espera un `string`.
- `NOT_ILIKE`: Versión de `NOT_LIKE` insensible a mayúsculas/minúsculas. Espera un `string`.

#### Pertenencia y Nulidad

- `IN`: Comprueba si un valor está dentro de un array dado. Espera un `Array<string | number | boolean | Date>`.
- `NOT_IN`: Comprueba si un valor no está dentro de un array dado. Espera un `Array<string | number | boolean | Date>`.
- `IS_NULL`: Comprueba si un valor es `NULL`. La propiedad `value` debe ser `null` o `undefined`.
- `IS_NOT_NULL`: Comprueba si un valor no es `NULL`. La propiedad `value` debe ser `null` o `undefined`.

#### Rangos y Regex

- `BETWEEN`: Comprueba si un valor está dentro de un rango especificado (inclusivo). Espera una tupla de dos valores: `[min, max]`.
- `NOT_BETWEEN`: Comprueba si un valor está fuera de un rango especificado. Espera una tupla de dos valores: `[min, max]`.
- `MATCHES_REGEX`: Comprueba si un valor de tipo string coincide con una expresión regular. Espera un `string` que representa el patrón de la regex.

#### Tipos Complejos (JSON, Array, SET)

- **Operadores JSON**
- `JSON_CONTAINS`: Comprueba si un documento JSON contiene una estructura o valor específico en una ruta dada. Espera un objeto donde las claves son rutas JSON y los valores son los datos a encontrar (ej. `{ "tags": "tech", "views": 100 }`).
- `JSON_NOT_CONTAINS`: La inversa de `JSON_CONTAINS`.
- **Operadores de Array**
- `ARRAY_CONTAINS_ELEMENT`: Comprueba si un array contiene un elemento específico. Para columnas de array nativo, espera un valor primitivo. Para arrays en JSON, espera un objeto como `{ "ruta.al.array": valorElemento }`.
- `ARRAY_CONTAINS_ALL_ELEMENTS`: Comprueba si un array contiene todos los elementos de un array dado. Espera un `Array<primitivo>` o `{ "ruta.al.array": [elementos] }`.
- `ARRAY_CONTAINS_ANY_ELEMENT`: Comprueba si un array contiene al menos un elemento de un array dado. Espera un `Array<primitivo>` o `{ "ruta.al.array": [elementos] }`.
- `ARRAY_EQUALS`: Comprueba si un array es exactamente igual a un array dado (orden y elementos). Espera un `Array<primitivo>` o `{ "ruta.al.array": [elementos] }`.
- **Operadores SET** (Conceptualmente para conjuntos, a menudo usados en campos de string o array)
- `SET_CONTAINS`: Comprueba si un conjunto contiene un valor específico. Espera un `string`.
- `SET_NOT_CONTAINS`: La inversa de `SET_CONTAINS`.
- `SET_CONTAINS_ANY`: Comprueba si un conjunto contiene al menos uno de los valores especificados. Espera un `Array<string>`.
- `SET_CONTAINS_ALL`: Comprueba si un conjunto contiene todos los valores especificados. Espera un `Array<string>`.

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

---

## 4. Ordenando Resultados

El ordenamiento se aplica con el método `orderBy()`, que toma el nombre del campo y la dirección (`OrderDirection.ASC` o `OrderDirection.DESC`).

### Ordenando por Campos de la Entidad Raíz

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema } from './path/to/your/schemas';

const postOrderCriteria = CriteriaFactory.GetCriteria(PostSchema)
  .orderBy('createdAt', OrderDirection.DESC)
  .orderBy('title', OrderDirection.ASC);
```

### Ordenando por Campos de Entidades Unidas

Para ordenar por un campo de una entidad unida, llama a `orderBy()` en la instancia del `JoinCriteria` correspondiente.

```typescript
import {
  CriteriaFactory,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/schemas';

const userJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
  UserSchema,
).orderBy('username', OrderDirection.ASC);

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
