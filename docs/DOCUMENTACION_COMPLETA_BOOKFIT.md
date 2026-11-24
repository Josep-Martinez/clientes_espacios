# BookFit — documentación funcional y técnica

**Estado:** primera versión local funcional  
**Alcance:** aplicación local de desarrollo; no es una plataforma de producción.

## 1. Producto y arquitectura

BookFit conecta clientes que buscan sesiones o clases de bienestar con profesionales y gestores de salas o gimnasios. La versión local conserva React, Vite y TypeScript, y añade una API Fastify y PostgreSQL levantado mediante Supabase CLI y Docker.

El navegador se comunica únicamente con `/api`. Fastify resuelve la sesión, permisos por objeto, disponibilidad, precios, retenciones, reservas, pagos simulados, preferencias, métricas y solicitudes de información. PostgreSQL conserva las reservas y el historial de pago al reiniciar la aplicación. No se usa `localStorage` para el estado de negocio.

El SDK `@supabase/supabase-js` y Supabase Auth quedan para una fase posterior. La migración ya contempla identidades externas vinculadas a actores internos. No se enlaza ni se modifica ningún proyecto de Supabase Cloud.

## 2. Perfiles semilla

El selector de perfiles locales permite probar sin registro. Los nombres y datos son sintéticos.

| Perfil | Rol | Recorrido principal |
|---|---|---|
| Nerea Soler y Alex Vidal | Cliente | Buscar servicios, revisar horarios, reservar, pagar con el simulador, ver agenda, cancelar fechas y apuntarse a clases llenas. |
| Marina Ortega, Nora Vidal, Leo Ferrer y otros perfiles | Profesional | Consultar agenda y preferencias; enviar solicitudes de información vinculadas a una reserva. |
| Gestión Senda | Gestor de espacio | Consultar reservas y métricas de los espacios asignados. |
| Leo Ferrer | Profesional y gestor | Probar la combinación de roles y comprobar que la agenda no duplica eventos. |

La exploración pública no necesita sesión. Los cambios de rol se gestionan con una sesión opaca en el servidor; la sesión de perfil semilla es solo para desarrollo local.

## 3. Flujos disponibles

### Exploración y búsqueda

La aplicación presenta el catálogo público de profesionales, servicios, clases y espacios. La búsqueda filtra la oferta y la disponibilidad se consulta al servidor. El cliente ve franjas viables, no los eventos privados ni los motivos de bloqueo del profesional.

La disponibilidad considera horarios, bloqueos, modalidad, duración, desplazamiento y margen entre citas, además de apertura, capacidad y equipamiento del espacio cuando corresponda. Las fechas se validan como fechas reales y se limitan al horizonte de reserva configurado. Se rechazan horas inexistentes o ambiguas por el cambio horario de `Europe/Madrid`.

### Reserva, retención y pago de prueba

El servidor calcula el precio a partir del servicio, fechas, plazas, modalidad y espacio. Al iniciar el checkout, crea una retención de diez minutos. Las transacciones y restricciones PostgreSQL protegen la disponibilidad de profesionales, salas y plazas ante solicitudes simultáneas.

El proveedor `FakePaymentProvider` permite simular éxito, fallo y caducidad. Los intentos y eventos se guardan en la base de datos y se procesan de manera idempotente. El cliente puede reintentar sin duplicar el cobro simulado ni la reserva. Las reservas confirmadas permanecen después de reiniciar la aplicación. No se recogen datos de tarjeta.

Las rutas de perfiles semilla y pagos falsos no están disponibles en producción; el servidor rechaza el arranque si se intenta habilitarlos con `NODE_ENV=production`. El contrato del proveedor deja preparado el límite para una integración futura con Stripe.

### Agenda, cancelación y lista de espera

Cada rol ve únicamente sus objetos autorizados: el cliente sus reservas, el profesional sus citas y el gestor las de sus espacios. La cuenta con doble rol ve la unión deduplicada. La cancelación afecta a la fecha elegida y libera solo los recursos de esa ocurrencia; no elimina la asignación permanente del profesional a una clase.

La lista de espera solo acepta inscripciones cuando la clase está llena. No reserva plaza ni inicia un cobro. El servidor vuelve a comprobar el aforo dentro de una transacción.

### Preferencias y métricas

Los profesionales pueden consultar y actualizar sus preferencias de modalidad, zona base, radio, desplazamiento y margen. Los gestores consultan métricas de sus espacios; la API limita cada consulta a los espacios asociados a su actor.

### Solicitudes de información unidireccionales

