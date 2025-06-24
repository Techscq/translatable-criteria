# Referencia de Operadores de Filtro

Esta guía proporciona una lista detallada de todos los valores de `FilterOperator` disponibles, su propósito, el tipo de `value` que esperan, y un ejemplo de código para cada uno.

## Índice

- [Igualdad y Comparación](#igualdad-y-comparación)
- [Coincidencia de Patrones](#coincidencia-de-patrones)
- [Pertenencia y Nulidad](#pertenencia-y-nulidad)
- [Rangos y Regex](#rangos-y-regex)
- [Tipos Complejos (JSON, Array, SET)](#tipos-complejos-json-array-set)

---

### Referencia de Operadores de Filtro

Aquí tienes una lista detallada de todos los valores de `FilterOperator` disponibles, su propósito, el tipo de `value` que esperan, y un ejemplo de código para cada uno.

#### Igualdad y Comparación

- `EQUALS` / `NOT_EQUALS`: Comprueba la igualdad o desigualdad exacta entre el valor del campo y el valor proporcionado.
  - **Valor Esperado:** Un valor primitivo (`string`, `number`, `boolean`, `Date`, `null`).
  - **Ejemplo:**

```typescript
const activeUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'isActive',
  operator: FilterOperator.EQUALS,
  value: true,
});

const nonAdminUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.NOT_EQUALS,
  value: 'admin',
});
```

- `GREATER_THAN` / `GREATER_THAN_OR_EQUALS`: Comprueba si un valor es estrictamente mayor que, o mayor o igual que el proporcionado.

  - **Valor Esperado:** Un `number` o `Date`.
  - **Ejemplo:**

```typescript
const recentPost = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'createdAt',
  operator: FilterOperator.GREATER_THAN,
  value: new Date('2023-01-01'),
});
```

- `LESS_THAN` / `LESS_THAN_OR_EQUALS`: Comprueba si un valor es estrictamente menor que, o menor o igual que el proporcionado.
  - **Valor Esperado:** Un `number` o `Date`.
  - **Ejemplo:**

```typescript
const cheapProduct = CriteriaFactory.GetCriteria(ProductSchema).where({
  field: 'price',
  operator: FilterOperator.LESS_THAN_OR_EQUALS,
  value: 10.0,
});
```

#### Coincidencia de Patrones

- `LIKE` / `NOT_LIKE`: Coincide o no coincide con un patrón. La sensibilidad a mayúsculas/minúsculas depende de la intercalación de la base de datos. El traductor es responsable de manejar los comodines (`%`, `_`).

  - **Valor Esperado:** Un `string`.
  - **Ejemplo:**

```typescript
const userWithDomain = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.LIKE,
  value: '%@example.com',
});
```

- `ILIKE` / `NOT_ILIKE`: Versión insensible a mayúsculas/minúsculas de `LIKE` y `NOT_LIKE`. El comportamiento puede variar ligeramente dependiendo de la base de datos.

  - **Valor Esperado:** Un `string`.
  - **Ejemplo:**

```typescript
const postWithTerm = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.ILIKE,
  value: '%typescript%',
});
```

- `CONTAINS` / `NOT_CONTAINS`: Comprueba si una cadena contiene o no contiene una subcadena. El traductor típicamente envolverá el valor con comodines (ej. `'%valor%'`).

  - **Valor Esperado:** Un `string`.
  - **Ejemplo:**

```typescript
const postWithKeyword = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'content',
  operator: FilterOperator.CONTAINS,
  value: 'important keyword',
});

const postWithoutDraft = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'title',
  operator: FilterOperator.NOT_CONTAINS,
  value: 'Draft',
});
```

- `STARTS_WITH`: Comprueba si una cadena comienza con una subcadena específica. El traductor típicamente añadirá un comodín al final (ej. `'valor%'`).

  - **Valor Esperado:** Un `string`.
  - **Ejemplo:**

```typescript
const devUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.STARTS_WITH,
  value: 'dev',
});
```

- `ENDS_WITH`: Comprueba si una cadena termina con una subcadena específica. El traductor típicamente añadirá un comodín al principio (ej. `'%valor'`).
  - **Valor Esperado:** Un `string`.
  - **Ejemplo:**

```typescript
const orgUser = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.ENDS_WITH,
  value: '.org',
});
```

#### Pertenencia y Nulidad

- `IN` / `NOT_IN`: Comprueba si el valor de un campo está presente o no está presente dentro de un array de valores dado.

  - **Valor Esperado:** Un `Array<string | number | boolean | Date>`.
  - **Ejemplo:**

```typescript
const specificUsers = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'id',
  operator: FilterOperator.IN,
  value: [1, 5, 10],
});

const postsFromOtherUsers = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'userId',
  operator: FilterOperator.NOT_IN,
  value: [100, 200],
});
```

- `IS_NULL` / `IS_NOT_NULL`: Comprueba si el valor de un campo es o no es `NULL`.
  - **Valor Esperado:** `null` o `undefined`. El traductor a menudo ignora el valor real.
  - **Ejemplo:**

```typescript
const postsWithoutContent = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'content',
  operator: FilterOperator.IS_NULL,
  value: null,
});

const usersWithEmail = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'email',
  operator: FilterOperator.IS_NOT_NULL,
  value: undefined,
});
```

#### Rangos y Regex

- `BETWEEN` / `NOT_BETWEEN`: Comprueba si el valor de un campo se encuentra dentro o fuera de un rango especificado (inclusivo).

  - **Valor Esperado:** Una tupla de dos valores primitivos `[min, max]` (ej. `[number, number]`, `[Date, Date]`).
  - **Ejemplo:**

```typescript
const midRangeProducts = CriteriaFactory.GetCriteria(ProductSchema).where({
  field: 'price',
  operator: FilterOperator.BETWEEN,
  value: [10.0, 50.0],
});
```

- `MATCHES_REGEX`: Comprueba si un valor de tipo string coincide con un patrón de expresión regular. La sintaxis específica de la expresión regular puede depender de la base de datos subyacente.
  - **Valor Esperado:** Un `string` que representa la expresión regular.
  - **Ejemplo:**

```typescript
const userWithNumericId = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'username',
  operator: FilterOperator.MATCHES_REGEX,
  value: '^user[0-9]{3}$',
});
```

#### Tipos Complejos (JSON, Array, SET)

- `JSON_PATH_VALUE_EQUALS` / `JSON_PATH_VALUE_NOT_EQUALS`: Comprueba si el valor en una ruta JSON específica es igual o no es igual a un valor primitivo dado.

  - **Valor Esperado:** Un objeto donde las claves son rutas JSON y los valores son los datos primitivos a coincidir.
  - **Ejemplo:**

```typescript
const publishedPosts = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_PATH_VALUE_EQUALS,
  value: { status: 'published', 'extra.source': 'import' },
});
```

- `JSON_CONTAINS` / `JSON_NOT_CONTAINS`: Comprueba si un documento JSON (o un valor en una ruta específica dentro de él) contiene o NO contiene un valor JSON especificado.

  - **Valor Esperado:** Un objeto donde las claves son rutas JSON y los valores son los datos JSON (escalar, array u objeto) a encontrar.
  - **Ejemplo:**

```typescript
const postsWithSpecificTag = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS,
  value: { 'tags[0]': 'tech' },
});
```

- `JSON_CONTAINS_ANY` / `JSON_NOT_CONTAINS_ANY`: Comprueba si un documento JSON contiene AL MENOS UNO de los valores especificados, o si no contiene NINGUNO de ellos.

  - **Valor Esperado:** Un objeto donde las claves son rutas JSON y los valores son arrays de datos JSON.
  - **Ejemplo:**

```typescript
const postsWithTechOrNews = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS_ANY,
  value: { tags: ['tech', 'news'] },
});

const postsWithoutSpam = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_NOT_CONTAINS_ANY,
  value: { tags: ['spam', 'ad'] },
});
```

- `JSON_CONTAINS_ALL` / `JSON_NOT_CONTAINS_ALL`: Comprueba si un documento JSON contiene TODOS los valores especificados, o si le falta AL MENOS UNO de ellos.

  - **Valor Esperado:** Un objeto donde las claves son rutas JSON y los valores son arrays de datos JSON.
  - **Ejemplo:**

```typescript
const postsWithRequiredTags = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'metadata',
  operator: FilterOperator.JSON_CONTAINS_ALL,
  value: { tags: ['tech', 'important'] },
});
```

- `ARRAY_CONTAINS_ELEMENT` / `ARRAY_NOT_CONTAINS_ELEMENT`: Comprueba si un array contiene o NO contiene un elemento específico.

  - **Valor Esperado:** Un valor primitivo (para columnas de array nativo) O un objeto como `{ "ruta.al.array": valorElemento }` (para arrays dentro de JSON).
  - **Ejemplo:**

```typescript
const postsInCategory = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ELEMENT,
  value: 'nestjs',
});

const postsNotInLegacy = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT,
  value: 'legacy',
});
```

- `ARRAY_CONTAINS_ANY_ELEMENT` / `ARRAY_NOT_CONTAINS_ANY_ELEMENT`: Comprueba si un array contiene AL MENOS UN elemento de un array dado, o si no contiene NINGUNO de ellos.

  - **Valor Esperado:** Un `Array<primitivo>` (para columnas de array nativo) O un objeto como `{ "ruta.al.array": [elementos] }` (para arrays dentro de JSON).
  - **Ejemplo:**

```typescript
const postsInAnyCategory = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
  value: ['nestjs', 'api'],
});

const postsWithoutBanned = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
  value: ['banned1', 'banned2'],
});
```

- `ARRAY_CONTAINS_ALL_ELEMENTS` / `ARRAY_NOT_CONTAINS_ALL_ELEMENTS`: Comprueba si un array contiene TODOS los elementos de un array dado, o si le falta AL MENOS UNO de ellos.

  - **Valor Esperado:** Un `Array<primitivo>` (para columnas de array nativo) O un objeto como `{ "ruta.al.array": [elementos] }` (para arrays dentro de JSON).
  - **Ejemplo:**

```typescript
const postsWithAllCategories = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
  value: ['nestjs', 'api'],
});
```

- `ARRAY_EQUALS` / `ARRAY_NOT_EQUALS`: Comprueba si un array es igual o NO es igual a un array dado (insensible al orden).

  - **Valor Esperado:** Un `Array<primitivo>` (para columnas de array nativo) O un objeto como `{ "ruta.al.array": [elementos] }` (para arrays dentro de JSON).
  - **Ejemplo:**

```typescript
const postsWithExactCategories = CriteriaFactory.GetCriteria(PostSchema).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_EQUALS,
  value: ['news', 'tech'],
});

const postsExcludingExactCategories = CriteriaFactory.GetCriteria(
  PostSchema,
).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_NOT_EQUALS,
  value: ['news', 'tech'],
});
```

- `ARRAY_EQUALS_STRICT` / `ARRAY_NOT_EQUALS_STRICT`: Comprueba si un array es exactamente igual o NO es exactamente igual a un array dado (sensible al orden).

  - **Valor Esperado:** Un `Array<primitivo>` (para columnas de array nativo) O un objeto como `{ "ruta.al.array": [elementos] }` (para arrays dentro de JSON).
  - **Ejemplo:**

```typescript
const postsWithOrderedCategories = CriteriaFactory.GetCriteria(
  PostSchema,
).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_EQUALS_STRICT,
  value: ['nestjs', 'api', 'typeorm'],
});
const postsExcludingOrderedCategories = CriteriaFactory.GetCriteria(
  PostSchema,
).where({
  field: 'categories',
  operator: FilterOperator.ARRAY_NOT_EQUALS_STRICT,
  value: ['nestjs', 'api', 'typeorm'],
});
```

- `SET_CONTAINS` / `SET_NOT_CONTAINS`: Comprueba si un campo de colección (como el tipo `SET` de MySQL) contiene o NO contiene un valor específico.

  - **Valor Esperado:** Un `string`.
  - **Ejemplo:**

```typescript
const userWithTag = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS,
  value: 'typescript',
});
```

- `SET_CONTAINS_ANY` / `SET_NOT_CONTAINS_ANY`: Comprueba si un campo de colección contiene AL MENOS UNO de los valores especificados, o si no contiene NINGUNO de ellos.

  - **Valor Esperado:** Un `Array<string>`.
  - **Ejemplo:**

```typescript
const userWithAnyTag = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ANY,
  value: ['typescript', 'javascript'],
});
```

- `SET_CONTAINS_ALL` / `SET_NOT_CONTAINS_ALL`: Comprueba si un campo de colección contiene TODOS los valores especificados, o si le falta AL MENOS UNO de ellos.
  - **Valor Esperado:** Un `Array<string>`.
  - **Ejemplo:**

```typescript
const userWithAllTags = CriteriaFactory.GetCriteria(UserSchema).where({
  field: 'tags',
  operator: FilterOperator.SET_CONTAINS_ALL,
  value: ['typescript', 'backend'],
});
```
