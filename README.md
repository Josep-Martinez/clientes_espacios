# BuqFit · reservas de bienestar

BuqFit conecta a clientes, profesionales de bienestar y gestores de espacios. Esta primera versión funcional conserva la interfaz React y usa una API Fastify local, PostgreSQL gestionado por Supabase CLI y perfiles semilla; los pagos se simulan dentro del servidor.

La API es la autoridad para sesión, permisos, disponibilidad, precio, retenciones, reservas y pagos. La interfaz llama a `/api` mediante el proxy local de Vite. No se usa Supabase Auth ni `@supabase/supabase-js` todavía; el esquema ya permite enlazar identidades en una fase posterior.

Consulta el [plan funcional y técnico de BuqFit](docs/implementacion/PLAN_BUQFIT_V1.md) y la [documentación del producto](docs/DOCUMENTACION_COMPLETA_BUQFIT.md).

## Requisitos

- Node.js 20.19 o posterior.
- pnpm 12.15 o compatible.
- Docker Desktop iniciado.
- Puerto 55432 disponible para PostgreSQL local.

## Instalación y primer arranque

Desde la raíz del repositorio:

```bash
pnpm install --frozen-lockfile
pnpm local:start
pnpm exec supabase db reset --local
pnpm local:env
pnpm dev
```

`pnpm dev` reutiliza la API o la web de BuqFit si ya están sanas en los puertos configurados. Si ambos servicios ya estaban activos, vuelve al prompt y los deja disponibles; para cerrarlos, usa el terminal donde arrancaron esos procesos.

`db reset --local` aplica las migraciones de `supabase/migrations/` y carga `supabase/seed.sql`. Al ejecutar `pnpm dev` por primera vez, BuqFit crea automáticamente `.env.local` si falta: genera una contraseña aleatoria para el rol SQL de ejecución `buqfit_runtime` y guarda la URL solo en ese archivo, ignorado por Git y con permisos de solo propietario. La credencial administrativa de migración se usa únicamente para configurar ese rol y no se guarda en el archivo. No copies credenciales de Supabase a variables `VITE_*`.

La API y Vite se enlazan a `127.0.0.1`. Abre <http://127.0.0.1:5173>. El selector local permite probar clientes, profesionales, gestores y una cuenta con doble rol, sin registro.

El identificador del proyecto y la red Docker locales se mantienen estables (`bookfit-v1-local` y `bookfit-local`) para reutilizar el volumen PostgreSQL que ya existe. Cambiarlos seleccionaría otra instancia local. La red publica puertos solo en `127.0.0.1`. No ejecutes `supabase link`, `db push` ni comandos contra Supabase Cloud en esta fase.

## Uso habitual

```bash
pnpm local:start
pnpm dev
```

Para reconstruir la base local desde las migraciones y regenerar los datos semilla de BuqFit:

```bash
pnpm exec supabase db reset --local
pnpm local:env
```

El reset borra los datos locales. Si quieres aplicar solo migraciones pendientes y conservar los datos actuales, usa:

```bash
pnpm exec supabase migration up --local
```

El reset elimina los datos de la base local. No lo ejecutes si quieres conservar las reservas y datos actuales. Si ya existía `.env.local`, el reset también elimina el rol SQL que contiene; después del reset vuelve a ejecutar `pnpm local:env` una vez antes de `pnpm dev`.

### Actualizar una instalación local existente

La migración de nombre conserva los datos existentes. No uses `db reset` para esta actualización:

```bash
pnpm local:start
pnpm exec supabase migration up --local
pnpm local:env
pnpm supabase:types
pnpm dev
```

La migración renombra el esquema y el rol SQL; `pnpm local:env` vuelve a escribir `.env.local` con el nombre de rol nuevo. Reinicia los procesos anteriores de la aplicación para que carguen el esquema BuqFit.

Para reiniciar solo la aplicación, detén `pnpm dev` con `Ctrl+C` y vuelve a iniciarlo. PostgreSQL conserva las reservas pagadas. Para detener y reanudar Supabase sin resetear la base:

```bash
pnpm exec supabase stop
pnpm local:start
```

## Comprobaciones

```bash
pnpm supabase:types
pnpm quality:check
```

`pnpm supabase:types` genera `src/types/database.types.ts` desde la base local y el esquema `buqfit`; no edites ese archivo a mano. El quality gate común comprueba formato, ESLint (incluida la prohibición de `any`), sincronización de tipos, TypeScript, pruebas unitarias, integración y pgTAP, build, dependencias y secretos. `pnpm test:db` requiere Supabase local con migraciones y seeds aplicadas. Para ejecutar solo una parte:

Las pruebas no se ejecutan al arrancar BuqFit con `pnpm dev` ni al iniciar Supabase con `pnpm local:start`. En local solo corren al invocar `pnpm test`, `pnpm test:integration`, `pnpm test:db` o `pnpm quality:check`. En GitHub Actions, `quality` se ejecuta para cada pull request y push.

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

`BUQFIT_DEV_PROFILES` y `BUQFIT_PAYMENT_MODE=fake` solo se permiten en desarrollo. El servidor rechaza perfiles semilla o pagos falsos cuando `NODE_ENV=production`. No se capturan datos de tarjeta. El contrato del proveedor de pagos permite integrar Stripe más adelante; autenticación real se incorporará mediante identidades externas asociadas a los actores internos.