Solo el profesional puede crear una solicitud para el cliente de una reserva o para el gestor del espacio relacionado con esa reserva. El servidor deriva quién envía y quién recibe a partir de la sesión y la reserva; no acepta destinatarios arbitrarios. El destinatario solo puede leer y marcar como leída la solicitud. No hay respuesta, conversación ni chat.

## 4. API local

Todas las rutas se sirven bajo `/api` a través de Fastify. Las rutas de mutación exigen sesión cuando corresponde, validación de origen y token CSRF. El servidor valida cuerpos y parámetros antes de ejecutar consultas parametrizadas.

| Área | Rutas principales |
|---|---|
| Sesión y perfiles locales | `GET /api/me`, `GET /api/csrf`, `GET /api/dev/profiles`, `POST /api/dev/session`, `DELETE /api/dev/session` |
| Catálogo y disponibilidad | `GET /api/catalog`, `GET /api/classes`, `GET /api/classes/:id`, `GET /api/availability` |
| Reservas | `POST /api/checkouts`, `POST /api/dev/checkouts/:id/pay`, `GET /api/agenda`, `GET /api/bookings/:id`, `POST /api/occurrences/:id/cancel`, `POST /api/classes/:id/waitlist` |
| Preferencias y espacios | `GET/PATCH /api/professional/preferences`, `GET /api/my-spaces`, `GET /api/my-spaces/:id/metrics` |
| Solicitudes | `GET/POST /api/information-requests`, `PATCH /api/information-requests/:id/read` |

La ruta de pago de prueba se habilita solo con la configuración local prevista para desarrollo.

## 5. Datos y seguridad

La migración crea el esquema privado `bookfit`, fuera de los esquemas expuestos por la Data API. Modela actores, roles, identidades futuras, sesiones de desarrollo, profesionales, preferencias, servicios, ubicaciones, espacios, horarios, clases, pedidos, retenciones, reservas, plazas, pagos, listas de espera, solicitudes y auditoría.

La credencial administrativa se utiliza para las migraciones y la creación del rol de ejecución. La API usa el rol `bookfit_runtime`, cuya conexión real se guarda en `.env.local` ignorado por Git y no se envía al cliente. `.env.example` solo contiene valores de ejemplo. Los servicios de desarrollo se enlazan a `127.0.0.1`.

Además de los permisos por objeto, la API aplica cookies de sesión `HttpOnly` y `SameSite`, CSRF y validación del origen en mutaciones, límites de frecuencia, límites de tamaño, cabeceras de seguridad y errores que no exponen SQL ni secretos. El acceso directo desde Supabase Auth o la Data API no forma parte de esta versión.

Los datos, perfiles, comisiones y pagos son de prueba. No introduzcas datos personales, información sanitaria, credenciales reales de acceso a espacios ni datos financieros.

## 6. Instalación, arranque y comprobaciones

Desde la raíz del repositorio:

```bash
pnpm install
pnpm local:start
pnpm exec supabase status
pnpm exec supabase db reset --local
pnpm local:env
pnpm dev
```

`local:start` prepara la red Docker de BookFit con puertos publicados solo en loopback y arranca Supabase. `db reset --local` borra y reconstruye la base local de BookFit con `supabase/migrations/` y `supabase/seed.sql`; no enlaza ni ejecuta cambios contra Cloud. `local:env` crea `.env.local` con la URL de PostgreSQL local y una contraseña aleatoria del rol `bookfit_runtime`.

Abre <http://127.0.0.1:5173>. Para detener la aplicación, usa `Ctrl+C`. Para detener Supabase sin borrar los datos y volver a arrancarlo, ejecuta:

```bash
pnpm exec supabase stop
pnpm local:start
pnpm dev
```

Para restablecer solo los datos de desarrollo y volver a cargar las semillas, utiliza `pnpm exec supabase db reset --local` y después `pnpm local:env`.

Comprobaciones disponibles:

```bash
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Las pruebas de integración necesitan Supabase local arrancado, migraciones y semillas aplicadas, y `.env.local` generado. Cubren permisos, solicitudes, CSRF, idempotencia de pagos, reservas y concurrencia.

## 7. Fuera del alcance de esta fase

Quedan para iteraciones futuras Supabase Auth, identidades verificadas, pagos reales con Stripe, reembolsos y liquidaciones, políticas comerciales definitivas y despliegue público. Antes de operar con personas reales habrá que revisar privacidad, obligaciones legales, fiscalidad, seguridad y recuperación de copias.

---

**Mantenimiento:** actualizar este documento junto con la API, las migraciones y la interfaz cuando cambien los flujos locales de BookFit.
