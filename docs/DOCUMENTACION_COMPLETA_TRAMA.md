# Trama — documentación completa del proyecto

**Tipo de documento:** guía funcional y técnica de la demo  
**Versión:** 1.0  
**Fecha:** 23 de noviembre de 2026  
**Estado:** documentación del prototipo local y de la dirección de producto

## 1. Propósito y alcance

Este documento reúne en un solo lugar qué es Trama, cómo se utiliza la demo, qué hace cada tipo de cuenta, qué reglas aplica, cómo está organizado el código y qué partes pertenecen a la futura plataforma. Está dirigido a quienes prueban, presentan o desarrollan el proyecto.

Trama es una plataforma en concepto para conectar a clientes que buscan sesiones de bienestar o entrenamiento, profesionales que ofrecen servicios y gestores que disponen de salas o gimnasios. La propuesta coordina en un mismo recorrido el servicio, el profesional, el horario y, cuando hace falta, el espacio.

**La versión del repositorio es una demo navegable.** No es todavía un marketplace operativo: no hay autenticación real, backend/API de negocio, base de datos, pagos reales, mensajería externa ni disponibilidad conectada a negocios. Sí hay un servidor local de desarrollo de Vite. Los perfiles, las reservas y las cifras sirven para recorrer y explicar el concepto.

### 1.1 Cómo leer los estados

| Etiqueta | Significado |
|---|---|
| **Implementado en la demo** | La interfaz y/o la lógica están presentes en el código actual. |
| **Simulado** | Se puede recorrer en el navegador, pero sus datos o efectos son ficticios y locales. |
| **Parcial** | Existe una versión reducida que no cubre el comportamiento esperado en producción. |
| **Objetivo acordado** | Forma parte de la dirección de producto expresada por el equipo, pero puede no estar construida. |
| **Pendiente de decisión** | No hay una regla comercial u operativa aprobada. No debe presentarse como definitiva. |
| **Propuesta** | Recomendación descrita en la especificación de producto, todavía sujeta a validación. |

Si hay una diferencia entre una función descrita aquí como actual y el código, el código es la referencia del comportamiento actual. La especificación funcional DOCX contiene objetivos, recomendaciones y decisiones pendientes además de acuerdos; no todo lo que aparece allí está implementado ni aprobado.

### 1.2 Fuentes de producto relacionadas

- [Especificación funcional original](Especificacion_funcional_plataforma_profesionales_clientes_espacios.docx): versión 1.0 del 20 de noviembre de 2026; define alcance, reglas propuestas y decisiones pendientes.
- [Material semilla para MiroFish](mirofish/semilla_trama_mirofish.md) y [prompt de simulación](mirofish/prompt_simulacion_trama_mirofish.md): preparados para explorar hipótesis con agentes sintéticos. No sustituyen pruebas con personas ni esta guía.

## 2. Resumen del producto

### 2.1 Necesidad que aborda

La reserva de un servicio puede exigir coordinar a varias partes: una persona que contrata, un profesional disponible y, a veces, un espacio adecuado. El producto quiere reunir esa coordinación en una sola búsqueda y un checkout claro.

El cliente debería poder indicar qué necesita, dónde y cuándo. Trama cruza esa solicitud con el servicio y las modalidades del profesional, su disponibilidad y sus límites privados de desplazamiento. Si el servicio necesita una sala o un gimnasio, la plataforma debe considerar también la disponibilidad y características del espacio.

### 2.2 Principios de producto expresados

1. **Explorar antes de iniciar sesión.** El acceso público permite conocer la oferta; reservar y completar el pago requiere una cuenta de cliente.
2. **La agenda y la viabilidad mandan.** No se debe ofrecer una hora que choque con otra cita o que no permita el desplazamiento necesario.
3. **La información privada se mantiene privada.** El cliente ve horas viables, no citas privadas, direcciones previas ni compromisos del calendario profesional.
4. **Un único checkout.** Servicio, comisiones y espacio se resumen en el mismo pago cuando la reserva necesita un espacio.
5. **Confirmación al completar el pago.** En la plataforma final, una reserva normal no debe depender de aprobación manual posterior del profesional si todos sus recursos están asegurados.
6. **El profesional configura preferencias; el gestor mantiene el espacio.** El profesional no debe administrar el inventario de salas de terceros.
7. **Un usuario puede tener más de un rol.** La navegación combina las vistas profesionales y de espacio sin duplicar la cuenta.
8. **Los importes y las condiciones deben ser transparentes.** Comisiones, cancelación, acceso y recurrencias requieren decisiones explícitas antes de cobros reales.
9. **Modelo de ingresos inicial previsto:** sin suscripción de la plataforma; ingresos mediante comisión por reserva del servicio y, si se utiliza un espacio, una comisión asociada a esa reserva. Los porcentajes aún no están aprobados.

### 2.3 Qué se puede probar hoy

- Navegación pública y navegación adaptada a cuentas demo.
- Búsqueda de servicios, profesionales y espacios ficticios.
- Comprobación determinista de horarios y compatibilidad de espacio.
- Checkout de ejemplo con desglose económico y resultado de pago simulado.
- Clases grupales, plazas y lista de espera local.
- Calendario con vistas de mes, semana y día.
- Detalles de reservas y cancelación local de una ocurrencia por parte del cliente.
- Preferencias de ejemplo para el profesional y métricas del gestor de espacios.
- Solicitudes y mensajes ficticios entre cliente y profesional.

## 3. Roles, permisos y navegación

### 3.1 Menú por cuenta

La navegación principal está en la parte superior y cambia según los roles de la cuenta. La página **Cómo funciona** permanece accesible desde la navegación, no escondida dentro de **Explorar**.

