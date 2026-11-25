# BookFit · reservas de bienestar

BookFit conecta a clientes, profesionales de bienestar y gestores de espacios. Esta primera versión funcional conserva la interfaz React y usa una API Fastify local, PostgreSQL gestionado por Supabase CLI y perfiles semilla; los pagos se simulan dentro del servidor.

La API es la autoridad para sesión, permisos, disponibilidad, precio, retenciones, reservas y pagos. La interfaz llama a `/api` mediante el proxy local de Vite. No se usa Supabase Auth ni `@supabase/supabase-js` todavía; el esquema ya permite enlazar identidades en una fase posterior.

Consulta el [plan funcional y técnico de BookFit](docs/implementacion/PLAN_BOOKFIT_V1.md) y la [documentación del producto](docs/DOCUMENTACION_COMPLETA_BOOKFIT.md).

## Requisitos

- Node.js 20.19 o posterior.
- pnpm 12.15.0 (la versión está fijada en `package.json`).
- Docker Desktop instalado y arrancado (o Docker Engine en Linux).
- Puertos locales disponibles: PostgreSQL `55432`, API `3001` y web `5173`.

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

```bash
pnpm install --frozen-lockfile
pnpm local:start
pnpm exec supabase db reset --local
pnpm local:env
pnpm dev
```

El primer `pnpm local:start` descarga las imágenes necesarias de Supabase y puede tardar varios minutos. Este comando prepara la red Docker local y ejecuta la CLI del proyecto con `supabase start`. Usa este comando para iniciar la base: así BookFit publica PostgreSQL solo en `127.0.0.1` y usa sus puertos propios. No hace falta instalar Supabase CLI ni `psql` globalmente.

`db reset --local` aplica las migraciones de `supabase/migrations/` y carga `supabase/seed.sql`. `pnpm local:env` genera `.env.local`: crea una contraseña aleatoria para el rol SQL de ejecución `bookfit_runtime`, guarda la URL solo en ese archivo (ignorado por Git y con permisos de solo propietario) y configura el rol mediante la biblioteca `pg` del proyecto. La credencial administrativa de migración no se guarda en el archivo. No copies credenciales a variables `VITE_*`.

El paso `pnpm local:env` es necesario tras el primer reset porque el reset recrea los roles de la base. En el primer arranque, `pnpm dev` también genera `.env.local` automáticamente si falta; se recomienda ejecutar el paso explícito para que quede claro cuándo se configura la conexión de la API.

Cuando la terminal muestre que Vite y la API están disponibles, abre <http://127.0.0.1:5173>. La API está en <http://127.0.0.1:3001>. El selector local permite probar clientes, profesionales, gestores y una cuenta con doble rol, sin registro.

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

## Migraciones, datos y reinicios

Para aplicar migraciones pendientes y conservar los datos actuales:

```bash
pnpm exec supabase migration up --local
```

Para reconstruir la base desde cero y volver a cargar los datos de ejemplo:

```bash
pnpm exec supabase db reset --local
pnpm local:env
```

**`db reset` elimina todos los datos locales**, incluidas reservas y cambios hechos desde la interfaz, y recrea los roles SQL. Úsalo solo cuando quieras empezar desde cero. Después del reset vuelve a ejecutar `pnpm local:env` antes de iniciar la API. Reiniciar solo `pnpm dev` no borra datos.

## Comprobaciones

```bash
pnpm supabase:types
pnpm quality:check
```

`pnpm supabase:types` genera `src/types/database.types.ts` desde la base local y el esquema `bookfit`; no edites ese archivo a mano. El quality gate común comprueba formato, ESLint (incluida la prohibición de `any`), sincronización de tipos, TypeScript, pruebas unitarias, integración y pgTAP, build, dependencias y secretos. `pnpm test:db` requiere Supabase local con migraciones y seeds aplicadas. Para ejecutar solo una parte:

Las pruebas no se ejecutan al arrancar BookFit con `pnpm dev` ni al iniciar Supabase con `pnpm local:start`. En local solo corren al invocar `pnpm test`, `pnpm test:integration`, `pnpm test:db` o `pnpm quality:check`. En GitHub Actions, `quality` se ejecuta para cada pull request y push.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:db
pnpm build
pnpm security:check
```

Las pruebas de integración requieren Supabase local iniciado, migraciones y seeds aplicadas y `.env.local` generado. Comprueban aislamiento de roles, CSRF, reservas, pago idempotente, cancelación, lista de espera y concurrencia sobre las plazas y recursos. El quality gate las marca como obligatorias: si no hay base local loopback, falla en lugar de omitirlas. CI crea su propia Supabase local efímera y no necesita credenciales de nube.

Las migraciones locales se aplican con `supabase migration up --local` o se reconstruyen con `supabase db reset --local`. `supabase db push` publica migraciones en el proyecto remoto enlazado; no uses `supabase link` ni `db push` para el ciclo de desarrollo local. La autenticación actual es el selector de perfiles semilla con sesión local de servidor, no Supabase Auth. Así se pueden probar permisos y recorridos de clientes, profesionales, gestores y doble rol; el login real con un proveedor se integrará más adelante contra un proyecto separado de pruebas antes de elegir la base definitiva.

## Desarrollo posterior

`BOOKFIT_DEV_PROFILES` y `BOOKFIT_PAYMENT_MODE=fake` solo se permiten en desarrollo. El servidor rechaza perfiles semilla o pagos falsos cuando `NODE_ENV=production`. No se capturan datos de tarjeta. El contrato del proveedor de pagos permite integrar Stripe más adelante; autenticación real se incorporará mediante identidades externas asociadas a los actores internos.
