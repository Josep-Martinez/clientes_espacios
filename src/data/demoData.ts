import type { DemoClassSession, DemoLocation, DemoProfessional, DemoService, DemoSpaceRecord } from '../domain/models.ts';

export const DEMO_LOCATIONS: DemoLocation[] = [
  { id: 'ruzafa', name: 'Ruzafa', x: 0, y: 0 },
  { id: 'centro', name: 'Centro', x: 2.1, y: 0.4 },
  { id: 'benimaclet', name: 'Benimaclet', x: 0.8, y: 4.1 },
  { id: 'mestalla', name: 'Mestalla', x: 1.3, y: 2 },
  { id: 'cabanyal', name: 'Cabanyal', x: 5.2, y: 0.7 },
  { id: 'patraix', name: 'Patraix', x: -3.1, y: -2.2 },
  { id: 'campanar', name: 'Campanar', x: -1.5, y: 4.4 },
  { id: 'online', name: 'En línea', x: 0, y: 0 },
];

const locationById = new Map(DEMO_LOCATIONS.map((location) => [location.id, location]));

export function simulatedDistanceKm(from: string, to: string): number {
  if (from === to || from === 'online' || to === 'online') return 0;
  const origin = locationById.get(from);
  const destination = locationById.get(to);
  if (!origin || !destination) return Number.POSITIVE_INFINITY;
  return Math.round(Math.hypot(origin.x - destination.x, origin.y - destination.y) * 10) / 10;
}

export function simulatedTravelMinutes(from: string, to: string): number {
  const distance = simulatedDistanceKm(from, to);
  if (distance === 0) return 0;
  if (!Number.isFinite(distance)) return Number.POSITIVE_INFINITY;
  return Math.ceil(distance * 4 + 5);
}

function calendarWithPrivateEvents(): Record<number, Array<{
  kind: 'appointment' | 'block';
  start: number;
  end: number;
  locationId?: string;
}>> {
  return {
    0: [],
    1: [
      { kind: 'appointment', start: 510, end: 540, locationId: 'centro' },
      { kind: 'block', start: 780, end: 840 },
      { kind: 'appointment', start: 1110, end: 1140, locationId: 'benimaclet' },
    ],
    2: [
      { kind: 'appointment', start: 510, end: 540, locationId: 'centro' },
      { kind: 'block', start: 780, end: 840 },
      { kind: 'appointment', start: 1110, end: 1140, locationId: 'benimaclet' },
    ],
    3: [
      { kind: 'appointment', start: 510, end: 540, locationId: 'centro' },
      { kind: 'block', start: 780, end: 840 },
      { kind: 'appointment', start: 1110, end: 1140, locationId: 'benimaclet' },
    ],
    4: [
      { kind: 'appointment', start: 510, end: 540, locationId: 'centro' },
      { kind: 'block', start: 780, end: 840 },
      { kind: 'appointment', start: 1110, end: 1140, locationId: 'benimaclet' },
    ],
    5: [
      { kind: 'appointment', start: 570, end: 600, locationId: 'mestalla' },
      { kind: 'block', start: 780, end: 840 },
    ],
    6: [],
  };
}

const commonCalendar = calendarWithPrivateEvents();