| Visitante | Cliente | Profesional | Gestor de espacio | Profesional y gestor |
|---|---|---|---|---|
| Explorar | Explorar | Explorar | Explorar | Explorar |
| Profesionales | Profesionales | Mi perfil | Profesionales | Mi perfil |
| Espacio | Espacio | Espacio | Mi espacio | Mi espacio |
| — | Mi agenda | Mi agenda | Mi agenda | Mi agenda |
| Cómo funciona | Cómo funciona | Cómo funciona | Cómo funciona | Cómo funciona |

El visitante no tiene acceso a **Mi agenda**; todas las cuentas iniciadas sí.

En la cabecera, arriba a la derecha, está el perfil o el acceso para iniciar sesión. Las cuentas de cliente y profesional también disponen de un botón **Mensajes** en la cabecera. La cuenta de gestor de espacio sin rol profesional o cliente no tiene acceso a mensajería.

No hay una publicación social ni un feed tipo LinkedIn. La referencia a LinkedIn describe únicamente una relación profesional directa: un cliente puede solicitar contactar con un profesional, este acepta o rechaza, y solo después de aceptar se habilita el chat.

### 3.2 Cuentas de demostración

El selector de perfil muestra cuatro cuentas. No hay contraseña ni verificación de identidad.

| Cuenta demo | Rol | Capacidades principales |
|---|---|---|
| Nerea Soler | Cliente | Buscar, preparar una reserva, simular el pago, consultar agenda y solicitar conversaciones. |
| Marina Ortega | Profesional | Consultar perfil y servicios demo, cambiar preferencias de trabajo, ver agenda y responder a solicitudes. |
| Marta Soler | Gestora de espacio | Consultar el espacio vinculado, reservas, ocupación y estimación de ingresos. |
| Marina Ortega | Profesional y gestora | Combina las vistas de perfil profesional y de espacio en una cuenta. |

Al iniciar o cambiar de cuenta, la app vuelve a **Explorar**. Al cerrar sesión, vuelve al visitante. La cuenta activa se guarda en el estado React de la página, no en `localStorage`; recargar el navegador vuelve a la vista de visitante. Los datos de actividad del demo sí se guardan en almacenamiento local.

### 3.3 Permisos actuales

- **Visitante:** puede buscar y consultar perfiles y espacios, ver la guía y llegar hasta revisar el checkout. No puede simular un pago, reservar desde una cuenta ni usar la agenda.
- **Cliente:** puede simular pagos, consultar sus reservas, solicitar conversaciones y cancelar una ocurrencia confirmada.
- **Profesional:** no tiene directorio de otros entrenadores. Ve su propia ficha y agenda, ajusta preferencias demo y responde a solicitudes de contacto.
- **Gestor:** puede explorar el directorio de profesionales, pero no solicitarles conversación. No edita salas ni horarios en esta demo; consulta información de los espacios asociados a su cuenta.
- **Doble rol:** recibe los permisos de profesional y de gestor para las entidades vinculadas. La agenda agrega sus reservas de ambos ámbitos sin duplicarlas.

La autenticación de la demo solo cambia el perfil local visible y habilita/deshabilita controles. No es una frontera de autorización segura para producción.

## 4. Recorridos funcionales actuales

### 4.1 Inicio y visitante

La aplicación se abre como visitante en **Explorar**. La cabecera y el aviso de demostración indican que se pueden consultar opciones sin cuenta y que los pagos y mensajes son simulados.

El visitante puede:

1. Buscar sesiones por texto, zona y fecha.
2. Abrir el directorio de profesionales y filtrar sus fichas.
3. Abrir el directorio de espacios y filtrar por salas o gimnasios.
4. Consultar **Cómo funciona**.
5. Avanzar hasta el resumen de checkout, donde se solicita iniciar sesión como cliente para simular el pago.

### 4.2 Búsqueda y reserva del cliente

#### Buscar una sesión

La vista **Explorar** combina:

- Texto de búsqueda, que puede corresponder al servicio, categoría o descripción.
- Zona de búsqueda seleccionable.
- Fecha de la sesión.
- Tipo de recorrido: sesión individual, sesión en gimnasio o clase grupal.
- Resultados compatibles y mensajes vacíos cuando no hay opciones para los criterios actuales.

El listado solo muestra información pública. El cliente no recibe la agenda privada del profesional ni la razón específica de cada compromiso que bloquea un hueco.

#### Elegir modalidad y hora

Las modalidades definidas para el modelo son sala externa, gimnasio, domicilio y en línea. La disponibilidad real depende de las modalidades permitidas para el servicio y de las preferencias demo del profesional.

Para domicilio y sesiones en línea se comprueba la disponibilidad profesional sin seleccionar una sala. Para una sala o un gimnasio, el motor busca espacios compatibles con:

- Horario de apertura o intervalo de disponibilidad.
- Tipo de espacio solicitado.
- Equipamiento requerido por el servicio.
- Capacidad mínima para las personas solicitadas.
- Ausencia de una reserva confirmada que se solape.
- Radio de trabajo del profesional.
- Zona solicitada por el cliente, con un radio máximo ficticio de 7 km.
- Tiempo para llegar desde la cita anterior y hasta la siguiente, cuando existan esos compromisos.

#### Cálculo de disponibilidad

La lógica de demo valida el intervalo (inicio anterior al final), descarta solapamientos y comprueba el radio del profesional. También busca la cita previa y la siguiente para validar desplazamiento y margen:

```text
inicio de la opción >= fin anterior + tiempo de viaje + margen
fin de la opción + tiempo de viaje + margen <= inicio siguiente
```

El viaje se comprueba contra el máximo de minutos permitido por el profesional. Los bloqueos privados impiden solapamientos, aunque no se muestran como citas en los resultados públicos.

Las ubicaciones usan coordenadas de muestra en zonas ficticias de Valencia. La distancia se calcula con un modelo euclidiano simplificado y el tiempo de viaje es determinista (en el código actual: `ceil(distancia_km × 4 + 5)`, salvo la misma ubicación o el modo en línea, que usan 0). **No son rutas, distancias ni tiempos actuales de mapas.**

#### Checkout y desglose

