# BookFit · reservas de bienestar

BookFit conecta a clientes, profesionales de bienestar y gestores de espacios. Esta primera versión funcional conserva la interfaz React y usa una API Fastify local, PostgreSQL gestionado por Supabase CLI y perfiles semilla; los pagos se simulan dentro del servidor.

La API es la autoridad para la sesión de demo, permisos, disponibilidad, precio, retenciones, reservas y pagos. La interfaz llama a `/api` mediante el proxy local de Vite. El selector de perfiles semilla sigue siendo el acceso de la aplicación; Supabase Auth local está habilitado para probar el ciclo real de registro, inicio y cierre de sesión sin conectarse a la aplicación ni a una instancia hospedada. No hay ningún cliente `@supabase/supabase-js`: el navegador no consulta directamente las tablas de BookFit.

Consulta el [plan funcional y técnico de BookFit](docs/implementacion/PLAN_BOOKFIT_V1.md) y la [documentación del producto](docs/DOCUMENTACION_COMPLETA_BOOKFIT.md).

## Requisitos

- Node.js 20.19 o posterior.
- pnpm 12.15.0 (la versión está fijada en `package.json`).
- Docker Desktop instalado y arrancado (o Docker Engine en Linux).
- Puertos locales disponibles: PostgreSQL `55432`, API Supabase/Auth `55431`, Mailpit `55434` (SMTP `55435`), API BookFit `3001` y web `5173`.

Instala Node.js y Docker Desktop para tu sistema operativo. Después instala pnpm 12.15.0. Si tu instalación de Node incluye Corepack:

```bash
corepack enable
corepack prepare pnpm@12.15.0 --activate
```

Si `corepack` no está disponible, instala pnpm con `npm install --global pnpm@12.15.0`. Comprueba que Docker está activo con `docker info` y que las herramientas están disponibles:

```bash
node --version
pnpm --version
docker --version
```

## Instalación y primer arranque

Clona el repositorio, abre una terminal en su carpeta raíz y ejecuta:

Si ya tienes una instancia local con datos, **no ejecutes `db reset`**. Arranca la pila, aplica las migraciones pendientes con `pnpm exec supabase migration up --local` y vuelve a generar `.env.local`. El reset borra las reservas y cambios guardados; úsalo solo tras hacer una copia o confirmar que la base es descartable.

```bash
pnpm install --frozen-lockfile
pnpm local:start
pnpm exec supabase db reset --local
pnpm local:env
pnpm dev
```

Si Supabase ya estaba iniciado antes de habilitar Auth y Mailpit, reinicia los servicios para que carguen la configuración nueva sin reconstruir los datos:

```bash
pnpm exec supabase stop
pnpm local:start
pnpm exec supabase migration up --local
pnpm local:env
```

El primer `pnpm local:start` descarga las imágenes necesarias de Supabase y puede tardar varios minutos. Este comando prepara la red Docker local y ejecuta la CLI del proyecto con `supabase start`. Usa este comando para iniciar la pila: BookFit publica sus servicios solo en `127.0.0.1` y usa puertos propios. No hace falta instalar Supabase CLI globalmente.

`db reset --local` aplica las migraciones de `supabase/migrations/` y carga `supabase/seed.sql`. `pnpm local:env` genera `.env.local`: crea una contraseña aleatoria para el rol SQL de ejecución `bookfit_runtime`, guarda la URL solo en ese archivo (ignorado por Git y con permisos de solo propietario) y configura el rol mediante la biblioteca `pg` del proyecto. La credencial administrativa de migración no se guarda en el archivo. No copies credenciales a variables `VITE_*`.

El paso `pnpm local:env` es necesario tras el primer reset porque el reset recrea los roles de la base. En el primer arranque, `pnpm dev` también genera `.env.local` automáticamente si falta; se recomienda ejecutar el paso explícito para que quede claro cuándo se configura la conexión de la API.

Cuando la terminal muestre que Vite y la API están disponibles, abre <http://127.0.0.1:5173>. La API está en <http://127.0.0.1:3001>. El selector local permite probar clientes, profesionales, gestores y una cuenta con doble rol, sin registro. El Auth local de Supabase usa la API en <http://127.0.0.1:55431>; los correos de prueba, si se activan, quedan en Mailpit en <http://127.0.0.1:55434>.

El proyecto local tiene el identificador `bookfit-v1-local`. `pnpm local:start` crea o valida la red Docker `bookfit-local` con publicación de puertos limitada a loopback y luego ejecuta `pnpm exec supabase start --network-id bookfit-local`. Por eso se recomienda usar `pnpm local:start` en lugar de ejecutar `supabase start` globalmente: usa la CLI fijada por el proyecto y la red local esperada. No ejecutes `supabase link`, `db push` ni comandos contra Supabase Cloud para el desarrollo local.

