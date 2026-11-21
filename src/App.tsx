import { useState } from 'react';
import { AppHeader, DemoNotice, type DemoRole } from './components/AppChrome.tsx';
import { ClientView } from './views/ClientView.tsx';
import { ProfessionalView } from './views/ProfessionalView.tsx';
import { SpaceManagerView } from './views/SpaceManagerView.tsx';
import { useDemoStore } from './state/useDemoStore.ts';

export default function App() {
  const demo = useDemoStore();
  const [activeRole, setActiveRole] = useState<DemoRole>('client');

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <AppHeader activeRole={activeRole} onRoleChange={setActiveRole} onReset={demo.resetDemo} />
      <main id="contenido" className="app-content">
        <DemoNotice>
          <span className="notice-separator">Desplazamientos simulados; no son rutas en tiempo real.</span>
        </DemoNotice>
        {demo.storageUnavailable && (
          <p className="storage-message" role="status">El navegador no permite guardar esta demo; los cambios se mantienen solo mientras la página esté abierta.</p>
        )}
        {activeRole === 'client' && <ClientView demo={demo} />}
        {activeRole === 'professional' && <ProfessionalView demo={demo} />}
        {activeRole === 'space' && <SpaceManagerView demo={demo} />}
      </main>
      <footer className="app-footer">
        <span>Trama · concepto de marketplace</span>
        <span>Todo lo que ves aquí es ficticio y no operativo.</span>
      </footer>
    </>
  );
}