Antes de simular el pago se revisan el servicio, las fechas seleccionadas, número de plazas, modalidad, espacio si se necesita y total.

| Partida | Cálculo de demo |
|---|---|
| X — servicio profesional | Precio del servicio × fechas × plazas. |
| Z — comisión del servicio | Porcentaje de X. |
| Y — uso del espacio | Tarifa por ocurrencia, salvo las ocurrencias gratuitas. |
| W — comisión del espacio | Porcentaje de Y. |
| Total | X + Z + Y + W. |

Los porcentajes actuales de configuración son **10 % para el servicio** y **12 % para el espacio**. Son parámetros ficticios editables, no tarifas aprobadas. Si no se utiliza espacio, Y y W no aplican. La cantidad se calcula en céntimos y las comisiones se redondean al céntimo.

#### Primer acceso al gimnasio

La demo deja a 0 € el coste del espacio si no encuentra una ocurrencia confirmada previa del cliente para ese gimnasio. No hace gratuito el servicio profesional ni su comisión. Esta regla se calcula con las reservas locales confirmadas. En el producto final aún hay que determinar exactamente qué cuenta como “cliente nuevo”, quién asume el coste y cómo tratar una visita cancelada.

#### Simulación de pago

- El visitante puede preparar el checkout, pero el control de pago le pide iniciar sesión como cliente.
- Un pago simulado correcto añade una reserva confirmada a las vistas relacionadas.
- Un pago simulado fallido muestra un error y no crea una reserva.
- No se solicita ni almacena tarjeta; no se realiza cobro.
- La confirmación de la demo ocurre localmente y no equivale a una reserva real con un profesional o un espacio.

### 4.3 Clases grupales, aforo y lista de espera

**Implementado en la demo:**

- Se muestran sesiones de clase con fecha, horario, profesional, espacio y plazas disponibles.
- El cliente puede seleccionar una o varias fechas y reservar varias plazas, hasta un máximo de ocho por compra demo y dentro del aforo disponible.
- Las plazas confirmadas se cuentan por sesión para calcular el aforo restante.
- Una sesión llena puede ofrecer una lista de espera gratuita.
- Una entrada en espera cuesta 0 € y no ocupa ni bloquea una plaza.
- Es necesario iniciar sesión como cliente para apuntarse.

**No implementado como operación real:** bloqueo temporal durante el checkout, control concurrente entre usuarios, aviso automático cuando se libera una plaza y periodo para completar el pago desde la lista de espera. El orden y la ventana de la lista de espera están pendientes de producto.

### 4.4 Cancelación y cambios

El cliente puede abrir una reserva confirmada y cancelar una ocurrencia individual. Si pertenece a una serie demo, las otras fechas conservan su estado. La interfaz pide confirmar e informa de que podría haber un coste, pero que la política y el importe están pendientes. La demo no calcula penalización ni reembolso y no realiza ningún cobro.

El profesional o el gestor no pueden mover o cancelar unilateralmente una cita desde la demo. La dirección acordada es que los cambios se hagan con la participación del cliente. Reprogramar, cancelar toda una serie, cancelar por parte del profesional o del espacio y gestionar reembolsos pertenecen a reglas de producto pendientes.

### 4.5 Directorio de profesionales

La página **Profesionales** permite buscar en los perfiles demo por nombre, titular, biografía, zona o categoría. Las fichas muestran presentación, zona aproximada, categorías, valoraciones ficticias y una selección de servicios/precios de muestra. Visitantes y gestores pueden consultar el directorio; solo una cuenta cliente puede solicitar contacto. El profesional no tiene el directorio en su menú.

Un cliente puede solicitar conversar con un profesional. El directorio no reserva directamente desde la tarjeta; el recorrido de contratación continúa por **Explorar**. La disponibilidad y los perfiles no se sincronizan con profesionales reales.

### 4.6 Directorio de espacios

La página **Espacio** permite buscar por nombre, zona, texto descriptivo, equipamiento o características (amenities), y filtrar entre todos, salas o gimnasios. Una ficha puede mostrar tipo, zona aproximada, tarifa ficticia, capacidad, equipamiento, horario y características.

La búsqueda pública no expone instrucciones privadas de acceso ni códigos. Desde una ficha se puede volver al flujo de búsqueda de sesiones. Consultar un espacio no supone que se haya reservado.

### 4.7 Perfil y preferencias del profesional

**Mi perfil** muestra la tarjeta del profesional demo, sus valoraciones de muestra, zona pública, categorías y servicios publicados. Los servicios, el precio y la descripción de perfil no se editan desde esta demo.

En el menú profesional no aparece el directorio de otros entrenadores. Su vista **Explorar** se limita a las opciones asociadas a su propio perfil.

Sí son editables las preferencias de trabajo de ejemplo:

- Ubicación base de muestra.
- Radio máximo (control de 0 a 40 km).
- Desplazamiento máximo (0 a 180 minutos).
- Margen entre sesiones (0 a 120 minutos).
- Modalidades: sala de terceros, gimnasio, domicilio y en línea.

Los cambios influyen en las opciones que aparecen en la búsqueda y se conservan localmente. El profesional no busca a otros entrenadores y no edita ni desplaza citas desde este perfil.

### 4.8 Mi agenda

**Mi agenda** es la vista de calendario personal. Está disponible para toda cuenta autenticada.

- **Mes:** calendario de lunes a domingo con eventos asociados a los días.
- **Semana:** siete días alrededor de la fecha seleccionada.
- **Día:** lista cronológica de sesiones y reservas de la fecha.
- Los controles permiten ir a **Hoy** y avanzar o retroceder por el periodo.
- Al seleccionar un día se abre su detalle diario.
- Al seleccionar un evento se muestra su información en el panel de detalle.
- Las ocurrencias de una serie aparecen y se gestionan como fechas individuales.
- La agenda del profesional y del gestor incluye las reservas vinculadas a su actividad o a sus espacios. La cuenta con doble rol ve la unión de ambos ámbitos, sin repetir un mismo evento.

