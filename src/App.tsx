import { useState } from 'react';
import { AppHeader, DemoNotice, type AppPage } from './components/AppChrome.tsx';
import { canSimulateClientPayment, getDemoHomeForAccount } from './domain/demoAuth.ts';
import { resolveDemoAccount, type DemoAccount } from './data/demoAccounts.ts';
import { ClientView, type ClientSection } from './views/ClientView.tsx';
import { ClientDirectoriesView } from './views/ClientDirectoriesView.tsx';
import { DemoLoginView } from './views/DemoLoginView.tsx';
import { HowItWorksView } from './views/HowItWorksView.tsx';
import { ProfessionalView } from './views/ProfessionalView.tsx';
import { SpaceManagerView } from './views/SpaceManagerView.tsx';
import { useDemoStore } from './state/useDemoStore.ts';

const GUEST_CLIENT_ID = 'visitante-demo';

export default function App() {
  const demo = useDemoStore();
  const [activeAccount, setActiveAccount] = useState<DemoAccount | null>(null);
  const [activePage, setActivePage] = useState<AppPage>('marketplace');
  const [clientSection, setClientSection] = useState<ClientSection>('search');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const demoHome = getDemoHomeForAccount(activeAccount);

  function login(accountId: string): void {
    const account = resolveDemoAccount(accountId);
    if (!account) return;
    setActiveAccount(account);
    setActivePage('marketplace');
    setClientSection('search');
    setSelectedConversationId(null);
    setLoginOpen(false);
  }

  function logout(): void {
    setActiveAccount(null);
    setActivePage('marketplace');
    setClientSection('search');
    setSelectedConversationId(null);
    setLoginOpen(false);
  }

  function changePage(page: AppPage): void {
    setActivePage(page);
    if (page === 'marketplace') {
      setClientSection('search');
      setSelectedConversationId(null);
    }
  }

  function openClientMessages(conversationId: string): void {
    setClientSection('messages');
    setSelectedConversationId(conversationId);
    setActivePage('marketplace');
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <AppHeader
        account={activeAccount}
        activePage={activePage}
        onOpenLogin={() => setLoginOpen(true)}
        onPageChange={changePage}
        onReset={demo.resetDemo}
      />
      <main id="contenido" className="app-content">
        <DemoNotice>
          <span className="notice-separator">Puedes explorar sin cuenta; los pagos y mensajes son simulados.</span>
        </DemoNotice>
        {demo.storageUnavailable && (
          <p className="storage-message" role="status">El navegador no permite guardar esta demo; los cambios se mantienen solo mientras la página esté abierta.</p>
        )}
        {activePage === 'how-it-works'
          ? <HowItWorksView />
          : activePage === 'directory'
            ? <ClientDirectoriesView
                canContact={canSimulateClientPayment(activeAccount)}
                clientId={demoHome === 'client' ? activeAccount?.id ?? GUEST_CLIENT_ID : GUEST_CLIENT_ID}
                clientName={demoHome === 'client' ? activeAccount?.name ?? 'Invitado' : 'Invitado'}
                demo={demo}
                showProfessionals={activeAccount?.role !== 'professional'}
                onLoginRequest={() => setLoginOpen(true)}
                onOpenMessages={openClientMessages}
                onOpenSearch={activeAccount?.role === 'professional' || activeAccount?.role === 'space'
                  ? undefined
                  : () => changePage('marketplace')}
              />
            : demoHome === 'professional' && activeAccount?.professionalId
            ? <ProfessionalView demo={demo} professionalId={activeAccount?.professionalId ?? ''} />
            : demoHome === 'space'
              ? <SpaceManagerView demo={demo} spaceIds={activeAccount?.spaceIds ?? []} />
              : <ClientView
                  activeSection={clientSection}
                  canPay={canSimulateClientPayment(activeAccount)}
                  clientId={demoHome === 'client' ? activeAccount?.id ?? GUEST_CLIENT_ID : GUEST_CLIENT_ID}
                  clientName={demoHome === 'client' ? activeAccount?.name ?? 'Invitado' : 'Invitado'}
                  demo={demo}
                  selectedConversationId={selectedConversationId}
                  onLoginRequest={() => setLoginOpen(true)}
                  onActiveSectionChange={setClientSection}
                />}
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
