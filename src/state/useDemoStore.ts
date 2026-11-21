import { useEffect, useState } from 'react';
import type { DemoBooking, DemoState, DemoWaitlistEntry, ProfessionalPreferences } from '../domain/models.ts';
import {
  addConversationMessage as addMessage,
  requestConversation as createConversationRequest,
  updateConversationStatus as changeConversationStatus,
  type NewConversationMessage,
  type NewConversationRequest,
} from '../domain/conversations.ts';
import {
  cancelDemoBookingOccurrence,
  readDemoState,
  saveDemoState,
  updateProfessionalPreferences,
} from './demoState.ts';

export interface DemoStore {
  state: DemoState;
  storageUnavailable: boolean;
  addBooking: (booking: DemoBooking) => void;
  addWaitlist: (entry: DemoWaitlistEntry) => void;
  requestConversation: (request: NewConversationRequest) => void;
  updateConversationStatus: (conversationId: string, professionalId: string, status: 'accepted' | 'declined') => void;
  sendConversationMessage: (message: NewConversationMessage) => void;
  cancelOccurrence: (bookingId: string, occurrenceId: string) => void;
  updatePreferences: (professionalId: string, value: ProfessionalPreferences) => void;
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

  function requestConversation(request: NewConversationRequest): void {
    setState((current) => ({
      ...current,
      conversations: createConversationRequest(current.conversations, request),
    }));
  }

  function updateConversationStatus(conversationId: string, professionalId: string, status: 'accepted' | 'declined'): void {
    setState((current) => ({
      ...current,
      conversations: changeConversationStatus(current.conversations, conversationId, professionalId, status),
    }));
  }

  function sendConversationMessage(message: NewConversationMessage): void {
    setState((current) => ({
      ...current,
      conversations: addMessage(current.conversations, message),
    }));
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

  return {
    state,
    storageUnavailable,
    addBooking,
    addWaitlist,
    requestConversation,
    updateConversationStatus,
    sendConversationMessage,
    cancelOccurrence,
    updatePreferences,
  };
}
