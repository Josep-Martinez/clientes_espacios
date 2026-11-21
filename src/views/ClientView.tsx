import { useMemo, useState } from 'react';
import { DEMO_CLIENT_ID, DEMO_CLIENT_NAME, DEMO_CUSTOMER_AREA_RADIUS_KM, DEMO_DECISIONS_NOTICE, DEMO_FEES, DEMO_TIME_LABEL } from '../data/demoConfig.ts';
import {
  DEMO_CLASS_SESSIONS,
  DEMO_LOCATIONS,
  DEMO_PROFESSIONALS,
  DEMO_SERVICES,
  DEMO_SPACES,
  TIME_CHOICES,
  formatDateLabel,
  formatTime,
  getDefaultSearchDate,
  simulatedDistanceKm,
  simulatedTravelMinutes,
} from '../data/demoData.ts';
import { canReserveSeats, countConfirmedSeats, joinWaitlist } from '../domain/capacity.ts';
import { getBookingOptions, type BookingTimeOption } from '../domain/bookingOptions.ts';
import type { BookingMode, DemoBooking, DemoClassSession, DemoService } from '../domain/models.ts';
import { calculateCheckout } from '../domain/pricing.ts';
import { hasConfirmedGymVisit, resolveCheckoutPayment } from '../domain/reservations.ts';
import { searchServices, type PublicServiceResult } from '../domain/search.ts';
import { type DemoStore } from '../state/useDemoStore.ts';
import { createConfirmedDemoBooking, makeOccurrence, makeWaitlistEntry } from '../state/demoState.ts';
import { AccessNote, formatMoney, MoneyBreakdown, OccurrenceLine, ServiceResultRow } from '../components/BookingPieces.tsx';
import { BookingThread, PageHeading } from '../components/AppChrome.tsx';

type ClientFlow = 'individual' | 'gym' | 'group';

