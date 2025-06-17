# Introducción a @nulledexp/translatable-criteria

Bienvenido a la documentación de `@nulledexp/translatable-criteria`. Esta librería ha sido
diseñada para simplificar y estandarizar la forma en que construyes y manejas consultas de
datos complejas en tus aplicaciones TypeScript.

## ¿Qué es `@nulledexp/translatable-criteria`?

`@nulledexp/translatable-criteria` es una librería que te permite definir criterios de consulta
(filtrado, ordenamiento, uniones, paginación, etc.) de una manera abstracta y agnóstica a la
fuente de datos.

Con `@nulledexp/translatable-criteria` , defines estos criterios como objetos estructurados y con
seguridad de tipos. Esto contrasta con la escritura directa de SQL, el uso de la sintaxis de un
ORM específico directamente en los casos de uso, o el desarrollo de múltiples métodos con
lógica compleja y fuertemente acoplada en los repositorios.

La idea central es que estos "criterios traducibles" puedan ser luego procesados por un
**Traductor** específico (que tú o la comunidad pueden implementar) para generar la consulta
nativa para tu base de datos o fuente de datos particular (por ejemplo, SQL para TypeORM,  
consultas para MongoDB, etc.).

- **[Traductor TypeOrm(MySql)](https://www.npmjs.com/package/@nulledexp/typeorm-mysql-criteria-translator)**
  - Author: [Nelson Cabrera](https://github.com/Techscq)

## ¿Qué Problema Resuelve?

En muchas aplicaciones, la lógica para consultar datos se encuentra mezclada con el código de  
negocio o fuertemente acoplada a un ORM o base de datos específica. Esto puede llevar a:

- **Dificultad para cambiar de base de datos o ORM:** Si decides migrar, gran parte de tu código
  de consulta necesita ser reescrito.
- **Complejidad en la lógica de negocio:** Las consultas complejas pueden volverse difíciles de
  leer, mantener y probar.
- **Repetición de código:** Lógicas de filtrado o paginación similares pueden estar duplicadas
  en diferentes partes de la aplicación.
- **Menor testeabilidad:** Probar la lógica de consulta de forma aislada se vuelve complicado.

`@nulledexp/translatable-criteria` aborda estos problemas al:

- **Desacoplar la definición de la consulta de su ejecución:** Define _qué_ datos necesitas, no _cómo_ obtenerlos de una fuente específica.
- **Promover la reutilización:** Los criterios pueden ser construidos, combinados y reutilizados.
- **Mejorar la seguridad de tipos:** Gracias a los esquemas, puedes construir criterios con validación en tiempo de compilación y ejecución.
- **Facilitar las pruebas:** Puedes probar la lógica de construcción de criterios de forma independiente.

## ¿Para Quién es Esta Librería?

Esta librería es ideal para desarrolladores y equipos que:

- Buscan una forma más estructurada y mantenible de manejar las consultas de datos.
- Trabajan en proyectos donde la flexibilidad para cambiar o interactuar con múltiples fuentes de datos es importante.
- Valoran la seguridad de tipos y quieren reducir errores en tiempo de ejecución relacionados con las consultas.
- Quieren mantener su lógica de negocio limpia y separada de las implementaciones específicas de acceso a datos.
- Desarrollan arquitecturas limpias, como DDD (Domain-Driven Design), donde los repositorios pueden beneficiarse de una forma agnóstica de definir criterios.

## Principales Beneficios

- **Seguridad de Tipos Mejorada:** Construye consultas con una interfaz fluida y fuertemente tipada.
- **Filtrado Potente:** Define lógica de filtrado intrincada con múltiples operadores y agrupación.
- **Sistema de Uniones (Joins) Flexible:** Soporte para varios tipos de join y configuraciones de tablas pivote.
- **Paginación Avanzada:** Soporte para paginación basada en offset y en cursor.
- **Arquitectura Extensible:** Crea tus propios traductores para cualquier fuente de datos.

## ¿Cómo se Estructura esta Documentación?

Para ayudarte a sacar el máximo provecho de `@nulledexp/translatable-criteria`, hemos organizado la documentación de la siguiente manera:

- **Introducción (esta página):** Una visión general de la librería.
- [**Conceptos Clave:**](../core-concepts/es.md) Explicación detallada de los componentes
  fundamentales como
  `Criteria`,
  `CriteriaFactory`, `Schemas`, y la interfaz `CriteriaTranslator`.
- [**Guías Prácticas:**](../guides/)
  - [Definición de Esquemas.](../guides/schema-definitions/es.md)
  - [Construcción de Criterios (filtros, joins, ordenamiento, paginación).](../guides/building-criteria/es.md)
  - [Desarrollo de Traductores Personalizados.](../guides/developing-translators/es.md)
- [**Ejemplos:**](../use-cases/es.md)
- [**API Reference:**](../api-reference/es.md)

¡Esperamos que esta librería te sea de gran utilidad!
