import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';

export type DemoRole = 'client' | 'professional' | 'space';

const roleLabels: Record<DemoRole, string> = {
  client: 'Cliente',
  professional: 'Profesional',
  space: 'Gestor de espacio',
};

export function AppHeader({
  activeRole,
  onRoleChange,
  onReset,
}: {
  activeRole: DemoRole;
  onRoleChange: (role: DemoRole) => void;
  onReset: () => void;
}) {
  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="Trama, inicio de la demo">
        <span className="brand-symbol"><Icon name="mark" size={28} /></span>
        <span className="brand-name">trama</span>
      </a>
      <nav className="role-switcher" aria-label="Cambiar vista de demostración">
        {(Object.keys(roleLabels) as DemoRole[]).map((role) => (
          <button
            aria-pressed={activeRole === role}
            className={activeRole === role ? 'role-tab is-active' : 'role-tab'}
            key={role}
            onClick={() => onRoleChange(role)}
            type="button"
          >
            {roleLabels[role]}
          </button>
        ))}
      </nav>
      <button className="reset-button" onClick={onReset} type="button">
        Reiniciar demo
      </button>
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
