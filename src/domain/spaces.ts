export type SpaceKind = 'room' | 'gym';

export interface SpaceOpeningInterval {
  date: string;
  start: number;
  end: number;
}

export interface SpaceOpeningHours {
  weekdays: number[];
  start: number;
  end: number;
}

export interface DemoSpace {
  id: string;
  name: string;
  kind?: SpaceKind;
  locationId: string;
  zoneLabel?: string;
  capacity: number;
  equipment: string[];
  pricePerOccurrenceCents?: number;
  openIntervals?: SpaceOpeningInterval[];
  openingHours?: SpaceOpeningHours;
  accessInstructions?: string;
}

export interface SpaceReservation {
  spaceId: string;
  date: string;
  start: number;
  end: number;
  status: 'confirmed' | 'cancelled' | 'pending';
}

export interface SpaceRequest {
  date: string;
  start: number;
  end: number;
  requiredEquipment: string[];
  requestedCapacity: number;
  professionalBaseLocationId: string;
  professionalMaxRadiusKm: number;
  preferredAreaLocationId: string;
  maxClientDistanceKm: number;
  kind?: SpaceKind;
}

export interface SpaceDistanceModel {
  distanceKm: (from: string, to: string) => number;
}

function isOpen(space: DemoSpace, request: SpaceRequest): boolean {
  const exactOpening = space.openIntervals?.some(
    (interval) =>
      interval.date === request.date &&
      interval.start <= request.start &&
      interval.end >= request.end,
  );

  if (exactOpening) return true;
  if (!space.openingHours) return false;

  const weekday = new Date(`${request.date}T12:00:00`).getDay();
  return (
    space.openingHours.weekdays.includes(weekday) &&
    space.openingHours.start <= request.start &&
    space.openingHours.end >= request.end
  );
}

function hasConflict(
  space: DemoSpace,
  request: SpaceRequest,
  reservations: SpaceReservation[],
): boolean {
  return reservations.some(
    (reservation) =>
      reservation.spaceId === space.id &&
      reservation.date === request.date &&
      reservation.status === 'confirmed' &&
      request.start < reservation.end &&
      reservation.start < request.end,
  );
}

export function findCompatibleSpaces(input: {
  spaces: DemoSpace[];
  request: SpaceRequest;
  reservations: SpaceReservation[];
  travel: SpaceDistanceModel;
}): Array<Omit<DemoSpace, 'accessInstructions'>> {
  const { spaces, request, reservations, travel } = input;

  return spaces
    .filter((space) => {
      const hasEquipment = request.requiredEquipment.every((item) =>
        space.equipment.includes(item),
      );
      const withinProfessionalRadius =
        travel.distanceKm(request.professionalBaseLocationId, space.locationId) <=
        request.professionalMaxRadiusKm;
      const nearClientArea =
        travel.distanceKm(request.preferredAreaLocationId, space.locationId) <=
        request.maxClientDistanceKm;

      return (
        isOpen(space, request) &&
        (!request.kind || space.kind === request.kind) &&
        space.capacity >= request.requestedCapacity &&
        hasEquipment &&
        withinProfessionalRadius &&
        nearClientArea &&
        !hasConflict(space, request, reservations)
      );
    })
    .map(({ accessInstructions: _privateInstructions, ...publicSpace }) => publicSpace);
}