Según el rol y el evento, el detalle puede incluir cliente, profesional, servicio, fecha, hora, modalidad, ubicación, plazas, serie, coste de espacio y nota de acceso de la reserva. La agenda cliente está limitada a las reservas de esa cuenta.

Solo el cliente puede cancelar una ocurrencia confirmada. El profesional puede abrir la conversación aceptada con el cliente si existe, pero no cambiar la cita unilateralmente. El gestor puede llegar a **Mi espacio** para consultar la instalación.

### 4.9 Mi espacio

**Mi espacio** es el panel de consulta del gestor. No es el editor del inventario ni sustituye a **Mi agenda**.

- Muestra solo los espacios vinculados a la cuenta.
- Permite seleccionar una fecha y filtrar la ficha entre todos, salas y gimnasios.
- Para la fecha seleccionada, lista reservas confirmadas de las instalaciones asignadas.
- Calcula métricas orientativas para los 30 días desde la fecha elegida: número de ocurrencias confirmadas, minutos ocupados, minutos abiertos, porcentaje de uso, ingreso bruto estimado, comisión demo e ingreso neto estimado.
- Las horas solapadas en una misma sala y fecha se unen al calcular minutos ocupados.
- En la ficha se muestran datos ficticios del espacio, como tarifa, horario, aforo, equipamiento y características; las reservas pueden indicar plazas disponibles o lista de espera.

El gestor no puede crear espacios, editar tarifas, horarios o aforo, ni modificar reservas desde esta página. Los ingresos no son ventas ni compromisos de liquidación reales. El gestor que además es profesional también cuenta con **Mi agenda**, con vistas de mes, semana y día.

### 4.10 Mensajes

Mensajes solo está disponible para cuentas cliente o profesional y se abre desde el botón de la cabecera.

1. El cliente solicita iniciar contacto desde un perfil profesional.
2. La solicitud queda pendiente hasta que el profesional la acepta o la rechaza.
3. Cuando se acepta, cliente y profesional pueden intercambiar mensajes ficticios.
4. Los mensajes tienen un máximo de 500 caracteres.
5. Si se rechaza, el cliente puede volver a solicitar contacto desde el perfil.

El código evita duplicar una solicitud abierta para la misma pareja cliente-profesional. Los gestores de espacio no tienen chat con estudios, gimnasios ni salas. No se envían notificaciones ni mensajes fuera del navegador.

### 4.11 Cómo funciona

La página pública **Cómo funciona** explica el recorrido de búsqueda a reserva, el desglose de ejemplo, las funciones de cada rol y los límites de la demo. Está pensada como orientación de producto, no como contrato, política de cancelación ni confirmación de precios reales.

## 5. Datos de muestra

Todo lo de esta sección es ficticio y está definido en el código para permitir la navegación.

### 5.1 Perfiles y servicios

La demo contiene siete perfiles, entre ellos Marina Ortega (entrenamiento personal), Nora Vidal (Pilates y movilidad), Leo Ferrer (fisioterapia), Alba Mateu (yoga y respiración), Marta Soler (podología), Vera Campos (masaje deportivo) e Iris Blasco (nutrición).

El catálogo inicial de la demo tiene nueve servicios de muestra: entrenamiento personal, sesión en gimnasio, Pilates con reformer, yoga de flujo, movilidad individual, fisioterapia y valoración, valoración podológica, masaje deportivo y consulta de nutrición. Hay formatos individuales y grupales.

El catálogo objetivo descrito en la especificación funcional incluye entrenamiento personal y preparación física; yoga, Pilates y movilidad; fisioterapia y podología; masaje deportivo, terapéutico y relajante; y dietistas-nutricionistas. CrossFit y entrenamiento funcional se representan como actividad de una clase, no como un rol profesional independiente. Esta lista objetivo no implica que todas las categorías o servicios estén activos en la demo ni que el catálogo comercial esté cerrado.

### 5.2 Espacios y zonas

Hay seis instalaciones de ejemplo: Loft Rueda, Consulta Azul, Estudio Reformer, Patio Move, Senda Gym y Activa Cabanyal. Las zonas de ubicación de ejemplo incluyen Ruzafa, Centro, Benimaclet, Mestalla, Cabanyal, Patraix y Campanar, además de una ubicación lógica en línea.

Los nombres, valoraciones, precios, coordenadas, horarios, capacidad, disponibilidad, equipamiento, instrucciones y reservas son datos de demostración. No deben utilizarse para coordinar una actividad real.

### 5.3 Reservas iniciales

El estado inicial contiene reservas semilla para que se vean eventos en la agenda del profesional y del espacio, aforo utilizado en clases y datos de ejemplo en las métricas. También hay un gimnasio de muestra y reservas de grupo. Estas reservas no pertenecen a personas reales.

## 6. Reglas de negocio: demo frente a plataforma final

### 6.1 Reglas activas en el prototipo

| Regla | Comportamiento de la demo | Límite |
|---|---|---|
| Horario | Descarta intervalos inválidos y solapados. | Datos de calendario de muestra. |
| Desplazamiento | Comprueba cita previa, siguiente, radio, tiempo máximo y margen configurado. | Modelo geométrico determinista, no rutas. |
| Espacio | Comprueba apertura, tipo, aforo, equipamiento, cercanía y reservas confirmadas solapadas. | Inventario estático en el código; no hay bloqueo concurrente. |
| Precio | Calcula X + Z + Y + W en el checkout y conserva el coste de espacio por ocurrencia cuando corresponde. | No persiste un desglose financiero completo; comisiones e importes son ejemplos. |
| Pago | Simula éxito o fallo; el éxito confirma la reserva local. | No hay pasarela, cargo ni proveedor de pagos. |
| Grupo | Valida plazas contra aforo y permite lista de espera gratuita. | Sin bloqueo durante checkout ni promoción automática. |
| Cancelación | Cambia a cancelada una ocurrencia confirmada del cliente. | Sin coste, reembolso ni política comercial aplicados. |
| Privacidad | Omite preferencias/calendario privados en resultados y no devuelve instrucciones de acceso en la búsqueda. | El estado está en el mismo navegador; no equivale a seguridad de servidor. |

