import type { DemoProfessional, DemoService } from './models.ts';

export interface PublicServiceResult {
  professional: Pick<DemoProfessional,
    'id' | 'name' | 'initials' | 'headline' | 'categories' | 'bio' | 'publicZone' | 'publicAreaLocationId' | 'rating' | 'reviewCount'>;
  service: DemoService;
}

export function searchServices(input: {
  query: string;
  format: 'individual' | 'group' | 'all';
  areaLocationId: string;
  maxAreaDistanceKm: number;
  professionals: DemoProfessional[];
  services: DemoService[];
  distanceKm: (from: string, to: string) => number;
}): PublicServiceResult[] {
  const query = input.query.trim().toLocaleLowerCase('es-ES');

  return input.services.flatMap((service) => {
    if (input.format !== 'all' && service.format !== input.format) return [];

    const professional = input.professionals.find((item) => item.id === service.professionalId);
    if (!professional) return [];

    const isOnlineOnly = service.modalities.every((mode) => mode === 'online');
    const nearArea = isOnlineOnly ||
      input.distanceKm(professional.publicAreaLocationId, input.areaLocationId) <= input.maxAreaDistanceKm;
    const matchesQuery = !query || [
      service.name,
      service.category,
      service.description,
      professional.name,
      professional.headline,
      ...professional.categories,
    ].join(' ').toLocaleLowerCase('es-ES').includes(query);

    if (!nearArea || !matchesQuery) return [];

    const {
      preferences: _privatePreferences,
      privateCalendarByWeekday: _privateCalendar,
      ...publicProfessional
    } = professional;

    return [{ professional: publicProfessional, service }];
  });
}
