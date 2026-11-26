const bookingSteps = [
  {
    number: "01",
    title: "Explora sin cuenta",
    body: "Busca profesionales, servicios y espacios disponibles en el catálogo público.",
  },
  {
    number: "02",
    title: "Elige una opción viable",
    body: "Selecciona servicio, modalidad y horario. El servidor comprueba la agenda, el desplazamiento y la compatibilidad del espacio.",
  },
  {
    number: "03",
    title: "Revisa el total",
    body: "El precio se calcula en el servidor y se muestra desglosado antes de confirmar. La plaza queda retenida durante diez minutos.",
  },
  {
    number: "04",
    title: "Prueba el checkout",
    body: "Con un perfil cliente puedes simular un pago correcto, fallido o caducado. Las reservas confirmadas permanecen en la agenda.",
  },
];

export function HowItWorksView() {
  return (
    <div className="how-it-works-page">
      <section className="how-hero">
        <div>
          <span className="eyebrow">GUÍA DE LA DEMO</span>
          <h1>Una reserva conecta el servicio, el horario y el espacio.</h1>
          <p>
            Descubre cómo pueden probar el recorrido clientes, profesionales y
            gestores con perfiles y datos locales.
          </p>
        </div>
        <div
          className="how-hero-stamp"
          aria-label="Servicio, horario y espacio"
        >
          <span>UNA SOLA</span>
          <strong>reserva</strong>
          <span>Servicio · horario · espacio</span>
        </div>
      </section>

      <section className="how-client-flow" aria-labelledby="how-client-title">
        <div className="how-section-heading">
          <span className="eyebrow">EL RECORRIDO</span>
          <h2 id="how-client-title">De la búsqueda a la confirmación.</h2>
          <p>
            Explora en abierto. Para guardar una reserva de prueba, inicia
            sesión con uno de los perfiles semilla.
          </p>
        </div>
        <ol className="how-steps-grid">
          {bookingSteps.map((step) => (
            <li className="how-step-card" key={step.number}>
              <span className="how-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="how-price-panel">
          <div>
            <span className="eyebrow">ANTES DE PAGAR</span>
            <h3>El servidor deja claro qué estás reservando.</h3>
          </div>
          <ul>
            <li>
              <span>Servicio profesional</span>
              <strong>Incluido</strong>
            </li>
            <li>
              <span>Espacio, si se necesita</span>
              <strong>Desglosado</strong>
            </li>
            <li>
              <span>Precio final</span>
              <strong>Calculado en servidor</strong>
            </li>
            <li>
              <span>Retención del horario</span>
              <strong>10 minutos</strong>
            </li>
            <li className="how-total">
              <span>Pago</span>
              <strong>Simulado en local</strong>
            </li>
          </ul>
        </div>
      </section>

      <section
        className="how-roles-grid"
        aria-label="Qué puede probar cada perfil"
      >
        <article className="how-role-card how-role-client">
          <span className="how-role-index">01 / CLIENTE</span>
          <h2>Encuentra y reserva.</h2>
          <p>
            Consulta opciones, prueba el checkout y revisa tus sesiones desde el
            calendario.
          </p>
          <ul>
            <li>Explorar sin iniciar sesión</li>
            <li>Simular pagos correctos, fallidos o caducados</li>
            <li>Cancelar una fecha concreta</li>
            <li>Apuntarse a la lista de espera de una clase llena</li>
          </ul>
        </article>
        <article className="how-role-card how-role-professional">
          <span className="how-role-index">02 / PROFESIONAL</span>
          <h2>Organiza tu actividad.</h2>
          <p>
            Consulta las sesiones vinculadas a tu perfil y ajusta tus
            preferencias de zona y modalidad.
          </p>
          <ul>
            <li>Ver agenda de mes, semana y día</li>
            <li>Revisar detalles de las reservas autorizadas</li>
            <li>Enviar solicitudes de información vinculadas a una reserva</li>
            <li>Consultar métricas si también gestiona un espacio</li>
          </ul>
        </article>
        <article className="how-role-card how-role-space">
          <span className="how-role-index">03 / GESTOR DE ESPACIO</span>
          <h2>Consulta la actividad del espacio.</h2>
          <p>
            Revisa las reservas relacionadas con las salas que gestiona tu
            perfil y consulta sus métricas.
          </p>
          <ul>
            <li>Ver calendario de reservas autorizadas</li>
            <li>Consultar ocupación e ingresos estimados</li>
            <li>Leer solicitudes de información del profesional</li>
            <li>Compartir la agenda con otros roles de tu perfil</li>
          </ul>
        </article>
      </section>

      <section
        className="how-demo-limits"
        aria-labelledby="how-demo-limit-title"
      >
        <div>
          <span className="eyebrow">ENTORNO LOCAL</span>
          <h2 id="how-demo-limit-title">
            Una demo navegable con datos de prueba.
          </h2>
        </div>
        <div className="how-demo-limit-copy">
          <p>
            Los perfiles y la actividad son sintéticos. Las sesiones se guardan
            en la base local y los pagos son simulados: no se mueve dinero ni se
            crean reservas reales.
          </p>
          <p>
            Los mensajes son solicitudes unidireccionales: solo el profesional
            puede enviarlas al cliente o al gestor relacionado con su reserva.
            El destinatario puede leerlas, pero no hay chat ni respuesta
            abierta.
          </p>
        </div>
      </section>
    </div>
  );
}
