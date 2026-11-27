export type BookFitRole = "client" | "professional" | "space_manager";
export type BookingMode = "room" | "gym" | "home" | "online";

export interface BookFitActor {
  actorId: string;
  name: string;
  roles: BookFitRole[];
  professionalId: string | null;
  spaceIds: string[];
}

export interface DemoProfile {
  id: string;
  name: string;
  roles: BookFitRole[];
  professionalId: string | null;
  spaceIds: string[];
}

export interface Location {
  id: string;
  slug: string;
  name: string;
  isOnline?: boolean;
}

export interface Professional {
  id: string;
  slug: string;
  name: string;
  headline: string;
  bio: string;
  publicZone: string;
  publicLocationId: string;
  rating: number;
  reviewCount: number;
  categories: string[];
}

export interface Service {
  id: string;
  slug: string;
  professionalId: string;
  professionalName: string;
  professionalHeadline: string;
  professionalZone: string;
  professionalRating: number;
  name: string;
  category: string;
  description: string;
  format: "individual" | "group";
  durationMinutes: number;
  priceCents: number;
  modalities: BookingMode[];
  requiredEquipment: string[];
  groupCapacity: number | null;
  classActivity: string | null;
}

export interface Space {
  id: string;
  slug: string;
  name: string;
  kind: "room" | "gym";
  locationId: string;
  locationName: string;
  capacity: number;
  equipment: string[];
  amenities: string[];
  description: string;
  pricePerOccurrenceCents: number;
}

export interface Catalog {
  locations: Location[];
  professionals: Professional[];
  services: Service[];
  spaces: Space[];
}

export interface ClassSession {
  id: string;
  serviceId: string;
  serviceName: string;
  professionalName: string;
  spaceId: string;
  spaceName: string;
  date: string;
  startMinute: number;
  endMinute: number;
  capacity: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface AvailableSpace {
  id: string;
  name: string;
  kind: "room" | "gym";
  locationId: string;
  locationName: string;
  pricePerOccurrenceCents: number;
}

export interface AvailabilitySlot {
  date: string;
  startMinute: number;
  endMinute: number;
  spaces: AvailableSpace[];
}

export interface CheckoutLine {
  occurrenceId: string;
  kind: "service" | "service_commission" | "space" | "space_commission";
  description: string;
  amountCents: number;
}

export interface Checkout {
  checkoutId: string;
  status: "pending" | "paid" | "failed" | "expired";
  holdExpiresAt: string | null;
  totalCents: number;
  lines: CheckoutLine[];
  occurrences: Array<{ id: string; date: string; start: string; end: string }>;
}

export type CheckoutPaymentResult = Pick<
  Checkout,
  "checkoutId" | "totalCents"
> & {
  status: Exclude<Checkout["status"], "pending">;
};

export interface AgendaEvent {
  bookingId: string;
  occurrenceId: string;
  clientActorId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  serviceId: string;
  serviceName: string;
  spaceId: string | null;
  spaceName: string | null;
  seats: number;
  mode: BookingMode;
  date: string;
  start: string;
  end: string;
  status: "pending" | "confirmed" | "cancelled";
}

export interface ProfessionalPreferences {
  baseLocationId: string;
  maxRadiusKm: number;
  maxTravelMinutes: number;
  bufferMinutes: number;
  trainingApproach: string;
  qualifications: string;
  modalities: BookingMode[];
}

export interface SpaceMetrics {
  confirmedOccurrences: number;
  bookedMinutes: number;
  openMinutes: number;
  utilizationPercent: number;
  grossEarningsCents: number;
  estimatedOwnerEarningsCents: number;
}

export interface InformationRequest {
  id: string;
  bookingOccurrenceId: string;
  senderActorId: string;
  senderName: string;
  recipientActorId: string;
  recipientName: string;
  recipientKind: "client" | "space_manager";
  body: string;
  readAt: string | null;
  createdAt: string;
  serviceName: string;
  serviceDate: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: { message?: string; code?: string } | string | null;
}

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/csrf", { credentials: "same-origin" });
  const envelope = (await response.json()) as ApiEnvelope<{ token: string }>;
  if (!response.ok || !envelope.success || !envelope.data?.token)
    throw new Error("No se pudo iniciar la sesión segura.");
  csrfToken = envelope.data.token;
  return csrfToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    headers.set("X-CSRF-Token", await ensureCsrfToken());
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      method,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new Error(
      "No se pudo conectar con BookFit. Comprueba que el servidor local esté iniciado.",
    );
  }
  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("El servidor devolvió una respuesta no válida.");
  }
  if (!response.ok || !envelope.success) {
    const message =
      typeof envelope.error === "string"
        ? envelope.error
        : envelope.error?.message;
    throw new Error(message || `La solicitud falló (${response.status}).`);
  }
  return envelope.data;
}

export const bookfitApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  idempotencyKey: () => crypto.randomUUID(),
};
