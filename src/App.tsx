import { useState, type ReactNode } from 'react';
import { AppHeader, DemoNotice } from './components/AppChrome.tsx';
import { canSimulateClientPayment } from './domain/demoAuth.ts';
import { hasDemoRole, resolveDemoAccount, type DemoAccount } from './data/demoAccounts.ts';
import type { AppPage } from './domain/navigation.ts';
import { ClientProfessionalsView } from './views/ClientProfessionalsView.tsx';
import { ClientSpacesView } from './views/ClientSpacesView.tsx';
import { ClientView } from './views/ClientView.tsx';
import { DemoLoginView } from './views/DemoLoginView.tsx';
import { HowItWorksView } from './views/HowItWorksView.tsx';
import { MessagesView } from './views/MessagesView.tsx';
import { AgendaView } from './views/AgendaView.tsx';
import { ProfessionalView } from './views/ProfessionalView.tsx';
import { SpaceManagerView } from './views/SpaceManagerView.tsx';
import { useDemoStore } from './state/useDemoStore.ts';

const GUEST_CLIENT_ID = 'visitante-demo';

export default function App() {
  const demo = useDemoStore();
  const [activeAccount, setActiveAccount] = useState<DemoAccount | null>(null);
  const [activePage, setActivePage] = useState<AppPage>('explore');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const isClient = hasDemoRole(activeAccount, 'client');
  const isProfessional = hasDemoRole(activeAccount, 'professional');
  const isSpaceManager = hasDemoRole(activeAccount, 'space');
  const currentClientId = isClient ? activeAccount?.id ?? GUEST_CLIENT_ID : GUEST_CLIENT_ID;
  const currentClientName = isClient ? activeAccount?.name ?? 'Cliente' : 'Invitado';

  function login(accountId: string): void {
    const account = resolveDemoAccount(accountId);
    if (!account) return;
    setActiveAccount(account);
    setActivePage('explore');
    setSelectedConversationId(null);
    setLoginOpen(false);
  }

  function logout(): void {
    setActiveAccount(null);
    setActivePage('explore');
    setSelectedConversationId(null);
    setLoginOpen(false);
  }

  function changePage(page: AppPage): void {
    setActivePage(page);
    if (page !== 'messages') setSelectedConversationId(null);
  }

  function openMessages(conversationId: string | null = null): void {
    setSelectedConversationId(conversationId);
    setActivePage('messages');
  }

  function renderClientExplore(): ReactNode {
    return (
      <ClientView
        canPay={canSimulateClientPayment(activeAccount)}
        clientId={currentClientId}
        clientName={currentClientName}
        demo={demo}
        onLoginRequest={() => setLoginOpen(true)}
        onOpenAgenda={() => changePage(activeAccount ? 'agenda' : 'explore')}
        professionalIdFilter={isProfessional ? activeAccount?.professionalId : undefined}
      />
    );
  }

  let pageContent: ReactNode;
  switch (activePage) {
    case 'professionals':
      pageContent = (
        <ClientProfessionalsView
          canContact={isClient}
          clientId={currentClientId}
          clientName={currentClientName}
          demo={demo}
          onLoginRequest={() => setLoginOpen(true)}
          onOpenMessages={(conversationId) => openMessages(conversationId)}
        />
      );
      break;
    case 'space-directory':
      pageContent = <ClientSpacesView onOpenSearch={() => changePage('explore')} />;
      break;
    case 'profile':
      pageContent = isProfessional && activeAccount?.professionalId
        ? <ProfessionalView demo={demo} professionalId={activeAccount.professionalId} />
        : renderClientExplore();
      break;
    case 'my-space':
      pageContent = isSpaceManager
        ? <SpaceManagerView demo={demo} spaceIds={activeAccount?.spaceIds ?? []} />
        : renderClientExplore();
      break;
    case 'agenda':
      pageContent = activeAccount
        ? <AgendaView account={activeAccount} demo={demo} onOpenMessages={openMessages} onOpenSpace={() => changePage('my-space')} />
        : renderClientExplore();
      break;
    case 'messages':
      pageContent = activeAccount && (isClient || isProfessional)
        ? <MessagesView account={activeAccount} demo={demo} initialConversationId={selectedConversationId} />
        : renderClientExplore();
      break;
    case 'how-it-works':
      pageContent = <HowItWorksView />;
      break;
    case 'explore':
    default:
      pageContent = renderClientExplore();
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <AppHeader
        account={activeAccount}
        activePage={activePage}
        onOpenLogin={() => setLoginOpen(true)}
        onOpenMessages={() => openMessages()}
        onPageChange={changePage}
      />
      <main id="contenido" className="app-content">
        <DemoNotice>
          <span className="notice-separator">Puedes explorar sin cuenta; los pagos y mensajes son simulados.</span>
        </DemoNotice>
        {demo.storageUnavailable && (
          <p className="storage-message" role="status">El navegador no permite guardar esta demo; los cambios se mantienen solo mientras la página esté abierta.</p>
        )}
        {pageContent}
      </main>
      <footer className="app-footer">
        <span>Trama · concepto de marketplace</span>
        <span>Todo lo que ves aquí es ficticio y no operativo.</span>
      </footer>
      {loginOpen && (
        <DemoLoginView
          currentAccount={activeAccount}
          onClose={() => setLoginOpen(false)}
          onLogin={login}
          onLogout={activeAccount ? logout : undefined}
        />
      )}
    </>
  );
}
