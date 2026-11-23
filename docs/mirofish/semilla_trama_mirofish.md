# Trama — material semilla para simulación en MiroFish

## Para qué sirve este documento

Este archivo describe la demo web de **Trama**, un marketplace que conecta a personas que buscan sesiones de bienestar o entrenamiento, profesionales que ofrecen servicios y personas que gestionan salas o gimnasios. Se utilizará como material de referencia para una simulación exploratoria de experiencias y objeciones.

La demo es un prototipo local. El contenido de este documento describe funcionalidades implementadas y límites conocidos; las opiniones de usuarios, la intención de compra y la adopción son cuestiones que la simulación debe explorar, no hechos demostrados.

## Qué permite la demo

### Acceso público y navegación por tipo de cuenta

Una persona sin cuenta puede explorar profesionales, espacios y servicios, consultar cómo funciona Trama y llegar a revisar una reserva. Para simular el pago debe iniciar sesión con una cuenta ficticia de cliente. La navegación cambia según los permisos de la cuenta:

| Tipo de cuenta | Navegación principal |
|---|---|
| Visitante | Explorar · Profesionales · Espacio · Cómo funciona |
| Cliente | Explorar · Profesionales · Espacio · Mi agenda · Cómo funciona |
| Profesional | Explorar · Mi perfil · Espacio · Mi agenda · Cómo funciona |
| Gestor de espacio | Explorar · Profesionales · Mi espacio · Mi agenda · Cómo funciona |
| Profesional y gestor | Explorar · Mi perfil · Mi espacio · Mi agenda · Cómo funciona |

La cuenta demo de cliente se llama Nerea Soler; la de profesional, Marina Ortega; la de gestora, Marta Soler. También existe una cuenta que combina profesional y gestora.

### Recorrido de reserva de cliente

- El cliente puede explorar sesiones individuales, entrenamiento con gimnasio y clases grupales, así como perfiles profesionales y espacios.
- En una sesión individual puede elegir modalidad, fecha y hora viable. Cuando el servicio requiere una sala, puede seleccionar un espacio compatible.
- Puede revisar el precio antes del paso de pago. El desglose de ejemplo separa servicio profesional (X), comisión de servicio (Z), uso de espacio (Y) y comisión de espacio (W). Si no se usa un espacio, Y y W no aplican.
- La primera entrada demo de un cliente a cada gimnasio tiene coste de espacio de 0 €. El servicio profesional y su comisión de ejemplo se mantienen.
- El pago es una simulación. Un resultado fallido no crea reserva; uno correcto añade una reserva ficticia a las vistas relacionadas.
- Las clases grupales tienen aforo. Una clase completa permite apuntarse a una lista de espera gratuita; apuntarse no bloquea una plaza.
- En una serie de sesiones se puede cancelar una ocurrencia individual sin cancelar las demás. La interfaz avisa de que la cancelación podría tener un coste, pero la política, el importe y los reembolsos no están definidos.

### Profesionales y conversaciones

- Un cliente puede solicitar iniciar una conversación desde el perfil de un profesional.
- La conversación solo permite intercambiar mensajes después de que el profesional acepte la solicitud.
- El profesional puede aceptar o rechazar solicitudes y consultar sus mensajes desde el acceso **Mensajes** de la cabecera.
- La cuenta profesional puede consultar su propio perfil, servicios y agenda. No tiene un directorio para buscar a otros entrenadores.
- El profesional puede cambiar preferencias de zona, radio, desplazamientos, margen y modalidades. En la demo, esas preferencias afectan a las opciones que se presentan al cliente.
- Los profesionales y los gestores de espacios no tienen chat con estudios o gimnasios.

### Agenda y gestión del espacio

- **Mi agenda** permite cambiar entre vistas de mes, semana y día. Al seleccionar una fecha se abre su vista diaria; al seleccionar una reserva se muestran sus detalles.
- Según el rol, la agenda muestra las reservas relacionadas con el cliente, el profesional o los espacios gestionados. En las citas profesionales se pueden consultar el cliente, servicio, fecha, hora y lugar.
- La demo no permite que un profesional cambie unilateralmente una cita. Los cambios requieren la participación del cliente.
- La gestora de espacio consulta los espacios vinculados a su cuenta, las reservas, el tiempo ocupado, el porcentaje de uso y una estimación de ingresos de los últimos 30 días.
- La cuenta con doble rol ve su perfil profesional y su espacio dentro de una misma cuenta; cada vista debe interpretarse según el rol que representa.

## Qué es ficticio o está pendiente

- Los inicios de sesión son selectores locales de cuentas de demostración, no autenticación real.
- No hay base de datos, sincronización entre usuarios, procesamiento de pagos ni comunicación externa.
- Reservas, mensajes, preferencias y cambios se guardan localmente en el navegador mediante `localStorage`.
- Perfiles, ubicaciones, horarios, distancias, disponibilidad, precios, comisiones, valoraciones, reservas, aforos e instrucciones son datos de ejemplo.
- Las distancias no provienen de mapas ni de rutas reales. No se deben inferir tiempos de viaje reales.
- Las condiciones de cancelación, reembolso, recurrencia y liquidación no están decididas.
- Los importes estimados de los gestores no representan ingresos reales ni una promesa de rentabilidad.

## Hipótesis abiertas para explorar

Estas ideas son preguntas, no conclusiones:

1. La posibilidad de explorar sin cuenta puede ayudar a descubrir la oferta, pero la obligación de iniciar sesión al pagar puede provocar abandono.
2. Mostrar todas las partidas del precio antes de pagar puede aumentar la claridad, aunque las comisiones separadas también pueden generar dudas.
3. La agenda con vistas de mes, semana y día podría resultar útil a profesionales y gestores, pero algunos pueden preferir una vista diaria más sencilla.
4. Los avisos sobre un posible coste de cancelación pueden reducir cancelaciones de última hora o generar desconfianza si la política aún no está concretada.
5. La mensajería previa a la reserva podría ayudar a resolver dudas; exigir que el profesional acepte la solicitud podría ralentizar la respuesta.
6. Un gestor puede valorar métricas de uso e ingresos estimados, pero también necesitar datos sobre disponibilidad, conflictos, cobros y control de reservas.
7. La navegación adaptada a cada rol podría simplificar la aplicación, aunque una cuenta con doble rol puede necesitar señales más claras sobre la vista activa.

## Cómo interpretar la simulación

Los perfiles y conversaciones generados por MiroFish son sintéticos. Sirven para sacar hipótesis y preparar entrevistas o pruebas moderadas; no prueban que exista demanda, que una función sea usable ni que una persona real pague. No se deben presentar expresiones simuladas como testimonios reales ni convertir frecuencias de agentes en porcentajes de mercado.
