import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  bookfitApi,
  type AgendaEvent,
  type BookFitActor,
} from "../api/bookfit.ts";
import {
  getCalendarMonthGrid,
  getCalendarPeriodRange,
  getCalendarWeekDays,
  shiftCalendarDate,
  toLocalDateKey,
  type CalendarDateRange,
  type CalendarViewMode,
} from "../domain/calendar.ts";

type AgendaFeedback = {
  kind: "success" | "error" | "info";
  message: string;
} | null;

type AgendaViewProps = {
  actor: BookFitActor;
  agenda: AgendaEvent[];
  onLoadRange: (from: string, to: string) => Promise<void>;
  onRefresh: (range?: CalendarDateRange) => Promise<void>;
  onFeedback: (feedback: AgendaFeedback) => void;
};

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function localDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function formatCalendarDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("es-ES", options).format(localDate(value));
}

function statusLabel(status: AgendaEvent["status"]): string {
  return status === "confirmed"
    ? "Confirmada"
    : status === "cancelled"
      ? "Cancelada"
      : "Pendiente";
}

function eventKey(event: AgendaEvent): string {
  return event.occurrenceId;
}

export function AgendaView({
  actor,
  agenda,
  onLoadRange,
  onRefresh,
  onFeedback,
}: AgendaViewProps) {
  const today = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [sendingFor, setSendingFor] = useState<{
    occurrenceId: string;
    kind: "client" | "space_manager";
  } | null>(null);
  const [body, setBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  const calendarRange = useMemo(
    () => getCalendarPeriodRange(viewMode, selectedDate),
    [selectedDate, viewMode],
  );
  const sortedEvents = useMemo(
    () =>
      [...agenda].sort(
        (first, second) =>
          first.date.localeCompare(second.date) ||
          first.start.localeCompare(second.start),
      ),
    [agenda],
  );
  const eventsByDate = useMemo(() => {
    const groups = new Map<string, AgendaEvent[]>();
    for (const event of sortedEvents) {
      const dayEvents = groups.get(event.date) ?? [];
      groups.set(event.date, [...dayEvents, event]);
    }
    return groups;
  }, [sortedEvents]);
  const monthDate = localDate(selectedDate);
  const monthDays = getCalendarMonthGrid(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    today,
  );
  const weekDays = getCalendarWeekDays(selectedDate, today);
  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedEvent =
    selectedDayEvents.find((event) => eventKey(event) === selectedEventKey) ??
    selectedDayEvents[0] ??
    null;
  const confirmedCount = sortedEvents.filter(
    (event) => event.status === "confirmed",
  ).length;
  const periodTitle =
    viewMode === "month"
      ? formatCalendarDate(selectedDate, { month: "long", year: "numeric" })
      : viewMode === "day"
        ? formatCalendarDate(selectedDate, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : `${formatCalendarDate(weekDays[0].date, { day: "numeric", month: "short" })} – ${formatCalendarDate(weekDays[6].date, { day: "numeric", month: "short", year: "numeric" })}`;
  const periodName =
    viewMode === "month" ? "Mes" : viewMode === "week" ? "Semana" : "Día";
  const calendarLabel =
    viewMode === "month"
      ? "Calendario mensual"
      : viewMode === "week"
        ? "Calendario semanal"
        : "Calendario del día";
  const canSendRequest = actor.roles.includes("professional");

  useEffect(() => {
    let active = true;
    setRangeLoading(true);
    void onLoadRange(calendarRange.from, calendarRange.to)
      .catch((error: unknown) => {
        if (active) {
          onFeedback({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo cargar esta parte de la agenda.",
          });
        }
      })
      .finally(() => {
        if (active) setRangeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [calendarRange.from, calendarRange.to, onFeedback, onLoadRange]);

  function selectDate(date: string): void {
    setSelectedDate(date);
    setSelectedEventKey(null);
    setSendingFor(null);
    setViewMode("day");
  }

  function movePeriod(amount: number): void {
    setSelectedDate((current) => shiftCalendarDate(current, viewMode, amount));
    setSelectedEventKey(null);
    setSendingFor(null);
  }

  function goToToday(): void {
    setSelectedDate(today);
    setSelectedEventKey(null);
    setSendingFor(null);
  }

  function selectEvent(event: AgendaEvent): void {
    setSelectedDate(event.date);
    setSelectedEventKey(eventKey(event));
    setSendingFor(null);
    setViewMode("day");
  }

  async function cancel(event: AgendaEvent): Promise<void> {
    if (
      !window.confirm(
        `¿Cancelar solo la sesión del ${formatCalendarDate(event.date, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}?`,
      )
    ) {
      return;
    }

    setBusyId(event.occurrenceId);
    try {
      await bookfitApi.post(`/occurrences/${event.occurrenceId}/cancel`, {});
      onFeedback({
        kind: "success",
        message:
          "Se canceló esa fecha. Las demás sesiones de la serie permanecen.",
      });
      await onRefresh(calendarRange);
    } catch (error) {
      onFeedback({
        kind: "error",
        message:
          error instanceof Error ? error.message : "No se pudo cancelar.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function sendRequest(event: AgendaEvent): Promise<void> {
    if (!sendingFor) return;
    setBusyId(event.occurrenceId);
    try {
      await bookfitApi.post("/information-requests", {
        bookingOccurrenceId: sendingFor.occurrenceId,
        recipientKind: sendingFor.kind,
        body: body.trim(),
      });
      onFeedback({
        kind: "success",
        message:
          "Solicitud enviada. El destinatario podrá leerla desde Solicitudes.",
      });
      setSendingFor(null);
      setBody("");
      await onRefresh(calendarRange);
    } catch (error) {
      onFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la solicitud.",
      });
    } finally {
      setBusyId(null);
    }
  }

  function renderEventButton(event: AgendaEvent, style: "month" | "week") {
    const counterpart =
      event.clientActorId === actor.actorId
        ? event.professionalName
        : event.clientName;
    const selectedClass =
      eventKey(event) === selectedEventKey ? " is-event-selected" : "";
    const label = `${formatTime(event.start)}, ${counterpart}, ${event.serviceName}, ${statusLabel(event.status)}`;

    if (style === "month") {
      return (
        <button
          aria-label={label}
          className={`agenda-calendar-event is-${event.status}${selectedClass}`}
          key={eventKey(event)}
          onClick={() => selectEvent(event)}
          title={`${formatTime(event.start)} · ${counterpart}`}
          type="button"
        >
          <span>{formatTime(event.start)}</span>
          <span>{counterpart}</span>
        </button>
      );
    }

    return (
      <button
        aria-label={label}
        className={`agenda-week-event is-${event.status}${selectedClass}`}
        key={eventKey(event)}
        onClick={() => selectEvent(event)}
        type="button"
      >
        <time>{formatTime(event.start)}</time>
        <strong>{counterpart}</strong>
        <small>{event.serviceName}</small>
      </button>
    );
  }

  const isClientOwner =
    selectedEvent?.clientActorId === actor.actorId &&
    actor.roles.includes("client");
  const isAssignedProfessional =
    selectedEvent?.professionalId === actor.professionalId &&
    actor.roles.includes("professional");

  return (
    <section className="bf-page bf-agenda-page">
      <div className="bf-page-hero">
        <div>
          <span className="bf-kicker">TU ACTIVIDAD</span>
          <h1>Mi agenda</h1>
          <p>
            Consulta tus reservas en las vistas de mes, semana y día. Selecciona
            una sesión para ver sus detalles.
          </p>
        </div>
        <div className="agenda-summary-chip">
          <strong>{confirmedCount}</strong>
          <span>reservas confirmadas</span>
        </div>
      </div>

      <div className="agenda-layout">
        <section className="agenda-calendar-card" aria-label={calendarLabel}>
          <div className="agenda-calendar-toolbar">
            <div>
              <span className="bf-kicker">CALENDARIO</span>
              <h2>{periodTitle}</h2>
            </div>
            <div className="agenda-calendar-controls">
              <div
                className="agenda-view-switch"
                role="group"
                aria-label="Vista del calendario"
              >
                {(
                  [
                    ["month", "Mes"],
                    ["week", "Semana"],
                    ["day", "Día"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    aria-pressed={viewMode === mode}
                    className={`agenda-view-option${viewMode === mode ? " is-active" : ""}`}
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                aria-label={`${periodName} anterior`}
                className="calendar-arrow-button is-previous"
                onClick={() => movePeriod(-1)}
                type="button"
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                className="agenda-today-button"
                onClick={goToToday}
                type="button"
              >
                Hoy
              </button>
              <button
                aria-label={`${periodName} siguiente`}
                className="calendar-arrow-button"
                onClick={() => movePeriod(1)}
                type="button"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {viewMode === "month" && (
            <>
              <div className="agenda-weekdays" aria-hidden="true">
                {WEEKDAYS.map((weekday, index) => (
                  <span key={`${weekday}-${index}`}>{weekday}</span>
                ))}
              </div>
              <div className="agenda-calendar-grid">
                {monthDays.map((day) => {
                  const dayEvents = eventsByDate.get(day.date) ?? [];
                  const isSelected = day.date === selectedDate;
                  const dayClasses = [
                    "agenda-calendar-day",
                    day.isCurrentMonth ? "" : "is-outside-month",
                    isSelected ? "is-selected" : "",
                    day.isToday ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div className={dayClasses} key={day.date}>
                      <button
                        aria-label={`${formatCalendarDate(day.date, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}${dayEvents.length ? `, ${dayEvents.length} reservas` : ""}`}
                        aria-pressed={isSelected}
                        className="agenda-day-select"
                        onClick={() => selectDate(day.date)}
                        type="button"
                      >
                        <span>{day.day}</span>
                        {dayEvents.length > 0 && (
                          <small>{dayEvents.length}</small>
                        )}
                      </button>
                      <div className="agenda-day-events">
                        {dayEvents
                          .slice(0, 2)
                          .map((event) => renderEventButton(event, "month"))}
                        {dayEvents.length > 2 && (
                          <span className="agenda-more-events">
                            +{dayEvents.length - 2} más
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="agenda-calendar-caption">
                Pulsa una fecha para abrir el día; después elige una sesión para
                ver sus detalles.
              </p>
            </>
          )}

          {viewMode === "week" && (
            <div className="agenda-week-grid">
              {weekDays.map((day) => {
                const dayEvents = eventsByDate.get(day.date) ?? [];
                return (
                  <section
                    className={`agenda-week-day${day.isToday ? " is-today" : ""}`}
                    key={day.date}
                  >
                    <button
                      aria-label={`Ver ${formatCalendarDate(day.date, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}`}
                      aria-pressed={day.date === selectedDate}
                      className={`agenda-week-day-date${day.date === selectedDate ? " is-selected" : ""}`}
                      onClick={() => selectDate(day.date)}
                      type="button"
                    >
                      <span>
                        {formatCalendarDate(day.date, { weekday: "short" })}
                      </span>
                      <strong>{day.day}</strong>
                    </button>
                    <div className="agenda-week-event-list">
                      {dayEvents.length ? (
                        dayEvents.map((event) =>
                          renderEventButton(event, "week"),
                        )
                      ) : (
                        <span className="agenda-week-empty">Sin reservas</span>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {viewMode === "day" && (
            <div
              className="agenda-single-day"
              aria-label={`Sesiones del ${periodTitle}`}
            >
              {selectedDayEvents.length ? (
                selectedDayEvents.map((event) => {
                  const isSelected =
                    selectedEvent &&
                    eventKey(event) === eventKey(selectedEvent);
                  return (
                    <button
                      aria-pressed={Boolean(isSelected)}
                      className={`agenda-timeline-event${isSelected ? " is-selected" : ""}`}
                      key={eventKey(event)}
                      onClick={() => setSelectedEventKey(eventKey(event))}
                      type="button"
                    >
                      <time>
                        {formatTime(event.start)}–{formatTime(event.end)}
                      </time>
                      <span
                        className="agenda-timeline-line"
                        aria-hidden="true"
                      />
                      <span className="agenda-timeline-copy">
                        <strong>
                          {event.clientActorId === actor.actorId
                            ? event.professionalName
                            : event.clientName}
                        </strong>
                        <small>
                          {event.serviceName} · {event.professionalName}
                        </small>
                      </span>
                      <span className={`agenda-status-pill is-${event.status}`}>
                        {statusLabel(event.status)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="agenda-empty-day agenda-empty-day-large">
                  <strong>Día sin reservas</strong>
                  <p>
                    Si se confirma una reserva, aparecerá aquí y en el
                    calendario.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="agenda-side-panel" aria-label="Detalle de agenda">
          <div className="agenda-day-heading">
            <div>
              <span className="bf-kicker">
                {selectedDate === today ? "HOY" : "DÍA SELECCIONADO"}
              </span>
              <h2>
                {formatCalendarDate(selectedDate, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>
            </div>
            <span className="agenda-day-count">{selectedDayEvents.length}</span>
          </div>

          {viewMode !== "day" && selectedDayEvents.length > 0 && (
            <div className="agenda-day-list" aria-label="Reservas del día">
              {selectedDayEvents.map((event) => {
                const isSelected =
                  eventKey(event) === selectedEventKey ||
                  (!selectedEventKey && selectedEvent === event);
                return (
                  <button
                    aria-pressed={Boolean(isSelected)}
                    className={`agenda-day-event${isSelected ? " is-selected" : ""}`}
                    key={eventKey(event)}
                    onClick={() => setSelectedEventKey(eventKey(event))}
                    type="button"
                  >
                    <span className="agenda-event-time">
                      {formatTime(event.start)}
                    </span>
                    <span className="agenda-event-copy">
                      <strong>
                        {event.clientActorId === actor.actorId
                          ? event.professionalName
                          : event.clientName}
                      </strong>
                      <small>{event.serviceName}</small>
                    </span>
                    <span
                      className={`agenda-status-dot is-${event.status}`}
                      aria-label={statusLabel(event.status)}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {!selectedDayEvents.length && (
            <div className="agenda-empty-day">
              <strong>Día sin reservas</strong>
              <p>Las sesiones confirmadas aparecerán aquí.</p>
            </div>
          )}

          {selectedEvent && (
            <article
              className="agenda-event-detail"
              aria-labelledby="agenda-event-title"
            >
              <div className="agenda-detail-topline">
                <span
                  className={`agenda-status-pill is-${selectedEvent.status}`}
                >
                  {statusLabel(selectedEvent.status)}
                </span>
                <span>
                  {selectedEvent.status === "confirmed"
                    ? "Reserva guardada"
                    : selectedEvent.status === "cancelled"
                      ? "Cancelada en esta fecha"
                      : "Pendiente"}
                </span>
              </div>
              <h3 id="agenda-event-title">{selectedEvent.serviceName}</h3>
              <dl className="agenda-detail-list">
                <div>
                  <dt>Cliente</dt>
                  <dd>{selectedEvent.clientName}</dd>
                </div>
                <div>
                  <dt>Profesional</dt>
                  <dd>{selectedEvent.professionalName}</dd>
                </div>
                <div>
                  <dt>Horario</dt>
                  <dd>
                    {formatTime(selectedEvent.start)}–
                    {formatTime(selectedEvent.end)}
                  </dd>
                </div>
                <div>
                  <dt>Lugar</dt>
                  <dd>
                    {selectedEvent.spaceName ??
                      (selectedEvent.mode === "online"
                        ? "En línea"
                        : selectedEvent.mode === "home"
                          ? "A domicilio"
                          : "Por confirmar")}
                  </dd>
                </div>
                <div>
                  <dt>Plazas</dt>
                  <dd>{selectedEvent.seats}</dd>
                </div>
                <div>
                  <dt>Modalidad</dt>
                  <dd>
                    {selectedEvent.mode === "room"
                      ? "Sala"
                      : selectedEvent.mode === "gym"
                        ? "Gimnasio"
                        : selectedEvent.mode === "home"
                          ? "A domicilio"
                          : "En línea"}
                  </dd>
                </div>
              </dl>

              <div className="agenda-event-actions">
                {isClientOwner && selectedEvent.status === "confirmed" && (
                  <button
                    className="bf-button bf-button-outline bf-small"
                    disabled={busyId === selectedEvent.occurrenceId}
                    onClick={() => void cancel(selectedEvent)}
                    type="button"
                  >
                    Cancelar esta fecha
                  </button>
                )}
                {canSendRequest &&
                  isAssignedProfessional &&
                  selectedEvent.status === "confirmed" && (
                    <>
                      <button
                        className="bf-text-action"
                        onClick={() => {
                          setSendingFor({
                            occurrenceId: selectedEvent.occurrenceId,
                            kind: "client",
                          });
                          setBody("");
                        }}
                        type="button"
                      >
                        Solicitar información al cliente
                      </button>
                      {selectedEvent.spaceId && (
                        <button
                          className="bf-text-action"
                          onClick={() => {
                            setSendingFor({
                              occurrenceId: selectedEvent.occurrenceId,
                              kind: "space_manager",
                            });
                            setBody("");
                          }}
                          type="button"
                        >
                          Solicitar al gestor del espacio
                        </button>
                      )}
                    </>
                  )}
                {rangeLoading && (
                  <p role="status">Actualizando las reservas visibles…</p>
                )}
              </div>

              {sendingFor?.occurrenceId === selectedEvent.occurrenceId && (
                <form
                  className="bf-request-composer"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void sendRequest(selectedEvent);
                  }}
                >
                  <label htmlFor={`bf-request-${selectedEvent.occurrenceId}`}>
                    Solicitud para{" "}
                    {sendingFor.kind === "client"
                      ? selectedEvent.clientName
                      : "el gestor del espacio"}
                  </label>
                  <textarea
                    id={`bf-request-${selectedEvent.occurrenceId}`}
                    maxLength={1200}
                    minLength={1}
                    onChange={(event) => setBody(event.currentTarget.value)}
                    placeholder="Escribe la información concreta que necesitas…"
                    required
                    value={body}
                  />
                  <div className="bf-request-actions">
                    <small>
                      {body.length}/1200 · solicitud unidireccional, sin chat
                    </small>
                    <button
                      className="bf-button bf-button-primary bf-small"
                      disabled={
                        busyId === selectedEvent.occurrenceId || !body.trim()
                      }
                      type="submit"
                    >
                      Enviar solicitud
                    </button>
                    <button
                      className="bf-link-button"
                      onClick={() => setSendingFor(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </article>
          )}

          {rangeLoading && !selectedEvent && (
            <p role="status">Cargando reservas de este periodo…</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
