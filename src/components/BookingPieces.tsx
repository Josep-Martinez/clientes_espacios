import type { DemoBooking, DemoBookingOccurrence, DemoService, DemoSpaceRecord } from '../domain/models.ts';
import type { CheckoutQuote } from '../domain/pricing.ts';
import type { PublicServiceResult } from '../domain/search.ts';
import { formatDateLabel, formatTime } from '../data/demoData.ts';

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function ServiceResultRow({
  result,
  selected,
  onSelect,
}: {
  result: PublicServiceResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const { service, professional } = result;
  return (
    <article className={selected ? 'service-result is-selected' : 'service-result'}>
      <div className="result-person">
        <span className="avatar" aria-hidden="true">{professional.initials}</span>
        <div>
          <h3>{service.name}</h3>
          <p>{professional.name} <span className="dot-separator">·</span> {professional.publicZone}</p>
        </div>
      </div>
      <div className="result-meta">
        <span>{service.durationMinutes} min</span>
        <span><span className="rating-star" aria-hidden="true">★</span> {professional.rating.toFixed(1)} <span className="review-count">({professional.reviewCount})</span></span>
        <strong>{formatMoney(service.priceCents)} <small>{service.format === 'group' ? '/ plaza' : '/ sesión'}</small></strong>
      </div>
      <button className={selected ? 'text-button selected-button' : 'text-button'} onClick={onSelect} type="button">
        {selected ? 'Seleccionado' : 'Ver horarios'}
      </button>
    </article>
  );
}

export function MoneyBreakdown({
  quote,
  service,
  occurrenceCount,
  seats,
  showSpace,
  spaceLabel,
  firstGymEntry,
  servicePercent,
  spacePercent,
}: {
  quote: CheckoutQuote;
  service: DemoService;
  occurrenceCount: number;
  seats: number;
  showSpace: boolean;
  spaceLabel: string;
  firstGymEntry: boolean;
  servicePercent: number;
  spacePercent: number;
}) {
  return (
    <dl className="money-breakdown">
      <div>
        <dt>Servicio profesional <small>({occurrenceCount} fecha{occurrenceCount === 1 ? '' : 's'} × {seats} plaza{seats === 1 ? '' : 's'})</small></dt>
        <dd>{formatMoney(quote.X)}</dd>
      </div>
      <div>
        <dt>Comisión demo del servicio <small>({servicePercent}% · ejemplo)</small></dt>
        <dd>{formatMoney(quote.Z)}</dd>
      </div>
      {showSpace && (
        <>
          <div>
            <dt>{spaceLabel} <small>{firstGymEntry ? '(primera entrada demo)' : '(importe ficticio)'}</small></dt>
            <dd>{firstGymEntry ? <span className="free-label">Gratis</span> : formatMoney(quote.Y)}</dd>
          </div>
          <div>
            <dt>Comisión demo del espacio <small>({spacePercent}% · ejemplo)</small></dt>
            <dd>{formatMoney(quote.W)}</dd>
          </div>
        </>
      )}
      <div className="money-total">
        <dt>Total de la simulación</dt>
        <dd>{formatMoney(quote.total)}</dd>
      </div>
      <p className="money-footnote">Importes ficticios de la demo; las comisiones no están acordadas.</p>
    </dl>
  );
}

export function AccessNote({
  booking,
  occurrence,
  spaces,
}: {
  booking: DemoBooking;
  occurrence: DemoBookingOccurrence;
  spaces: DemoSpaceRecord[];
}) {
  if (occurrence.status !== 'confirmed' || !booking.spaceId) return null;
  const space = spaces.find((item) => item.id === booking.spaceId);
  if (!space?.accessInstructions) return null;

  return (
    <div className="access-note">
      <span className="demo-access-label">Acceso de muestra</span>
      <p>{space.accessInstructions}</p>
    </div>
  );
}

export function OccurrenceLine({ occurrence, service }: { occurrence: DemoBookingOccurrence; service: DemoService | undefined }) {
  return (
    <div className="occurrence-line">
      <span className="occurrence-date">{formatDateLabel(occurrence.date, { weekday: 'long' })}</span>
      <span>{formatTime(occurrence.start)} · {service?.durationMinutes ?? occurrence.end - occurrence.start} min</span>
      <span className={occurrence.status === 'confirmed' ? 'status-label status-confirmed' : 'status-label status-cancelled'}>
        {occurrence.status === 'confirmed' ? 'Confirmada · simulación' : 'Cancelada · política pendiente'}
      </span>
    </div>
  );
}