### 6.2 Reglas objetivo para la plataforma

Estas son reglas objetivo expresadas en las instrucciones del proyecto y decisiones de producto. Deben implementarse y validarse antes de considerar que la demo es una plataforma real:

- El tiempo de inicio de una cita debe ser igual o posterior al fin de la cita anterior, más el tiempo de viaje entre ambas ubicaciones y el margen configurado.
- La cita candidata debe dejar tiempo para viajar hasta la siguiente cita y respetar el margen.
- No se deben ofrecer huecos que incumplan el radio o el tiempo de desplazamiento del profesional.
- La agenda privada no se expone al cliente; se muestran únicamente opciones viables.
- La compra coordina servicio y espacio en un checkout único, con desglose X + Z + Y + W.
- El pago confirmado reserva automáticamente el servicio, la plaza y el espacio asociado, sin aprobación manual posterior del profesional.
- Si el pago falla o caduca, no debe quedar una reserva confirmada ni un recurso retenido indefinidamente.
- Para evitar vender una misma sala o plaza a la vez a varias personas, se requiere bloqueo temporal durante checkout. La regla de proyecto indica un TTL de 10 minutos y bloqueo transaccional a nivel de fila (`SELECT ... FOR UPDATE`); no existe aún en la demo.
- Las clases respetan el aforo estricto. La lista de espera no se cobra ni ocupa plaza antes de aceptar una plaza liberada.
- La primera entrada de un cliente nuevo a un gimnasio cuesta 0 € en el concepto del producto. La elegibilidad exacta, el pagador y el tratamiento de entradas posteriores están por cerrar.

### 6.3 Decisiones comerciales y operativas pendientes

No se deben inferir decisiones definitivas a partir de las cifras o el comportamiento del prototipo.

| Área | Pendiente |
|---|---|
| Comisiones | Porcentajes, base de cálculo, mínimos, redondeos, impuestos y liquidaciones. Los valores 10 % y 12 % solo son tasas demo. |
| Gimnasios | Qué significa “cliente nuevo”, quién paga la primera entrada, condiciones de futuras cuotas y quién las cobra. |
| Cancelaciones | Plazos, coste, reembolso, reprogramación, ausencias, cancelaciones por profesional o espacio. |
| Recurrencias | Fechas seleccionadas frente a patrón, pago anticipado frente a cargos posteriores y consentimiento para cobros futuros. |
| Lista de espera | Orden, aviso cuando se libera plaza, plazo para pagar y qué ocurre si no se completa la compra. |
| Aforo mínimo | Si se exige un mínimo para impartir una clase y la solución si no se alcanza. |
| Inventario | Reglas para bloquear, cancelar, cambiar horarios y resolver un espacio no disponible. |
| Verificación | Documentación y revisión necesarias para cada tipo de profesional y espacio. |
| Búsqueda | Prioridad relativa de disponibilidad, cercanía, precio, adecuación y valoraciones. |
| Acceso físico | Cómo se entregan instrucciones, recepción de acompañantes, retrasos, limpieza y daños. |
| Ubicación de piloto | Ciudad, barrios y densidad inicial de oferta. Los datos actuales de Valencia son ficticios. |
| Bonos | Usos, caducidad, transferencia, reembolsos y forma de aplicar comisiones. |

## 7. Alcance futuro de producto

La especificación funcional original describe funcionalidades deseadas que exceden el prototipo. Esta sección mantiene claro el salto entre el demo local y un piloto operativo.

### 7.1 Identidad y cuentas

**Objetivo acordado:** cuentas reales con roles de cliente, profesional y gestor de espacio; una cuenta podría tener más de un rol.  
**Situación actual:** selector local de cuatro cuentas, sin contraseñas, registro, recuperación, sesiones seguras, organizaciones ni roles protegidos por servidor.

### 7.2 Perfil profesional y oferta

**Objetivo:** publicar y editar identidad y presentación pública, categorías, idiomas, experiencia y credenciales; crear servicios con formato, precio, duración, modalidad, requisitos de espacio y equipamiento; definir disponibilidad semanal, pausas, excepciones, citas privadas y bloqueos; y pausar o reactivar publicaciones. El cliente debería poder filtrar por disponibilidad, distancia, precio, valoración, formato, modalidad y requisitos del espacio, además de texto y zona.

**Situación actual:** el catálogo está precargado; el profesional ve su tarjeta y solo cambia preferencias demo de zona, desplazamiento, margen y modalidad. La agenda base y los compromisos son datos semilla, no un calendario editable.

### 7.3 Inventario de espacios

**Objetivo:** el gestor crea y mantiene instalaciones y salas con fotos, dimensiones aproximadas, privacidad, accesibilidad, tipo, capacidad, equipamiento y restricciones de actividad; configura horarios, precio, normas, instrucciones de acceso, cierres y bloqueos. Si una modificación afecta a una reserva confirmada, debe conservar las condiciones aceptadas o informar y resolver la reserva con una alternativa o devolución definida.

**Situación actual:** vista de consulta para espacios asignados y datos precargados; no hay edición ni publicación de inventario real.

### 7.4 Reservas, pagos y operaciones

**Objetivo:** backend multiusuario, persistencia central, pasarela de pagos, confirmación idempotente, bloqueo temporal atómico de plazas y salas, conciliación de comisiones y liquidaciones, recibos e historial de cambios.  
**Situación actual:** lógica de dominio del navegador; el estado se guarda en `localStorage`; el éxito/fallo del pago es una elección de demo; no hay concurrencia entre usuarios.

