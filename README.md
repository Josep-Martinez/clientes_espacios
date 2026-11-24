# BookFit · reservas de bienestar

BookFit conecta a clientes, profesionales de bienestar y gestores de espacios. Esta primera versión funcional conserva la interfaz React y usa una API Fastify local, PostgreSQL gestionado por Supabase CLI y perfiles semilla; los pagos se simulan dentro del servidor.

La API es la autoridad para sesión, permisos, disponibilidad, precio, retenciones, reservas y pagos. La interfaz llama a `/api` mediante el proxy local de Vite. No se usa Supabase Auth ni `@supabase/supabase-js` todavía; el esquema ya permite enlazar identidades en una fase posterior.

Consulta el [plan funcional y técnico de BookFit](docs/implementacion/PLAN_BOOKFIT_V1.md) y la [documentación del producto](docs/DOCUMENTACION_COMPLETA_BOOKFIT.md).

## Requisitos

- Node.js 20.19 o posterior.
- pnpm 12.15 o compatible.
- Docker Desktop iniciado.
- Puerto 55432 disponible para PostgreSQL local.

## Instalación y primer arranque

Desde la raíz del repositorio:

```bash
pnpm install
pnpm local:start
pnpm exec supabase status
pnpm exec supabase db reset --local
pnpm local:env
pnpm dev
```

`db reset --local` aplica las migraciones de `supabase/migrations/` y carga `supabase/seed.sql`. Si Supabase muestra las credenciales por defecto en el estado local, no las copies a Vite: `pnpm local:env` crea una contraseña aleatoria para el rol SQL de ejecución `bookfit_runtime` y guarda la URL en `.env.local`, ignorado por Git y con permisos de solo propietario. La credencial administrativa de migración se usa solo para configurar ese rol y no se guarda en el archivo.

La API y Vite se enlazan a `127.0.0.1`. Abre <http://127.0.0.1:5173>. El selector local permite probar clientes, profesionales, gestores y una cuenta con doble rol, sin registro.

El proyecto Supabase local tiene el identificador `bookfit-v1-local` y puertos propios. `pnpm local:start` crea o valida una red Docker con publicación de puertos limitada a `127.0.0.1` y luego ejecuta `pnpm exec supabase start --network-id bookfit-local`. Así no comparte los nombres de contenedor ni los puertos de otra instancia local del repositorio. No ejecutes `supabase link`, `db push` ni comandos contra Supabase Cloud en esta fase.

## Uso habitual

```bash
pnpm local:start
pnpm dev
```

Para volver a aplicar migraciones y regenerar los datos semilla de BookFit:

```bash
pnpm exec supabase db reset --local
pnpm local:env
```

El reset elimina los datos de la base local identificada como `bookfit-v1-local`. No lo ejecutes si quieres conservar los datos de BookFit de esa instancia. Tras un reset hay que volver a ejecutar `pnpm local:env`, porque el rol de runtime se crea de nuevo.

Para reiniciar solo la aplicación, detén `pnpm dev` con `Ctrl+C` y vuelve a iniciarlo. PostgreSQL conserva las reservas pagadas. Para detener y reanudar Supabase sin resetear la base:

```bash
pnpm exec supabase stop
pnpm local:start
```

## Comprobaciones

```bash
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Las pruebas de integración requieren Supabase local iniciado, migraciones y seeds aplicadas y `.env.local` generado. Comprueban aislamiento de roles, CSRF, reservas, pago idempotente, cancelación, lista de espera y concurrencia sobre las plazas y recursos.

## Desarrollo posterior

`BOOKFIT_DEV_PROFILES` y `BOOKFIT_PAYMENT_MODE=fake` solo se permiten en desarrollo. El servidor rechaza perfiles semilla o pagos falsos cuando `NODE_ENV=production`. No se capturan datos de tarjeta. El contrato del proveedor de pagos permite integrar Stripe más adelante; autenticación real se incorporará mediante identidades externas asociadas a los actores internos.
