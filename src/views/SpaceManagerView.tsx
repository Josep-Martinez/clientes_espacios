import { useMemo, useState } from 'react';
import { AccessNote, formatMoney } from '../components/BookingPieces.tsx';
import { PageHeading } from '../components/AppChrome.tsx';
import { DEMO_CLASS_SESSIONS, DEMO_LOCATIONS, DEMO_PROFESSIONALS, DEMO_SERVICES, DEMO_SPACES, addDaysToDate, formatDateLabel, formatTime, getDefaultSearchDate } from '../data/demoData.ts';
import { calculateSpaceMetrics } from '../domain/spaceMetrics.ts';
import { DEMO_FEES } from '../data/demoConfig.ts';
import type { DemoStore } from '../state/useDemoStore.ts';

function dateInputValue(): string {
  return getDefaultSearchDate();
}

export function SpaceManagerView({ demo, spaceIds }: { demo: DemoStore; spaceIds: string[] }) {
  const [selectedDate, setSelectedDate] = useState(dateInputValue);
  const [selectedKind, setSelectedKind] = useState<'all' | 'room' | 'gym'>('all');
  const ownedSpaces = useMemo(() => DEMO_SPACES.filter((space) => spaceIds.includes(space.id)), [spaceIds]);

  const reservationsBySpace = useMemo(() => {
    const rows = demo.state.bookings.flatMap((booking) => {
      if (!booking.spaceId) return [];
      const service = DEMO_SERVICES.find((item) => item.id === booking.serviceId);
      const professional = DEMO_PROFESSIONALS.find((item) => item.id === booking.professionalId);
      return booking.occurrences
        .filter((occurrence) => occurrence.date === selectedDate && occurrence.status === 'confirmed')
        .map((occurrence) => ({
          bookingId: booking.id,
          booking,
          occurrence,
          serviceName: service?.name ?? 'Servicio demo',
          professionalName: professional?.name ?? 'Profesional demo',
        }));
    });
    return new Map(ownedSpaces.map((space) => [space.id, rows
      .filter((row) => row.booking.spaceId === space.id)
      .sort((a, b) => a.occurrence.start - b.occurrence.start)]));
  }, [demo.state.bookings, ownedSpaces, selectedDate]);

  const spaces = ownedSpaces.filter((space) => selectedKind === 'all' || space.kind === selectedKind);
  const confirmedCount = [...reservationsBySpace.values()].reduce((sum, rows) => sum + rows.length, 0);
  const metrics = calculateSpaceMetrics({
    spaces: ownedSpaces,
    bookings: demo.state.bookings,
    startDate: selectedDate,
    endDateExclusive: addDaysToDate(selectedDate, 30),
    spaceCommissionPercent: DEMO_FEES.spaceCommissionPercent,
  });

  return (
    <div className="role-view space-view" id="inicio">
      <div className="role-intro-grid">
        <PageHeading
          title="Tu espacio, a la vista."
          description="Consulta el calendario de tu instalación, revisa cuánto se está usando y mira una estimación de ingresos."
        />
        <div className="role-summary-card space-summary">
          <span className="eyebrow">TU INVENTARIO</span>
          <strong>{ownedSpaces.length.toString().padStart(2, '0')}</strong>
          <span>espacio{ownedSpaces.length === 1 ? '' : 's'} asociado{ownedSpaces.length === 1 ? '' : 's'} a esta cuenta</span>
          <div className="inventory-mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </div>
      </div>

      <section className="space-metrics-section" aria-labelledby="space-metrics-title">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">PRÓXIMOS 30 DÍAS DESDE LA FECHA ELEGIDA</span>
            <h2 id="space-metrics-title">Uso e ingresos aproximados</h2>
            <p>Solo cuenta reservas confirmadas de los espacios vinculados a tu cuenta.</p>
          </div>
          <span className="fake-data-label">Tarifas ficticias</span>
        </div>
        <div className="space-metrics-grid">
          <article className="space-metric-card">
            <span>Reservas confirmadas</span>
            <strong>{metrics.confirmedOccurrences}</strong>
            <small>en el periodo seleccionado</small>
          </article>
          <article className="space-metric-card">
            <span>Tiempo reservado</span>
            <strong>{(metrics.bookedMinutes / 60).toLocaleString('es-ES', { maximumFractionDigits: 1 })} h</strong>
            <small>de {(metrics.openMinutes / 60).toLocaleString('es-ES', { maximumFractionDigits: 0 })} h disponibles</small>
          </article>
          <article className="space-metric-card">
            <span>Uso de agenda</span>
            <strong>{metrics.utilizationPercent}%</strong>
            <small>según el horario de apertura demo</small>
          </article>
          <article className="space-metric-card space-metric-earnings">
            <span>Ingreso neto estimado</span>
            <strong>{formatMoney(metrics.estimatedOwnerEarningsCents)}</strong>
            <small>{formatMoney(metrics.grossEarningsCents)} brutos · comisión demo {DEMO_FEES.spaceCommissionPercent}%</small>
          </article>
        </div>
        <p className="pending-decisions-note">Estimación orientativa: las comisiones, entradas gratuitas, cancelaciones y liquidaciones finales siguen pendientes de definición.</p>
      </section>

      <section className="space-controls" aria-label="Filtros de inventario">
        <div className="space-date-intro">
          <span className="eyebrow">RESERVAS COMPARTIDAS</span>
          <h2>Disponibilidad del día</h2>
          <p>{formatDateLabel(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })} · horarios y aforo de ejemplo.</p>
        </div>
        <div className="space-date-controls">
          <div className="field">
            <label htmlFor="space-date">Consultar fecha</label>
            <input id="space-date" onChange={(event) => { if (event.currentTarget.value) setSelectedDate(event.currentTarget.value); }} type="date" value={selectedDate} />
          </div>
          <div className="field">
            <label htmlFor="space-kind">Tipo de espacio</label>
            <select id="space-kind" onChange={(event) => setSelectedKind(event.currentTarget.value as typeof selectedKind)} value={selectedKind}>
              <option value="all">Todos</option>
              <option value="room">Salas</option>
              <option value="gym">Gimnasios</option>
            </select>
          </div>
          <span className="availability-count"><strong>{confirmedCount}</strong> reservas confirmadas demo</span>
        </div>
      </section>

      <section className="space-inventory" aria-label="Inventario de espacios">
        {spaces.map((space, index) => {
          const rows = reservationsBySpace.get(space.id) ?? [];
          const reservedSeats = rows.reduce((sum, row) => sum + row.booking.seats, 0);
          const occupancy = Math.min(100, Math.round((reservedSeats / space.capacity) * 100));
          const weekday = new Date(`${selectedDate}T12:00:00`).getDay();
          const isOpen = space.openingHours.weekdays.includes(weekday);
          const openingLabel = isOpen
            ? `${formatTime(space.openingHours.start)}–${formatTime(space.openingHours.end)}`
            : 'Cerrado según horario demo';
          const relevantClasses = DEMO_CLASS_SESSIONS.filter((session) => session.spaceId === space.id && session.date === selectedDate);
          return (
            <article className="inventory-card" key={space.id}>
              <div className={`inventory-card-art inventory-art-${(index % 4) + 1}`} aria-hidden="true">
                <span className="inventory-art-orbit" />
                <span className="inventory-art-window" />
                <span className="inventory-art-floor" />
                <span className="inventory-art-index">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="inventory-card-body">
                <div className="inventory-card-heading">
                  <div>
                    <span className="eyebrow">{space.kind === 'gym' ? 'GIMNASIO' : 'SALA'} · {space.zoneLabel}</span>
                    <h3>{space.name}</h3>
                  </div>
                  <span className={isOpen ? 'availability-chip is-open' : 'availability-chip is-closed'}>{isOpen ? 'Abierto' : 'Cerrado'}</span>
                </div>
                <p className="inventory-description">{space.description}</p>
                <div className="inventory-facts">
                  <span><strong>{space.capacity}</strong> plazas de capacidad</span>
                  <span><strong>{openingLabel}</strong></span>
                  <span><strong>{(space.pricePerOccurrenceCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong> por uso demo</span>
                </div>
                <div className="inventory-equipment">
                  <span className="eyebrow">EQUIPAMIENTO</span>
                  <div className="equipment-chips">{space.equipment.map((item) => <span key={item}>{item}</span>)}</div>
                </div>
                <div className="inventory-occupancy">
                  <div className="occupancy-label"><span>Ocupación por reservas</span><strong>{reservedSeats} / {space.capacity} plazas</strong></div>
                  <div className="occupancy-track" role="progressbar" aria-label={`Ocupación de ${space.name}`} aria-valuemin={0} aria-valuemax={space.capacity} aria-valuenow={reservedSeats}><span style={{ width: `${occupancy}%` }} /></div>
                </div>
                <div className="inventory-reservations">
                  <span className="eyebrow">RESERVAS CONFIRMADAS · {formatDateLabel(selectedDate)}</span>
                  {rows.length ? rows.map((row) => (
                    <div className="manager-reservation" key={`${row.bookingId}-${row.occurrence.id}`}>
                      <div className="manager-reservation-main">
                        <strong>{formatTime(row.occurrence.start)}–{formatTime(row.occurrence.end)} · {row.serviceName}</strong>
                        <span>{row.professionalName} · {row.booking.seats} plaza{row.booking.seats === 1 ? '' : 's'} · pago demo confirmado</span>
                      </div>
                      <AccessNote booking={row.booking} occurrence={row.occurrence} spaces={DEMO_SPACES} />
                    </div>
                  )) : <p className="no-space-reservations">No hay reservas confirmadas para este día de muestra.</p>}
                  {relevantClasses.map((session) => {
                    const waitlistCount = demo.state.waitlist.filter((entry) => entry.sessionId === session.id).length;
                    const reservedClassSeats = rows.filter((row) => row.occurrence.sessionId === session.id).reduce((sum, row) => sum + row.booking.seats, 0);
                    return (
                      <div className="class-capacity-meter" key={session.id}>
                        <div className="occupancy-label"><span>{DEMO_SERVICES.find((item) => item.id === session.serviceId)?.name} · {formatTime(session.start)}</span><strong>{Math.max(0, session.capacity - reservedClassSeats)} plazas libres de aforo</strong></div>
                        <small>Aforo {session.capacity} · lista de espera: {waitlistCount} (sin plaza retenida ni cobro)</small>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="inventory-card-footer">
                <span>{DEMO_LOCATIONS.find((location) => location.id === space.locationId)?.name ?? space.zoneLabel}</span>
                <span>{space.amenities.join(' · ')}</span>
              </div>
            </article>
          );
        })}
        {!spaces.length && (
          <div className="empty-state compact-empty">
            <h3>No tienes espacios en este filtro</h3>
            <p>Prueba con otro tipo de espacio. Esta cuenta solo muestra el inventario que tiene asignado.</p>
          </div>
        )}
      </section>
      <p className="pending-decisions-note">La disponibilidad, capacidad, precios e instrucciones de acceso son ficticios. Los accesos solo aparecen junto a reservas confirmadas y están marcados como muestra.</p>
    </div>
  );
}
