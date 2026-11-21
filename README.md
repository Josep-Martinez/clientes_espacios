# Trama · demo de reservas de bienestar

Demo navegable para enseñar el concepto de un marketplace que conecta clientes, profesionales de bienestar y gestores de salas o gimnasios. Los perfiles, horarios, precios, disponibilidad, desplazamientos y accesos son ficticios. La aplicación no procesa dinero, no crea citas operativas y no se conecta a servicios externos.

## Requisitos y arranque

- Node.js 20.19 o posterior.
- pnpm.

```bash
pnpm install
pnpm dev
```

Vite muestra en la terminal la dirección local, normalmente `http://localhost:5173`. El servidor escucha también en la red local para facilitar una presentación desde otro dispositivo. Para parar el servidor, usa `Ctrl+C`.

## Recorridos de la demo

El selector superior permite cambiar entre **Cliente**, **Profesional** y **Gestor de espacio**. Las reservas con pago demo correcto y las preferencias del profesional se guardan en el almacenamiento local del navegador para que se reflejen al cambiar de vista. El botón **Reiniciar demo** restaura los datos iniciales de ejemplo.

### Cliente

1. Busca por servicio o especialidad, zona y fecha.
2. Elige una sesión individual, una sesión de gimnasio o una clase grupal.
3. En una sesión individual, selecciona modalidad, una hora viable y, cuando corresponda, una sala compatible.
4. Revisa el checkout único y su desglose antes de pulsar **Simular pago correcto** o **Simular pago fallido**. El pago fallido no crea reserva; el correcto añade la confirmación a las tres vistas.
5. En una clase grupal, ajusta las plazas, elige una o varias fechas, revisa cada ocurrencia y comprueba las plazas restantes. Las clases completas permiten apuntarse a una lista de espera gratuita que no retiene aforo.
6. En **Mis reservas**, cancela una fecha individual de una serie. Las demás fechas siguen confirmadas y la interfaz marca la política de cancelación como pendiente/simulada.
7. La primera entrada del cliente demo a cada gimnasio aparece a 0 €. El servicio profesional y su comisión de ejemplo se mantienen en el resumen.

### Profesional

1. Selecciona uno de los perfiles ficticios.
2. Cambia la ubicación base, el radio máximo, el máximo de desplazamiento, el margen y las modalidades disponibles.
3. Vuelve a Cliente: las horas y opciones se recalculan con esas preferencias.
4. Realiza un pago demo correcto en Cliente y comprueba la reserva en **Reservas simuladas**.

La vista permite configurar las preferencias del profesional. El inventario de salas de terceros se gestiona desde la vista **Gestor de espacio**.

### Gestor de espacio

1. Filtra el inventario por fecha y tipo de espacio.
2. Revisa horarios ficticios, equipamiento, capacidad y reservas confirmadas para ese día.
3. Confirma que una reserva creada desde Cliente aparece aquí y que los datos de acceso demo solo se muestran junto a reservas confirmadas, con la etiqueta **Acceso de muestra**.
4. En clases grupales, consulta el aforo libre y las listas de espera sin plaza retenida.

## Reglas de ejemplo

Las reglas del motor se mantienen separadas de la interfaz en `src/domain/`. Incluyen solapamientos, límites de radio, desplazamiento y margen antes y después de citas, compatibilidad de salas y equipo, desglose X + Z + Y + W, cortesía de primera entrada al gimnasio, límite de aforo, lista de espera sin cobro, resultado del pago y cancelación de una sola ocurrencia.

Las ubicaciones usan distancias euclidianas ficticias y los minutos de viaje se derivan de ellas mediante una fórmula determinista. No representan rutas actuales ni información de mapas. El cliente solo recibe horas viables; la agenda privada del profesional no se incluye en los resultados.

Los porcentajes editables de ejemplo están en `src/data/demoConfig.ts`; los perfiles, servicios, salas, clases, horarios y datos de acceso de muestra están en `src/data/demoData.ts`. Los precios, porcentajes, políticas de cancelación, condiciones de reembolso y reglas de recurrencia no son decisiones comerciales acordadas.

## Comprobaciones

```bash
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm build
```

Las pruebas usan el test runner integrado de Node y no necesitan base de datos ni servicios externos. Cubren las reglas principales de disponibilidad, checkout, aforo, lista de espera, pagos simulados y cancelación por ocurrencia.

## Límites de la demo

- Datos ficticios compartidos en un solo navegador mediante `localStorage`; no hay cuentas, autenticación, base de datos ni sincronización entre usuarios.
- Los botones de pago solo simulan resultados; no se solicitan ni almacenan datos de pago reales.
- Distancias, desplazamientos, horarios, precios, comisiones, valoraciones, reservas, aforo e instrucciones de acceso son ejemplos editables.
- No se envían mensajes, no se crean reservas con terceros y no se consultan mapas ni servicios externos.
- Las condiciones de cancelación, reembolsos, recurrencia y liquidaciones siguen pendientes.
