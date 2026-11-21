import { useEffect, useState } from 'react';
import type { DemoBooking, DemoState, DemoWaitlistEntry, ProfessionalPreferences } from '../domain/models.ts';
import {
  cancelDemoBookingOccurrence,
  createInitialDemoState,
  readDemoState,
  saveDemoState,
  updateProfessionalPreferences,
} from './demoState.ts';

export interface DemoStore {
  state: DemoState;
  storageUnavailable: boolean;
  addBooking: (booking: DemoBooking) => void;
  addWaitlist: (entry: DemoWaitlistEntry) => void;
  cancelOccurrence: (bookingId: string, occurrenceId: string) => void;
  updatePreferences: (professionalId: string, value: ProfessionalPreferences) => void;
  resetDemo: () => void;
}

export function useDemoStore(): DemoStore {
  const [state, setState] = useState<DemoState>(readDemoState);
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  useEffect(() => {
    setStorageUnavailable(!saveDemoState(state));
  }, [state]);

  function addBooking(booking: DemoBooking): void {
    setState((current) => ({ ...current, bookings: [...current.bookings, booking] }));
  }

  function addWaitlist(entry: DemoWaitlistEntry): void {
    setState((current) => ({ ...current, waitlist: [...current.waitlist, entry] }));
  }

  function cancelOccurrence(bookingId: string, occurrenceId: string): void {
    setState((current) => ({
      ...current,
      bookings: current.bookings.map((booking) =>
        booking.id === bookingId
          ? cancelDemoBookingOccurrence(booking, occurrenceId)
          : booking,
      ),
    }));
  }

  function updatePreferences(professionalId: string, value: ProfessionalPreferences): void {
    setState((current) => ({
      ...current,
      preferencesByProfessional: updateProfessionalPreferences(
        current.preferencesByProfessional,
        professionalId,
        value,
      ),
    }));
  }

  function resetDemo(): void {
    setState(createInitialDemoState());
  }

  return {
    state,
    storageUnavailable,
    addBooking,
    addWaitlist,
    cancelOccurrence,
    updatePreferences,
    resetDemo,
  };
}
