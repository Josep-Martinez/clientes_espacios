# BookFit · Guía para desplegar con Supabase en producción

Esta guía se aplica cuando exista un proyecto Supabase Cloud para BookFit. El repositorio actual desarrolla contra un PostgreSQL local, y GitHub Actions levanta su propia base temporal para cada PR. La validación se mantiene separada del futuro despliegue. La [PR #6](https://github.com/Josep-Martinez/clientes_espacios/pull/6) recoge los cambios que prepararon este flujo.

## 1. Elegir los entornos

| Entorno           | Para qué sirve                                                                        | Datos                                                   |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Supabase local    | Desarrollar con `pnpm local:start`, aplicar migraciones y regenerar tipos.            | Datos ficticios de `supabase/seed.sql`.                 |
| GitHub Actions    | Reconstruir Supabase desde cero, comparar tipos y ejecutar `quality` antes del merge. | Datos ficticios en una instancia desechable del runner. |
| Producción        | Ejecutar la aplicación con usuarios, reservas y datos reales.                         | Datos reales y copias de seguridad protegidas.          |
| Staging, opcional | Ensayar un despliegue en un dominio real o una migración sobre datos existentes.      | Datos ficticios o copias autorizadas y minimizadas.     |

Para un primer lanzamiento sencillo basta con local, CI y producción. Valora staging cuando haya cambios delicados sobre reservas existentes, pagos reales, redirecciones de Auth, correo o integraciones que dependan del alojamiento. Si el riesgo es alto, ensaya antes de tocar producción.

## 2. Crear y preparar el proyecto Cloud

1. Crea un proyecto dedicado a producción en la organización adecuada. Elige región cerca del servidor de la API y registra el identificador del proyecto. Comprueba quién puede administrar el proyecto y recuperar el acceso.
2. Comprueba qué copias y opciones de restauración ofrece el plan elegido. Decide cuántos datos se pueden perder y cuánto tiempo puede estar parada la app. Ensaya una restauración en una instancia separada antes de admitir datos reales.
3. Desde el alojamiento de Fastify, verifica conectividad hacia PostgreSQL y TLS con validación de certificado. Elige conexión directa o pooler según la red, el modelo de ejecución y el presupuesto de conexiones. Verifica también el acceso del runner de despliegue. Consulta la [guía de conexión a PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Revisa el historial de migraciones de `supabase/migrations/` antes del primer despliegue. En especial, comprueba el soporte de las extensiones, la creación de `bookfit_runtime` y el permiso `CONNECT` que la migración inicial concede sobre la base `postgres`. Si el proyecto elegido ya contiene tablas o migraciones, compara ambos historiales antes de aplicar cambios. Para el primer lanzamiento, un proyecto vacío evita ese problema.
5. Mantén `bookfit` fuera de los esquemas expuestos por la Data API. La aplicación accede por Fastify y PostgreSQL. Si más adelante se expone una tabla al navegador, añade y prueba RLS y los permisos de cada rol antes de publicarla.

## 3. Preparar Fastify, la web y Auth

Crear el proyecto Cloud habilita la infraestructura. Para que BookFit esté listo para usuarios reales, hay que completar estos pasos de aplicación:

- **Arranque de producción.** El backend actual solo permite que `API_HOST` sea loopback. Elige un proxy en el mismo host o adapta el binding al alojamiento elegido. Define un comando de arranque de producción y verifica que el artefacto de la API esté disponible. `pnpm build` compila la web y comprueba TypeScript, pero no crea un ejecutable de Fastify.
- **Web y API.** Sirve el build de la web y configura HTTPS, el enrutado de `/api` y `APP_ORIGINS` con los orígenes reales. Si web y API usan dominios diferentes, valida CORS, cookies, CSRF y HTTPS en ese diseño.
- **Modo de producción.** Configura `NODE_ENV=production`, `BOOKFIT_DEV_PROFILES=false` y `BOOKFIT_PAYMENT_MODE=disabled`. El modo de pago real requiere una implementación aparte. Verifica que los perfiles de demo y pagos falsos estén inaccesibles.
- **Auth real.** La prueba actual de Supabase Auth es independiente del login de BookFit. Integra Auth con Fastify y la vinculación de identidades a actores de BookFit. Configura dominio de la app, URLs de retorno permitidas y correo de producción. Prueba alta, inicio y cierre de sesión, recuperación de contraseña y permisos de clientes, profesionales y gestores.
- **Conexión de ejecución.** Configura una credencial propia para `bookfit_runtime` después de crearlo mediante las migraciones. Prueba que la API puede leer y escribir lo necesario y que el rol carece de permisos de administración. El script `pnpm local:env` es exclusivo del desarrollo local.

## 4. Guardar credenciales en el lugar adecuado

| Uso                 | Ubicación                                               | Datos                                                                                                                                                             |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aplicar migraciones | Entorno protegido `production` de GitHub Actions        | Por ejemplo, `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` como secretos, y `SUPABASE_PROJECT_REF` como variable de entorno de GitHub.                         |
| Conectar Fastify    | Gestor de secretos del alojamiento                      | `DATABASE_URL` con el rol restringido, contraseña y configuración TLS.                                                                                            |
| Integrar Auth       | Configuración del servidor y, si se necesita, de la web | URL del proyecto y clave publicable para flujos públicos. Cualquier clave privilegiada permanece en el servidor y solo se configura si una operación la necesita. |

Usa credenciales distintas para cada entorno y revisa su alcance. No guardes contraseñas, tokens, claves privilegiadas ni dumps en Git, logs, artefactos del workflow o variables públicas de Vite. Valida primero que una conexión desde el servidor está apuntando al proyecto esperado usando solo datos que se puedan mostrar, como el host y el rol.

## 5. Configurar GitHub y hacer el primer despliegue

1. Mantén `quality` obligatorio para los PR. Aplica todas las migraciones en una Supabase temporal, comprueba los tipos versionados y ejecuta las pruebas sin credenciales de producción.
2. Crea un workflow separado de despliegue. Usa `push` a `main` para activarlo tras un squash and merge. El job que tiene acceso a secretos debe pertenecer al entorno `production`, restringido a `main`. Si hay una persona técnica disponible, configura su aprobación para el primer despliegue o para cambios delicados. Los PR y ramas de trabajo deben quedarse en el flujo de validación.
3. Valida el commit exacto que se va a desplegar antes de abrir la conexión de producción. Haz que el job de migración dependa de esa validación. Serializa migraciones y despliegues con un grupo de concurrencia de producción y `cancel-in-progress: false`, para que un push nuevo no interrumpa una migración iniciada. Al reintentar, comprueba que la revisión elegida sigue siendo la que quieres desplegar.
4. Instala con el lockfile y usa la CLI fijada por el repositorio. Vincula el proyecto solo dentro del runner de despliegue. Antes del primer despliegue revisa el proyecto de destino, el historial remoto y el resultado de la simulación. La secuencia de referencia, **para el futuro runner de producción**, es:

   ```bash
   pnpm exec supabase link --project-ref "$SUPABASE_PROJECT_REF"
   pnpm exec supabase db push --remote --dry-run
   # Tras revisar el plan y autorizar el despliegue:
   pnpm exec supabase db push --remote --yes
   ```

   Confirma las opciones en la CLI fijada al implementar el workflow. Deja fuera `--include-seed`. No ejecutes `db reset` contra producción. Usa un único mecanismo para aplicar migraciones, de modo que una integración adicional de Supabase no intente ejecutar los mismos cambios a la vez que GitHub Actions.

5. Tras aplicar las migraciones, comprueba que el historial remoto coincide con lo esperado. Despliega el mismo commit de la API y la web. Verifica HTTPS, salud de la API, acceso a la base con el rol restringido y recorridos críticos de autenticación y reservas con cuentas controladas. Registra el SHA desplegado y quién atendió la verificación.

Referencias oficiales: [GitHub Actions y entornos de Supabase](https://supabase.com/docs/guides/deployment/managing-environments) y [despliegue de migraciones](https://supabase.com/docs/guides/deployment/database-migrations).

## 6. Gestionar los siguientes cambios de esquema

1. Añade una migración nueva a `supabase/migrations/`. Evita editar una que ya se aplicó en producción. Usa el SQL versionado como origen de los cambios y evita cambios manuales de esquema desde el panel remoto.
2. Aplica o reconstruye el esquema local según si quieres conservar tus datos. Regenera con `pnpm supabase:types` y comprueba con `pnpm supabase:types:check`. Sube los tipos si cambiaron y describe el impacto en el PR.
3. Si se van a eliminar columnas, cambiar tipos, añadir restricciones o reescribir muchos datos, revisa bloqueos e impacto sobre datos existentes. Primero añade estructuras compatibles con ambas versiones de la app, migra los datos, cambia la aplicación y retira lo antiguo en una entrega posterior. Así puedes volver a la versión anterior de la app mientras las dos versiones sean compatibles.
4. Para personas no técnicas, conserva los checks obligatorios. Cuando haya un revisor técnico disponible, configura revisión obligatoria para cambios en migraciones, permisos, Auth y workflows. Un check verde confirma las pruebas cubiertas. La revisión técnica debe confirmar también qué permisos y datos cambia la migración.

## 7. Qué hacer si algo falla

| Fallo                                     | Acción                                                                                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Falla `quality` en el PR                  | Corrige la causa en la rama. Si difieren los tipos, regénéralos desde las migraciones locales y vuelve a subirlos.                                                                                                               |
| Falla la simulación o la migración remota | Detén el despliegue de la app. Revisa el historial y qué operaciones llegaron a aplicarse. Evita reintentar a ciegas o alterar el historial para ocultar diferencias. Prepara una migración correctiva revisada.                 |
| La migración termina, pero falla la app   | Mantén o recupera la versión anterior solo si es compatible con el esquema resultante. Revertir código o un commit de Git no revierte SQL ejecutado.                                                                             |
| Hay pérdida o corrupción de datos         | Pausa escrituras según el alcance, conserva evidencias y aplica el plan de recuperación. Valida la copia o el punto de restauración en un entorno aislado y estima los datos que podrían perderse antes de restaurar producción. |

Consulta [copias de seguridad y restauración en Supabase](https://supabase.com/docs/guides/platform/backups).

## Antes de abrir producción

- [ ] Proyecto y alojamiento definidos, con conectividad y TLS probados.
- [ ] Permisos y credenciales separados, con el esquema de BookFit privado.
- [ ] Auth real y recorridos críticos probados. Perfiles semilla y pagos falsos desactivados.
- [ ] Copias configuradas y restauración probada. Responsables y procedimiento de fallo documentados.
- [ ] GitHub confirma `quality` en el PR. El workflow de producción opera solo sobre `main`, con migraciones antes del despliegue de la app.
- [ ] Primera migración revisada, sin seeds de demo, y verificación del despliegue completada.
