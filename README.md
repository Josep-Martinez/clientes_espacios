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

La página de inicio es pública. La navegación superior separa **Buscar y reservar**, **Explorar profesionales y espacios** y **Cómo funciona**. Desde el perfil de la derecha puedes iniciar sesión con una de las cuentas ficticias. No hay contraseñas ni autenticación real. El cambio de cuenta simula las distintas vistas; **Reiniciar demo** restaura reservas, conversaciones y preferencias a los datos iniciales.

### Cliente

1. Sin iniciar sesión, explora servicios, perfiles profesionales y espacios.
2. Elige una sesión individual, una sesión de gimnasio o una clase grupal.
3. En una sesión individual, selecciona modalidad, una hora viable y, cuando corresponda, una sala compatible.
4. Puedes revisar el checkout como visitante. Para simular el pago, inicia sesión como cliente desde el perfil superior. El pago fallido no crea reserva; el correcto añade la confirmación a las vistas relacionadas.
5. En una clase grupal, ajusta las plazas, elige una o varias fechas, revisa cada ocurrencia y comprueba las plazas restantes. Las clases completas permiten apuntarse a una lista de espera gratuita que no retiene aforo.
6. En **Mis reservas**, cancela una fecha individual de una serie. Las demás fechas siguen confirmadas y la interfaz marca la política de cancelación como pendiente/simulada.
7. La primera entrada del cliente demo a cada gimnasio aparece a 0 €. El servicio profesional y su comisión de ejemplo se mantienen en el resumen.

En **Explorar profesionales y espacios** puedes buscar perfiles, solicitar una conversación con profesionales desde una cuenta cliente y consultar salas o gimnasios. El chat solo se abre cuando el profesional acepta la solicitud. La ficha del espacio muestra ubicación aproximada, equipamiento, capacidad y tarifa ficticia; no se muestran códigos ni instrucciones privadas.

La página **Cómo funciona** explica el recorrido de reserva, las funciones de cada rol, el desglose y los límites de la simulación.

### Profesional

1. Inicia sesión como profesional desde el perfil superior.
2. Consulta tu agenda por fecha. La vista no permite mover ni cancelar citas sin la participación del cliente.
3. Cambia tu ubicación base, radio máximo, tiempo de desplazamiento, margen y modalidades. Las opciones del cliente se recalculan con esas preferencias.
4. Revisa solicitudes de conversación, acéptalas o declínalas. El chat solo queda habilitado tras aceptar.

La cuenta demo representa a Marina Ortega y no ofrece una búsqueda de otros entrenadores.
Desde su navegación puede explorar salas y gimnasios, sin acceso al directorio de otros profesionales.

### Gestor de espacio

1. Inicia sesión como gestora desde el perfil superior.
2. Consulta el calendario diario de los espacios asignados a esa cuenta.
3. Revisa las reservas confirmadas, el tiempo ocupado, el porcentaje de uso y los ingresos estimados del periodo de 30 días.
4. Las cifras son orientativas y usan las tarifas y comisiones de ejemplo. No hay chat con los estudios o gimnasios.

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

Las pruebas usan el test runner integrado de Node y no necesitan base de datos ni servicios externos. Cubren disponibilidad, checkout, aforo, conversaciones, permisos de las cuentas demo, migración del estado local, métricas del espacio y cancelación por ocurrencia.

## Límites de la demo

- Los inicios de sesión solo cambian la vista local; no hay cuentas reales, autenticación, base de datos ni sincronización entre usuarios.
- Las reservas, conversaciones y preferencias se guardan en `localStorage` de un solo navegador.
- Los botones de pago solo simulan resultados; no se solicitan ni almacenan datos de pago reales.
- Distancias, desplazamientos, horarios, precios, comisiones, valoraciones, reservas, aforo e instrucciones de acceso son ejemplos editables.
- No se envían mensajes fuera del navegador, no se crean reservas con terceros y no se consultan mapas ni servicios externos.
- Las condiciones de cancelación, reembolsos, recurrencia y liquidaciones siguen pendientes.
