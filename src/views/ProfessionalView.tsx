import { useMemo, useState } from 'react';
import { PageHeading } from '../components/AppChrome.tsx';
import { formatDateLabel, formatTime, getDefaultSearchDate, DEMO_LOCATIONS, DEMO_PROFESSIONALS, DEMO_SERVICES } from '../data/demoData.ts';
import type { BookingMode, ProfessionalPreferences } from '../domain/models.ts';
import { DEMO_BOOKING_MODE_LABELS } from '../data/demoConfig.ts';
import { getConversationsForUser } from '../domain/conversations.ts';
import type { DemoStore } from '../state/useDemoStore.ts';
import { ConversationInbox } from '../components/ConversationInbox.tsx';

const modalityChoices: BookingMode[] = ['room', 'gym', 'home', 'online'];

function createMessageId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `mensaje-${token}`;
}

export function ProfessionalView({ demo, professionalId }: { demo: DemoStore; professionalId: string }) {
  const [selectedDate, setSelectedDate] = useState(getDefaultSearchDate);
  const professional = DEMO_PROFESSIONALS.find((item) => item.id === professionalId);
  const preferences = professional
    ? demo.state.preferencesByProfessional[professional.id] ?? professional.preferences
    : null;
  const bookings = useMemo(() => demo.state.bookings
    .filter((booking) => booking.professionalId === professionalId)
    .flatMap((booking) => {
      const service = DEMO_SERVICES.find((item) => item.id === booking.serviceId);
      return booking.occurrences
        .filter((occurrence) => occurrence.date === selectedDate)
        .map((occurrence) => ({ booking, occurrence, service }));
    })
    .sort((a, b) => `${a.occurrence.date}-${a.occurrence.start}`.localeCompare(`${b.occurrence.date}-${b.occurrence.start}`)),
  [demo.state.bookings, professionalId, selectedDate]);
  const conversations = getConversationsForUser(demo.state.conversations, professionalId);

  function updatePreferences(patch: Partial<ProfessionalPreferences>): void {
    if (!professional || !preferences) return;
    demo.updatePreferences(professional.id, { ...preferences, ...patch });
  }

  function toggleModality(modality: BookingMode): void {
    if (!preferences) return;
    const modalities = preferences.modalities.includes(modality)
      ? preferences.modalities.filter((item) => item !== modality)
      : [...preferences.modalities, modality];
    updatePreferences({ modalities });
  }

  return (
    <div className="role-view professional-view" id="inicio">
      <div className="role-intro-grid">
        <PageHeading
          title="Tu agenda, con margen para moverte."
          description="Consulta tus reservas y responde a clientes. Esta vista es de solo lectura: no se cambian citas sin la participación del cliente."
        />
        <div className="role-summary-card professional-summary">
          <span className="eyebrow">PREFERENCIAS DE MUESTRA</span>
          <strong>{preferences?.maxRadiusKm ?? 0} km</strong>
          <span>Radio máximo desde tu ubicación base</span>
          <div className="summary-micro-line"><span /><span /><span /></div>
        </div>
      </div>

      <section className="professional-layout" aria-label="Perfil y preferencias de profesional">
        <article className="panel-card preference-card">
          <div className="panel-card-heading">
            <div>
              <span className="eyebrow">PERFIL DEMO</span>
              <h2>Preferencias de trabajo</h2>
              <p>Estas opciones cambian las horas y modalidades que aparecen en la vista Cliente.</p>
            </div>
            <span className="demo-tag">Editable en esta sesión</span>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="professional-base">Ubicación base</label>
              <select id="professional-base" onChange={(event) => updatePreferences({ baseLocationId: event.currentTarget.value })} value={preferences?.baseLocationId ?? ''}>
                {DEMO_LOCATIONS.filter((item) => item.id !== 'online').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                <option value="online">En línea</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="professional-radius">Radio máximo (km)</label>
              <input id="professional-radius" max="40" min="0" onChange={(event) => updatePreferences({ maxRadiusKm: Number(event.currentTarget.value) })} type="number" value={preferences?.maxRadiusKm ?? 0} />
            </div>
            <div className="field">
              <label htmlFor="professional-travel">Desplazamiento máximo (min)</label>
              <input id="professional-travel" max="180" min="0" onChange={(event) => updatePreferences({ maxTravelMinutes: Number(event.currentTarget.value) })} type="number" value={preferences?.maxTravelMinutes ?? 0} />
            </div>
            <div className="field">
              <label htmlFor="professional-buffer">Margen entre sesiones (min)</label>
              <input id="professional-buffer" max="120" min="0" onChange={(event) => updatePreferences({ bufferMinutes: Number(event.currentTarget.value) })} type="number" value={preferences?.bufferMinutes ?? 0} />
            </div>
          </div>
          <fieldset className="preference-modalities">
            <legend>Modalidades disponibles</legend>
            <p>Configuras lo que ofreces; las salas siguen siendo parte del inventario del gestor.</p>
            <div className="modality-toggles">
              {modalityChoices.map((modality) => (
                <label className="toggle-choice" key={modality}>
                  <input checked={preferences?.modalities.includes(modality) ?? false} onChange={() => toggleModality(modality)} type="checkbox" />
                  <span>{DEMO_BOOKING_MODE_LABELS[modality]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="privacy-hint"><strong>Privacidad:</strong> tus citas y los lugares de otras personas no se muestran en el buscador del cliente.</p>
        </article>

        <aside className="profile-card">
          {professional ? (
            <>
              <div className="profile-card-top">
                <span className="avatar avatar-large" aria-hidden="true">{professional.initials}</span>
                <span className="rating-chip">★ {professional.rating.toFixed(1)} <small>({professional.reviewCount})</small></span>
              </div>
              <span className="eyebrow">{professional.headline}</span>
              <h2>{professional.name}</h2>
              <p>{professional.bio}</p>
              <div className="profile-location"><span aria-hidden="true">⌖</span> {professional.publicZone}</div>
              <div className="category-chips">{professional.categories.map((category) => <span key={category}>{category}</span>)}</div>
              <div className="profile-divider" />
              <span className="eyebrow">SERVICIOS DE MUESTRA</span>
              <ul className="profile-services">
                {DEMO_SERVICES.filter((service) => service.professionalId === professional.id).map((service) => (
                  <li key={service.id}><span>{service.name}</span><strong>{(service.priceCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong></li>
                ))}
              </ul>
            </>
          ) : <p>No hay perfiles demo disponibles.</p>}
        </aside>
      </section>

      <section className="role-bookings-section" aria-labelledby="professional-bookings-title">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">TU CALENDARIO</span>
            <h2 id="professional-bookings-title">Agenda · {formatDateLabel(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <p>Consulta las citas de ese día. Para mover una reserva hace falta la participación del cliente.</p>
          </div>
          <span className="fake-data-label">{bookings.filter(({ occurrence }) => occurrence.status === 'confirmed').length} confirmadas</span>
        </div>
        <div className="calendar-toolbar">
          <label className="field" htmlFor="professional-date">
            <span>Consultar fecha</span>
            <input id="professional-date" onChange={(event) => { if (event.currentTarget.value) setSelectedDate(event.currentTarget.value); }} type="date" value={selectedDate} />
          </label>
          <span className="read-only-label">Solo consulta · sin cambios de cita</span>
        </div>
        {bookings.length ? (
          <div className="professional-booking-list">
            {bookings.map(({ booking, occurrence, service }) => (
              <article className="professional-booking-row" key={`${booking.id}-${occurrence.id}`}>
                <div className="booking-date-stamp"><strong>{new Date(`${occurrence.date}T12:00:00`).getDate().toString().padStart(2, '0')}</strong><span>{formatDateLabel(occurrence.date, { month: 'short' })}</span></div>
                <div className="booking-row-main">
                  <h3>{service?.name ?? 'Servicio demo'}</h3>
                  <p>{booking.clientName} · {formatTime(occurrence.start)} · {occurrence.locationId === 'online' ? 'En línea' : DEMO_LOCATIONS.find((location) => location.id === occurrence.locationId)?.name ?? 'Ubicación demo'}</p>
                  {booking.seriesId && <span className="series-label">Serie con fechas individuales</span>}
                </div>
                <span className={occurrence.status === 'confirmed' ? 'status-label status-confirmed' : 'status-label status-cancelled'}>
                  {occurrence.status === 'confirmed' ? 'Confirmada · pago demo' : 'Cancelada · política pendiente'}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty"><h3>Sin reservas para este perfil</h3><p>Prueba un pago correcto desde la vista Cliente para ver cómo aparece aquí.</p></div>
        )}
        <p className="pending-decisions-note">Los importes, tiempos y condiciones que aparecen aquí son ficticios. No se genera ninguna cita operativa.</p>
      </section>

      <section className="professional-messages-section" aria-labelledby="professional-messages-title">
        <div className="directory-heading">
          <div>
            <span className="eyebrow">CONTACTO CON CLIENTES</span>
            <h2 id="professional-messages-title">Solicitudes y conversaciones.</h2>
            <p>Los clientes piden contacto desde su cuenta. Acepta la solicitud para abrir el chat.</p>
          </div>
          <span className="fake-data-label">Sin búsqueda de otros profesionales</span>
        </div>
        <ConversationInbox
          conversations={conversations}
          currentUserId={professionalId}
          onSendMessage={(conversationId, body) => demo.sendConversationMessage({
            id: createMessageId(),
            conversationId,
            senderId: professionalId,
            body,
            createdAt: new Date().toISOString(),
          })}
          onStatusChange={(conversationId, status) => demo.updateConversationStatus(conversationId, professionalId, status)}
          role="professional"
        />
      </section>
    </div>
  );
}
