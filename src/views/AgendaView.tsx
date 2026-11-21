import { useMemo, useState } from 'react';
import { AccessNote, formatMoney } from '../components/BookingPieces.tsx';
import { Icon } from '../components/Icon.tsx';
import { PageHeading } from '../components/AppChrome.tsx';
import { DEMO_CLASS_SESSIONS, DEMO_LOCATIONS, DEMO_PROFESSIONALS, DEMO_SERVICES, DEMO_SPACES, formatDateLabel, formatTime, getDefaultSearchDate } from '../data/demoData.ts';
import { hasDemoRole, type DemoAccount } from '../data/demoAccounts.ts';
import { getAgendaEvents, getAgendaScope, getCalendarMonthGrid, toLocalDateKey, type AgendaEvent } from '../domain/calendar.ts';
import { getConversationsForUser } from '../domain/conversations.ts';
import type { DemoRole } from '../domain/models.ts';
import type { DemoStore } from '../state/useDemoStore.ts';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function localToday(): string {
  return toLocalDateKey(new Date());
}

function startOfMonth(dateKey: string): Date {
  const date = new Date(dateKey + 'T12:00:00');
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function eventKey(event: AgendaEvent): string {
  return event.bookingId + ':' + event.occurrenceId;
}

function statusLabel(status: AgendaEvent['occurrence']['status']): string {
  return status === 'confirmed' ? 'Confirmada' : status === 'cancelled' ? 'Cancelada' : 'Pendiente';
}

export function AgendaView({ account, demo, onOpenMessages, onOpenSpace }: {
  account: DemoAccount;
  demo: DemoStore;
  onOpenMessages: (conversationId?: string | null) => void;
  onOpenSpace: () => void;
}) {
  const today = localToday();
  const initialDate = getDefaultSearchDate();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const roles: readonly DemoRole[] = account.roles ?? [account.role];
  const scope = getAgendaScope({
    accountId: account.id,
    roles,
    professionalId: account.professionalId,
    spaceIds: account.spaceIds,
  });
  const events = useMemo(() => getAgendaEvents(demo.state.bookings, scope), [demo.state.bookings, account.id, account.professionalId, account.spaceIds, roles]);
  const eventsByDate = useMemo(() => events.reduce<Record<string, AgendaEvent[]>>((days, event) => ({
    ...days,
    [event.occurrence.date]: [...(days[event.occurrence.date] ?? []), event],
  }), {}), [events]);
  const monthDays = getCalendarMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth(), today);
  const selectedDayEvents = eventsByDate[selectedDate] ?? [];
  const selectedEvent = selectedDayEvents.find((event) => eventKey(event) === selectedEventKey)
    ?? selectedDayEvents[0]
    ?? null;
  const monthTitle = visibleMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const isClient = hasDemoRole(account, 'client');
  const professional = selectedEvent
    ? DEMO_PROFESSIONALS.find((item) => item.id === selectedEvent.professionalId)
    : null;
  const service = selectedEvent
    ? DEMO_SERVICES.find((item) => item.id === selectedEvent.serviceId)
    : null;
  const space = selectedEvent?.spaceId
    ? DEMO_SPACES.find((item) => item.id === selectedEvent.spaceId)
    : null;
  const location = selectedEvent
    ? space?.name ?? (selectedEvent.occurrence.locationId === 'online'
      ? 'En línea'
      : DEMO_LOCATIONS.find((item) => item.id === selectedEvent.occurrence.locationId)?.name ?? 'Ubicación demo')
    : '';
  const relatedConversation = selectedEvent && account.professionalId
    ? getConversationsForUser(demo.state.conversations, account.professionalId)
        .find((conversation) => conversation.clientId === selectedEvent.clientId && conversation.status === 'accepted')
    : undefined;
  const confirmedCount = events.filter((event) => event.occurrence.status === 'confirmed').length;
  const clientWaitlist = isClient
    ? demo.state.waitlist.filter((entry) => entry.clientId === account.id)
    : [];

  function selectDate(date: string): void {
    setSelectedDate(date);
    setSelectedEventKey(null);
    setVisibleMonth(startOfMonth(date));
  }

  function moveMonth(amount: number): void {
    const nextMonth = shiftMonth(visibleMonth, amount);
    setVisibleMonth(nextMonth);
    const selected = new Date(selectedDate + 'T12:00:00');
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(selected.getDate(), lastDay), 12);
    setSelectedDate(toLocalDateKey(nextDate));
    setSelectedEventKey(null);
  }

  function selectEvent(event: AgendaEvent): void {
    setSelectedDate(event.occurrence.date);
    setVisibleMonth(startOfMonth(event.occurrence.date));
    setSelectedEventKey(eventKey(event));
  }

  return (
    <section className="agenda-page" aria-labelledby="agenda-title">
      <div className="agenda-page-heading">
        <PageHeading
          titleId="agenda-title"
          title="Mi agenda"
          description={isClient
            ? 'Consulta tus reservas, sus horarios y los detalles de cada sesión.'
            : 'Todas tus reservas y eventos, en un calendario. Selecciona una cita para consultar sus detalles.'}
        />
        <div className="agenda-summary-chip"><Icon name="calendar" size={17} /><strong>{confirmedCount}</strong><span>reservas confirmadas</span></div>
      </div>

      <div className="agenda-layout">
        <section className="agenda-calendar-card" aria-label="Calendario mensual">
          <div className="agenda-calendar-toolbar">
            <div>
              <span className="eyebrow">CALENDARIO</span>
              <h2>{monthTitle}</h2>
            </div>
            <div className="agenda-calendar-controls">
              <button aria-label="Mes anterior" className="calendar-arrow-button is-previous" onClick={() => moveMonth(-1)} type="button"><Icon name="arrow" size={17} /></button>
              <button className="agenda-today-button" onClick={() => selectDate(today)} type="button">Hoy</button>
              <button aria-label="Mes siguiente" className="calendar-arrow-button" onClick={() => moveMonth(1)} type="button"><Icon name="arrow" size={17} /></button>
            </div>
          </div>

          <div className="agenda-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday, index) => <span key={weekday + '-' + index}>{weekday}</span>)}
          </div>
          <div className="agenda-calendar-grid">
            {monthDays.map((day) => {
              const dayEvents = eventsByDate[day.date] ?? [];
              const isSelected = day.date === selectedDate;
              const dayClasses = [
                'agenda-calendar-day',
                day.isCurrentMonth ? '' : 'is-outside-month',
                isSelected ? 'is-selected' : '',
                day.isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ');
              return (
                <div className={dayClasses} key={day.date}>
                  <button
                    aria-label={formatDateLabel(day.date, { weekday: 'long', day: 'numeric', month: 'long' }) + (dayEvents.length ? ', ' + dayEvents.length + ' reservas' : '')}
                    aria-pressed={isSelected}
                    className="agenda-day-select"
                    onClick={() => selectDate(day.date)}
                    type="button"
                  >
                    <span>{day.day}</span>
                    {dayEvents.length > 0 && <small>{dayEvents.length}</small>}
                  </button>
                  <div className="agenda-day-events">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button
                        aria-label={formatTime(event.occurrence.start) + ', ' + event.clientName + ', ' + (DEMO_SERVICES.find((item) => item.id === event.serviceId)?.name ?? 'Reserva')}
                        className={'agenda-calendar-event is-' + event.occurrence.status + (eventKey(event) === selectedEventKey ? ' is-event-selected' : '')}
                        key={eventKey(event)}
                        onClick={() => selectEvent(event)}
                        title={formatTime(event.occurrence.start) + ' · ' + event.clientName}
                        type="button"
                      >
                        <span>{formatTime(event.occurrence.start)}</span>
                        <span>{event.clientName}</span>
                      </button>
                    ))}
                    {dayEvents.length > 2 && <span className="agenda-more-events">+{dayEvents.length - 2} más</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="agenda-calendar-caption">Las citas aparecen según el perfil y los espacios asociados a tu cuenta.</p>
        </section>

        <aside className="agenda-side-panel" aria-label="Detalle del día y reserva">
          <div className="agenda-day-heading">
            <div>
              <span className="eyebrow">{selectedDate === today ? 'HOY' : 'DÍA SELECCIONADO'}</span>
              <h2>{formatDateLabel(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            </div>
            <span className="agenda-day-count">{selectedDayEvents.length}</span>
          </div>

          {selectedDayEvents.length ? (
            <div className="agenda-day-list" aria-label="Reservas del día">
              {selectedDayEvents.map((event) => {
                const eventService = DEMO_SERVICES.find((item) => item.id === event.serviceId);
                const isSelected = eventKey(event) === selectedEventKey || (!selectedEventKey && selectedEvent === event);
                return (
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? 'agenda-day-event is-selected' : 'agenda-day-event'}
                    key={eventKey(event)}
                    onClick={() => setSelectedEventKey(eventKey(event))}
                    type="button"
                  >
                    <span className="agenda-event-time">{formatTime(event.occurrence.start)}</span>
                    <span className="agenda-event-copy"><strong>{event.clientName}</strong><small>{eventService?.name ?? 'Reserva demo'}</small></span>
                    <span className={'agenda-status-dot is-' + event.occurrence.status} aria-label={statusLabel(event.occurrence.status)} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="agenda-empty-day">
              <Icon name="calendar" size={22} />
              <strong>Día sin reservas</strong>
              <p>Si se confirma una reserva, aparecerá aquí y en el calendario.</p>
            </div>
          )}

          {selectedEvent && (
            <article className="agenda-event-detail" aria-labelledby="agenda-event-title">
              <div className="agenda-detail-topline">
                <span className={'agenda-status-pill is-' + selectedEvent.occurrence.status}>{statusLabel(selectedEvent.occurrence.status)}</span>
                <span>{selectedEvent.occurrence.status === 'confirmed' ? 'Pago demo confirmado' : 'Esta fecha está cancelada'}</span>
              </div>
              <h3 id="agenda-event-title">{service?.name ?? 'Reserva demo'}</h3>
              <dl className="agenda-detail-list">
                <div><dt>Cliente</dt><dd>{selectedEvent.clientName}</dd></div>
                <div><dt>Profesional</dt><dd>{professional?.name ?? 'Profesional demo'}</dd></div>
                <div><dt>Horario</dt><dd>{formatTime(selectedEvent.occurrence.start)}–{formatTime(selectedEvent.occurrence.end)}</dd></div>
                <div><dt>Lugar</dt><dd>{location}</dd></div>
                <div><dt>Plazas</dt><dd>{selectedEvent.seats}</dd></div>
                <div><dt>Fechas</dt><dd>{selectedEvent.seriesId ? 'Serie de varias fechas' : 'Fecha única'}</dd></div>
                <div><dt>Modalidad</dt><dd>{selectedEvent.mode === 'room' ? 'Sala' : selectedEvent.mode === 'gym' ? 'Gimnasio' : selectedEvent.mode === 'home' ? 'A domicilio' : 'En línea'}</dd></div>
                {selectedEvent.occurrence.spaceAmountCents !== undefined && <div><dt>Uso del espacio</dt><dd>{formatMoney(selectedEvent.occurrence.spaceAmountCents)}</dd></div>}
              </dl>
              {space && (() => {
                const booking = demo.state.bookings.find((item) => item.id === selectedEvent.bookingId);
                return booking ? <AccessNote booking={booking} occurrence={selectedEvent.occurrence} spaces={DEMO_SPACES} /> : null;
              })()}

              <div className="agenda-event-actions">
                {isClient && selectedEvent.occurrence.status === 'confirmed' && (
                  <button className="secondary-button" onClick={() => demo.cancelOccurrence(selectedEvent.bookingId, selectedEvent.occurrenceId)} type="button">Cancelar esta fecha</button>
                )}
                {!isClient && account.professionalId && relatedConversation && (
                  <button className="secondary-button" onClick={() => onOpenMessages(relatedConversation.id)} type="button">Abrir conversación con el cliente</button>
                )}
                {!isClient && account.professionalId && !relatedConversation && (
                  <p>Para pedir un cambio de horario, primero hace falta la participación del cliente.</p>
                )}
                {isClient && selectedEvent.occurrence.status === 'cancelled' && <p>Se canceló solo esta fecha. Las demás reservas de la serie siguen igual.</p>}
                {!isClient && selectedEvent.occurrence.status === 'confirmed' && <p>Los cambios de horario necesitan la participación del cliente; esta demo no mueve la reserva directamente.</p>}
                {hasDemoRole(account, 'space') && <button className="secondary-button" onClick={onOpenSpace} type="button">Abrir mi espacio</button>}
              </div>
            </article>
          )}
        </aside>
      </div>
      {clientWaitlist.length > 0 && (
        <section className="agenda-waitlist-card" aria-labelledby="agenda-waitlist-title">
          <div>
            <span className="eyebrow">SIN PLAZA RETENIDA NI COBRO</span>
            <h2 id="agenda-waitlist-title">Lista de espera</h2>
          </div>
          <div className="agenda-waitlist-list">
            {clientWaitlist.map((entry) => {
              const session = DEMO_CLASS_SESSIONS.find((item) => item.id === entry.sessionId);
              const waitlistService = DEMO_SERVICES.find((item) => item.id === entry.serviceId);
              return (
                <article className="agenda-waitlist-row" key={entry.id}>
                  <div>
                    <strong>{waitlistService?.name ?? 'Clase de muestra'}</strong>
                    <span>{formatDateLabel(entry.date, { weekday: 'long', day: 'numeric', month: 'long' })}{session ? ' · ' + formatTime(session.start) : ''}</span>
                  </div>
                  <span>{entry.seats} plaza{entry.seats === 1 ? '' : 's'} · En espera</span>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <p className="pending-decisions-note">Calendario de demostración. Los eventos, importes y estados son ficticios; los cambios de reserva requieren confirmación.</p>
    </section>
  );
}