La plataforma debe separar el estado de la reserva del estado del pago. El modelo objetivo puede contemplar reservas en checkout, confirmadas, completadas, canceladas por cliente/profesional/espacio, no presentado e incidencia; y pagos iniciados, fallidos, pagados, reembolsados parcial o totalmente y disputados. La demo actual solo necesita estados locales como pendiente, confirmada y cancelada, además de una marca de pago simulado correcto; no implementa reembolsos ni disputas.

### 7.5 Recurrencias y grupos

**Objetivo:** series finitas y patrones repetidos con ocurrencias individuales, comprobación de cada fecha, aforo independiente por sesión, reglas de cancelación y promoción de lista de espera con plazo.  
**Situación actual:** se pueden elegir varias fechas en el flujo demo y se representan como ocurrencias relacionadas; no existe un motor de repetición de calendario ni un flujo operativo de lista de espera.

### 7.6 Mensajes y notificaciones

**Objetivo:** conversación fiable cliente-profesional vinculada a consulta o reserva, avisos de confirmación, recordatorios, cambios de fecha o lugar, cancelaciones, incidencias de acceso y valoraciones posteriores. Los canales (notificación interna, correo o SMS) están por decidir. Los cambios formales de fecha y lugar deben gestionarse desde la reserva para que el calendario y los cargos queden actualizados.
**Situación actual:** conversación local con solicitud y aceptación; no hay mensajes a estudios o gimnasios ni notificaciones externas.

### 7.7 Confianza, soporte y administración

**Objetivo/propuesta:** permitir una valoración vinculada a una reserva completada; mostrar reseñas recientes y habilitar reporte, moderación y respuesta; definir la verificación de identidad, credenciales y documentación del espacio; y proporcionar soporte para pagos, acceso, cambios e incidencias.

El panel interno de operación debería permitir buscar usuarios, perfiles, servicios, espacios, reservas, pagos e incidencias; revisar altas; pausar o rechazar publicaciones con motivo; configurar parámetros aprobados; consultar pagos y bloqueos; resolver duplicados y devoluciones; gestionar reportes; suspender cuentas; y mantener un historial auditable de cambios sensibles.

**Situación actual:** las valoraciones visibles son de muestra; no hay publicación de valoraciones, verificación, herramientas internas, moderación ni soporte.

### 7.8 Mapas, calendario y analítica

**Objetivo/evolución:** cálculo de desplazamientos más preciso, posible integración de calendario externo y métricas avanzadas para medir ocupación y repetición.  
**Situación actual:** distancia y tiempo deterministas; calendario visible del demo; métricas limitadas a reservas y tarifas de ejemplo.

### 7.9 Criterios para considerar listo un piloto real

Antes de anunciar Trama como una plataforma operativa, una persona debería poder completar los siguientes recorridos con datos y servicios reales:

1. Encontrar un servicio de las categorías habilitadas y reservarlo con el lugar coordinado cuando haga falta.
2. Configurar la ubicación base, el radio y el máximo de desplazamiento del profesional, y no ofrecer huecos que infrinjan esos límites ni el tiempo de viaje entre las citas anterior y posterior.
3. Desactivar una modalidad para retirarla de las opciones de cliente.
4. Reservar una sala que esté abierta, libre, dentro de los límites de ubicación y que cumpla el aforo y el equipamiento requerido.
5. Confirmar el servicio, plaza y sala al recibir el pago confirmado, sin aprobación posterior del profesional.
6. Impedir que pagos fallidos o expirados dejen una reserva confirmada o recursos retenidos indefinidamente.
7. Mostrar el precio completo con servicio, comisión, espacio y comisión de espacio como partidas separadas.
8. Vender grupos sin superar el aforo, incluir varias plazas, usar bloqueo temporal durante el checkout y gestionar de forma definida la lista de espera.
9. Permitir sesiones puntuales, fechas múltiples y series con ocurrencias individuales, explicando qué fechas se pagan ahora.
10. Mantener gratuita la primera entrada elegible al gimnasio sin hacer gratuita la sesión profesional.
11. Mostrar antes del pago las condiciones de cambio, cancelación, ausencia y reembolso que se aplicarán.
12. Permitir que cliente, profesional y gestor consulten las partes de agenda y reserva que corresponden a sus permisos, manteniendo la privacidad.

Estos son criterios de aceptación del producto objetivo resumidos a partir de la especificación funcional; no son una afirmación de que la demo ya los cumpla en una operación real.

## 8. Arquitectura técnica del prototipo

### 8.1 Tecnologías

- React 19 para la interfaz.
- TypeScript para componentes, modelos y reglas.
- Vite para desarrollo local y empaquetado.
- CSS propio en `src/styles/app.css`.
- Node.js test runner para pruebas de funciones de dominio.
- No hay framework de backend ni base de datos en este repositorio.

El proyecto declara Node.js 20.19 o posterior y pnpm como herramientas para desarrollo.

### 8.2 Cómo fluye la aplicación

`src/main.tsx` inicia React y monta `src/App.tsx`. La vista activa y la cuenta se gestionan localmente en `App.tsx`; la navegación se resuelve mediante un `switch` interno, no mediante rutas de URL. `App.tsx` compone las páginas, cabecera, aviso de demo, selector de cuenta y pie.

Las funciones de búsqueda, disponibilidad, precios, capacidad, conversaciones, reservas, calendario y métricas se mantienen en módulos de `src/domain/`. Las vistas llaman a esas funciones y al store local. Los datos iniciales se definen en `src/data/`. No se hacen llamadas a una API propia.

### 8.3 Mapa de carpetas

