# Prompt de simulación de Trama en MiroFish

## Preparación

1. Sube `semilla_trama_mirofish.md` como material semilla.
2. Usa **Trama — prueba piloto sintética de marketplace** como nombre del proyecto.
3. Copia el bloque siguiente en el campo de requisitos de simulación.
4. Si MiroFish permite configurar tamaño o duración, empieza con una simulación pequeña y corta para revisar si el resultado es útil antes de ampliarla.

## Requisito de simulación para copiar y pegar

```text
Simula una prueba piloto exploratoria de la demo web Trama, un marketplace de bienestar y entrenamiento que conecta clientes, profesionales y gestores de espacios. Usa como única fuente de hechos el material semilla adjunto. El horizonte narrativo es el primer mes de una invitación beta en Valencia; esto es un escenario hipotético, no una predicción ni evidencia de mercado.

OBJETIVO
Identificar qué entienden, valoran, dudan y abandonan los distintos tipos de usuario al descubrir Trama y recorrer sus flujos principales. Simula experiencias y conversaciones entre agentes con motivaciones distintas. No afirmes que los agentes han navegado realmente por la web ni que han probado botones: no tienes acceso interactivo al sitio. Evalúa los recorridos descritos en el material semilla como escenarios hipotéticos.

POBLACIÓN SINTÉTICA
Representa, si el tamaño de simulación lo permite, a 12 personas con perfiles diferenciados:
- 5 clientes: alguien que nunca ha reservado online; alguien que compara precios; alguien que ya entrena con profesional; alguien interesado en clases grupales; y alguien que valora especialmente privacidad y confianza.
- 3 profesionales independientes: una persona que prioriza llenar huecos; otra que protege su autonomía y agenda; y otra que necesita conversar antes de aceptar un nuevo cliente.
- 2 gestores de espacios: una persona con una sala pequeña que busca ocupación; y otra que gestiona un gimnasio y necesita entender reservas, uso e ingresos.
- 2 personas con doble rol de profesional y gestora de espacio, interesadas en saber si la cuenta y la agenda combinadas son fáciles de entender.
Haz que tengan distintas edades adultas, familiaridad digital, disponibilidad, presupuesto y tolerancia a la incertidumbre, sin usar estereotipos ni inventar datos personales sensibles.

RECORRIDOS A SIMULAR
1. CLIENTE SIN CUENTA: descubre Trama, explora profesionales y espacios, busca una sesión, entiende qué incluye el precio, llega al checkout y decide si iniciar sesión para completar el pago simulado o abandonar. Observa si entiende qué puede hacer sin cuenta y por qué se le pide iniciar sesión.
2. CLIENTE QUE NECESITA ACLARAR DUDAS: localiza un profesional, solicita una conversación, espera la aceptación y decide si la mensajería le da confianza suficiente para seguir hacia una reserva.
3. CLIENTE DE CLASE GRUPAL: revisa fechas y plazas, compara una clase disponible con una completa y valora la lista de espera gratuita. Después consulta cómo entendería una reserva con varias fechas.
4. CANCELACIÓN: una persona abre una reserva, revisa los detalles y considera cancelar una fecha. Evalúa la reacción al aviso de que podría haber un coste cuando el importe y la política aún no están definidos. No inventes una tarifa de cancelación.
5. PROFESIONAL: revisa la navegación, su perfil, preferencias y agenda. Cambia entre mes, semana y día, abre una reserva para ver los detalles del cliente y responde a una solicitud de conversación. Comprueba si entiende que no puede buscar otros entrenadores ni cambiar una cita unilateralmente.
6. GESTOR DE ESPACIO: busca su espacio, revisa reservas, ocupación e ingresos estimados y decide qué información o controles necesita para confiar en la herramienta.
7. DOBLE ROL: alterna entre perfil profesional, espacio propio y agenda; identifica si distingue qué reservas pertenecen a cada actividad y qué información espera ver.
8. PRECIO: compara una reserva con y sin espacio. Evalúa si el desglose X + Z + Y + W y la primera entrada al gimnasio a 0 € se entienden, y qué preguntas suscitan las comisiones. No presupongas importes o porcentajes que no aparezcan en la semilla.

PREGUNTAS DE ANÁLISIS
- ¿Qué tarea intenta completar cada persona y qué la haría seguir, pedir ayuda o abandonar?
- ¿Qué términos, pasos o diferencias entre roles se malinterpretan?
- ¿En qué momento aparecen dudas de confianza, privacidad, disponibilidad, pagos, comisiones o cancelaciones?
- ¿La puerta de inicio de sesión en el checkout parece razonable? ¿Qué información querrían ver antes de registrarse?
- ¿El calendario y sus tres vistas resuelven necesidades distintas? ¿Qué esperan al seleccionar una fecha o una reserva?
- ¿La aceptación previa a los mensajes ayuda a profesionales, clientes o a ambos? ¿Qué efecto podría tener en el tiempo de respuesta?
- ¿Qué necesitan los gestores para evaluar el valor de publicar o gestionar un espacio?
- ¿Cómo cambia la experiencia de una persona con doble rol?
- ¿Qué barreras diferencian a quien ofrece servicios de quien aporta un espacio?

COMPARACIONES
Cuando sea posible, compara estas alternativas como hipótesis, sin presentarlas como experimentos reales:
A. Pedir el inicio de sesión solo al iniciar el pago frente a explicarlo antes, durante la exploración.
B. Mostrar la vista mensual como entrada a la agenda frente a abrir la vista diaria del primer día con reservas.
C. Mostrar el aviso de cancelación con política pendiente frente a pedir que la política esté definida antes de activar la cancelación.
D. Mantener navegación común adaptada por rol frente a mostrar una etiqueta más explícita de “vista profesional” o “vista de espacio” en cuentas con doble rol.
Indica qué perfiles podrían preferir cada alternativa y por qué; no declares un ganador estadístico.

FORMATO DEL INFORME
1. Resumen ejecutivo breve con 5 hallazgos sintéticos y el nivel de confianza cualitativo (alto, medio o bajo) según la consistencia de la simulación.
2. Tabla de perfiles, necesidades, motivaciones y principales objeciones.
3. Resultado de cada recorrido: intención, pasos que entiende, fricción, reacción emocional y posible decisión.
4. Lista priorizada de problemas, ordenada por impacto potencial y número de perfiles sintéticos afectados. Aclara que ese número no representa una tasa de mercado.
5. Oportunidades concretas de mejora de producto y texto de interfaz, sin rediseñar funcionalidades que la semilla no describe.
6. Recomendaciones para una prueba posterior con personas reales: tareas, preguntas neutrales y perfiles a reclutar.
7. Límites: separa claramente los hechos de la semilla, las inferencias del modelo y cualquier dato no disponible. Si una conclusión depende de algo no descrito, márcala como supuesto y no la rellenes inventando.

REGLAS
- Todas las personas y conversaciones son sintéticas. No escribas testimonios como si fueran citas de clientes reales; cualquier frase ilustrativa debe llevar la etiqueta “diálogo simulado”.
- No inventes precios, porcentajes, disponibilidad real, resultados de negocio, competidores, regulación ni estadísticas de Valencia.
- No asumas que la demo procesa pagos, guarda datos en un servidor o envía mensajes reales.
- No confundas simulación de opiniones con una prueba de usabilidad observada o con validación de demanda.
- Mantén una mirada crítica: identifica también cuándo una función parece innecesaria o genera más complejidad que valor.
```

## Contexto opcional

Si MiroFish ofrece un campo de contexto adicional, puedes pegar esto:

```text
Trama es una demo local para explorar el funcionamiento de un marketplace; no es todavía un servicio comercial operativo. Queremos usar la simulación para preparar pruebas de producto con personas reales y descubrir preguntas que aún no hemos resuelto. La prioridad es comprender la experiencia por rol, la claridad de la reserva y el nivel de confianza, sin tratar los resultados sintéticos como evidencia de mercado.
```
