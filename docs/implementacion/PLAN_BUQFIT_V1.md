# BuqFit funcional · primera iteración

## 1. Entrega y arquitectura

Convertir la demo en una aplicación con persistencia y reglas del servidor. La primera entrega se ejecuta en un solo ordenador con datos semilla, perfiles de prueba y pagos falsos. Conserva React, Vite y el diseño actual. Añade una API Node.js/TypeScript con Fastify y un PostgreSQL local mediante Supabase CLI y Docker. El frontend llama a /api mediante el proxy de Vite. La API decide permisos, disponibilidad, importes y transiciones. PostgreSQL garantiza la integridad incluso cuando dos peticiones llegan a la vez.

En producción, propuesta de alojamiento: Supabase administrado en Frankfurt para PostgreSQL y Supabase Auth, y un servicio Node en Render Frankfurt que sirva también el build de Vite para compartir origen con /api. Separar desarrollo, pruebas y producción. Confirmar región, conectividad, capacidad de restauración, plan de copias y costes antes de contratar. Los dos proveedores están en redes distintas. Exigir TLS con verificación de certificado y verificar conexión directa o pooler de sesión según la conectividad del servidor. Las migraciones deben funcionar en local y en el entorno administrado. Mantener el esquema de negocio fuera de la Data API, sin permisos a anon/authenticated/PUBLIC. Usar credenciales distintas para migraciones y runtime, con permisos mínimos. Reusar Supabase Auth en la segunda iteración mediante una identidad externa asociada al actor interno.

## 2. Herramientas y repositorios

