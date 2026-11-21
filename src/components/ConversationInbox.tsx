import { useState, type FormEvent } from 'react';
import type { DemoConversation } from '../domain/models.ts';
import { DEMO_PROFESSIONALS } from '../data/demoData.ts';

export function ConversationInbox({
  conversations,
  currentUserId,
  role,
  initialConversationId,
  onStatusChange,
  onSendMessage,
}: {
  conversations: DemoConversation[];
  currentUserId: string;
  role: 'client' | 'professional';
  initialConversationId?: string | null;
  onStatusChange: (conversationId: string, status: 'accepted' | 'declined') => void;
  onSendMessage: (conversationId: string, body: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = conversations.find((conversation) => conversation.id === selectedId)
    ?? conversations.find((conversation) => conversation.id === initialConversationId)
    ?? conversations[0]
    ?? null;
  const selectedProfessional = selected
    ? DEMO_PROFESSIONALS.find((professional) => professional.id === selected.professionalId)
    : null;
  const otherPerson = selected
    ? role === 'client' ? selectedProfessional?.name ?? 'Profesional demo' : selected.clientName
    : '';
  const initials = selected
    ? role === 'client'
      ? selectedProfessional?.initials ?? 'PR'
      : selected.clientName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toLocaleUpperCase('es-ES')
    : '';

  function submitMessage(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get('message') ?? '').trim();
    if (!body) return;
    onSendMessage(selected.id, body);
    form.reset();
  }

  if (!conversations.length) {
    return (
      <div className="empty-state conversation-empty">
        <span className="empty-state-mark" aria-hidden="true">↗</span>
        <h3>Aún no hay conversaciones</h3>
        <p>{role === 'client' ? 'Encuentra a un profesional y solicita iniciar una conversación.' : 'Las solicitudes de conversación de clientes aparecerán aquí.'}</p>
      </div>
    );
  }

  return (
    <div className="conversation-inbox">
      <div className="conversation-list" aria-label="Conversaciones">
        {conversations.map((conversation) => {
          const professional = DEMO_PROFESSIONALS.find((item) => item.id === conversation.professionalId);
          const title = role === 'client' ? professional?.name ?? 'Profesional demo' : conversation.clientName;
          const isSelected = conversation.id === selected?.id;
          return (
            <button
              aria-pressed={isSelected}
              className={isSelected ? 'conversation-list-item is-selected' : 'conversation-list-item'}
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              type="button"
            >
              <span className="conversation-avatar" aria-hidden="true">{role === 'client' ? professional?.initials ?? 'PR' : title.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toLocaleUpperCase('es-ES')}</span>
              <span className="conversation-list-copy">
                <strong>{title}</strong>
                <small>{conversation.status === 'pending' ? 'Solicitud pendiente' : conversation.status === 'accepted' ? 'Conversación abierta' : 'Solicitud rechazada'}</small>
              </span>
              {conversation.messages.length > 0 && <span className="conversation-message-count">{conversation.messages.length}</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="conversation-detail" aria-label={`Conversación con ${otherPerson}`}>
          <header className="conversation-detail-heading">
            <span className="conversation-avatar conversation-avatar-large" aria-hidden="true">{initials}</span>
            <div>
              <h3>{otherPerson}</h3>
              <p>{selected.status === 'accepted' ? 'Conversación privada de la demo' : selected.status === 'pending' ? 'Solicitud de conversación' : 'Solicitud no aceptada'}</p>
            </div>
          </header>

          {selected.status === 'pending' && role === 'professional' && (
            <div className="conversation-request-actions">
              <p>{selected.clientName} quiere contactar contigo. Acepta la solicitud para abrir la conversación.</p>
              <div>
                <button className="primary-button" onClick={() => onStatusChange(selected.id, 'accepted')} type="button">Aceptar solicitud</button>
                <button className="secondary-button" onClick={() => onStatusChange(selected.id, 'declined')} type="button">Ahora no</button>
              </div>
            </div>
          )}

          {selected.status === 'pending' && role === 'client' && (
            <p className="conversation-state-note" role="status">Tu solicitud está enviada. Podrás escribir cuando el profesional la acepte.</p>
          )}

          {selected.status === 'declined' && (
            <p className="conversation-state-note">Esta solicitud no se aceptó. Puedes volver a solicitar contacto desde el perfil profesional.</p>
          )}

          {selected.status === 'accepted' && (
            <>
              <ol className="conversation-message-list" aria-live="polite" aria-relevant="additions">
                {selected.messages.length ? selected.messages.map((message) => (
                  <li className={message.senderId === currentUserId ? 'conversation-message is-mine' : 'conversation-message'} key={message.id}>
                    <span>{message.senderId === currentUserId ? 'Tú' : otherPerson}</span>
                    <p>{message.body}</p>
                    <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                  </li>
                )) : (
                  <li className="conversation-first-message">Solicitud aceptada. Puedes empezar la conversación.</li>
                )}
              </ol>
              <form className="conversation-composer" onSubmit={submitMessage}>
                <label className="visually-hidden" htmlFor="conversation-message">Escribe un mensaje</label>
                <textarea id="conversation-message" maxLength={500} name="message" placeholder="Escribe un mensaje…" required rows={2} />
                <div className="conversation-composer-footer">
                  <span>Máximo 500 caracteres · mensajes ficticios</span>
                  <button className="primary-button" type="submit">Enviar</button>
                </div>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
