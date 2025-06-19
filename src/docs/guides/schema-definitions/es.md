# Guía Práctica: Definición de Esquemas

Los esquemas (`CriteriaSchema`) son el pilar de la seguridad de tipos y la validación en `@nulledexp/translatable-criteria`. Definen la estructura de tus entidades de datos, permitiendo que la librería entienda qué campos y relaciones están disponibles para construir consultas.

Esta guía te mostrará cómo definir esquemas para tus entidades utilizando la función helper `GetTypedCriteriaSchema`.

## ¿Por Qué Usar `GetTypedCriteriaSchema`?

La función `GetTypedCriteriaSchema` es crucial porque:

1.  **Preserva los Tipos Literales:** Mantiene los tipos exactos de tus `fields` y `alias` (por ejemplo, `'uuid' | 'email'` en lugar de `string`). Esto es fundamental para el autocompletado y la validación estricta en tiempo de compilación cuando construyes tus `Criteria`.
2.  **Validación Estructural:** Aunque `GetTypedCriteriaSchema` es una función de identidad en tiempo de ejecución (simplemente devuelve el objeto que le pasas), su tipado ayuda a asegurar que la estructura de tu esquema (presencia de `source_name`, `alias`, `fields`, `joins`) sea correcta.
3.  **Evita `as const`:** Elimina la necesidad de usar aserciones `as const` en tus definiciones de esquema para lograr la preservación de tipos literales, haciendo el código más limpio.

## Estructura de un Esquema

Un `CriteriaSchema` se define con los siguientes campos principales:

- `source_name`: (string) El nombre real de la tabla o colección en tu base de datos.
- `alias`: (array de strings) Una lista de alias que puedes usar para referirte a esta entidad al construir `Criteria`. El primer alias suele ser el principal o el más descriptivo.
- `fields`: (array de strings) Una lista de todos los campos consultables para esta entidad.
- `joins`: (array de objetos) Define las relaciones que esta entidad tiene con otras. Cada objeto de join especifica:
  - `alias`: (string) El alias que usarás para referirte a la entidad unida (debe coincidir con uno de los `alias` definidos en el esquema de la entidad unida).
  - `join_relation_type`: (string) El tipo de relación, como `'one_to_many'`, `'many_to_one'`, `'one_to_one'`, o `'many_to_many'`.
  - `metadata`: (objeto opcional) Un campo opcional para almacenar información arbitraria específica del traductor o pistas directamente dentro de la definición del esquema para esta unión específica.
- `metadata`: (objeto opcional) Un campo opcional en la raíz del esquema para almacenar información arbitraria específica del traductor o configuración relevante para toda la entidad que este esquema representa.

## Ejemplo: Definiendo el Esquema `UserSchema`

Basándonos en una entidad `User` que podría tener campos como `uuid`, `email`, `username`, `created_at` y relaciones con `Address`, `Permission` y `Post`, así es como definiríamos su esquema:

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user', // Nombre de la tabla en la base de datos
  alias: ['users', 'user', 'publisher'], // Posibles alias para esta entidad
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    {
      alias: 'permissions', // Alias para la entidad Permission
      join_relation_type: 'many_to_many',
    },
    {
      alias: 'addresses', // Alias para la entidad Address
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'posts', // Alias para la entidad Post
      join_relation_type: 'one_to_many',
    },
  ],
});

// Exportar el tipo para usarlo en tu aplicación
export type UserSchema = typeof UserSchema;
```

**Desglose del Ejemplo `UserSchema`:**

- `source_name: 'user'`: Indica que los datos de los usuarios se encuentran en una tabla/colección llamada `user`.
- `alias: ['users', 'user', 'publisher']`: Podemos referirnos a la entidad `User` como `users`, `user`, o `publisher` al crear `Criteria`.
- `fields: [...]`: Lista los campos directamente consultables de la entidad `User`.
- `joins: [...]`:
  - Define una relación `many_to_many` con una entidad cuyo alias es `permissions`.
  - Define una relación `one_to_many` con una entidad cuyo alias es `addresses`.
  - Define una relación `one_to_many` con una entidad cuyo alias es `posts`.

## Ejemplo: Definiendo el Esquema `PostSchema`

De manera similar, para una entidad `Post`:

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: [
    'uuid',
    'categories',
    'title',
    'body',
    'user_uuid', // Clave foránea al User (publisher)
    'created_at',
    'metadata', // Ejemplo de un campo JSON
  ],
  joins: [
    {
      alias: 'comments', // Alias para la entidad Comment
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'publisher', // Alias para la entidad User (el autor del post)
      join_relation_type: 'many_to_one',
    },
  ],
});

export type PostSchema = typeof PostSchema;
```

**Puntos Clave del `PostSchema`:**

- `fields`: Incluye campos como `categories` y `metadata`. Estos campos podrían ser de tipos complejos (arrays, JSON) en tu base de datos, y la librería permite filtrarlos usando operadores específicos (ver la guía de construcción de criterios).
- `user_uuid`: Es un campo que probablemente representa la clave foránea hacia la entidad `User`. Aunque la relación se define en `joins`, tener el campo de la FK listado en `fields` permite filtrar directamente por él si es necesario.
- `joins`:
  - `comments`: Un post puede tener muchos comentarios (`one_to_many`).
  - `publisher`: Un post pertenece a un usuario (`many_to_one`). Nota cómo el `alias` `publisher` aquí coincide con uno de los `alias` definidos en `UserSchema`.

## Exportando el Tipo del Esquema

Es una práctica recomendada exportar también el tipo inferido de tu esquema:

Esto te permite usar `UserSchema` (el tipo) en otras partes de tu aplicación para asegurar la coherencia y aprovechar la seguridad de tipos de TypeScript al interactuar con objetos que deben conformarse a la estructura del esquema.

## Próximos Pasos

Ahora que sabes cómo definir esquemas, el siguiente paso es aprender a Construir Criterios utilizando estos esquemas.