function createDemoId(kind: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${kind}-${random}`;
}

function getLocalToday(): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

function getConfirmedCommitments(
  demo: DemoStore,
  professionalId: string,
  date: string,
): Array<{ kind: 'appointment'; start: number; end: number; locationId: string }> {
  return demo.state.bookings.flatMap((booking) =>
    booking.professionalId !== professionalId
      ? []
      : booking.occurrences
          .filter((occurrence) => occurrence.date === date && occurrence.status === 'confirmed')
          .map((occurrence) => ({
            kind: 'appointment' as const,
            start: occurrence.start,
            end: occurrence.end,
            locationId: occurrence.locationId,
          })),
  );
}

function getSpaceReservations(demo: DemoStore) {
  return demo.state.bookings.flatMap((booking) =>
    !booking.spaceId
      ? []
      : booking.occurrences
          .filter((occurrence) => occurrence.status === 'confirmed')
          .map((occurrence) => ({
            spaceId: booking.spaceId as string,
            date: occurrence.date,
            start: occurrence.start,
            end: occurrence.end,
            status: 'confirmed' as const,
          })),
  );
}

function getClassRows(service: DemoService, date: string, demo: DemoStore) {
  return DEMO_CLASS_SESSIONS
    .filter((session) => session.serviceId === service.id && session.date >= date)
    .map((session) => {
      const confirmedSeats = countConfirmedSeats(session.id, demo.state.bookings);
      return {
        session,
        confirmedSeats,
        remainingSeats: Math.max(0, session.capacity - confirmedSeats),
        space: DEMO_SPACES.find((item) => item.id === session.spaceId),
      };
    });
}

export function ClientView({ demo }: { demo: DemoStore }) {
  const [flow, setFlow] = useState<ClientFlow>('individual');
  const [query, setQuery] = useState('');
  const [areaLocationId, setAreaLocationId] = useState('ruzafa');
  const [searchDate, setSearchDate] = useState(getDefaultSearchDate);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<BookingMode>('room');
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [seats, setSeats] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'failure' | null>(null);
  const [feedback, setFeedback] = useState('');

  const resultFormat = flow === 'group' ? 'group' : 'individual';
  const serviceResults = useMemo(() => {
    const all = searchServices({
      query,
      format: resultFormat,
      areaLocationId,
      maxAreaDistanceKm: DEMO_CUSTOMER_AREA_RADIUS_KM,
      professionals: DEMO_PROFESSIONALS,
      services: DEMO_SERVICES,
      distanceKm: simulatedDistanceKm,
    });
    return all.filter((item) => {
      const itemProfessional = DEMO_PROFESSIONALS.find((candidate) => candidate.id === item.professional.id);
      if (!itemProfessional) return false;
      const itemPreferences = demo.state.preferencesByProfessional[itemProfessional.id] ?? itemProfessional.preferences;
      const enabledModalities = item.service.modalities.filter((mode) => itemPreferences.modalities.includes(mode));

      if (flow === 'gym') return enabledModalities.includes('gym');
      if (flow === 'individual') return enabledModalities.some((mode) => mode !== 'gym');
      return enabledModalities.length > 0;
    });
  }, [areaLocationId, demo.state.preferencesByProfessional, flow, query, resultFormat]);

  const selectedResult = serviceResults.find((item) => item.service.id === selectedServiceId) ?? null;
  const selectedService = selectedResult?.service ?? null;
  const professional = selectedResult
    ? DEMO_PROFESSIONALS.find((item) => item.id === selectedResult.professional.id) ?? null
    : null;
  const preferences = professional
    ? demo.state.preferencesByProfessional[professional.id] ?? professional.preferences
    : null;
  const selectedClasses = selectedService && selectedService.format === 'group'
    ? getClassRows(selectedService, searchDate, demo)
    : [];
  const selectedClassRows = selectedClasses.filter((row) => selectedClassIds.includes(row.session.id));
  const maxSelectedSeats = selectedClassRows.length
    ? Math.min(...selectedClassRows.map((row) => row.remainingSeats))
    : Math.max(1, Math.min(selectedService?.groupCapacity ?? 1, ...selectedClasses.filter((row) => row.remainingSeats > 0).map((row) => row.remainingSeats)));
  const individualOptions = selectedService && professional && preferences && selectedService.format === 'individual'
    && preferences.modalities.includes(selectedMode)
    ? getBookingOptions({
        candidates: TIME_CHOICES.map((start) => ({
          id: `${searchDate}-${start}`,
          start,
          end: start + selectedService.durationMinutes,
          locationId: 'online',
        })),
        date: searchDate,
        mode: selectedMode,
        professional: preferences,
        commitments: [
          ...(professional.privateCalendarByWeekday[new Date(`${searchDate}T12:00:00`).getDay()] ?? []),
          ...getConfirmedCommitments(demo, professional.id, searchDate),
        ],
        spaces: DEMO_SPACES,
        spaceReservations: getSpaceReservations(demo),
        requiredEquipment: selectedService.requiredEquipment,
        requestedCapacity: 1,
        preferredAreaLocationId: areaLocationId,
        maxClientDistanceKm: DEMO_CUSTOMER_AREA_RADIUS_KM,
        travel: { distanceKm: simulatedDistanceKm, travelMinutes: simulatedTravelMinutes },
      })
    : [];
  const selectedTimeOption = individualOptions.find((option) => option.start === selectedTime) ?? null;
  const selectedSpace = selectedTimeOption?.spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedClassSpace = selectedClassRows[0]?.space ?? null;
  const checkoutSpace = selectedMode === 'room' || selectedMode === 'gym' ? selectedSpace : selectedClassSpace;
  const showSpace = selectedService?.format === 'group'
    ? Boolean(selectedClassSpace)
    : (selectedMode === 'room' || selectedMode === 'gym') && Boolean(selectedSpace);
  const occurrenceCount = selectedService?.format === 'group' ? selectedClassRows.length : 1;
  const quoteSeats = selectedService?.format === 'group' ? seats : 1;
  const isNewAtGym = selectedMode === 'gym' && selectedSpaceId
    ? !hasConfirmedGymVisit(demo.state.bookings, DEMO_CLIENT_ID, selectedSpaceId)
    : false;
  const quote = selectedService
    ? calculateCheckout({
        servicePriceCents: selectedService.priceCents,
        occurrenceCount: Math.max(1, occurrenceCount),
        seats: quoteSeats,
        spacePricePerOccurrenceCents: showSpace ? checkoutSpace?.pricePerOccurrenceCents ?? 0 : 0,
        freeSpaceOccurrences: isNewAtGym ? 1 : 0,
        fees: DEMO_FEES,
      })
    : null;
  const canContinue = selectedService?.format === 'group'
    ? selectedClassRows.length > 0 && selectedClassRows.every((row) => canReserveSeats({
        capacity: row.session.capacity,
        confirmedSeats: row.confirmedSeats,
        requestedSeats: seats,
      }))
    : selectedService?.format === 'individual' && preferences?.modalities.includes(selectedMode) && selectedTimeOption !== null &&
      ((selectedMode !== 'room' && selectedMode !== 'gym') || selectedSpace !== null);

  function chooseFlow(nextFlow: ClientFlow): void {
    setFlow(nextFlow);
    setSelectedServiceId(null);
    setSelectedClassIds([]);
    setSelectedTime(null);
    setSelectedSpaceId(null);
    setCheckoutOpen(false);
    setPaymentResult(null);
    setFeedback('');
  }

  function chooseService(result: PublicServiceResult): void {
    const service = result.service;
    setSelectedServiceId(service.id);
    const itemProfessional = DEMO_PROFESSIONALS.find((candidate) => candidate.id === result.professional.id);
    const itemPreferences = itemProfessional
      ? demo.state.preferencesByProfessional[itemProfessional.id] ?? itemProfessional.preferences
      : null;
    const enabledModalities = itemPreferences
      ? service.modalities.filter((mode) => itemPreferences.modalities.includes(mode))
      : [];
    const preferredMode = flow === 'gym'
      ? 'gym'
      : enabledModalities.find((mode) => mode !== 'gym') ?? enabledModalities[0] ?? service.modalities[0];
    setSelectedMode(preferredMode);
    setSelectedTime(null);
    setSelectedSpaceId(null);
    setSelectedClassIds([]);
    setSeats(1);
    setCheckoutOpen(false);
    setPaymentResult(null);
    setFeedback('');
    if (service.format === 'group') {
      const firstOpen = getClassRows(service, searchDate, demo).find((row) => row.remainingSeats > 0);
      if (firstOpen) setSelectedClassIds([firstOpen.session.id]);
    }
  }

  function setDate(date: string): void {
    setSearchDate(date);
    setSelectedClassIds([]);
    setSelectedTime(null);
    setSelectedSpaceId(null);
    setCheckoutOpen(false);
    setPaymentResult(null);
  }

  function selectTime(option: BookingTimeOption): void {
    setSelectedTime(option.start);
    setSelectedSpaceId(option.spaces[0]?.id ?? null);
    setCheckoutOpen(false);
    setPaymentResult(null);
  }

  function toggleClass(session: DemoClassSession): void {
    const row = selectedClasses.find((item) => item.session.id === session.id);
    if (!row || !canReserveSeats({ capacity: session.capacity, confirmedSeats: row.confirmedSeats, requestedSeats: seats })) return;
    setSelectedClassIds((current) => current.includes(session.id)
      ? current.filter((id) => id !== session.id)
      : [...current, session.id]);
    setCheckoutOpen(false);
    setPaymentResult(null);
  }

  function joinClassWaitlist(session: DemoClassSession): void {
    const row = selectedClasses.find((item) => item.session.id === session.id);
    if (!row) return;
    const id = createDemoId('espera');
    const entry = joinWaitlist(
      [],
      { id, clientId: DEMO_CLIENT_ID, sessionId: session.id },
      { capacity: session.capacity, confirmedSeats: row.confirmedSeats },
    );
    if (!entry) return;
    demo.addWaitlist(makeWaitlistEntry({
      id,
      sessionId: session.id,
      serviceId: session.serviceId,
      date: session.date,
      seats,
    }));
    setFeedback(`Te has apuntado a la lista de espera para el ${formatDateLabel(session.date)}. No se cobra ni se reserva una plaza.`);
  }

  function createDraftBooking(): Omit<DemoBooking, 'paymentStatus'> | null {
    if (!selectedService || !professional) return null;
    const seriesId = occurrenceCount > 1 ? createDemoId('serie') : null;
    const occurrences = selectedService.format === 'group'
      ? selectedClassRows.map((row) => makeOccurrence({
          id: createDemoId('fecha'),
          sessionId: row.session.id,
          date: row.session.date,
          start: row.session.start,
          end: row.session.end,
          locationId: row.space?.locationId ?? 'online',
        }))
      : selectedTimeOption
        ? [makeOccurrence({
            id: createDemoId('fecha'),
            date: searchDate,
            start: selectedTimeOption.start,
            end: selectedTimeOption.end,
            locationId: selectedMode === 'room' || selectedMode === 'gym'
              ? selectedSpace?.locationId ?? 'online'
              : selectedMode === 'home'
                ? areaLocationId
                : 'online',
          })]
        : [];
    if (!occurrences.length) return null;
    return {
      id: createDemoId('reserva'),
      clientId: DEMO_CLIENT_ID,
      clientName: DEMO_CLIENT_NAME,
      professionalId: professional.id,
      serviceId: selectedService.id,
      spaceId: selectedService.format === 'group'
        ? selectedClassRows[0]?.session.spaceId ?? null
        : (selectedMode === 'room' || selectedMode === 'gym') ? selectedSpace?.id ?? null : null,
      mode: selectedService.format === 'group' ? 'room' : selectedMode,
      seats: selectedService.format === 'group' ? seats : 1,
      seriesId,
      occurrences,
    };
  }

  function simulatePayment(outcome: 'success' | 'failure'): void {
    const draft = createDraftBooking();
    if (!draft) return;

    if (outcome === 'failure') {
      const failed = resolveCheckoutPayment({
        outcome: 'failure',
        draft: { ...draft, occurrences: draft.occurrences.map((occurrence) => ({ ...occurrence, status: 'pending' as const })) },
      });
      setPaymentResult('failure');
      setFeedback(failed.booking === null
        ? 'El pago de prueba ha fallado. No se ha creado ninguna reserva ni se ha retenido una plaza.'
        : 'No se pudo completar la simulación.');
      return;
    }

    const booking = createConfirmedDemoBooking(draft);
    demo.addBooking(booking);
    setPaymentResult('success');
    setCheckoutOpen(false);
    setFeedback('Reserva confirmada en esta demo. El cambio ya aparece en las vistas profesional y de espacio.');
  }

  const ownBookings = demo.state.bookings.filter((booking) => booking.clientId === DEMO_CLIENT_ID);
  const ownWaitlist = demo.state.waitlist.filter((entry) => entry.clientId === DEMO_CLIENT_ID);

  return (
    <div className="client-view" id="inicio">
      <section className="client-hero">
        <div className="client-hero-copy">
          <h1>Encuentra tu sesión.<br /><span>El lugar también.</span></h1>
          <p>Elige un servicio, una zona y una fecha. Trama cruza las horas viables con profesionales y espacios compatibles.</p>
          <div className="hero-meta-line">
            <span>Perfiles ficticios</span>
            <span>·</span>
            <span>Horarios de ejemplo</span>
            <span>·</span>
            <span>Sin pagos reales</span>
          </div>
        </div>
        <div className="hero-thread" aria-label="El mismo recorrido conecta servicio, profesional y espacio">
          <div className="hero-thread-top">
            <span className="hero-thread-kicker">UN SOLO RECORRIDO</span>
            <span className="hero-thread-id">01 — 03</span>
          </div>
          <div className="hero-thread-line" aria-hidden="true"><span /><span /><span /></div>
          <div className="hero-thread-names">
            <span>Servicio</span>
            <span>Profesional</span>
            <span>Espacio</span>
          </div>
          <div className="hero-thread-slot">
            <div>
              <span>Hora viable</span>
              <strong>18:30</strong>
            </div>
            <span className="slot-space-mark">Ruzafa · sala compatible</span>
          </div>
          <p>Vista de muestra. Sin rutas reales ni disponibilidad operativa.</p>
        </div>
      </section>

      <section className="search-panel" aria-labelledby="search-title">
        <div className="search-panel-heading">
          <div>
            <h2 id="search-title">¿Qué te apetece reservar?</h2>
            <p>Busca por servicio, especialidad, zona y día.</p>
          </div>
          <span className="fake-data-label">Catálogo de muestra</span>
        </div>
        <form className="search-form" onSubmit={(event) => event.preventDefault()}>
          <div className="search-field search-field-service">
            <label htmlFor="service-search">Servicio o especialidad</label>
            <div className="input-with-icon">
              <span className="input-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 19a8 8 0 1 1 5.66-2.34L21 21" /></svg></span>
              <input id="service-search" onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Pilates, fisioterapia…" value={query} />
            </div>
          </div>
          <div className="search-field">
            <label htmlFor="client-area">Zona</label>
            <select id="client-area" onChange={(event) => setAreaLocationId(event.currentTarget.value)} value={areaLocationId}>
              {DEMO_LOCATIONS.filter((location) => location.id !== 'online').map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="client-date">Fecha</label>
            <input id="client-date" min={getLocalToday()} onChange={(event) => setDate(event.currentTarget.value)} type="date" value={searchDate} />
          </div>
          <button className="primary-button search-submit" type="submit">Buscar opciones</button>
        </form>
        <div className="flow-tabs" role="group" aria-label="Tipo de reserva">
          <button aria-pressed={flow === 'individual'} className={flow === 'individual' ? 'flow-tab is-active' : 'flow-tab'} onClick={() => chooseFlow('individual')} type="button">Sesión individual</button>
          <button aria-pressed={flow === 'gym'} className={flow === 'gym' ? 'flow-tab is-active' : 'flow-tab'} onClick={() => chooseFlow('gym')} type="button">Gimnasio</button>
          <button aria-pressed={flow === 'group'} className={flow === 'group' ? 'flow-tab is-active' : 'flow-tab'} onClick={() => chooseFlow('group')} type="button">Clase grupal</button>
        </div>
      </section>

      <section className="client-workspace" aria-label="Resultados y reserva">
        <div className="results-column" id="resultados" tabIndex={-1}>
          <div className="section-title-row">
            <div>
              <h2>{flow === 'group' ? 'Clases con plazas' : flow === 'gym' ? 'Entrenamiento con gimnasio' : 'Sesiones disponibles'}</h2>
              <p>{serviceResults.length} {serviceResults.length === 1 ? 'opción de muestra' : 'opciones de muestra'} cerca de {DEMO_LOCATIONS.find((item) => item.id === areaLocationId)?.name}</p>
            </div>
            <span className="sort-label">Compatibilidad primero</span>
          </div>
          {serviceResults.length ? (
            <div className="service-list">
              {serviceResults.map((result) => (
                <ServiceResultRow
                  key={result.service.id}
                  onSelect={() => chooseService(result)}
                  result={result}
                  selected={selectedServiceId === result.service.id}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No encontramos opciones con esos filtros</h3>
              <p>Prueba otra fecha, zona o especialidad. Las horas ocupadas y los datos privados del profesional no se muestran.</p>
            </div>
          )}
          <p className="distance-note">{DEMO_TIME_LABEL}. Las zonas y distancias también son ficticias.</p>
        </div>

        <aside className="booking-column" aria-label="Configurar la reserva">
          {!selectedResult || !selectedService || !professional || !preferences ? (
            <div className="booking-start">
              <span className="booking-start-line" aria-hidden="true"><i /><i /><i /></span>
              <h2>Una reserva, tres piezas coordinadas.</h2>
              <p>Selecciona un servicio y verás solo los horarios viables y, cuando haga falta, las salas compatibles.</p>
              <div className="booking-start-points">
                <span>Agenda privada protegida</span>
                <span>Espacio comprobado</span>
                <span>Resumen antes del pago demo</span>
              </div>
            </div>
          ) : (
            <div className="booking-panel">
              <div className="booking-panel-head">
                <div>
                  <span className="booking-panel-label">Tu selección</span>
                  <h2>{selectedService.name}</h2>
                </div>
                <button className="quiet-button" onClick={() => { setSelectedServiceId(null); setCheckoutOpen(false); setPaymentResult(null); }} type="button">Cambiar</button>
              </div>
              <BookingThread active={checkoutOpen || paymentResult === 'success' ? 'confirm' : 'schedule'} />

              {selectedService.format === 'group' ? (
                <div className="group-selection">
                  <div className="selection-block-title">
                    <h3>Elige una o varias fechas</h3>
                    <span>{selectedClasses.length} fechas próximas</span>
                  </div>
                  <div className="seat-picker">
                    <label htmlFor="group-seats">Plazas para tu grupo</label>
                    <input
                      id="group-seats"
                      max={Math.max(1, Math.min(selectedService.groupCapacity ?? 1, ...selectedClasses.filter((row) => row.remainingSeats > 0).map((row) => row.remainingSeats)))}
                      min="1"
                      onChange={(event) => {
                        const value = Number(event.currentTarget.value);
                        setSeats(Number.isFinite(value) ? Math.max(1, value) : 1);
                        setSelectedClassIds((current) => current.filter((id) => {
                          const row = selectedClasses.find((item) => item.session.id === id);
                          return Boolean(row && row.remainingSeats >= value);
                        }));
                        setCheckoutOpen(false);
                      }}
                      type="number"
                      value={seats}
                    />
                    <span>Máximo 8 plazas por compra demo.</span>
                  </div>
                  <div className="class-date-list">
                    {selectedClasses.map(({ session, confirmedSeats, remainingSeats, space }) => {
                      const canSelect = canReserveSeats({ capacity: session.capacity, confirmedSeats, requestedSeats: seats });
                      const selected = selectedClassIds.includes(session.id);
                      return (
                        <article className={selected ? 'class-date-row is-selected' : 'class-date-row'} key={session.id}>
                          <label className="class-date-choice">
                            <input checked={selected} disabled={!canSelect} onChange={() => toggleClass(session)} type="checkbox" />
                            <span>
                              <strong>{formatDateLabel(session.date, { weekday: 'long' })}</strong>
                              <small>{formatTime(session.start)} · {space?.zoneLabel ?? 'València'} · {space?.name ?? 'Espacio demo'}</small>
                            </span>
                          </label>
                          <div className="class-seat-state">
                            <span className={remainingSeats === 0 ? 'capacity-label is-full' : 'capacity-label'}>
                              {remainingSeats === 0 ? 'Completa' : `${remainingSeats} plazas`}
                            </span>
                            {remainingSeats === 0 && (
                              <button className="inline-button" onClick={() => joinClassWaitlist(session)} type="button">Lista de espera</button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {!selectedClasses.length && (
                    <p className="general-empty">No hay clases para esa fecha. Cambia el día para ver otras opciones.</p>
                  )}
                </div>
              ) : (
                <div className="individual-selection">
                  <div className="selection-control-row">
                    <div className="selection-block-title">
                      <h3>Modalidad</h3>
                      <span>Configurable por el profesional</span>
                    </div>
                    <fieldset className="mode-options">
                      <legend className="visually-hidden">Modalidad del servicio</legend>
                      {selectedService.modalities.map((mode) => {
                        const allowed = preferences.modalities.includes(mode);
                        return (
                          <label className={selectedMode === mode ? 'mode-option is-selected' : 'mode-option'} key={mode}>
                            <input checked={selectedMode === mode} disabled={!allowed} name="service-mode" onChange={() => { setSelectedMode(mode); setSelectedTime(null); setSelectedSpaceId(null); setCheckoutOpen(false); }} type="radio" />
                            <span>{mode === 'room' ? 'Sala' : mode === 'gym' ? 'Gimnasio' : mode === 'home' ? 'A domicilio' : 'En línea'}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                    {!preferences.modalities.includes(selectedMode) && (
                      <p className="general-empty">Esta modalidad está pausada en las preferencias demo del profesional.</p>
                    )}
                  </div>
                  <div className="selection-block-title">
                    <h3>Horas viables</h3>
                    <span>{formatDateLabel(searchDate, { weekday: 'long' })}</span>
                  </div>
                  {individualOptions.length ? (
                    <div className="time-options" role="group" aria-label="Horas viables para la fecha seleccionada">
                      {individualOptions.map((option) => (
                        <button
                          aria-pressed={selectedTime === option.start}
                          className={selectedTime === option.start ? 'time-option is-selected' : 'time-option'}
                          key={`${option.start}-${option.end}`}
                          onClick={() => selectTime(option)}
                          type="button"
                        >
                          {formatTime(option.start)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="general-empty">No encontramos una hora que encaje con esta fecha y zona. Prueba otra fecha o modalidad.</p>
                  )}

                  {selectedTimeOption && (selectedMode === 'room' || selectedMode === 'gym') && (
                    <fieldset className="space-picker">
                      <legend>{selectedMode === 'gym' ? 'Gimnasio compatible' : 'Sala compatible'}</legend>
                      {selectedTimeOption.spaces.length ? selectedTimeOption.spaces.map((space) => (
                        <label className={selectedSpaceId === space.id ? 'space-choice is-selected' : 'space-choice'} key={space.id}>
                          <input checked={selectedSpaceId === space.id} name="compatible-space" onChange={() => setSelectedSpaceId(space.id)} type="radio" />
                          <span className="space-choice-name">
                            <strong>{space.name}</strong>
                            <small>{space.zoneLabel ?? space.locationId} · hasta {space.capacity} personas</small>
                            <small>{space.equipment.join(' · ')}</small>
                          </span>
                          <span className="space-choice-price">{selectedMode === 'gym' && isNewAtGym ? 'Primera entrada gratis' : formatMoney(space.pricePerOccurrenceCents ?? 0)}</span>
                        </label>
                      )) : <p className="general-empty">No hay un espacio compatible para esta hora. Prueba otra hora o zona.</p>}
                    </fieldset>
                  )}
                </div>
              )}

              {feedback && <p className="inline-feedback" role="status">{feedback}</p>}

              {!checkoutOpen && paymentResult !== 'success' && (
                <div className="booking-action">
                  <div className="booking-estimate">
                    <span>{selectedService.format === 'group' ? `${selectedClassRows.length || 0} fecha${selectedClassRows.length === 1 ? '' : 's'} seleccionadas` : `${selectedService.durationMinutes} minutos`}</span>
                    <strong>{quote ? formatMoney(quote.total) : '—'}</strong>
                  </div>
                  <button className="primary-button full-button" disabled={!canContinue} onClick={() => { setCheckoutOpen(true); setPaymentResult(null); }} type="button">
                    Revisar reserva
                  </button>
                  <p>El precio se muestra antes de la simulación de pago.</p>
                </div>
              )}

              {checkoutOpen && quote && selectedService && (
                <section className="checkout-panel" aria-labelledby="checkout-title">
                  <div className="checkout-heading">
                    <div>
                      <span className="checkout-overline">RESUMEN ÚNICO</span>
                      <h3 id="checkout-title">Confirma la simulación</h3>
                    </div>
                    <button className="quiet-button" onClick={() => setCheckoutOpen(false)} type="button">Volver</button>
                  </div>
                  <div className="checkout-itinerary">
                    <strong>{professional?.name}</strong>
                    <span>{selectedService.name} · {selectedService.format === 'group' ? `${seats} plazas` : `${selectedService.durationMinutes} min`}</span>
                    {selectedService.format === 'group'
                      ? selectedClassRows.map(({ session, space }) => (
                          <span className="itinerary-date" key={session.id}>{formatDateLabel(session.date)} · {formatTime(session.start)} · {space?.name}</span>
                        ))
                      : <span className="itinerary-date">{formatDateLabel(searchDate)} · {selectedTimeOption ? formatTime(selectedTimeOption.start) : ''} · {selectedSpace?.name ?? (selectedMode === 'online' ? 'En línea' : areaLocationId)}</span>}
                    {isNewAtGym && <span className="itinerary-free">Primera entrada al gimnasio: 0 € en esta demo</span>}
                  </div>
                  <MoneyBreakdown
                    firstGymEntry={isNewAtGym}
                    occurrenceCount={Math.max(1, occurrenceCount)}
                    quote={quote}
                    seats={quoteSeats}
                    service={selectedService}
                    servicePercent={DEMO_FEES.serviceCommissionPercent}
                    showSpace={showSpace}
                    spaceLabel={selectedMode === 'gym' ? 'Acceso al gimnasio' : 'Uso del espacio'}
                    spacePercent={DEMO_FEES.spaceCommissionPercent}
                  />
                  <p className="checkout-demo-warning">No se cobra dinero real. El resultado solo sirve para probar el recorrido; no confirma una cita operativa.</p>
                  {paymentResult === 'failure' && <p className="payment-error" role="alert">{feedback}</p>}
                  <div className="payment-actions">
                    <button className="primary-button" onClick={() => simulatePayment('success')} type="button">Simular pago correcto</button>
                    <button className="secondary-button" onClick={() => simulatePayment('failure')} type="button">Simular pago fallido</button>
                  </div>
                </section>
              )}

              {paymentResult === 'success' && (
                <div className="payment-success" role="status">
                  <span className="success-mark" aria-hidden="true">✓</span>
                  <div>
                    <h3>Reserva confirmada en la demo</h3>
                    <p>{feedback}</p>
                  </div>
                  <a className="text-button" href="#mis-reservas">Ver mis reservas</a>
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      {selectedService?.format === 'group' && (
        <p className="group-waitlist-note">Si una clase está completa, la lista de espera no cobra ni bloquea una plaza. La ventana de acceso cuando se libera una plaza sigue pendiente.</p>
      )}

      <section className="my-bookings" id="mis-reservas" aria-labelledby="my-bookings-title">
        <div className="section-title-row">
          <div>
            <h2 id="my-bookings-title">Mis reservas</h2>
            <p>Las confirmaciones y cambios demo aparecen también en los otros perfiles.</p>
          </div>
          <span className="fake-data-label">{ownBookings.length} reserva{ownBookings.length === 1 ? '' : 's'}</span>
        </div>
        {ownBookings.length ? (
          <div className="my-booking-list">
            {ownBookings.map((booking) => {
              const service = DEMO_SERVICES.find((item) => item.id === booking.serviceId);
              const provider = DEMO_PROFESSIONALS.find((item) => item.id === booking.professionalId);
              return (
                <article className="my-booking" key={booking.id}>
                  <div className="my-booking-heading">
                    <div>
                      <h3>{service?.name ?? 'Servicio demo'}</h3>
                      <p>{provider?.name} · {booking.seats > 1 ? `${booking.seats} plazas` : '1 plaza'} · {booking.seriesId ? 'Serie finita' : 'Fecha única'}</p>
                    </div>
                    <span className="confirmed-chip">Pago demo · confirmada</span>
                  </div>
                  <div className="occurrences-list">
                    {booking.occurrences.map((occurrence) => (
                      <div className="occurrence-card" key={occurrence.id}>
                        <OccurrenceLine occurrence={occurrence} service={service} />
                        {occurrence.status === 'confirmed' && (
                          <button className="cancel-link" onClick={() => {
                            demo.cancelOccurrence(booking.id, occurrence.id);
                            setFeedback('Se canceló solo esta fecha. La política y cualquier reembolso siguen pendientes y se simulan.');
                          }} type="button">Cancelar esta fecha</button>
                        )}
                        {occurrence.status === 'confirmed' && <AccessNote booking={booking} occurrence={occurrence} spaces={DEMO_SPACES} />}
                        {occurrence.status === 'cancelled' && (
                          <p className="cancelled-note">Solo se ha cancelado esta fecha. La política y el posible efecto económico están pendientes y se simulan.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>Aún no hay reservas para este cliente demo</h3>
            <p>Completa un pago de prueba correcto para ver la confirmación en esta lista y en los otros perfiles.</p>
          </div>
        )}
        {ownWaitlist.length > 0 && (
          <div className="waitlist-list">
            <h3>Lista de espera</h3>
            {ownWaitlist.map((entry) => {
              const session = DEMO_CLASS_SESSIONS.find((item) => item.id === entry.sessionId);
              const service = DEMO_SERVICES.find((item) => item.id === entry.serviceId);
              return (
                <div className="waitlist-entry" key={entry.id}>
                  <span>{service?.name} · {formatDateLabel(entry.date)} · {entry.seats} plaza{entry.seats === 1 ? '' : 's'}</span>
                  <strong>En espera · 0 € · ninguna plaza retenida</strong>
                  <small>{session ? formatTime(session.start) : ''}</small>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <p className="pending-decisions-note">{DEMO_DECISIONS_NOTICE}</p>
    </div>
  );
}
