# Guía Práctica: Construcción Dinámica de Criterios

Las guías anteriores te han mostrado cómo [Definir Esquemas](../guides/schema-definitions/es.md) y [Construir Criterios](../guides/building-criteria/es.md). Ahora, veamos cómo estas piezas encajan en un escenario de aplicación más realista y dinámico.

Esta guía presenta un ejemplo completo que demuestra la construcción de un objeto `Criteria` complejo basado en parámetros de entrada opcionales, como los de una petición de API. El objetivo es ilustrar cómo la librería puede ser utilizada para resolver problemas de una manera sutil, ordenada y desacoplada, sin importar si el contexto es simple o muy complejo.

## Índice

- 1. [El Escenario del Ejemplo](#1-el-escenario-del-ejemplo)
- 2. [Definición de Esquemas (Recordatorio)](#2-definición-de-esquemas-recordatorio)
- 3. [Construyendo el Criteria Dinámico](#3-construyendo-el-criteria-dinámico)
- 4. [La Función de Ayuda (Helper): Una Buena Práctica](#4-la-función-de-ayuda-helper-una-buena-práctica)
- 5. [Conclusión: Una Filosofía de Flexibilidad](#5-conclusión-una-filosofía-de-flexibilidad)

---

## 1. El Escenario del Ejemplo

Imagina que estás construyendo un endpoint de API para buscar publicaciones de blog. El endpoint debe soportar el filtrado por varios parámetros opcionales como título, contenido del cuerpo, etiquetas y detalles del autor. También necesita manejar diferentes estrategias de paginación (offset y basada en cursor).

Un objeto de petición típico podría verse así, donde cualquier campo puede ser omitido:

```typescript
type getPostByCriteriaRequest = {
  offset?: { page: number; order: 'ASC' | 'DESC' };
  cursor?: {
    uuid: string;
    created_at: string;
    order: 'ASC' | 'DESC';
  };
  title?: string;
  body?: string;
  metadata?: {
    tags?: string[];
    views?: number;
    ratings?: number[];
    extra?: Record<string, any>;
  };
  publisher_uuid?: string;
  categories?: string[];
  excludedCategories?: string[];
};
```

Nuestro objetivo es construir una única función que tome este objeto de petición y construya dinámicamente un objeto [`Criteria`](../api-reference/es.md#criteria-clase-abstracta-base), aplicando filtros, uniones y lógica de paginación solo si se proporcionan los parámetros correspondientes.

## 2. Definición de Esquemas (Recordatorio)

Para este ejemplo, utilizaremos los esquemas `PostSchema` y `UserSchema`. Para una guía detallada sobre cómo crearlos, por favor consulta [la guía de Definición de Esquemas.](../guides/schema-definitions/es.md)

```typescript
import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export interface EntityBase {
  uuid: string;
  created_at: string;
}
export interface User extends EntityBase {
  email: string;
  username: string;
  posts: Post[];
}

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: 'users',
  fields: ['uuid', 'email', 'username', 'created_at'],
  identifier_field: 'uuid',
  relations: [
    {
      relation_alias: 'posts',
      relation_type: 'one_to_many',
      target_source_name: 'post',
      local_field: 'uuid',
      relation_field: 'user_uuid',
    },
  ],
});
export type UserSchema = typeof UserSchema;

export interface Post extends EntityBase {
  title: string;
  body: string;
  publisher: User;
  categories: string[] | null;
  metadata?: {
    tags?: string[];
    views?: number;
    ratings?: number[];
    extra?: Record<string, any>;
  };
}
export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: 'posts',
  identifier_field: 'uuid',
  fields: [
    'uuid',
    'categories',
    'title',
    'body',
    'user_uuid',
    'created_at',
    'metadata',
  ],
  relations: [
    {
      relation_alias: 'publisher',
      relation_type: 'many_to_one',
      target_source_name: 'user',
      local_field: 'user_uuid',
      relation_field: 'uuid',
    },
  ],
});
export type PostSchema = typeof PostSchema;
```

## 3. Construyendo el Criteria Dinámico

Crearemos una función, `buildPostPaginatedCriteria`, que acepte el objeto de la petición y construya condicionalmente el objeto `Criteria`. Este enfoque mantiene la lógica de construcción de la consulta limpia y centralizada.

```typescript
const maxPostPerPage = 5;

function buildPostPaginatedCriteria(request: getPostByCriteriaRequest) {
  const postCriteria = CriteriaFactory.GetCriteria(PostSchema);

  if (request.title) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'title',
      operator: FilterOperator.CONTAINS,
      value: request.title,
    });
  }

  if (request.body) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'body',
      operator: FilterOperator.CONTAINS,
      value: request.body,
    });
  }

  if (request.categories) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'categories',
      operator: FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
      value: request.categories,
    });
  }

  if (request.excludedCategories && request.excludedCategories.length > 0) {
    dynamicFilterApplierHelper(postCriteria, {
      field: 'categories',
      operator: FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
      value: request.excludedCategories,
    });
  }

  if (request.metadata) {
    if (request.metadata.tags && request.metadata.tags.length > 0) {
      dynamicFilterApplierHelper(postCriteria, {
        field: 'metadata',
        operator: FilterOperator.JSON_CONTAINS_ALL,
        value: { tags: request.metadata.tags },
      });
    }
    if (request.metadata.views !== undefined) {
      dynamicFilterApplierHelper(postCriteria, {
        field: 'metadata',
        operator: FilterOperator.JSON_PATH_VALUE_EQUALS,
        value: { views: request.metadata.views },
      });
    }
    if (request.metadata.ratings && request.metadata.ratings.length > 0) {
      dynamicFilterApplierHelper(postCriteria, {
        field: 'metadata',
        operator: FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
        value: { ratings: request.metadata.ratings },
      });
    }
  }

  if (request.publisher_uuid) {
    postCriteria.join(
      'publisher',
      CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: request.publisher_uuid,
      }),
    );
  }

  if (request.cursor) {
    const cursorOperator =
      request.cursor.order === 'ASC'
        ? FilterOperator.GREATER_THAN
        : FilterOperator.LESS_THAN;

    postCriteria
      .setCursor(
        [
          { field: 'created_at', value: request.cursor.created_at },
          { field: 'uuid', value: request.cursor.uuid },
        ],
        cursorOperator,
        request.cursor.order,
      )
      .orderBy('created_at', request.cursor.order)
      .orderBy('uuid', request.cursor.order);
  } else if (request.offset) {
    postCriteria.setSkip(
      Math.max(0, (request.offset.page - 1) * maxPostPerPage),
    );
    postCriteria.orderBy('created_at', request.offset.order);
  } else {
    postCriteria.orderBy('created_at', 'DESC');
  }

  postCriteria.setTake(maxPostPerPage);

  return postCriteria;
}
```

**Desglose del Criteria:**

- **Inicialización:** Empezamos con un `RootCriteria` base para `PostSchema`.
- **Filtros Condicionales:** Cada bloque `if (request.campo)` comprueba la existencia de un parámetro. Si está presente, utiliza una función de ayuda (`dynamicFilterApplierHelper`) para aplicar el filtro correspondiente. Observa el uso de `FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT` para `excludedCategories`, que filtra eficientemente las publicaciones que pertenecen a cualquiera de las categorías especificadas en una sola operación.
- **Unión Condicional:** El `JOIN` al `publisher` (User) solo se añade si se proporciona un `publisher_uuid` para filtrar. Esto asegura que la unión no se realice innecesariamente.
- **Paginación Condicional:** La lógica maneja tres escenarios: aplica paginación basada en cursor si hay un cursor presente, recurre a la paginación por offset si se proporciona un offset, o aplica un ordenamiento por defecto si no se especifica ninguno.
- **Límite Global:** Se aplica un `setTake()` al final, que sirve como un tamaño de página por defecto para ambos métodos de paginación.

## 4. La Función de Ayuda (Helper): Una Buena Práctica

El ejemplo utiliza una función de ayuda, `dynamicFilterApplierHelper`, para gestionar la aplicación de filtros.

```typescript
function dynamicFilterApplierHelper<
  TSchema extends CriteriaSchema,
  Operator extends FilterOperator,
>(
  criteria: ICriteriaBase<TSchema>,
  filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>, Operator>,
) {
  if (criteria.rootFilterGroup.items.length === 0) {
    criteria.where(filterPrimitive);
  } else {
    criteria.andWhere(filterPrimitive);
  }
}
```

Este helper se proporciona puramente como un **ejemplo** de cómo un desarrollador puede manejar la complejidad de construir un objeto de criterio. La clave no es la implementación específica del helper, sino el **principio** que hay detrás:

- **Encapsulación:** Encapsula la lógica para resolver el problema común de decidir si se debe llamar a `.where()` (para el primer filtro) o a `.andWhere()` (para los filtros posteriores) al construir una consulta de forma dinámica.
- **Seguridad de Tipos:** El helper es genérico (`<TSchema extends CriteriaSchema, ...>`). Esta es una **práctica muy recomendada**. Al extender los tipos genéricos de la librería, te aseguras de que tus propias abstracciones mantengan una seguridad de tipos y un autocompletado completos, previniendo errores y mejorando la mantenibilidad del código en todo tu proyecto.

Los desarrolladores son totalmente libres de crear sus propias soluciones o helpers para construir dinámicamente sus criterios. Lo importante es aprovechar el sistema de tipos de la librería para construir un código robusto y mantenible.

## Nuevo Caso de Uso: Filtrado Eficiente con `withSelect`

Además del filtrado dinámico, un requisito común es filtrar una entidad principal basándose en sus relaciones, sin necesitar los datos de la entidad relacionada. Para esto, el parámetro `withSelect` en el método `.join()` es ideal.

Vamos a crear una nueva función que encuentre publicaciones de un editor específico pero que solo devuelva los datos de la publicación, haciendo la consulta más eficiente.

```typescript
/**
 * Builds a criteria to find posts by a specific publisher's UUID,
 * but only for filtering purposes, without selecting the publisher's data.
 * @param publisherUuid The UUID of the publisher to filter by.
 * @returns A Criteria object configured for fetching posts.
 */
export function buildPostFilterOnlyByPublisherCriteria(publisherUuid: string) {
  const postCriteria = CriteriaFactory.GetCriteria(PostSchema);

  postCriteria.join(
    'publisher',
    CriteriaFactory.GetInnerJoinCriteria(UserSchema).where({
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: publisherUuid,
    }),
    false, // withSelect is false
  );

  postCriteria.orderBy('created_at', 'DESC');
  postCriteria.setTake(10);

  return postCriteria;
}
```

Esta función `buildPostFilterOnlyByPublisherCriteria` crea un objeto `Criteria` que generará una consulta para unirse a la tabla `user` únicamente para filtrar por `publisherUuid`, pero la sentencia `SELECT` final no incluirá ningún campo de la tabla `user`.

## 5. Conclusión: Una Filosofía de Flexibilidad

Este ejemplo no pretende imponer ni proponer ningún patrón de arquitectura específico. El propósito es demostrar cómo `@nulledexp/translatable-criteria` proporciona las herramientas para resolver un problema potencialmente complejo de una manera desacoplada y organizada.

Los mismos principios mostrados aquí se aplican igualmente a escenarios más simples o incluso más complejos. La librería te da los bloques de construcción; cómo los integres en tus servicios, repositorios o casos de uso depende enteramente de tus decisiones de arquitectura.

---

## Próximos Pasos

- Para una referencia detallada de todas las clases y tipos, consulta la [Referencia de API.](../api-reference/es.md)
- Para aprender a convertir un objeto `Criteria` en una consulta nativa, consulta la [guía de Desarrollo de Traductores Personalizados.](../guides/developing-translators/es.md)
