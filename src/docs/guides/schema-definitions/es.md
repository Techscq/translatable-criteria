# Guía Práctica: Definición de Esquemas

Los esquemas (`CriteriaSchema`) son el pilar de la seguridad de tipos y la validación en `@nulledexp/translatable-criteria`. Definen la estructura de tus entidades de datos, permitiendo que la librería entienda qué campos y relaciones están disponibles para construir consultas.

Esta guía te mostrará cómo definir esquemas para tus entidades utilizando la función helper `GetTypedCriteriaSchema`.

## ¿Por Qué Usar `GetTypedCriteriaSchema`?

La función `GetTypedCriteriaSchema` es crucial porque:

1.  **Preserva los Tipos Literales:** Mantiene los tipos exactos de tus `fields` y `alias` (por ejemplo, `'id' | 'email'` en lugar de `string`). Esto es fundamental para el autocompletado y la validación estricta en tiempo de compilación cuando construyes tus `Criteria`.

2.  **Validación Estructural:** Aunque `GetTypedCriteriaSchema` es una función de identidad en tiempo de ejecución (simplemente devuelve el objeto que le pasas), su tipado ayuda a asegurar que la estructura de tu esquema (presencia de `source_name`, `alias`, `fields`, `identifier_field`, `joins`) sea correcta.
3.  **Evita `as const`:** Elimina la necesidad de usar aserciones `as const` en tus definiciones de esquema para lograr la preservación de tipos literales, haciendo el código más limpio.

## Estructura de un Esquema

Un `CriteriaSchema` se define con los siguientes campos principales:

```typescript
{
    source_name: string;
    alias: string;
    fields: readonly string[];
    identifier_field: string;
    joins: readonly {
        alias: string;
        target_source_name: string;
        relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
        metadata?: { [key: string]: any };
    }[];
    metadata?: { [key: string]: any };
}
```

- `source_name`: (string) El nombre real de la tabla o colección en tu base de datos.
- `alias`: (string) Un **único alias canónico** que usarás para referirte a esta entidad cuando sea la raíz de una consulta.
- `fields`: (readonly string[]) Una lista de todos los campos consultables para esta entidad.
- `identifier_field`: (string) **(Obligatorio)** El nombre del campo que identifica unívocamente una entidad de este esquema (ej. su clave primaria). Este campo **debe** ser uno de los nombres listados en el array `fields`.
- `joins`: (readonly object[]) Define las relaciones que esta entidad tiene con otras. Cada objeto de join especifica:
- `alias`: (string) El alias que usarás para referirte a esta **relación de unión específica** (ej. `'posts'`, `'autor'`). Este es el alias que pasarás al método `.join()`.
- `target_source_name`: (string) El `source_name` del esquema de la entidad a la que te estás uniendo. Esto se usa para una validación robusta.
- `relation_type`: (string) El tipo de relación, como `'one_to_many'`, `'many_to_one'`, o `'many_to_many'`.
- `metadata`: (objeto opcional) Un campo opcional para almacenar información arbitraria, específica del traductor para esta unión específica.
- `metadata`: (objeto opcional) Un campo opcional en la raíz del esquema para almacenar información arbitraria, específica del traductor para toda la entidad.

## Ejemplos de Esquemas

Para asegurar la consistencia a lo largo de la documentación, usaremos un conjunto unificado de esquemas. Estos ejemplos definen las entidades `User`, `Post` y `Role` y sus relaciones.

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
```

### Desglose del Ejemplo `UserSchema`

- **`source_name: 'users'`**: Indica que los datos de los usuarios se encuentran en una fuente (ej. tabla) llamada `users`.
- **`alias: 'u'`**: El alias canónico para la entidad `User` es `'u'`. Al crear un `RootCriteria` para usuarios, se le asignará el alias `u` en la consulta.
- **`fields: [...]`**: Lista los campos directamente consultables de la entidad `User`, incluyendo campos como `tags` que pueden ser usados con operadores avanzados.
- **`identifier_field: 'id'`**: Especifica `id` como el identificador único para las entidades `User`.
- **`joins: [...]`**:
  - La primera unión define una relación llamada `'posts'`. Este es el alias que usarás en el método `.join('posts', ...)`. Apunta a la fuente `posts` y es una relación `one_to_many`.
  - La segunda unión define una relación llamada `'roles'`, que apunta a la fuente `roles` con una relación `many_to_many`.

### Desglose del Ejemplo `PostSchema`

- **`joins: [...]`**:
  - Define una relación llamada `'user'`. Esto te permite unirte desde un `Post` de vuelta a su autor (`User`) usando `.join('user', ...)`.

## Próximos Pasos

Ahora que sabes cómo definir esquemas, el siguiente paso es aprender a [Construir Criterios utilizando estos esquemas.](../building-criteria/es.md)