## Iniciar cada día

Abre una terminal en la carpeta raíz. Primero inicia o reanuda Supabase local:

```bash
pnpm local:start
```

No borra ni reinicia la base; conserva reservas, perfiles y datos locales. Si la base ya está activa, el comando la reutiliza. Luego, en esa misma terminal o en otra terminal abierta en la raíz del proyecto, inicia BookFit:

```bash
pnpm dev
```

Mantén esa terminal abierta mientras uses la aplicación. Detén la aplicación con `Ctrl+C`. Supabase puede quedarse en ejecución. Para parar también la base sin borrar sus datos, abre otra terminal en la raíz y ejecuta:

```bash
pnpm exec supabase stop
```

La próxima vez, vuelve a ejecutar `pnpm local:start` y `pnpm dev`. No hace falta reinstalar dependencias, volver a ejecutar `db reset` ni regenerar `.env.local` en el uso diario.

## Abrir la base de datos local

La aplicación usa PostgreSQL local en `127.0.0.1:55432`. Puedes conectarte con un cliente gráfico PostgreSQL como DBeaver, pgAdmin, TablePlus o similar usando estos datos:

| Campo         | Valor       |
| ------------- | ----------- |
| Tipo          | PostgreSQL  |
| Host          | `127.0.0.1` |
| Puerto        | `55432`     |
| Base de datos | `postgres`  |
| Usuario       | `postgres`  |
| Contraseña    | `postgres`  |
| SSL           | Desactivado |

Inicia antes Supabase con `pnpm local:start`; el cliente gráfico no puede conectarse si la base está detenida. Las tablas de BookFit están en el esquema `bookfit`. Para inspeccionar la base con permisos de administrador, usa la conexión anterior. La API usa el usuario restringido `bookfit_runtime`; su URL y contraseña se guardan en `.env.local` y no se deben copiar ni compartir.

También puedes ver el estado de los servicios con:

```bash
pnpm exec supabase status
```

El estado de la CLI muestra claves locales. No copies esa salida en chats, tickets ni variables `VITE_*`. Los scripts locales leen las claves en memoria y no las imprimen ni las guardan.

## Migraciones, datos y reinicios

Para aplicar migraciones pendientes y conservar los datos actuales:

```bash
pnpm exec supabase migration up --local
```

Para reconstruir una base local descartable desde cero y volver a cargar los datos de ejemplo:

```bash
pnpm exec supabase db reset --local
pnpm local:env
```

**`db reset` elimina todos los datos locales**, incluidas reservas y cambios hechos desde la interfaz, y recrea los roles SQL. Antes de ejecutarlo en una instancia existente, haz una copia o confirma que los datos son descartables. Para aplicar migraciones sin reconstruir la base usa `pnpm exec supabase migration up --local`. Después del reset vuelve a ejecutar `pnpm local:env` antes de iniciar la API. Reiniciar solo `pnpm dev` no borra datos.

## Comprobaciones

```bash
pnpm install --frozen-lockfile
pnpm supabase:types
pnpm supabase:types:check
pnpm quality:check
```

`pnpm supabase:types` genera la fuente canónica `src/types/database.types.ts` desde la base local y el esquema `bookfit`; no edites ese archivo a mano. `server/database-types.ts` lo importa y proyecta tipos del backend, no mantiene una copia. El quality gate común comprueba formato, ESLint (incluida la prohibición de `any`), sincronización de tipos, TypeScript, pruebas unitarias, integración, pgTAP, Auth local, build, dependencias y secretos. `pnpm test:db`, `pnpm supabase:types:check` y `pnpm test:auth:local` requieren Supabase local con migraciones y seeds aplicadas.

Las pruebas de integración crean una base temporal en la instancia PostgreSQL local, aplican las migraciones y seeds versionados, ejecutan los recorridos y eliminan esa base al terminar. No leen ni modifican las reservas de la base `postgres` de desarrollo. El rol de ejecución se toma de `.env.local`; el script rechaza cualquier host que no sea loopback.

Para probar el ciclo de Supabase Auth local:

```bash
pnpm test:auth:local
```

El test registra un usuario aleatorio de `example.test`, inicia sesión con contraseña, comprueba el cierre de sesión y que la clave pública no puede consultar el esquema privado `bookfit`; elimina el usuario temporal aunque falle un paso posterior. El test usa las claves que entrega la CLI de la instancia local solo en memoria. La app BookFit aún mantiene su selector de perfiles semilla y sus sesiones Fastify.

