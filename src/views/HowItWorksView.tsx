import { DEMO_FEES } from '../data/demoConfig.ts';

const clientSteps = [
  { number: '01', title: 'Busca tu sesión', body: 'Indica qué necesitas, en qué zona y para qué fecha. Puedes explorar perfiles y espacios sin iniciar sesión.' },
  { number: '02', title: 'Elige una opción viable', body: 'La demo combina servicio, modalidad, horario y sala compatible. Las ubicaciones privadas y las horas ocupadas no se exponen.' },
  { number: '03', title: 'Revisa el precio completo', body: 'Antes de pagar se muestran por separado el servicio, las comisiones de ejemplo y el coste del espacio, cuando lo hay.' },
  { number: '04', title: 'Inicia sesión para probar el pago', body: 'Puedes llegar al checkout como visitante. Para simular un pago correcto o fallido, elige una cuenta cliente de prueba.' },
];

export function HowItWorksView() {
  return (
    <div className="how-it-works-page" id="inicio">
      <section className="how-hero">
        <div>
          <span className="eyebrow">TRAMA · GUÍA DEL PRODUCTO</span>
          <h1>Una reserva conecta a las personas y al lugar.</h1>
          <p>Así funciona el recorrido de clientes, profesionales y gestores de espacios dentro de esta demo.</p>
        </div>
        <div className="how-hero-stamp">
          <span>UNA SOLA</span>
          <strong>reserva</strong>
          <span>Servicio · horario · espacio</span>
        </div>
      </section>

      <section className="how-client-flow" aria-labelledby="how-client-title">
        <div className="how-section-heading">
          <span className="eyebrow">PARA CLIENTES</span>
          <h2 id="how-client-title">De la búsqueda a la confirmación.</h2>
          <p>La cuenta es opcional para explorar y necesaria para simular el pago y guardar actividad del cliente.</p>
        </div>
        <ol className="how-steps-grid">
          {clientSteps.map((step) => (
            <li className="how-step-card" key={step.number}>
              <span className="how-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="how-price-panel">
          <div>
            <span className="eyebrow">DESGLOSE DE EJEMPLO</span>
            <h3>Un total claro antes de pagar.</h3>
          </div>
          <ul>
            <li><span>Servicio profesional</span><strong>X</strong></li>
            <li><span>Comisión del servicio · ejemplo {DEMO_FEES.serviceCommissionPercent}%</span><strong>Z</strong></li>
            <li><span>Uso del espacio, si hace falta</span><strong>Y</strong></li>
            <li><span>Comisión del espacio · ejemplo {DEMO_FEES.spaceCommissionPercent}%</span><strong>W</strong></li>
            <li className="how-total"><span>Total</span><strong>X + Z + Y + W</strong></li>
          </ul>
        </div>
      </section>

      <section className="how-roles-grid" aria-label="Qué hace cada perfil">
        <article className="how-role-card how-role-client">
          <span className="how-role-index">01 / CLIENTE</span>
          <h2>Encuentra y reserva.</h2>
          <p>Busca una especialidad, revisa profesionales, compara salas y gimnasios, elige horas viables y consulta tus reservas en la agenda.</p>
          <ul><li>Explorar sin cuenta</li><li>Pago de prueba con cuenta cliente</li><li>Cancelación con aviso de posible coste</li><li>Solicitud de conversación al profesional</li></ul>
        </article>
        <article className="how-role-card how-role-professional">
          <span className="how-role-index">02 / PROFESIONAL</span>
          <h2>Consulta tu actividad.</h2>
          <p>Cambia entre vistas de mes, semana y día. Abre una sesión para ver los datos del cliente y la reserva; solicita cambios por mensajes con su participación.</p>
          <ul><li>Agenda con vistas de mes, semana y día</li><li>Preferencias de zona y desplazamiento</li><li>Mensajes con clientes</li><li>Sin buscar otros entrenadores</li></ul>
        </article>
        <article className="how-role-card how-role-space">
          <span className="how-role-index">03 / GESTOR DE ESPACIO</span>
          <h2>Controla el uso del espacio.</h2>
          <p>Consulta las reservas del inventario vinculado a tu cuenta, las horas ocupadas y una estimación de ingresos tras una comisión de ejemplo.</p>
          <ul><li>Calendario de reservas</li><li>Ocupación y uso estimados</li><li>Sin chat con estudios o gimnasios</li></ul>
        </article>
      </section>

      <section className="how-demo-limits" aria-labelledby="how-demo-limit-title">
        <div>
          <span className="eyebrow">QUÉ ESTÁS PROBANDO</span>
          <h2 id="how-demo-limit-title">Una simulación navegable, todavía sin operación real.</h2>
        </div>
        <div className="how-demo-limit-copy">
          <p>Los perfiles, precios, horarios, desplazamientos, conversaciones, comisiones e ingresos son datos de ejemplo. No se procesan pagos, no se publican mensajes reales y no se crean reservas con profesionales o espacios.</p>
          <p>Los porcentajes, reembolsos, costes y condiciones de cancelación, cambios, liquidaciones y condiciones comerciales siguen pendientes de definir. La primera entrada gratuita al gimnasio solo se representa como una regla de la demo.</p>
        </div>
      </section>
    </div>
  );
}
