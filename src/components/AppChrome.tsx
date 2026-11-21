import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import { hasDemoRole, type DemoAccount } from '../data/demoAccounts.ts';
import { getNavigationItems, type AppPage } from '../domain/navigation.ts';

export function AppHeader({
  account,
  activePage,
  onPageChange,
  onOpenLogin,
  onOpenMessages,
}: {
  account: DemoAccount | null;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  onOpenLogin: () => void;
  onOpenMessages: () => void;
}) {
  const navigationItems = getNavigationItems(account);
  const canOpenMessages = hasDemoRole(account, 'client') || hasDemoRole(account, 'professional');

  return (
    <header className="app-header">
      <button aria-label="Trama, ir a explorar" className="brand" onClick={() => onPageChange('explore')} type="button">
        <span className="brand-symbol"><Icon name="mark" size={28} /></span>
        <span className="brand-name">trama</span>
      </button>
      <nav className="site-navigation" aria-label="Navegación principal">
        {navigationItems.map(({ page, label }) => (
          <button aria-current={activePage === page ? 'page' : undefined} className={activePage === page ? 'site-nav-link is-active' : 'site-nav-link'} key={page} onClick={() => onPageChange(page)} type="button">
            {label}
          </button>
        ))}
      </nav>
      <div className="header-session">
        <button className="profile-button" onClick={onOpenLogin} type="button">
          <span className="header-avatar" aria-hidden="true">{account?.initials ?? <Icon name="person" size={20} />}</span>
          <span className="header-session-copy">
            <span>{account ? account.roleLabel : 'Tu perfil'}</span>
            <strong>{account ? account.name : 'Iniciar sesión'}</strong>
          </span>
          <span className="profile-button-chevron" aria-hidden="true"><Icon name="arrow" size={15} /></span>
        </button>
        {canOpenMessages && (
          <button aria-current={activePage === 'messages' ? 'page' : undefined} aria-label="Abrir mensajes" className={activePage === 'messages' ? 'header-messages-button is-active' : 'header-messages-button'} onClick={onOpenMessages} type="button">
            <Icon name="mail" size={19} />
            <span>Mensajes</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <aside className="demo-notice" aria-label="Aviso sobre la demostración">
      <span className="demo-pulse" aria-hidden="true" />
      <p>
        <strong>Demostración</strong>
        <span> Datos, reservas, disponibilidad y accesos son ficticios. No se cobra dinero real ni se confirma una cita real.</span>
        {children}
      </p>
    </aside>
  );
}

export function BookingThread({ active }: { active: 'discover' | 'schedule' | 'confirm' }) {
  const steps = [
    { id: 'discover', label: 'Servicio' },
    { id: 'schedule', label: 'Profesional y lugar' },
    { id: 'confirm', label: 'Una reserva' },
  ] as const;

  return (
    <ol className="booking-thread" aria-label="Recorrido de reserva">
      {steps.map((step, index) => (
        <li className={active === step.id ? 'thread-step is-current' : 'thread-step'} key={step.id}>
          <span className="thread-node" aria-hidden="true">{index + 1}</span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function PageHeading({ title, description, titleId }: { title: string; description: string; titleId?: string }) {
  return (
    <div className="page-heading">
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
