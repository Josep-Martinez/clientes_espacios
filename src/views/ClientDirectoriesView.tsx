import { ClientProfessionalsView } from './ClientProfessionalsView.tsx';
import { ClientSpacesView } from './ClientSpacesView.tsx';
import type { DemoStore } from '../state/useDemoStore.ts';

export function ClientDirectoriesView({
  demo,
  clientId,
  clientName,
  canContact,
  showProfessionals,
  onOpenMessages,
  onLoginRequest,
  onOpenSearch,
}: {
  demo: DemoStore;
  clientId: string;
  clientName: string;
  canContact: boolean;
  showProfessionals: boolean;
  onOpenMessages: (conversationId: string) => void;
  onLoginRequest: () => void;
  onOpenSearch?: () => void;
}) {
  return (
    <div className="client-directories-view" id="inicio">
      {showProfessionals && <ClientProfessionalsView
          clientId={clientId}
          clientName={clientName}
          canContact={canContact}
          demo={demo}
          onOpenMessages={onOpenMessages}
          onLoginRequest={onLoginRequest}
        />}
      <ClientSpacesView onOpenSearch={onOpenSearch} />
    </div>
  );
}