| Herramienta | Uso | Fuente oficial |
|---|---|---|
| React, Vite, TypeScript, pnpm | Mantener interfaz, build y dependencias | [Vite](https://github.com/vitejs/vite) |
| Fastify y JSON Schema | HTTP, validación de entrada y serialización de respuestas | [Fastify](https://github.com/fastify/fastify) |
| node-postgres | SQL parametrizado y transacciones en una misma conexión | [Repositorio](https://github.com/brianc/node-postgres) · [Transacciones](https://node-postgres.com/features/transactions) |
| Supabase CLI y Docker | Postgres local reproducible y migraciones SQL | [Repositorio](https://github.com/supabase/cli) · [Guía local](https://supabase.com/docs/guides/local-development) |
| Supabase alojado y Auth | Base y cuentas reales en la fase siguiente | [Repositorio](https://github.com/supabase/supabase) · [SDK](https://github.com/supabase/supabase-js) · [Regiones](https://supabase.com/docs/guides/platform/regions) |
| Render | Opción de alojamiento del servidor y del frontend compilado | [Servicios web](https://render.com/docs/web-services) |
| Stripe Checkout, Connect y SDK Node | Fases posteriores de cobro, onboarding y reparto | [SDK](https://github.com/stripe/stripe-node) · [Ejemplo de pago único](https://github.com/stripe-samples/checkout-one-time-payments) · [Connect](https://docs.stripe.com/connect/separate-charges-and-transfers) |
| Node test runner | Pruebas unitarias e integración de API y base de datos | [Node.js](https://nodejs.org/api/test.html) |
| Dependabot y CI | Dependencias, comprobaciones y prevención de regresiones | [Dependabot](https://docs.github.com/en/code-security/dependabot) |

Instalar dependencias oficiales con versión fijada en el lockfile. Los repos anteriores son componentes y referencias, no una certificación del producto. Usar el ejemplo de Stripe como referencia de Checkout, sin asumir que cubre Connect ni todas las obligaciones de un marketplace. Antes de copiar código, revisar licencia, releases, compatibilidad y avisos de seguridad. No hace falta incorporar un repositorio de chat, un calendario externo ni un marketplace prefabricado.

## 3. Modelo de datos

UUID para entidades, céntimos enteros y moneda EUR en v1, timestamps UTC con timestamptz y zona de negocio Europe/Madrid para horarios semanales. Intervalos [inicio, fin). Validar fechas inexistentes o ambiguas por cambios de hora.

| Entidades | Contenido y restricciones principales |
|---|---|
| actors, actor_roles, auth_identities | Actor estable, roles cliente/profesional/gestor, identidad futura única por proveedor y subject. Las personas semilla carecen de identidad real. |
| dev_sessions | Identificador opaco almacenado como hash, actor, caducidad y revocación. |
| professionals, professional_preferences, services, locations | Perfil público separado de base privada, radio, margen, desplazamiento, modalidades, duración, tarifa y requisitos de equipo. |
| spaces, space_memberships, space_opening_hours, space_blocks | Inventario, autorización de gestores, capacidad, tarifa, equipamiento, franjas y excepciones. Instrucciones privadas fuera de las proyecciones públicas. |
| professional_hours, professional_blocks, class_sessions | Horarios y compromisos. La clase ocupa profesional y sala una vez. Cada compra de clase consume plazas de esa sesión. |
| resource_day_locks, resource_allocations, checkout_holds | Recursos, día, ocupación exclusiva, retención, propietario y vencimiento. Un slot de clase no se duplica por comprador. |
| orders, order_lines, booking_occurrences, seat_allocations | Desglose X/Z/Y/W por ocurrencia, moneda, snapshot de tarifa y comisiones, relación de una compra con varias fechas, estado por fecha. |
| waitlist_entries, gym_entitlements | Una inscripción activa por persona y clase, sin consumo de plazas. Cortesía con una reclamación exclusiva por cliente y gimnasio, incluso con dos checkouts simultáneos. |
| payment_attempts, payment_events, idempotency_keys | Intentos independientes de la reserva, evento único por proveedor, claves acotadas por actor y operación, huella de petición y resultado. |
| information_requests, audit_events | Solicitudes salientes y auditoría de metadatos. No registrar cuerpos de mensajes, cookies, claves ni datos de pago. |

Añadir PK, FK, restricciones de unicidad, cantidades positivas, intervalos válidos, estados válidos e índices por propietario, fecha y recurso. No persistir números de tarjeta ni datos sanitarios en esta iteración. Definir política de conservación antes de recoger datos reales.

## 4. Flujos y API

| Área | Rutas orientativas y comportamiento |
|---|---|
| Público | GET /api/professionals, /spaces, /services y /availability. Datos públicos mediante esquemas explícitos. No devolver compromisos ni motivos privados. |
| Identidad local | POST /api/dev/session y DELETE /api/dev/session. Selector de personas semilla sin alta ni contraseña. GET /api/me devuelve capacidades calculadas por la API. |
| Checkout | POST /api/checkouts valida selección, recalcula tarifa y crea retención de 10 min. POST /api/dev/checkouts/:id/pay simula resultado, solo para el cliente propietario. |
| Agenda | GET /api/agenda?from=…&to=…, GET /api/bookings/:id y POST /api/occurrences/:id/cancel. Cliente ve sus citas, profesional las propias, gestor las de su instalación, y doble rol ve la unión deduplicada. |
| Grupos | GET /api/classes y POST /api/classes/:id/waitlist. Mantener aforo estricto, varias plazas y fechas confirmadas como una compra. |
| Profesional | PATCH /api/professional/preferences. Solo propietario. Reutilizar el cálculo demo de radio y trayectos como modelo ficticio inyectable. |
| Gestor | GET /api/my-spaces y GET /api/my-spaces/:id/metrics. Calcular desde reservas confirmadas y la tarifa persistida. |
| Solicitudes de información | POST /api/information-requests y GET /api/information-requests. Alcance por participante y relación autorizada. |

### Mensajería unidireccional

Interpretación adoptada para v1: el profesional envía una solicitud de información al cliente de su reserva o al gestor de la sala vinculada. El destinatario puede leerla. No hay texto de respuesta, chat abierto ni contacto iniciado por el cliente o la sala. Si se decide que el cliente debe poder responder a una petición concreta, será un permiso adicional limitado a esa solicitud. La API deriva el remitente de la sesión y resuelve el destinatario a partir de la relación. Evitar listas libres de destinatarios. Enviar texto plano con longitud limitada y límite de frecuencia. Retirar el flujo anterior de solicitud iniciada por el cliente y los componentes de chat bidireccional.

### Reservas y concurrencia

1. En la creación del checkout adquirir bloqueos de filas centinela existentes por recurso y día y por sesión grupal, siempre en orden canónico, incluso en compras con varias fechas. Adquirir los de todos los días implicados en los límites de jornada cuando corresponda.
2. Expirar retenciones vencidas bajo los mismos bloqueos. Revalidar agenda, radio, viaje anterior y posterior, apertura, sala, equipo y plazas. Persistir el precio calculado en el servidor. Para reservas exclusivas añadir EXCLUDE GiST con btree_gist y rango temporal sobre asignaciones activas de sala/profesional. [Rangos y exclusión en PostgreSQL](https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT).
3. Confirmar plazas bajo bloqueo de clase contando confirmadas y retenidas vigentes. Confirmar todas las fechas o ninguna. Usar reloj de base de datos y marcar el vencimiento como transición explícita. Un proceso de limpieza puede complementar la expiración en acceso.
4. No mantener una conexión bloqueada mientras se espera el pago. Al recibir el resultado volver a bloquear, comprobar propietario, intento, idempotencia, importe y vigencia. Éxito confirma una vez. Fallo libera la retención. Caducidad impide confirmar. Un pago real tardío requerirá conciliación o reembolso sin recuperar el hueco a la fuerza.
5. Cancelar solo la fecha elegida, con confirmación y aviso de política futura. En modo falso no hay cargo ni reembolso. Liberar plaza y recursos cuando corresponda. Mantener la asignación de la clase al profesional y a la sala aunque cancele un asistente.

### Pagos

V1 usa un proveedor FakePaymentProvider dentro del servidor y un contrato común para iniciar un intento y procesar su resultado. Guardar éxito, fallo y caducidad en PostgreSQL. Simular reenvíos para comprobar idempotencia. En producción no registrar rutas de simulación y abortar arranque si el modo falso está activo.

Para fase posterior, integrar primero Stripe en sandbox con Checkout alojado y Stripe CLI. Para una compra que reparte entre profesional y sala, evaluar Connect con cobros y transferencias separados. Modelar liquidaciones y reversión de transferencias por separado. Confirmar importes, divisa y referencia en webhooks con firma sobre cuerpo sin modificar y deduplicar identificadores de evento. La redirección del navegador no confirma una compra. Registrar eventos y ejecutar transiciones de forma idempotente aunque lleguen desordenados. Antes de cobros reales decidir onboarding, contratos, responsabilidades por reembolsos y disputas, fiscalidad, verificación de elegibilidad en España y titularidad de cada importe. [Webhooks de Stripe](https://docs.stripe.com/webhooks).

Stripe Checkout admite un mínimo de 30 minutos para expires_at. Para conservar el plazo de 10 minutos, expirar explícitamente la sesión abierta desde el servidor al vencer la retención y probar la carrera pago/caducidad. Empezar con medios de confirmación inmediata. [Creación de sesión](https://docs.stripe.com/api/checkout/sessions/create) · [Expiración explícita](https://docs.stripe.com/api/checkout/sessions/expire).

## 5. Controles de seguridad y verificación

- API, Vite y base de desarrollo accesibles solo desde loopback. El Vite actual escucha en todas las interfaces y debe cambiar en modo funcional local. Nunca abrir Studio o Postgres a Internet. Perfiles semilla y pagos falsos únicamente con configuración explícita de desarrollo.
- Sesión opaca en cookie HttpOnly y SameSite, Secure bajo HTTPS, con expiración, rotación al cambiar actor y revocación. Mutaciones con CSRF y validación del origen. No confiar en IDs, roles, precios o estados proporcionados por el navegador.
- Autorizar cada operación y cada objeto en el servidor. Evitar consultas por ID sin filtrar propietario o membresía. Probar acceso cruzado entre clientes, profesionales y gestores, además del doble rol. [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- Validar esquemas de entrada y salida, límites de paginación, rango de fechas y tamaño de cuerpo. SQL parametrizado, mensajes renderizados como texto, cabeceras de seguridad, CSP y límites de frecuencia. Usar errores predecibles como 401/403/404/409/422 y evitar exponer datos de otras agendas.
- Secretos de servidor fuera de Git, VITE_* y logs. Desplegar con cuenta de BD de permisos mínimos. Si se incorpora acceso directo desde cliente más adelante, diseñar RLS y probarla explícitamente antes de exponer tablas.
- Comprobar dependencias, redacción de logs e historial auditable. Hacer copias y verificar restauración antes de admitir datos de clientes. Evaluar privacidad y tratamiento de datos antes de operar.
- Pruebas de integración con conexiones independientes para última plaza, dos compras de misma sala, retención expirada, varias fechas, cortesía de gimnasio simultánea, pago duplicado, intento tardío y cancelación repetida. Probar además accesos directos a endpoints de mensajes y mutaciones sin sesión o con CSRF inválido.
- Recorridos completos: visitante explora, cliente semilla reserva con pago correcto o fallido y recarga, profesional consulta agenda y envía solicitud, gestor ve agenda y métricas, doble rol no duplica eventos. Prueba de arranque con configuración de producción que rechaza las opciones de demo.

## 6. Orden de ejecución

1. Crear scripts de arranque, .env.example sin secretos, servidor y proxy. Instalar Supabase CLI como herramienta de desarrollo. Inicializar supabase/config.toml, migraciones y seed reproducible desde el catálogo ficticio. Documentar supabase start, db reset --local y su pérdida de datos locales.
2. Implementar repositorios y sesión local. Sustituir las lecturas del catálogo y permisos de localStorage por la API. Mantener temporalmente las funciones puras de dominio y sus pruebas, con la decisión de reserva en el servidor.
3. Implementar retenciones, cálculo de precio, disponibilidad y pagos falsos. Completar cancelaciones, espera, cortesía y series de múltiples fechas.
4. Conectar las agendas, métricas, preferencias y solicitudes unidireccionales. Retirar los caminos antiguos de escritura y estados duplicados. Los datos del navegador de la demo no se migran como reservas reales.
5. Ejecutar las pruebas, revisar permisos y concurrencia, documentar arranque desde clon limpio y registrar decisiones abiertas. Una segunda fase activa Supabase Auth enlazando identidades a actores internos. Una tercera fase integra Stripe sandbox y prepara el paso a producción.

## 7. Encargo para el agente implementador

Lee este plan, AGENTS.md y la documentación funcional. Implementa la fase local completa en el repo actual. Empieza por migraciones, contratos de API y pruebas de regresión de autorización y concurrencia. Conserva React/Vite y emplea los SDK oficiales indicados. Deja el proyecto reproducible desde un clon limpio con datos semilla, sin registro real ni cuentas externas. Completa los recorridos y las comprobaciones de la sección 5. Entrega listado de migraciones, endpoints, comandos ejecutados y problemas restantes. Usa las reglas de producto de este plan cuando contradigan el chat antiguo de la demo. Guarda cualquier decisión nueva en docs y marca como futura toda integración de Stripe, Auth o alojamiento.

La primera iteración queda terminada cuando se completa un pago falso, se reinicia la aplicación y la reserva sigue guardada, los otros roles autorizados la ven y las pruebas impiden reservar por duplicado o enviar solicitudes desde roles no autorizados.
