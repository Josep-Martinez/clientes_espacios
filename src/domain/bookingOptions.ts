import {
  checkCandidateAvailability,
  type AvailabilityProfile,
  type PrivateCommitment,
  type TimeSlot,
  type TravelModel,
} from "./availability.ts";
import {
  findCompatibleSpaces,
  type DemoSpace,
  type SpaceRequest,
  type SpaceReservation,
} from "./spaces.ts";
import type { BookingMode } from "./models.ts";

export interface BookingOptionSpace extends Omit<
  DemoSpace,
  "accessInstructions"
> {}

export interface BookingTimeOption {
  start: number;
  end: number;
  spaces: BookingOptionSpace[];
}

export interface BookingOptionInput {
  candidates: TimeSlot[];
  date: string;
  mode: BookingMode;
  professional: AvailabilityProfile;
  commitments: PrivateCommitment[];
  spaces: DemoSpace[];
  spaceReservations: SpaceReservation[];
  requiredEquipment: string[];
  requestedCapacity: number;
  preferredAreaLocationId: string;
  maxClientDistanceKm: number;
  travel: TravelModel;
}

export function getBookingOptions(
  input: BookingOptionInput,
): BookingTimeOption[] {
  if (input.mode === "online" || input.mode === "home") {
    const locationId =
      input.mode === "online" ? "online" : input.preferredAreaLocationId;
    return input.candidates
      .filter(
        (candidate) =>
          checkCandidateAvailability({
            candidate: { ...candidate, locationId },
            profile: input.professional,
            commitments: input.commitments,
            travel: input.travel,
          }).available,
      )
      .map(({ start, end }) => ({ start, end, spaces: [] }));
  }

  const kind = input.mode === "gym" ? "gym" : "room";

  return input.candidates.flatMap((candidate) => {
    const request: SpaceRequest = {
      date: input.date,
      start: candidate.start,
      end: candidate.end,
      requiredEquipment: input.requiredEquipment,
      requestedCapacity: input.requestedCapacity,
      professionalBaseLocationId: input.professional.baseLocationId,
      professionalMaxRadiusKm: input.professional.maxRadiusKm,
      preferredAreaLocationId: input.preferredAreaLocationId,
      maxClientDistanceKm: input.maxClientDistanceKm,
      kind,
    };
    const compatible = findCompatibleSpaces({
      spaces: input.spaces,
      request,
      reservations: input.spaceReservations,
      travel: input.travel,
    });
    const viableSpaces = compatible.filter(
      (space) =>
        checkCandidateAvailability({
          candidate: { ...candidate, locationId: space.locationId },
          profile: input.professional,
          commitments: input.commitments,
          travel: input.travel,
        }).available,
    );

    return viableSpaces.length > 0
      ? [{ start: candidate.start, end: candidate.end, spaces: viableSpaces }]
      : [];
  });
}