export const DEMO_PROFESSIONALS: DemoProfessional[] = [
  {
    id: 'marina-ortega',
    name: 'Marina Ortega',
    initials: 'MO',
    headline: 'Entrenamiento personal',
    categories: ['Entrenamiento personal', 'Preparación física'],
    bio: 'Sesiones de fuerza y movimiento adaptadas a tu ritmo.',
    publicZone: 'Ruzafa · València',
    publicAreaLocationId: 'ruzafa',
    rating: 4.9,
    reviewCount: 86,
    preferences: {
      baseLocationId: 'ruzafa',
      maxRadiusKm: 8,
      maxTravelMinutes: 35,
      bufferMinutes: 15,
      modalities: ['room', 'gym', 'home', 'online'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
  {
    id: 'nora-vidal',
    name: 'Nora Vidal',
    initials: 'NV',
    headline: 'Pilates y movilidad',
    categories: ['Pilates', 'Movilidad'],
    bio: 'Clases cuidadas para ganar fuerza, control y libertad de movimiento.',
    publicZone: 'Benimaclet · València',
    publicAreaLocationId: 'benimaclet',
    rating: 4.8,
    reviewCount: 52,
    preferences: {
      baseLocationId: 'benimaclet',
      maxRadiusKm: 7,
      maxTravelMinutes: 30,
      bufferMinutes: 15,
      modalities: ['room', 'gym', 'online'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
  {
    id: 'leo-ferrer',
    name: 'Leo Ferrer',
    initials: 'LF',
    headline: 'Fisioterapia',
    categories: ['Fisioterapia'],
    bio: 'Valoración y tratamiento de movimiento con objetivos claros.',
    publicZone: 'Centro · València',
    publicAreaLocationId: 'centro',
    rating: 4.9,
    reviewCount: 114,
    preferences: {
      baseLocationId: 'centro',
      maxRadiusKm: 9,
      maxTravelMinutes: 40,
      bufferMinutes: 15,
      modalities: ['room', 'home', 'online'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
  {
    id: 'alba-mateu',
    name: 'Alba Mateu',
    initials: 'AM',
    headline: 'Yoga y respiración',
    categories: ['Yoga'],
    bio: 'Prácticas accesibles para recuperar espacio y energía.',
    publicZone: 'Mestalla · València',
    publicAreaLocationId: 'mestalla',
    rating: 4.8,
    reviewCount: 38,
    preferences: {
      baseLocationId: 'mestalla',
      maxRadiusKm: 8,
      maxTravelMinutes: 35,
      bufferMinutes: 15,
      modalities: ['room', 'gym', 'online'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
  {
    id: 'marta-soler',
    name: 'Marta Soler',
    initials: 'MS',
    headline: 'Podología',
    categories: ['Podología'],
    bio: 'Cuidado y orientación para que tus pasos acompañen tu día a día.',
    publicZone: 'Centro · València',
    publicAreaLocationId: 'centro',
    rating: 4.9,
    reviewCount: 67,
    preferences: {
      baseLocationId: 'centro',
      maxRadiusKm: 6,
      maxTravelMinutes: 25,
      bufferMinutes: 15,
      modalities: ['room'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
  {
    id: 'vera-campos',
    name: 'Vera Campos',
    initials: 'VC',
    headline: 'Masaje deportivo',
    categories: ['Masaje deportivo', 'Masaje terapéutico'],
    bio: 'Sesiones de recuperación en una sala tranquila y equipada.',
    publicZone: 'Ruzafa · València',
    publicAreaLocationId: 'ruzafa',
    rating: 4.7,
    reviewCount: 42,
    preferences: {
      baseLocationId: 'ruzafa',
      maxRadiusKm: 6,
      maxTravelMinutes: 30,
      bufferMinutes: 15,
      modalities: ['room', 'home'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
  {
    id: 'iris-blasco',
    name: 'Iris Blasco',
    initials: 'IB',
    headline: 'Nutrición',
    categories: ['Dietética y nutrición'],
    bio: 'Acompañamiento nutricional práctico y compatible con tu rutina.',
    publicZone: 'València · En línea',
    publicAreaLocationId: 'online',
    rating: 5,
    reviewCount: 29,
    preferences: {
      baseLocationId: 'online',
      maxRadiusKm: 0,
      maxTravelMinutes: 0,
      bufferMinutes: 0,
      modalities: ['online'],
    },
    privateCalendarByWeekday: commonCalendar,
  },
];

export const DEMO_SERVICES: DemoService[] = [
  {
    id: 'entrenamiento-uno-a-uno',
    professionalId: 'marina-ortega',
    name: 'Entrenamiento personal',
    category: 'Entrenamiento personal',
    description: 'Una sesión individual de fuerza y acondicionamiento.',
    format: 'individual',
    durationMinutes: 60,
    priceCents: 3800,
    modalities: ['room', 'gym', 'home', 'online'],
    requiredEquipment: ['bandas', 'mancuernas'],
  },
  {
    id: 'entrenamiento-gimnasio',
    professionalId: 'marina-ortega',
    name: 'Sesión en gimnasio',
    category: 'Entrenamiento personal',
    description: 'Entrena con material completo y acceso de bienvenida al centro.',
    format: 'individual',
    durationMinutes: 55,
    priceCents: 3400,
    modalities: ['gym'],
    requiredEquipment: ['mancuernas'],
  },
  {
    id: 'pilates-grupo',
    professionalId: 'nora-vidal',
    name: 'Pilates con reformer',
    category: 'Pilates',
    description: 'Clase de grupo con plazas limitadas y fechas seleccionables.',
    format: 'group',
    durationMinutes: 55,
    priceCents: 1600,
    modalities: ['room'],
    requiredEquipment: ['reformer'],
    groupCapacity: 8,
    classActivity: 'Pilates en grupo',
  },
  {
    id: 'yoga-flujo',
    professionalId: 'alba-mateu',
    name: 'Yoga: flujo de mañana',
    category: 'Yoga',
    description: 'Una práctica grupal para empezar el día con movimiento.',
    format: 'group',
    durationMinutes: 60,
    priceCents: 1400,
    modalities: ['room'],
    requiredEquipment: ['esterillas'],
    groupCapacity: 12,
    classActivity: 'Yoga en grupo',
  },
  {
    id: 'movilidad-individual',
    professionalId: 'nora-vidal',
    name: 'Sesión de movilidad',
    category: 'Movilidad',
    description: 'Trabajo individual de control, rango y movimiento.',
    format: 'individual',
    durationMinutes: 50,
    priceCents: 3200,
    modalities: ['room', 'online'],
    requiredEquipment: ['esterillas'],
  },
  {
    id: 'fisioterapia',
    professionalId: 'leo-ferrer',
    name: 'Fisioterapia y valoración',
    category: 'Fisioterapia',
    description: 'Sesión individual en consulta o en línea.',
    format: 'individual',
    durationMinutes: 50,
    priceCents: 5200,
    modalities: ['room', 'home', 'online'],
    requiredEquipment: ['camilla'],
  },
  {
    id: 'podologia',
    professionalId: 'marta-soler',
    name: 'Valoración podológica',
    category: 'Podología',
    description: 'Consulta individual en una sala de atención privada.',
    format: 'individual',
    durationMinutes: 45,
    priceCents: 4700,
    modalities: ['room'],
    requiredEquipment: ['camilla'],
  },
  {
    id: 'masaje-deportivo',
    professionalId: 'vera-campos',
    name: 'Masaje deportivo',
    category: 'Masaje deportivo',
    description: 'Sesión de recuperación en una sala preparada.',
    format: 'individual',
    durationMinutes: 60,
    priceCents: 4900,
    modalities: ['room', 'home'],
    requiredEquipment: ['camilla'],
  },
  {
    id: 'nutricion-online',
    professionalId: 'iris-blasco',
    name: 'Consulta de nutrición',
    category: 'Dietética y nutrición',
    description: 'Sesión individual en línea para revisar tus objetivos.',
    format: 'individual',
    durationMinutes: 45,
    priceCents: 4200,
    modalities: ['online'],
    requiredEquipment: [],
  },
];

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export const DEMO_SPACES: DemoSpaceRecord[] = [
  {
    id: 'loft-rueda',
    name: 'Loft Rueda',
    kind: 'room',
    locationId: 'ruzafa',
    zoneLabel: 'Ruzafa',
    capacity: 5,
    equipment: ['bandas', 'mancuernas', 'esterillas'],
    pricePerOccurrenceCents: 1800,
    openingHours: { weekdays: ALL_WEEKDAYS, start: 480, end: 1260 },
    accessInstructions: 'Entrada lateral; recepción de bienvenida (código de acceso ficticio: 4182).',
    description: 'Sala de movimiento con luz natural y material funcional.',
    amenities: ['Accesible', 'Vestuario', 'Luz natural'],
  },
  {
    id: 'consulta-azul',
    name: 'Consulta Azul',
    kind: 'room',
    locationId: 'centro',
    zoneLabel: 'Centro',
    capacity: 2,
    equipment: ['camilla'],
    pricePerOccurrenceCents: 1600,
    openingHours: { weekdays: [1, 2, 3, 4, 5, 6], start: 480, end: 1200 },
    accessInstructions: 'Llamar al timbre de Consulta Azul; instrucciones ficticias para la demo.',
    description: 'Consulta privada para fisioterapia, podología y masaje.',
    amenities: ['Privacidad', 'Baño', 'Recepción'],
  },
  {
    id: 'estudio-reformer',
    name: 'Estudio Reformer',
    kind: 'room',
    locationId: 'benimaclet',
    zoneLabel: 'Benimaclet',
    capacity: 8,
    equipment: ['reformer', 'esterillas'],
    pricePerOccurrenceCents: 2400,
    openingHours: { weekdays: ALL_WEEKDAYS, start: 480, end: 1320 },
    accessInstructions: 'La recepción indica el estudio asignado; dato ficticio de acceso.',
    description: 'Estudio para sesiones de Pilates individual y grupal.',
    amenities: ['Reformers', 'Duchas', 'Recepción'],
  },
  {
    id: 'patio-move',
    name: 'Patio Move',
    kind: 'room',
    locationId: 'mestalla',
    zoneLabel: 'Mestalla',
    capacity: 14,
    equipment: ['esterillas', 'bandas'],
    pricePerOccurrenceCents: 2000,
    openingHours: { weekdays: ALL_WEEKDAYS, start: 480, end: 1260 },
    accessInstructions: 'Acceso por recepción del patio; instrucción de muestra.',
    description: 'Espacio amplio para yoga, movilidad y actividad suave.',
    amenities: ['Accesible', 'Esterillas', 'Zona de espera'],
  },
  {
    id: 'senda-gym',
    name: 'Senda Gym',
    kind: 'gym',
    locationId: 'ruzafa',
    zoneLabel: 'Ruzafa',
    capacity: 40,
    equipment: ['mancuernas', 'bandas', 'máquinas', 'racks'],
    pricePerOccurrenceCents: 700,
    openingHours: { weekdays: ALL_WEEKDAYS, start: 360, end: 1380 },
    accessInstructions: 'Presenta la reserva demo en recepción. No es un acceso real.',
    description: 'Gimnasio con zona de fuerza y material variado.',
    amenities: ['Duchas', 'Taquillas', 'Zona de fuerza'],
  },
  {
    id: 'activa-cabanyal',
    name: 'Activa Cabanyal',
    kind: 'gym',
    locationId: 'cabanyal',
    zoneLabel: 'Cabanyal',
    capacity: 55,
    equipment: ['mancuernas', 'máquinas', 'racks'],
    pricePerOccurrenceCents: 600,
    openingHours: { weekdays: ALL_WEEKDAYS, start: 360, end: 1380 },
    accessInstructions: 'Acceso ficticio: validar la reserva demo en mostrador.',
    description: 'Gimnasio amplio con zona de entrenamiento funcional.',
    amenities: ['Duchas', 'Taquillas', 'Accesible'],
  },
];

function dateAtNextWeekday(weekday: number, weekOffset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const daysUntil = (weekday - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntil + weekOffset * 7);
  return date.toISOString().slice(0, 10);
}

export const DEMO_CLASS_SESSIONS: DemoClassSession[] = [
  ...[0, 1, 2, 3].map((weekOffset) => ({
    id: `pilates-${weekOffset + 1}`,
    serviceId: 'pilates-grupo',
    professionalId: 'nora-vidal',
    spaceId: 'estudio-reformer',
    date: dateAtNextWeekday(3, weekOffset),
    start: 1080,
    end: 1135,
    capacity: 8,
  })),
  ...[0, 1, 2, 3].map((weekOffset) => ({
    id: `yoga-${weekOffset + 1}`,
    serviceId: 'yoga-flujo',
    professionalId: 'alba-mateu',
    spaceId: 'patio-move',
    date: dateAtNextWeekday(6, weekOffset),
    start: 600,
    end: 660,
    capacity: 12,
  })),
];

export const DEMO_GROUP_SEAT_COUNTS: Record<string, number> = {
  'pilates-1': 5,
  'pilates-2': 8,
  'pilates-3': 4,
  'pilates-4': 6,
  'yoga-1': 7,
  'yoga-2': 12,
  'yoga-3': 8,
  'yoga-4': 5,
};

export const TIME_CHOICES = [570, 630, 690, 855, 930, 1020, 1080];

export function addDaysToDate(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDefaultSearchDate(): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  today.setDate(today.getDate() + 1);
  return today.toISOString().slice(0, 10);
}

export function formatDateLabel(dateString: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
}
