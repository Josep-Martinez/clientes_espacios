import { DEMO_CLIENT_ID } from './demoConfig.ts';
import type { DemoRole } from '../domain/models.ts';

export interface DemoAccount {
  id: string;
  name: string;
  initials: string;
  role: DemoRole;
  roles?: DemoRole[];
  roleLabel: string;
  description: string;
  professionalId?: string;
  spaceIds?: string[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: DEMO_CLIENT_ID,
    name: 'Nerea Soler',
    initials: 'NS',
    role: 'client',
    roleLabel: 'Cliente',
    description: 'Busca profesionales, reserva sesiones y consulta tus conversaciones y citas.',
  },
  {
    id: 'demo-profesional-marina',
    name: 'Marina Ortega',
    initials: 'MO',
    role: 'professional',
    roleLabel: 'Profesional',
    description: 'Consulta tu agenda y responde a las solicitudes de conversación de clientes.',
    professionalId: 'marina-ortega',
  },
  {
    id: 'demo-profesional-gestora-marina',
    name: 'Marina Ortega',
    initials: 'MO',
    role: 'professional',
    roles: ['professional', 'space'],
    roleLabel: 'Profesional y gestora',
    description: 'Gestiona su perfil profesional y un espacio desde la misma cuenta.',
    professionalId: 'marina-ortega',
    spaceIds: ['loft-rueda'],
  },
  {
    id: 'gestor-loft-rueda',
    name: 'Marta Soler',
    initials: 'MS',
    role: 'space',
    roleLabel: 'Gestora de espacio',
    description: 'Revisa las reservas, el uso del espacio y una estimación de ingresos.',
    spaceIds: ['loft-rueda'],
  },
];

export function hasDemoRole(account: DemoAccount | null | undefined, role: DemoRole): boolean {
  return Boolean(account && (account.roles ?? [account.role]).includes(role));
}

export function resolveDemoAccount(accountId: string | null | undefined): DemoAccount | null {
  if (!accountId?.trim()) return null;
  return DEMO_ACCOUNTS.find((account) => account.id === accountId.trim()) ?? null;
}
