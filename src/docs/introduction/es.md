# Introducción a @nulledexp/translatable-criteria

Bienvenido a la documentación de `@nulledexp/translatable-criteria`. Esta librería ha sido
diseñada para simplificar y estandarizar la forma en que construyes y manejas consultas de
datos complejas en tus aplicaciones TypeScript.

## ¿Qué es `@nulledexp/translatable-criteria`?

`@nulledexp/translatable-criteria` es una librería que te permite definir criterios de consulta
(filtrado, ordenamiento, uniones, paginación, etc.) de una manera abstracta y agnóstica a la
fuente de datos.

Con `@nulledexp/translatable-criteria`, defines estos criterios como objetos estructurados y con
seguridad de tipos. La librería ha evolucionado para ofrecer una validación de esquemas aún más
robusta y proporcionar información contextual más rica a los traductores, simplificando aún más
el desarrollo de integraciones sofisticadas con fuentes de datos.
Esto contrasta con la escritura directa de SQL, el uso de la sintaxis de un
ORM específico directamente en los casos de uso, o el desarrollo de múltiples métodos con
lógica compleja y fuertemente acoplada en los repositorios.

La idea central es que estos "criterios traducibles" puedan ser luego procesados por un
**Traductor** específico (que tú o la comunidad pueden implementar) para generar la consulta
nativa para tu base de datos o fuente de datos particular (por ejemplo, SQL para TypeORM, consultas para MongoDB, etc.).

- **[Traductor TypeOrm(MySql)](https://www.npmjs.com/package/@nulledexp/typeorm-mysql-criteria-translator)**
  - Autor: [Nelson Cabrera](https://github.com/Techscq)

## ¿Qué Problema Resuelve?

Muchas aplicaciones se enfrentan al desafío de crear una lógica de acceso a datos flexible y reutilizable. Un síntoma común es la **proliferación de métodos de consulta especializados** como `getUserByUuid`, `getUserByEmail` o `getPostByUuidAndTitleAndCategories`. Este enfoque se convierte rápidamente en un cuello de botella para el mantenimiento.

Este problema se agrava porque el "contexto" de una consulta puede cambiar. Por ejemplo, obtener un post para un usuario regular no es lo mismo que obtenerlo para su autor, un moderador o un servicio de analítica. Cada contexto puede requerir diferentes campos, uniones o filtros. Esto conduce a:

- **Explosión de Métodos:** Una necesidad constante de escribir nuevos métodos para cada pequeña variación en el filtrado, acoplando la capa de acceso a datos a casos de uso específicos.
- **Carga de Mantenimiento:** Los nuevos requisitos de negocio a menudo obligan a los desarrolladores a crear más y más métodos, aumentando la complejidad y el riesgo de errores.
- **Acoplamiento Fuerte:** La lógica de la aplicación se acopla fuertemente a una fuente de datos u ORM específico, dificultando futuras migraciones o cambios.
- **Complejidad Contextual:** La lógica para manejar diferentes contextos de acceso (ej. usuario vs. administrador) se dispersa y duplica.

`@nulledexp/translatable-criteria` proporciona una solución más abstracta e ideal. Al permitirte construir especificaciones de consulta de forma dinámica, aborda estos problemas al:

- **Desacoplar la definición de la consulta de su ejecución:** Define _qué_ datos necesitas, no _cómo_ obtenerlos.
- **Promover la reutilización:** Un único método de consulta puede manejar innumerables variaciones al aceptar un objeto `Criteria`.
- **Mejorar la seguridad de tipos:** Construye criterios con una fuerte validación en tiempo de compilación.
- **Facilitar las pruebas:** Prueba la lógica de construcción de consultas independientemente de la base de datos.

Si bien adoptar cualquier librería introduce un grado de acoplamiento, `@nulledexp/translatable-criteria` ofrece una compensación estratégica. Acoplas tu aplicación a un flujo de construcción de consultas predecible y mantenible a cambio de **desacoplar tu lógica de negocio de la fuente de datos subyacente y su implementación específica**. Esto resulta en una arquitectura más manejable, predecible y adaptable a largo plazo.

## ¿Para Quién es Esta Librería?

Esta librería es ideal para desarrolladores y equipos que:

- Buscan una forma más estructurada y mantenible de manejar las consultas de datos.
- Trabajan en proyectos donde la flexibilidad para cambiar o interactuar con múltiples fuentes de datos es importante.
- Valoran la seguridad de tipos y quieren reducir errores en tiempo de ejecución relacionados con las consultas.
- Quieren mantener su lógica de negocio limpia y separada de las implementaciones específicas de acceso a datos.
- Desarrollan arquitecturas limpias, como DDD (Domain-Driven Design), donde los repositorios pueden beneficiarse de una forma agnóstica de definir criterios.

## Principales Beneficios

- **[Seguridad de Tipos Mejorada](../guides/schema-definitions/es.md):** Construye consultas con una interfaz fluida y fuertemente tipada, incluyendo validación de esquemas robusta y valores de filtro tipados.
- **[Filtrado Potente](../guides/building-criteria/es.md#2-aplicando-filtros):** Define lógica de filtrado intrincada con una amplia gama de operadores (incluyendo para JSON, arrays, sets, rangos y regex) y agrupación lógica.
- **[Sistema de Uniones (Joins) Declarativo](../guides/building-criteria/es.md#3-añadiendo-uniones-joins):** Define la lógica de las relaciones una sola vez en el esquema y reutilízala con llamadas a join simples y seguras.
- **[Paginación Avanzada](../guides/building-criteria/es.md#5-paginación):** Soporte para paginación basada en offset y en cursor.
- **[Arquitectura Extensible](../guides/developing-translators/es.md):** Crea tus propios traductores para cualquier fuente de datos, ayudado por información de join más completa.

## ¿Cómo se Estructura esta Documentación?

Para ayudarte a sacar el máximo provecho de `@nulledexp/translatable-criteria`, hemos organizado la documentación de la siguiente manera:

- **Introducción (esta página):** Una visión general de la librería.
- [**Conceptos Clave:**](../core-concepts/es.md) Explicación detallada de los componentes
  fundamentales como
  `Criteria`,
  `CriteriaFactory`, `Schemas`, y la interfaz `CriteriaTranslator`.
- **Guías Prácticas:**
  - [Definición de Esquemas.](../guides/schema-definitions/es.md)
  - [Construcción de Criterios (filtros, joins, ordenamiento, paginación).](../guides/building-criteria/es.md)
  - [Desarrollo de Traductores Personalizados.](../guides/developing-translators/es.md)
- [**Ejemplos:**](../use-cases/es.md)
- [**API Reference:**](../api-reference/es.md)

¡Esperamos que esta librería te sea de gran utilidad!