| Ruta | Responsabilidad |
|---|---|
| `src/App.tsx` | Estado de navegación/cuenta y composición de vistas. |
| `src/components/` | Cabecera, avisos, fragmentos de precio y reserva, inbox de conversación e iconos. |
| `src/data/demoAccounts.ts` | Cuentas ficticias y comprobación local de roles. |
| `src/data/demoConfig.ts` | Tasas de comisión, clave de almacenamiento, radios y etiquetas demo. |
| `src/data/demoData.ts` | Profesionales, servicios, ubicaciones, espacios, sesiones y agenda semilla. |
| `src/domain/` | Tipos y reglas puras del dominio demo. |
| `src/state/demoState.ts` | Estado inicial, lectura, validación, normalización y persistencia local. |
| `src/state/useDemoStore.ts` | Hook para modificar reservas, conversaciones, preferencias y lista de espera. |
| `src/views/` | Pantallas de explorar, directorios, perfil, espacio, agenda, mensajes, acceso y guía. |
| `src/styles/app.css` | Diseño, componentes visuales y ajustes responsive. |
| `tests/` | Pruebas unitarias de reglas y utilidades de dominio. |
| `docs/` | Especificación funcional y documentación del proyecto. |

### 8.4 Módulos de dominio

| Archivo | Función principal |
|---|---|
| `models.ts` | Tipos para perfiles, servicios, espacios, reservas, ocurrencias, mensajes y estado demo. |
| `navigation.ts` | Menús derivados de los roles de cada cuenta. |
| `demoAuth.ts` | Reglas de acceso local al pago y a las pantallas demo; no es autenticación segura. |
| `search.ts` | Coincidencia de texto/formato y proyección pública de perfiles sin preferencias privadas. |
| `availability.ts` | Conflictos, radio del profesional y desplazamiento antes/después de una cita. |
| `spaces.ts` | Apertura, capacidad, equipamiento, cercanía y conflictos de reserva de sala. |
| `bookingOptions.ts` | Combina modalidad, disponibilidad profesional y opciones compatibles de espacio. |
| `pricing.ts` | Partidas X, Z, Y, W, comisiones y cortesía de acceso. |
| `capacity.ts` | Plazas confirmadas, validación de aforo y entrada a lista de espera. |
| `reservations.ts` | Resultado del pago simulado y cancelación de una ocurrencia. |
| `conversations.ts` | Solicitudes, permisos de conversación y mensajes de máximo 500 caracteres. |
| `calendar.ts` | Días del calendario, eventos y alcance por cuenta/rol. |
| `spaceMetrics.ts` | Ocupación y estimación de ingresos por espacio. |

### 8.5 Modelo de estado local

El estado de negocio comprende:

- Reservas y sus ocurrencias.
- Entradas de lista de espera.
- Preferencias demo por profesional.
- Solicitudes de conversación y mensajes.

La clave de almacenamiento local actual es `trama-marketplace-demo-v1`. Al cargar la app, los datos se inicializan desde `localStorage` o desde reservas semilla. Se valida la estructura principal y algunos campos; un JSON inválido o campos obligatorios incompatibles hacen que vuelva al estado inicial. Las conversaciones malformadas se descartan individualmente y las preferencias no tienen validación profunda. Si el navegador no permite almacenamiento, la demo avisa y conserva los cambios solo mientras la página siga abierta.

No hay un botón **Reiniciar demo**. Para restaurar manualmente las reservas y preferencias iniciales se puede borrar la clave local del navegador o los datos del sitio. Esto es una operación del navegador, no una función de usuario expuesta por la app.

### 8.6 Entidades del dominio objetivo

Esta tabla resume la información que la plataforma completa previsiblemente necesitará. Es un mapa funcional, no un esquema SQL aprobado.

| Entidad | Información principal |
|---|---|
| Usuario y roles | Identidad, acceso, datos de contacto, roles y consentimientos. |
| Perfil profesional | Presentación pública, categorías, zona pública, experiencia, credenciales y estado de publicación. |
| Servicio | Categoría, formato, precio, duración, modalidad, equipamiento requerido y condiciones. |
| Disponibilidad y compromiso | Horario habitual, excepciones, pausas, citas, bloqueos y márgenes. |
| Preferencias de desplazamiento | Ubicación base privada, radio, tiempo máximo y modalidades aceptadas. |
| Espacio y sala | Gestor, ubicación, capacidad, disponibilidad, tarifa, equipamiento, normas e instrucciones de acceso. |
| Sesión grupal | Servicio, profesional, fecha, lugar, aforo, plazas, recurrencia y lista de espera. |
| Reserva, serie y ocurrencia | Cliente, servicio, fechas, modalidad, asistentes, estado y relación con profesional/espacio. |
| Pedido y pago | Partidas del checkout, comisiones, método, estado, reembolsos y liquidaciones. |
| Reseña | Reserva completada, puntuación, texto, fecha, moderación y respuesta. |
| Incidencia | Tipo, personas afectadas, evidencia, acciones y resolución. |

## 9. Cómo ejecutar el proyecto

Requisitos indicados en el proyecto: Node.js 20.19 o posterior y pnpm.

```bash
pnpm install
pnpm dev
```

Vite muestra en la terminal la URL local, normalmente `http://localhost:5173`. El servidor de desarrollo se configura para escuchar también en la red local.

Comandos disponibles en `package.json`:

```bash
pnpm dev            # Desarrollo local
pnpm typecheck      # Comprobación de TypeScript
pnpm test           # Pruebas de dominio
pnpm test:coverage  # Pruebas con cobertura de los módulos de dominio
pnpm build          # TypeScript y build de producción
```

Esta documentación no afirma que esos comandos se hayan ejecutado en esta revisión.

## 10. Pruebas existentes

Hay pruebas unitarias para disponibilidad, calendario, capacidad, conversaciones, permisos locales, estado demo, precios, reservas, métricas y espacios:

- `tests/availability.test.mjs`
- `tests/calendar.test.mjs`
- `tests/capacity.test.mjs`
- `tests/conversations.test.mjs`
- `tests/demoAuth.test.mjs`
- `tests/demoState.test.mjs`
- `tests/pricing.test.mjs`
- `tests/reservations.test.mjs`
- `tests/spaceMetrics.test.mjs`
- `tests/spaces.test.mjs`

Estas pruebas cubren funciones de dominio. No equivalen a pruebas end-to-end de interfaz, pruebas de pasarela, concurrencia o integración de un backend real. No se ha establecido aquí una cifra de cobertura.

