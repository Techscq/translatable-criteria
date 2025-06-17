# Guía Práctica: Ejemplos de Uso

Las guías anteriores te han mostrado cómo [Definir Esquemas](../guides/defining-schemas.md) y [Construir Criterios](../guides/building-criteria.md). Ahora, veamos cómo estas piezas encajan en un escenario de aplicación más realista.

Esta guía presenta un ejemplo completo que demuestra la construcción de un `Criteria` complejo y cómo podría ser utilizado por un repositorio para consultar datos.

## Índice

- 1. [El Escenario del Ejemplo](#1-el-escenario-del-ejemplo)
- 2. [Definición de Esquemas (Recordatorio)](#2-definición-de-esquemas-recordatorio)
- 3. [Construyendo el Criteria Complejo](#3-construyendo-el-criteria-complejo)
- 4. [Usando el Criteria en un Repositorio](#4-usando-el-criteria-en-un-repositorio)
  - 4.1. [Interfaz del Repositorio](#41-interfaz-del-repositorio)
  - 4.1.1. [Optimizando Modelos de Lectura con `setSelect`](#411-optimizando-modelos-de-lectura-con-setselect)
  - 4.2. [Implementación del Repositorio (Conceptual)](#42-implementación-del-repositorio-conceptual)
  - 4.3. [Uso del Repositorio](#43-uso-del-repositorio)
- 5. [La Traducción (Breve Mención)](#5-la-traducción-breve-mención)
- 6. [Conclusión](#6-conclusión)

---

## 1. El Escenario del Ejemplo

Imagina que necesitas implementar una funcionalidad de búsqueda paginada de usuarios. El requisito específico es:

> Obtener una lista paginada de usuarios cuyo email contenga "@example.com" Y cuyo nombre de usuario comience con "user\_", que además hayan publicado posts que contengan la palabra "TypeScript" en su título y que hayan sido creados en los últimos 6 meses. Los resultados deben estar ordenados primero por el nombre de usuario (ascendente) y luego por la fecha de creación del post (descendente).

Este escenario requiere:

- Filtrado en la entidad raíz (`User`).
- Una unión (`JOIN`) a la entidad `Post`.
- Filtrado en la entidad unida (`Post`).
- Ordenamiento por campos de ambas entidades (raíz y unida).
- Paginación basada en offset (`LIMIT`/`OFFSET`).

## 2. Definición de Esquemas (Recordatorio)

Para este ejemplo, utilizaremos los esquemas `UserSchema` y `PostSchema` que definimos en la guía de Definición de Esquemas. Asumimos que estos esquemas están disponibles en tu proyecto.

```typescript
// La ubicación de tus esquemas dependerá de la arquitectura de tu proyecto.
// Por ejemplo, en una arquitectura hexagonal:
// - src/user/application/criteria/user-criteria.schema.ts
// - src/post/application/criteria/post-criteria.schema.ts
// A continuación, se muestran como si estuvieran en un directorio común por simplicidad del ejemplo.

import { GetTypedCriteriaSchema } from '@nulledexp/translatable-criteria';

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: ['users', 'user', 'publisher'],
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    {
      alias: 'posts', // Alias para la entidad Post
      join_relation_type: 'one_to_many',
    },
    // ... otras uniones si existen (ej. con PermissionSchema, AddressSchema)
  ],
});
export type UserSchema = typeof UserSchema;

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: [
    'uuid',
    'title',
    'body',
    'user_uuid', // Clave foránea al User (publisher)
    'created_at',
    'categories', // Podría ser un array de strings
    'metadata', // Podría ser un campo JSON
  ],
  joins: [
    {
      alias: 'publisher', // Alias para la entidad User (el autor del post)
      join_relation_type: 'many_to_one',
    },
    // ... otras uniones si existen (ej. con PostCommentSchema)
  ],
});
export type PostSchema = typeof PostSchema;

// Podrías tener otros esquemas aquí si fueran necesarios para el ejemplo,
// como PostCommentSchema, PermissionSchema, etc.
// Por simplicidad, nos centraremos en User y Post para este ejemplo principal.
```

## 3. Construyendo el Criteria Complejo

Ahora, construyamos el objeto `Criteria` que representa la consulta descrita en el escenario. Utilizaremos `CriteriaFactory` y los métodos fluidos.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './domain/criteria/schemas'; // Ajusta la ruta según tu proyecto

// Calcular la fecha de hace 6 meses
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const userSearchCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
  // Filtros en la entidad raíz (User)
  .where({
    field: 'email',
    operator: FilterOperator.CONTAINS,
    value: '@example.com',
  })
  .andWhere({
    field: 'username',
    operator: FilterOperator.STARTS_WITH,
    value: 'user_',
  })
  // Unir con Post y aplicar orderBy directamente al JoinCriteria
  .join(
    CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts')
      // Filtros en la entidad unida (Post)
      .where({
        field: 'title',
        operator: FilterOperator.CONTAINS,
        value: 'TypeScript',
      })
      .andWhere({
        field: 'created_at',
        operator: FilterOperator.GREATER_THAN_OR_EQUALS,
        value: sixMonthsAgo,
      })
      // Ordenamiento específico para los posts, aplicado aquí mismo
      .orderBy('created_at', OrderDirection.DESC), // <--- orderBy en el JoinCriteria
    // Parámetros de la unión (User.uuid = Post.user_uuid)
    { parent_field: 'uuid', join_field: 'user_uuid' },
  )
  // Ordenamiento para la entidad raíz (User)
  .orderBy('username', OrderDirection.ASC)
  // Paginación
  .setTake(10)
  .setSkip(10);
```

**Desglose del Criteria:**

- `CriteriaFactory.GetCriteria(UserSchema, 'users')`: Iniciamos la consulta desde la entidad `User`, usando el alias `users`.
- `.where(...)`, `.andWhere(...)`: Aplicamos los filtros iniciales sobre los campos `email` y `username` de la entidad raíz (`User`).
- `.join(...)`: Añadimos una unión a la entidad `Post`.
  - `CriteriaFactory.GetInnerJoinCriteria(PostSchema, 'posts')`: Creamos el `Criteria` para la unión, especificando el esquema `PostSchema` y el alias `posts`. Usamos `InnerJoin` porque solo queremos usuarios que _tengan_ posts que cumplan las condiciones.
  - `.where(...)`, `.andWhere(...)`: Aplicamos los filtros sobre los campos `title` y `created_at` _de la entidad unida (`Post`)_.
  - `{ parent_field: 'uuid', join_field: 'user_uuid' }`: Definimos cómo se relacionan `User` (padre) y `Post` (hijo).
- `.orderBy(...)`: Definimos el ordenamiento. Primero por `username` (campo de la raíz) ascendente, luego por `created_at` (campo de la unión) descendente.
- `.setTake(...)`, `.setSkip(...)`: Aplicamos la paginación.

Este objeto `userSearchCriteria` encapsula ahora toda la lógica de la consulta de forma agnóstica a la base de datos.

## 4. Usando el Criteria en un Repositorio

Un repositorio es un patrón de diseño que media entre el dominio y las capas de mapeo de datos, utilizando una interfaz similar a una colección para acceder a los objetos del dominio. Un repositorio podría tener métodos que acepten un `Criteria` para desacoplar la lógica de consulta del ORM/base de datos específico.

### 4.1. Interfaz del Repositorio

Podrías definir una interfaz de repositorio agnóstica a la implementación:

```typescript
import { RootCriteria } from '@nulledexp/translatable-criteria';
import { UserSchema } from './domain/criteria/schemas';
import { UserReadModel } from './domain/user.read-model';

// Define la interfaz del repositorio de lectura para Usuarios
export interface IUserRepository {
  /**
   * Busca múltiples usuarios que coincidan con el Criteria proporcionado.
   * @param criteria El RootCriteria que define la consulta.
   * @returns Una promesa que resuelve a un array de UserReadModel.
   */
  matchingMany(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel[]>;

  /**
   * Busca un único usuario que coincida con el Criteria proporcionado.
   * Se espera que el Criteria esté configurado para devolver un único resultado o ninguno.
   * @param criteria El RootCriteria que define la consulta.
   * @returns Una promesa que resuelve a un UserReadModel o null si no se encuentra.
   */
  matchingOne(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel | null>;

  // Podrías añadir otros métodos comunes de repositorio si fueran necesarios,
  // por ejemplo, para contar resultados:
  // count(criteria: RootCriteria<UserSchema, any>): Promise<number>;
}
```

- `UserReadModel`: Sería la interfaz o tipo que representa la estructura de datos que tu capa de aplicación espera recibir.
- `RootCriteria<UserSchema, any>`: Indica que los métodos esperan un `Criteria` cuya entidad raíz sea `UserSchema`.

### 4.1.1. Optimizando Modelos de Lectura con `setSelect`

Aunque la interfaz `IUserRepository` define métodos que devuelven `UserReadModel`, puedes optimizar aún más la recuperación de datos especificando exactamente qué campos se necesitan utilizando el método `setSelect()` en tu objeto `Criteria`.

Cuando usas `setSelect()`, instruyes al `CriteriaTranslator` (y subsecuentemente al ORM o controlador de base de datos) para que obtenga solo esos campos especificados. Esto puede mejorar significativamente el rendimiento al reducir la cantidad de datos transferidos desde la base de datos y procesados por tu aplicación.

Por ejemplo, si solo necesitas el `uuid` y el `email` de un usuario para una vista de lista particular, podrías construir tu `Criteria` así:

```typescript
import {
  CriteriaFactory,
  FilterOperator,
} from '@nulledexp/translatable-criteria';
import { UserSchema } from './domain/criteria/schemas'; // Ajusta la ruta

const lightweightUserCriteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
  .setSelect(['uuid', 'email']) // Selecciona solo uuid y email
  .where({
    field: 'username',
    operator: FilterOperator.STARTS_WITH,
    value: 'user_',
  })
  .setTake(10);
```

En este escenario, tu `UserReadModel` aún podría definir más campos, pero los datos realmente poblados para las instancias devueltas por `matchingMany(lightweightUserCriteria)` idealmente solo contendrían `uuid` y `email` (más cualquier campo esencial para la hidratación del ORM, si aplica).

Alternativamente, podrías definir modelos de lectura más específicos, como un `UserEmailListReadModel`:

```typescript
// Conceptual: Un modelo de lectura más específico
interface UserEmailListReadModel {
  uuid: string;
  email: string;
}
```

La implementación del repositorio, al procesar `lightweightUserCriteria`, buscaría entonces devolver un array de objetos que coincidan con `UserEmailListReadModel` (o instancias de `UserReadModel` escasamente pobladas). Esto minimiza la sobrecarga de datos y alinea los datos obtenidos precisamente con los requisitos del caso de uso.

Este enfoque es particularmente beneficioso cuando se trata con entidades con muchos campos o al obtener grandes listas de datos.

### 4.2. Implementación del Repositorio (Conceptual)

La implementación concreta de este repositorio (por ejemplo, usando TypeORM, Sequelize, o una base de datos NoSQL) sería la responsable de utilizar un `CriteriaTranslator` para convertir el `Criteria` en una consulta nativa. El repositorio recibiría las dependencias necesarias, como el constructor de consultas de un ORM y una instancia del traductor, en su constructor.

```typescript
import { RootCriteria } from '@nulledexp/translatable-criteria';
import { UserSchema } from './domain/criteria/schemas'; // Ajusta la ruta
import { UserReadModel } from './domain/user.read-model'; // Ajusta la ruta
import { IUserRepository } from './user.repository.interface'; // La interfaz definida arriba

// --- Dependencias Específicas de la Implementación (Ejemplo con TypeORM) ---
// import { DataSource, SelectQueryBuilder } from 'typeorm';
// import { UserEntity } from './infrastructure/typeorm/entities/user.entity'; // Tu entidad TypeORM
// import { TypeOrmMysqlTranslator } from '@nulledexp/typeorm-mysql-translator'; // Tu traductor

export class TypeOrmUserRepository implements IUserRepository {
  // private readonly translator: TypeOrmMysqlTranslator<UserReadModel>; // O el tipo de entidad que devuelve TypeORM

  // constructor(
  //   private readonly dataSource: DataSource,
  //   // Podrías instanciar el traductor aquí o inyectarlo
  // ) {
  //   this.translator = new TypeOrmMysqlTranslator<UserReadModel>();
  // }

  async matchingMany(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel[]> {
    // Ejemplo conceptual con TypeORM:
    // const alias = criteria.alias;
    // const queryBuilder = this.dataSource
    //   .getRepository(UserEntity) // Repositorio de la entidad de BD
    //   .createQueryBuilder(alias); // Alias debe coincidir con el del RootCriteria

    // // El traductor modifica el queryBuilder basándose en el Criteria
    // this.translator.translate(criteria, queryBuilder);

    // // Ejecuta la consulta
    // const results = await queryBuilder.getMany();

    // // Mapea los resultados de la entidad de BD a UserReadModel si es necesario
    // return results.map(userEntity => ({
    //   uuid: userEntity.uuid,
    //   email: userEntity.email,
    //   username: userEntity.username,
    //   // ... otros campos necesarios para UserReadModel
    // }));

    // Ejemplo simplificado sin ORM real para la guía:
    console.log('Simulando ejecución de matchingMany con Criteria:', criteria);
    // Aquí iría la lógica real de traducción y ejecución
    // que podría devolver instancias de UserReadModel directamente
    // si el traductor y el ORM lo permiten (seleccionando solo los campos necesarios).
    return Promise.resolve([]); // Devuelve un array vacío como placeholder
  }

  async matchingOne(
    criteria: RootCriteria<UserSchema, any>,
  ): Promise<UserReadModel | null> {
    // Ejemplo conceptual con TypeORM:
    // const alias = criteria.alias;
    // const queryBuilder = this.dataSource
    //   .getRepository(UserEntity)
    //   .createQueryBuilder(alias);

    // this.translator.translate(criteria, queryBuilder);

    // const result = await queryBuilder.getOne();

    // if (!result) {
    //   return null;
    // }
    // // Mapea el resultado a UserReadModel
    // return {
    //   uuid: result.uuid,
    //   email: result.email,
    //   username: result.username,
    //   // ...
    // };

    // Ejemplo simplificado sin ORM real para la guía:
    console.log('Simulando ejecución de matchingOne con Criteria:', criteria);
    return Promise.resolve(null); // Devuelve null como placeholder
  }

  // async count(criteria: RootCriteria<UserSchema, any>): Promise<number> {
  //   // Ejemplo conceptual con TypeORM:
  //   // const alias = criteria.alias;
  //   // const queryBuilder = this.dataSource
  //   //   .getRepository(UserEntity)
  //   //   .createQueryBuilder(alias);
  //   //
  //   // // Para count, usualmente no necesitas joins complejos o selects específicos,
  //   // // a menos que los filtros del criteria los requieran.
  //   // // Podrías tener una versión simplificada del translate para count,
  //   // // o el traductor podría ser lo suficientemente inteligente.
  //   // this.translator.translate(criteria, queryBuilder); // Aplicar filtros y joins necesarios
  //   //
  //   // return await queryBuilder.getCount();
  //
  //   console.log("Simulando ejecución de count con Criteria:", criteria);
  //   return Promise.resolve(0);
  // }
}
```

**Nota:** Este es un ejemplo conceptual. La implementación real dependerá de tu ORM y traductor específico. El punto clave es que el `Criteria` se pasa al traductor, y el traductor modifica un constructor de consultas nativo (`queryBuilder`) o genera la consulta de alguna otra forma.

### 4.3. Uso del Repositorio

Desde tu capa de servicio o aplicación, instanciarías el repositorio con sus dependencias y luego llamarías a sus métodos pasándoles el `Criteria` construido.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
  type RootCriteria,
} from '@nulledexp/translatable-criteria';
import { UserSchema, PostSchema } from './domain/criteria/schemas'; // Ajusta la ruta según tu proyecto
import type { IUserRepository } from './user.repository.interface'; // Ajusta la ruta
import type { UserReadModel } from './domain/user.read-model'; // Ajusta la ruta

async function demostrarUsoRepositorio() {
  // En una aplicación real, este Criteria podría ser construido por un servicio
  // o una clase dedicada a la construcción de consultas específicas.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
    PostSchema,
    'posts',
  )
    .where({
      field: 'title',
      operator: FilterOperator.CONTAINS,
      value: 'TypeScript',
    })
    .andWhere({
      field: 'created_at',
      operator: FilterOperator.GREATER_THAN_OR_EQUALS,
      value: sixMonthsAgo,
    })
    .orderBy('created_at', OrderDirection.DESC);

  const userSearchCriteria: RootCriteria<typeof UserSchema, 'users'> =
    CriteriaFactory.GetCriteria(UserSchema, 'users')
      .where({
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: '@example.com',
      })
      .andWhere({
        field: 'username',
        operator: FilterOperator.STARTS_WITH,
        value: 'user_',
      })
      .join(postJoinCriteria, { parent_field: 'uuid', join_field: 'user_uuid' })
      .orderBy('username', OrderDirection.ASC)
      .setTake(10)
      .setSkip(10);

  // 2. Instanciación y Uso del Repositorio (Conceptual)
  // En una aplicación real, `userRepository` sería una instancia inyectada
  // de una clase que implementa `IUserRepository` (ej. TypeOrmUserRepository).=

  // const userRepository: IUserRepository = new ConcreteUserRepository(dataSource, translator);
  // const usuarios: UserReadModel[] = await userRepository.matchingMany(userSearchCriteria);
  // console.log(`Usuarios encontrados (simulado):`, usuarios.length);

  // Para fines de esta guía, ilustramos el concepto:
  console.log(
    'El objeto `userSearchCriteria` (recién construido) se pasaría al método `matchingMany` de una instancia de `IUserRepository`.',
  );
  console.log(
    'La implementación concreta del repositorio (ej. TypeOrmUserRepository) utilizaría un `CriteriaTranslator` para convertir el `Criteria` en una consulta nativa y ejecutarla contra la base de datos.',
  );
  console.log(
    'Finalmente, el método del repositorio devolvería los resultados (ej. UserReadModel[]).',
  );
}

demostrarUsoRepositorio();
```

En este flujo:

1.  Se construye el `Criteria` que define la consulta deseada.
2.  Se instancia el repositorio (ej. `TypeOrmUserRepository`) con sus dependencias (ej. un `DataSource` de TypeORM y una instancia del `TypeOrmMysqlTranslator`).
3.  Se llama al método apropiado del repositorio (`matchingMany` o `matchingOne`), pasándole el `Criteria`.
4.  El repositorio utiliza internamente el `CriteriaTranslator` para ejecutar la consulta en la base de datos.
5.  El repositorio devuelve los datos en el formato esperado (ej. `UserReadModel[]`).

Esto mantiene la lógica de construcción de la consulta separada de la lógica de acceso a datos.

## 5. La Traducción (Breve Mención)

Como se detalla en la guía de Desarrollo de Traductores Personalizados, el paso de convertir el objeto `Criteria` a una consulta nativa es manejado por una implementación concreta de `CriteriaTranslator`.

Por ejemplo, un `TypeOrmMysqlTranslator` tomaría el `userSearchCriteria` y un `SelectQueryBuilder` de TypeORM (que el repositorio tendría disponible), y modificaría el `queryBuilder` añadiendo las cláusulas `WHERE`, `JOIN`, `ORDER BY`, `LIMIT`, `OFFSET` correspondientes.

La belleza de este patrón es que la definición del `Criteria` no necesita saber _cómo_ se traducirá la consulta, solo que se puede traducir.

## 6. Conclusión

Este ejemplo demuestra cómo `@nulledexp/translatable-criteria` te permite construir especificaciones de consulta complejas de manera estructurada, tipada y agnóstica a la fuente de datos. Al integrar esta librería con el patrón Repositorio, puedes lograr una arquitectura de acceso a datos más limpia, mantenible y testeable.

---

## Próximos Pasos

Con una comprensión de los conceptos, la construcción de criterios y el desarrollo de traductores, ahora tienes las herramientas para empezar a utilizar `@nulledexp/translatable-criteria` en tus propios proyectos.

Para una referencia detallada de todas las clases y tipos, consulta la [Referencia de API.](../api-reference/es.md)
