import { PageHeading } from '../components/AppChrome.tsx';
import { ConversationInbox } from '../components/ConversationInbox.tsx';
import { getConversationsForUser } from '../domain/conversations.ts';
import { hasDemoRole, type DemoAccount } from '../data/demoAccounts.ts';
import type { DemoStore } from '../state/useDemoStore.ts';

function createMessageId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `mensaje-${token}`;
}

export function MessagesView({ account, demo, initialConversationId }: {
  account: DemoAccount;
  demo: DemoStore;
  initialConversationId?: string | null;
}) {
  const isClient = hasDemoRole(account, 'client');
  const currentUserId = isClient ? account.id : account.professionalId ?? '';
  const role = isClient ? 'client' : 'professional';
  const conversations = getConversationsForUser(demo.state.conversations, currentUserId);

  return (
    <section className="messages-page" aria-labelledby="messages-title">
      <div className="messages-page-heading">
        <PageHeading
          titleId="messages-title"
          title="Mensajes"
          description={isClient
            ? 'Sigue las solicitudes que enviaste y conversa con profesionales cuando acepten.'
            : 'Revisa las solicitudes de clientes y continúa las conversaciones que ya están abiertas.'}
        />
        <span className="fake-data-label">Conversaciones de la demo</span>
      </div>
      <ConversationInbox
        conversations={conversations}
        currentUserId={currentUserId}
        initialConversationId={initialConversationId}
        onSendMessage={(conversationId, body) => demo.sendConversationMessage({
          id: createMessageId(),
          conversationId,
          senderId: currentUserId,
          body,
          createdAt: new Date().toISOString(),
        })}
        onStatusChange={(conversationId, status) => {
          if (role === 'professional') demo.updateConversationStatus(conversationId, currentUserId, status);
        }}
        role={role}
      />
      <p className="pending-decisions-note">Los mensajes son ficticios y solo se guardan en este navegador.</p>
    </section>
  );
}
