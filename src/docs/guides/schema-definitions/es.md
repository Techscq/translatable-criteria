# Guía Práctica: Definición de Esquemas

Los esquemas (`CriteriaSchema`) son el pilar de la seguridad de tipos y la validación en `@nulledexp/translatable-criteria`. Definen la estructura de tus entidades de datos, permitiendo que la librería entienda qué campos y relaciones están disponibles para construir consultas.

Esta guía te mostrará cómo definir esquemas para tus entidades utilizando la función helper `GetTypedCriteriaSchema`.

## ¿Por Qué Usar `GetTypedCriteriaSchema`?

La función `GetTypedCriteriaSchema` es crucial porque:

1.  **Preserva los Tipos Literales:** Mantiene los tipos exactos de tus `fields` y `alias` (por ejemplo, `'id' | 'email'` en lugar de `string`). Esto es fundamental para el autocompletado y la validación estricta en tiempo de compilación cuando construyes tus `Criteria`.
2.  **Validación Estructural:** Aunque `GetTypedCriteriaSchema` es una función de identidad en tiempo de ejecución (simplemente devuelve el objeto que le pasas), su tipado ayuda a asegurar que la estructura de tu esquema (presencia de `source_name`, `alias`, `fields`, `identifier_field`, `relations`) sea correcta.
3.  **Evita `as const`:** Elimina la necesidad de usar aserciones `as const` en tus definiciones de esquema para lograr la preservación de tipos literales, haciendo el código más limpio.

## Estructura de un Esquema

Un `CriteriaSchema` se define con los siguientes campos principales:

```typescript
    {
        source_name: string;
        alias: string;
        fields: readonly string[];
        identifier_field: string;
        relations: readonly SchemaJoins<string>[];
        metadata?: { [key: string]: any };
    }
```

- `source_name`: (string) El nombre real de la tabla o colección en tu base de datos.
- `alias`: (string) Un **único alias canónico** que usarás para referirte a esta entidad cuando sea la raíz de una consulta.
- `fields`: (readonly string[]) Una lista de todos los campos consultables para esta entidad.
- `identifier_field`: (string) **(Obligatorio)** El nombre del campo que identifica unívocamente una entidad de este esquema (ej. su clave primaria). Este campo **debe** ser uno de los nombres listados en el array `fields`.
- `relations`: (readonly object[]) Define las relaciones que esta entidad tiene con otras. Cada objeto en este array describe una única relación completa.
- `metadata`: (objeto opcional) Un campo opcional en la raíz del esquema para almacenar información arbitraria, específica del traductor para toda la entidad.

### La Propiedad `relations`

Este es el núcleo del sistema de uniones declarativo. Cada objeto en el array `relations` define una relación completa, incluyendo los campos por los que se debe unir.

#### Para Uniones Simples (one-to-one, one-to-many, many-to-one)

```typescript
    {
      relation_alias: string;
      relation_type: 'one_to_one' | 'one_to_many' | 'many_to_one';
      target_source_name: string;
      local_field: string;
      relation_field: string;
      metadata?: { [key: string]: any };
    }
```

- `relation_alias`: El nombre único para esta relación (ej. `'posts'`, `'autor'`). Este es el alias que pasarás al método `.join()`.
- `relation_type`: El tipo de relación.
- `target_source_name`: El `source_name` del esquema de la entidad a la que te estás uniendo.
- `local_field`: El nombre del campo **en el esquema actual** usado para la condición de la unión.
- `relation_field`: El nombre del campo **en el esquema de destino** usado para la condición de la unión.

#### Para Uniones `many-to-many`

```typescript
    {
      relation_alias: string;
      relation_type: 'many_to_many';
      target_source_name: string;
      pivot_source_name: string;
      local_field: { pivot_field: string; reference: string };
      relation_field: { pivot_field: string; reference: string };
      metadata?: { [key: string]: any };
    }
```

- `pivot_source_name`: El nombre de la tabla pivote intermediaria.
- `local_field`: Un objeto que especifica el campo `reference` en el esquema actual y el `pivot_field` al que se conecta en la tabla pivote.
- `relation_field`: Un objeto que especifica el campo `reference` en el esquema de destino y el `pivot_field` al que se conecta en la tabla pivote.

## Ejemplos de Esquemas

Para asegurar la consistencia a lo largo de la documentación, usaremos un conjunto unificado de esquemas. Estos ejemplos definen las entidades `User`, `Post` y `Role` y sus relaciones usando la nueva estructura declarativa.

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
```

### Desglose del Ejemplo `UserSchema`

- **`source_name: 'users'`**: Indica que los datos de los usuarios se encuentran en una fuente (ej. tabla) llamada `users`.
- **`alias: 'u'`**: El alias canónico para la entidad `User` es `'u'`.
- **`identifier_field: 'id'`**: Especifica `id` como el identificador único para las entidades `User`.
- **`relations: [...]`**:
  - La primera relación define una relación `one_to_many` llamada `'posts'`. Especifica que el campo `users.id` (`local_field`) se conecta con el campo `posts.userId` (`relation_field`).
  - La segunda relación define una relación `many_to_many` llamada `'roles'` a través de la tabla pivote `user_roles`. Mapea `users.id` a `user_roles.user_id` y `roles.id` a `user_roles.role_id`.

### Desglose del Ejemplo `PostSchema`

- **`relations: [...]`**:
  - Define una relación `many_to_one` llamada `'user'`. Esto te permite unirte desde un `Post` de vuelta a su autor (`User`) conectando `posts.userId` (`local_field`) con `users.id` (`relation_field`).

## Próximos Pasos

Ahora que sabes cómo definir esquemas, el siguiente paso es aprender a [Construir Criterios utilizando estos esquemas.](../building-criteria/es.md)
