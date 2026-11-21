import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { DemoAccount } from '../data/demoAccounts.ts';
import { DEMO_ACCOUNTS } from '../data/demoAccounts.ts';
import { Icon } from '../components/Icon.tsx';

export function DemoLoginView({
  currentAccount,
  onClose,
  onLogin,
  onLogout,
}: {
  currentAccount: DemoAccount | null;
  onClose: () => void;
  onLogin: (accountId: string) => void;
  onLogout?: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstControl = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    if (firstControl) firstControl.focus();
    else dialogRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="login-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="login-title" aria-modal="true" className="login-dialog" onKeyDown={handleDialogKeyDown} ref={dialogRef} role="dialog" tabIndex={-1}>
        <header className="login-dialog-header">
          <div className="login-dialog-brand">
            <span className="brand-symbol"><Icon name="mark" size={23} /></span>
            <span className="brand-name">trama</span>
          </div>
          <button aria-label="Cerrar selector de cuenta" className="login-close-button" onClick={onClose} type="button">×</button>
        </header>

        <div className="login-dialog-intro">
          <span className="eyebrow">ACCESO DE PRUEBA</span>
          <h2 id="login-title">{currentAccount ? 'Cambiar de perfil' : 'Elige una cuenta demo'}</h2>
          <p>Selecciona qué experiencia quieres probar. No hay contraseña ni se crea una cuenta real.</p>
        </div>

        <div className="login-account-grid">
          {DEMO_ACCOUNTS.map((account, index) => (
            <article className={`login-account-card login-card-${account.role}${currentAccount?.id === account.id ? ' is-current' : ''}`} key={account.id}>
              <div className="login-account-top">
                <span className="avatar" aria-hidden="true">{account.initials}</span>
                <span className="login-role-chip">{account.roleLabel}</span>
                <span className="login-account-index">0{index + 1}</span>
              </div>
              <div className="login-account-copy">
                <h3>{account.name}</h3>
                <p>{account.description}</p>
              </div>
              <button className={currentAccount?.id === account.id ? 'secondary-button full-button' : 'primary-button full-button'} onClick={() => onLogin(account.id)} type="button">
                {currentAccount?.id === account.id ? 'Seguir con este perfil' : `Entrar como ${account.roleLabel.toLocaleLowerCase('es-ES')}`}
              </button>
            </article>
          ))}
        </div>

        {onLogout && <button className="login-logout-link" onClick={onLogout} type="button">Cerrar sesión y volver a explorar</button>}
        <p className="login-disclaimer"><strong>Simulación local.</strong> Los pagos, mensajes y datos de actividad son ficticios.</p>
      </section>
    </div>
  );
}