## 11. Privacidad, seguridad y límites de la demo

### 11.1 Límites presentes

- Las cuentas y permisos son locales y falsos; no protegerían datos en un servicio real.
- Las reservas, preferencias y conversaciones se comparten solo en el mismo perfil del navegador mediante `localStorage`; no existen cuentas sincronizadas entre dispositivos.
- Las personas que usan un mismo navegador comparten el almacén local de la demo. No hay aislamiento de datos multiusuario en un servidor.
- Los pagos, tarifas, comisiones, ubicaciones, tiempos, valoraciones y accesos son ficticios.
- No se debe introducir información personal, sanitaria, financiera o de acceso real.
- La demo no crea citas operativas ni envía comunicaciones a terceros.

### 11.2 Requisitos para una versión operativa

Antes de producción habría que diseñar autenticación segura y autorización en servidor; minimizar datos; proteger direcciones, agendas e instrucciones de acceso; validar permisos por rol; gestionar pagos y webhooks de manera segura; controlar concurrencia; registrar cambios; establecer reglas de cancelación y reembolso; y realizar las revisiones legales y de seguridad pertinentes.

El código de la demo oculta campos privados en ciertas proyecciones públicas, pero el almacenamiento en el navegador no constituye un control de seguridad. La documentación no sustituye asesoramiento legal, fiscal, de pagos o de seguridad.

## 12. Accesibilidad y comportamiento responsive

La interfaz incluye elementos semánticos y nombres accesibles para navegación y acciones, enlace para saltar al contenido y etiquetas para formularios y estados. El CSS incluye adaptaciones para móvil. Las interacciones sensibles, como cancelar una reserva, presentan una confirmación en pantalla.

Esto describe patrones visibles en el código, no una auditoría completa de conformidad WCAG. La accesibilidad debe probarse con teclado, lectores de pantalla, zoom y diferentes tamaños antes de un piloto público.

## 13. Dirección de diseño acordada

- Mantener la página de inicio reconocible mientras se mejora la calidad visual del resto de la aplicación.
- Situar arriba las opciones principales, sin esconder secciones dentro de **Explorar**.
- Adaptar el menú al rol de la cuenta con las etiquetas indicadas en la sección 3.
- Mantener perfil/inicio de sesión en la esquina superior derecha.
- Ofrecer **Mensajes** desde la cabecera para cliente y profesional; no mostrar acceso de mensajes al gestor puro.
- Presentar la agenda como calendario utilizable en mes, semana y día; abrir detalles al seleccionar una sesión.
- Usar el calendario de Apple como referencia opcional de claridad y lectura de mes/semana/día; no es una exigencia de copiar su interfaz.
- Indicar con claridad que la cancelación puede tener un coste cuando la política aún no está concretada.
- Evitar controles que den a entender que existe un pago, reserva, cuenta, reseña o disponibilidad real cuando solo son de demo.

## 14. Glosario

| Término | Significado en Trama |
|---|---|
| Cliente | Persona que explora y contrata una sesión o clase. |
| Profesional | Persona que presta el servicio de bienestar, entrenamiento o especialidad del catálogo. |
| Gestor de espacio | Persona que controla la información y disponibilidad de una sala o gimnasio. |
| Modalidad | Lugar o forma de prestar el servicio: sala, gimnasio, domicilio o en línea. |
| Radio profesional | Distancia máxima que el profesional acepta desde su ubicación base en la lógica de disponibilidad. |
| Margen | Minutos de preparación/desplazamiento que se reservan entre compromisos. |
| Ocurrencia | Una fecha individual dentro de una reserva o serie. |
| Serie | Conjunto de ocurrencias relacionadas; en la demo se limita a fechas seleccionadas. |
| Aforo | Número máximo de plazas disponibles en una clase. |
| Lista de espera | Registro gratuito de interés por una clase llena; no retiene una plaza. |
| Checkout | Resumen de servicio, fechas, espacio y precio antes del pago simulado. |
| X, Z, Y, W | Variables para precio del servicio, comisión del servicio, coste del espacio y comisión del espacio. |
| Agenda privada | Compromisos que el profesional utiliza para calcular huecos; no se publican al cliente. |

## 15. Mapa rápido de archivos fuente

- Aplicación y shell: [`src/App.tsx`](../src/App.tsx), [`src/components/AppChrome.tsx`](../src/components/AppChrome.tsx).
- Datos y configuración: [`src/data/demoData.ts`](../src/data/demoData.ts), [`src/data/demoAccounts.ts`](../src/data/demoAccounts.ts), [`src/data/demoConfig.ts`](../src/data/demoConfig.ts).
- Vistas: [`src/views/ClientView.tsx`](../src/views/ClientView.tsx), [`src/views/ClientProfessionalsView.tsx`](../src/views/ClientProfessionalsView.tsx), [`src/views/ClientSpacesView.tsx`](../src/views/ClientSpacesView.tsx), [`src/views/ProfessionalView.tsx`](../src/views/ProfessionalView.tsx), [`src/views/SpaceManagerView.tsx`](../src/views/SpaceManagerView.tsx), [`src/views/AgendaView.tsx`](../src/views/AgendaView.tsx), [`src/views/MessagesView.tsx`](../src/views/MessagesView.tsx), [`src/views/HowItWorksView.tsx`](../src/views/HowItWorksView.tsx).
- Dominio y estado: carpeta [`src/domain/`](../src/domain/) y carpeta [`src/state/`](../src/state/).
- Estilos: [`src/styles/app.css`](../src/styles/app.css).
- Pruebas unitarias: [`tests/`](../tests/).
- Arranque y scripts: [`package.json`](../package.json).

---

**Mantenimiento:** actualizar esta guía cuando cambien los flujos visibles, las reglas del dominio, las cuentas de demo o los límites entre simulación y producto operativo. Mantener explícitas las decisiones pendientes para que ningún valor ficticio se interprete como una política aprobada.
