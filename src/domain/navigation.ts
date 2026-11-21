import type { DemoRole } from './models.ts';

export type AppPage =
  | 'explore'
  | 'professionals'
  | 'space-directory'
  | 'profile'
  | 'my-space'
  | 'agenda'
  | 'messages'
  | 'how-it-works';

export interface NavigationItem {
  page: AppPage;
  label: string;
}

export interface NavigationAccount {
  role: DemoRole;
  roles?: readonly DemoRole[];
}

export function getNavigationItems(account: NavigationAccount | null): NavigationItem[] {
  const roles = new Set(account?.roles ?? (account ? [account.role] : []));
  const hasProfessional = roles.has('professional');
  const hasSpace = roles.has('space');
  const items: NavigationItem[] = [{ page: 'explore', label: 'Explorar' }];

  if (hasProfessional) items.push({ page: 'profile', label: 'Mi perfil' });
  else items.push({ page: 'professionals', label: 'Profesionales' });

  if (hasSpace) items.push({ page: 'my-space', label: 'Mi espacio' });
  else items.push({ page: 'space-directory', label: 'Espacio' });

  if (account) items.push({ page: 'agenda', label: 'Mi agenda' });
  items.push({ page: 'how-it-works', label: 'Cómo funciona' });
  return items;
}
