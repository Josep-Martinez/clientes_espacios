import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { DemoAccount } from '../data/demoAccounts.ts';

export type AppPage = 'marketplace' | 'directory' | 'how-it-works';

export function AppHeader({
  account,
  activePage,
  onPageChange,
  onOpenLogin,
  onReset,
}: {
  account: DemoAccount | null;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  onOpenLogin: () => void;
  onReset: () => void;
}) {
  const workspaceLabel = account?.role === 'professional'
    ? 'Mi agenda'
    : account?.role === 'space'
      ? 'Mi espacio'
      : 'Buscar y reservar';

  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="Trama, inicio de la demo">
        <span className="brand-symbol"><Icon name="mark" size={28} /></span>
        <span className="brand-name">trama</span>
      </a>
      <nav className="site-navigation" aria-label="Navegación principal">
        <button aria-current={activePage === 'marketplace' ? 'page' : undefined} className={activePage === 'marketplace' ? 'site-nav-link is-active' : 'site-nav-link'} onClick={() => onPageChange('marketplace')} type="button">
          {workspaceLabel}
        </button>
        <button aria-current={activePage === 'directory' ? 'page' : undefined} className={activePage === 'directory' ? 'site-nav-link is-active' : 'site-nav-link'} onClick={() => onPageChange('directory')} type="button">
          {account?.role === 'professional' ? 'Explorar espacios' : 'Explorar profesionales y espacios'}
        </button>
        <button aria-current={activePage === 'how-it-works' ? 'page' : undefined} className={activePage === 'how-it-works' ? 'site-nav-link is-active' : 'site-nav-link'} onClick={() => onPageChange('how-it-works')} type="button">
          Cómo funciona
        </button>
      </nav>
      <div className="header-session">
        <button className="profile-button" onClick={onOpenLogin} type="button">
          <span className="header-avatar" aria-hidden="true">{account?.initials ?? <Icon name="person" size={20} />}</span>
          <span className="header-session-copy">
            <span>{account ? account.roleLabel : 'Tu perfil'}</span>
            <strong>{account ? account.name : 'Iniciar sesión'}</strong>
          </span>
          <span className="profile-button-chevron" aria-hidden="true">⌄</span>
        </button>
        {account && <button className="reset-button" onClick={onReset} type="button">Reiniciar demo</button>}
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

export function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-heading">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
