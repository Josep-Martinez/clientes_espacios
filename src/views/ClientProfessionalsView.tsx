import { useMemo, useState } from 'react';
import { DEMO_PROFESSIONALS, DEMO_SERVICES } from '../data/demoData.ts';
import { DEMO_BOOKING_MODE_LABELS } from '../data/demoConfig.ts';
import { getConversationsForUser } from '../domain/conversations.ts';
import type { DemoStore } from '../state/useDemoStore.ts';

function createConversationId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `contacto-${token}`;
}

export function ClientProfessionalsView({
  clientId,
  clientName,
  demo,
  onOpenMessages,
  canContact,
  onLoginRequest,
}: {
  clientId: string;
  clientName: string;
  demo: DemoStore;
  onOpenMessages: (conversationId: string) => void;
  canContact: boolean;
  onLoginRequest: () => void;
}) {
  const [query, setQuery] = useState('');
  const conversations = getConversationsForUser(demo.state.conversations, clientId);
  const visibleProfessionals = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-ES');
    return DEMO_PROFESSIONALS.filter((professional) => !normalized || [
      professional.name,
      professional.headline,
      professional.bio,
      professional.publicZone,
      ...professional.categories,
    ].join(' ').toLocaleLowerCase('es-ES').includes(normalized));
  }, [query]);

  function requestConversation(professionalId: string): void {
    demo.requestConversation({
      id: createConversationId(),
      clientId,
      clientName,
      professionalId,
      requestedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="client-network-section" aria-labelledby="professional-directory-title">
      <div className="directory-heading">
        <div>
          <span className="eyebrow">PERSONAS PROFESIONALES</span>
          <h1 id="professional-directory-title">Encuentra a alguien con quien hablar.</h1>
          <p>Explora perfiles y solicita una conversación. El chat se abre cuando el profesional acepta.</p>
        </div>
        <span className="fake-data-label">Perfiles ficticios</span>
      </div>

      <label className="directory-search">
        <span className="visually-hidden">Buscar profesional por nombre, especialidad o zona</span>
        <span aria-hidden="true">⌕</span>
        <input onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Nombre, especialidad o zona" type="search" value={query} />
      </label>

      {visibleProfessionals.length ? (
        <div className="professional-directory-grid">
          {visibleProfessionals.map((professional) => {
            const serviceCards = DEMO_SERVICES.filter((service) => service.professionalId === professional.id);
            const conversation = conversations.find((item) => item.professionalId === professional.id && item.status !== 'declined');
            return (
              <article className="directory-profile-card" key={professional.id}>
                <div className="directory-profile-top">
                  <span className="avatar avatar-large" aria-hidden="true">{professional.initials}</span>
                  <span className="rating-chip">★ {professional.rating.toFixed(1)} <small>({professional.reviewCount})</small></span>
                </div>
                <span className="eyebrow">{professional.headline}</span>
                <h2>{professional.name}</h2>
                <p className="directory-location"><span aria-hidden="true">⌖</span> {professional.publicZone}</p>
                <p className="directory-bio">{professional.bio}</p>
                <div className="category-chips">{professional.categories.map((category) => <span key={category}>{category}</span>)}</div>
                <ul className="directory-services">
                  {serviceCards.slice(0, 2).map((service) => (
                    <li key={service.id}>
                      <span>{service.name}<small>{service.durationMinutes} min · {DEMO_BOOKING_MODE_LABELS[service.modalities[0]]}</small></span>
                      <strong>{(service.priceCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong>
                    </li>
                  ))}
                </ul>
                {conversation?.status === 'accepted' ? (
                  <button className="secondary-button full-button" onClick={() => onOpenMessages(conversation.id)} type="button">Abrir conversación</button>
                ) : conversation?.status === 'pending' ? (
                  <button className="secondary-button full-button" disabled type="button">Solicitud enviada</button>
                ) : (
                  <button className="primary-button full-button" onClick={() => canContact ? requestConversation(professional.id) : onLoginRequest()} type="button">
                    {canContact ? 'Solicitar conversación' : 'Iniciar sesión para contactar'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <h2>No encontramos ese perfil</h2>
          <p>Prueba con otra especialidad, nombre o zona.</p>
        </div>
      )}
      <p className="pending-decisions-note">Las solicitudes y los mensajes solo existen dentro de esta simulación. Los gestores de espacios no tienen mensajería en esta versión.</p>
    </section>
  );
}