El esquema `bookfit` no está incluido en los esquemas expuestos por la API de Supabase y sus permisos se revocan a `anon` y `authenticated`; las pruebas SQL verifican ambas barreras. No se habilita RLS para estas tablas porque ningún cliente de navegador las consulta: las operaciones de negocio pasan por Fastify con el rol de base restringido y autorización por objeto. Si más adelante se expone una tabla al navegador, deberá incorporarse RLS y sus pruebas antes de añadirla a los esquemas de la API.

Auth local mantiene desactivada la confirmación por correo para que el smoke test sea reproducible. Para probar mensajes, activa `auth.email.enable_confirmations` en `supabase/config.toml`, detén y vuelve a iniciar la pila, registra el usuario manualmente y abre <http://127.0.0.1:55434>. Mailpit captura los correos localmente y no los envía a destinatarios externos. Desactiva de nuevo la confirmación para ejecutar `pnpm test:auth:local`.

El entorno de ejemplo no contiene una URL de Supabase hospedada ni claves. El único `DATABASE_URL` de desarrollo se genera en `.env.local`, está ignorado por Git y el backend exige loopback fuera de producción; el bundle del navegador no recibe URLs ni claves de Supabase. Esta fase no configura staging o producción. Cuando se añadan, usa proyectos separados, almacena las claves en el gestor de secretos, conserva las claves secretas solo en backend, aplica migraciones revisadas sin seeds demo y valida Auth, redirecciones y RLS primero en local o staging.

Las pruebas no se ejecutan al arrancar BookFit con `pnpm dev` ni al iniciar Supabase con `pnpm local:start`. En local solo corren al invocar `pnpm test`, `pnpm test:integration`, `pnpm test:db`, `pnpm test:auth:local` o `pnpm quality:check`. En GitHub Actions, `quality` se ejecuta para cada pull request y push.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:db
pnpm test:auth:local
pnpm build
pnpm security:check
```

Las pruebas de integración comprueban aislamiento de roles, CSRF, reservas, pago idempotente, cancelación, lista de espera y concurrencia sobre plazas y recursos. Si Supabase local no está disponible o falta `.env.local`, fallan; no se omiten en el quality gate. CI crea su propia Supabase local efímera y no necesita credenciales de nube.

Las migraciones locales se aplican con `supabase migration up --local` o se reconstruyen con `supabase db reset --local`. `supabase db push` publica migraciones en el proyecto remoto enlazado; no uses `supabase link` ni `db push` para el ciclo de desarrollo local. El smoke test de Auth local verifica el proveedor local real; el login de la aplicación continúa con perfiles semilla. La integración de Auth con cuentas BookFit se hará más adelante contra un proyecto de staging separado.

## Desarrollo posterior

`BOOKFIT_DEV_PROFILES` y `BOOKFIT_PAYMENT_MODE=fake` solo se permiten en desarrollo. El servidor rechaza perfiles semilla o pagos falsos cuando `NODE_ENV=production`. No se capturan datos de tarjeta. El contrato del proveedor de pagos permite integrar Stripe más adelante; autenticación real se incorporará mediante identidades externas asociadas a los actores internos.

## Migraciones en las ramas y los PR

Puedes hacer commit y push con Supabase local apagado. Si has activado el hook con `git config --local core.hooksPath .githooks`, solo recibirás un recordatorio cuando el commit incluya migraciones.

El check obligatorio `quality` arranca una base temporal en GitHub para cada actualización del PR y cada push a `main`, aplica las migraciones, regenera los tipos y compara el resultado con el archivo versionado. El PR muestra los resultados de «Rellenar descripción del PR» y «Migraciones, tipos y pruebas» por separado. El resultado obligatorio `quality` reúne ambos. Si los tipos difieren, el paso «Comprobar tipos de Supabase versionados» indica cómo resolverlo y el PR queda bloqueado. Para corregirlo, aplica las migraciones en Supabase local (o reconstruye tu base si es descartable), ejecuta `pnpm supabase:types` y sube el resultado en otro commit. Las migraciones que no cambian los tipos pueden pasar sin modificar el archivo generado.

## Despliegue futuro de migraciones

Cuando exista un proyecto de producción, configura un workflow de despliegue separado que arranque tras integrar cambios en `main`. Conviene validar la revisión exacta que va a desplegarse, ensayar la migración primero en staging y serializar las ejecuciones de producción. Guarda las credenciales en el entorno protegido de GitHub y aplica las migraciones pendientes con la CLI fijada, sin incluir seeds de demo. El despliegue de la aplicación debe esperar a que la migración termine correctamente. Consulta la [guía de Supabase para separar entornos](https://supabase.com/docs/guides/deployment/managing-environments).
