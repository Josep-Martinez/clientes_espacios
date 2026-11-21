export interface TimeSlot {
  id?: string;
  start: number;
  end: number;
  locationId: string;
}

export interface PrivateCommitment {
  kind: 'appointment' | 'block';
  start: number;
  end: number;
  locationId?: string;
}

export interface AvailabilityProfile {
  baseLocationId: string;
  maxRadiusKm: number;
  maxTravelMinutes: number;
  bufferMinutes: number;
}

export interface TravelModel {
  distanceKm: (from: string, to: string) => number;
  travelMinutes: (from: string, to: string) => number;
}

export type AvailabilityReason =
  | 'conflict'
  | 'outside-radius'
  | 'travel-before'
  | 'travel-after'
  | 'invalid-interval';

export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: AvailabilityReason };

function overlaps(left: TimeSlot, right: PrivateCommitment): boolean {
  return left.start < right.end && right.start < left.end;
}

function nearestPrevious(
  candidate: TimeSlot,
  appointments: PrivateCommitment[],
): PrivateCommitment | undefined {
  return appointments
    .filter((appointment) => appointment.end <= candidate.start)
    .sort((left, right) => right.end - left.end)[0];
}

function nearestNext(
  candidate: TimeSlot,
  appointments: PrivateCommitment[],
): PrivateCommitment | undefined {
  return appointments
    .filter((appointment) => appointment.start >= candidate.end)
    .sort((left, right) => left.start - right.start)[0];
}

export function checkCandidateAvailability(input: {
  candidate: TimeSlot;
  profile: AvailabilityProfile;
  commitments: PrivateCommitment[];
  travel: TravelModel;
}): AvailabilityResult {
  const { candidate, profile, commitments, travel } = input;

  if (
    !Number.isFinite(candidate.start) ||
    !Number.isFinite(candidate.end) ||
    candidate.start >= candidate.end
  ) {
    return { available: false, reason: 'invalid-interval' };
  }

  if (commitments.some((commitment) => overlaps(candidate, commitment))) {
    return { available: false, reason: 'conflict' };
  }

  if (travel.distanceKm(profile.baseLocationId, candidate.locationId) > profile.maxRadiusKm) {
    return { available: false, reason: 'outside-radius' };
  }

  const appointments = commitments.filter(
    (commitment) => commitment.kind === 'appointment' && commitment.locationId,
  );
  const previous = nearestPrevious(candidate, appointments);

  if (previous?.locationId) {
    const travelMinutes = travel.travelMinutes(previous.locationId, candidate.locationId);
    const earliestStart = previous.end + travelMinutes + profile.bufferMinutes;
    if (travelMinutes > profile.maxTravelMinutes || candidate.start < earliestStart) {
      return { available: false, reason: 'travel-before' };
    }
  }

  const next = nearestNext(candidate, appointments);

  if (next?.locationId) {
    const travelMinutes = travel.travelMinutes(candidate.locationId, next.locationId);
    const latestEnd = next.start - travelMinutes - profile.bufferMinutes;
    if (travelMinutes > profile.maxTravelMinutes || candidate.end > latestEnd) {
      return { available: false, reason: 'travel-after' };
    }
  }

  return { available: true };
}

/** Return only the public time and selected location for viable slots. */
export function filterViableSlots(input: {
  candidates: TimeSlot[];
  profile: AvailabilityProfile;
  commitments: PrivateCommitment[];
  travel: TravelModel;
}): Array<Pick<TimeSlot, 'start' | 'end' | 'locationId'>> {
  return input.candidates
    .filter((candidate) =>
      checkCandidateAvailability({
        candidate,
        profile: input.profile,
        commitments: input.commitments,
        travel: input.travel,
      }).available,
    )
    .map(({ start, end, locationId }) => ({ start, end, locationId }));
}
