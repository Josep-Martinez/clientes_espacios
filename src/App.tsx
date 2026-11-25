import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  buqfitApi,
  type AgendaEvent,
  type AvailabilitySlot,
  type BuqFitActor,
  type Catalog,
  type Checkout,
  type CheckoutPaymentResult,
  type ClassSession,
  type DemoProfile,
  type InformationRequest,
  type ProfessionalPreferences,
  type Service,
  type Space,
  type SpaceMetrics,
} from "./api/buqfit.ts";

type Page = "explore" | "agenda" | "professional" | "spaces" | "requests";
type Feedback = { kind: "success" | "error" | "info"; message: string } | null;

const BOOKING_MODES = [
  { value: "room", label: "Sala" },
  { value: "gym", label: "Gimnasio" },
  { value: "home", label: "A domicilio" },
  { value: "online", label: "En línea" },
] as const;

function hasRole(
  actor: BuqFitActor | null,
  role: BuqFitActor["roles"][number],
): boolean {
  return Boolean(actor?.roles.includes(role));
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfter(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function plusDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatTime(value: string | number): string {
  if (typeof value === "number") {
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function initials(name: string | null | undefined): string {
  const safeName = typeof name === "string" && name.trim() ? name : "BuqFit";
  return (
    safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BQ"
  );
}

function startOfToday(): string {
  return dateKey(new Date());
}

function getRoleLabel(roles: BuqFitActor["roles"]): string {
  const labels: Record<BuqFitActor["roles"][number], string> = {
    client: "Cliente",
    professional: "Profesional",
    space_manager: "Gestor de espacio",
  };
  return roles.map((role) => labels[role]).join(" · ");
}

function selectedData<T>(
  value:
    | T[]
    | {
        items?: T[];
        sessions?: T[];
        requests?: T[];
        spaces?: T[];
        profiles?: T[];
        slots?: T[];
      },
): T[] {
  if (Array.isArray(value)) return value as T[];
  const wrapped = value as {
    items?: T[];
    sessions?: T[];
    requests?: T[];
    spaces?: T[];
    profiles?: T[];
    slots?: T[];
  };
  return (
    wrapped.items ??
    wrapped.sessions ??
    wrapped.requests ??
    wrapped.spaces ??
    wrapped.profiles ??
    wrapped.slots ??
    []
  );
}

function actorFromPayload(payload: unknown): BuqFitActor | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidate = (record.actor ??
    record.me ??
    payload) as Partial<BuqFitActor>;
  if (typeof candidate.actorId !== "string" || !Array.isArray(candidate.roles))
    return null;
  return {
    actorId: candidate.actorId,
    name: typeof candidate.name === "string" ? candidate.name : "Cuenta demo",
    roles: candidate.roles as BuqFitActor["roles"],
    professionalId: candidate.professionalId ?? null,
    spaceIds: Array.isArray(candidate.spaceIds) ? candidate.spaceIds : [],
  };
}

export default function App() {
  const [actor, setActor] = useState<BuqFitActor | null>(null);
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [catalog, setCatalog] = useState<Catalog>({
    locations: [],
    professionals: [],
    services: [],
    spaces: [],
  });
  const [page, setPage] = useState<Page>("explore");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [requests, setRequests] = useState<InformationRequest[]>([]);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  const refreshAccount = useCallback(
    async (currentActor: BuqFitActor | null) => {
      if (!currentActor) {
        setAgenda([]);
        setRequests([]);
        return;
      }
      const from = startOfToday();
      const to = dateAfter(90);
      const [agendaResult, requestResult] = await Promise.allSettled([
        buqfitApi.get<AgendaEvent[] | { items?: AgendaEvent[] }>(
          `/agenda?from=${from}&to=${to}`,
        ),
        buqfitApi.get<
          InformationRequest[] | { requests?: InformationRequest[] }
        >(`/information-requests`),
      ]);
      if (agendaResult.status === "fulfilled")
        setAgenda(selectedData(agendaResult.value));
      if (requestResult.status === "fulfilled")
        setRequests(selectedData(requestResult.value));
    },
    [],
  );

  const refreshCatalog = useCallback(async (query = "") => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    const suffix = params.size ? `?${params.toString()}` : "";
    const result = await buqfitApi.get<Catalog>(`/catalog${suffix}`);
    setCatalog({
      locations: result.locations ?? [],
      professionals: result.professionals ?? [],
      services: result.services ?? [],
      spaces: result.spaces ?? [],
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    async function initialize(): Promise<void> {
      setLoading(true);
      try {
        const [meResult, catalogResult, profilesResult] =
          await Promise.allSettled([
            buqfitApi.get<unknown>("/me"),
            buqfitApi.get<Catalog>("/catalog"),
            buqfitApi.get<DemoProfile[] | { profiles?: DemoProfile[] }>(
              "/dev/profiles",
            ),
          ]);
        if (!mounted) return;
        const currentActor =
          meResult.status === "fulfilled"
            ? actorFromPayload(meResult.value)
            : null;
        setActor(currentActor);
        if (catalogResult.status === "fulfilled") {
          setCatalog({
            locations: catalogResult.value.locations ?? [],
            professionals: catalogResult.value.professionals ?? [],
            services: catalogResult.value.services ?? [],
            spaces: catalogResult.value.spaces ?? [],
          });
        } else {
          setFeedback({
            kind: "error",
            message:
              catalogResult.reason instanceof Error
                ? catalogResult.reason.message
                : "No se pudo cargar el catálogo.",
          });
        }
        if (profilesResult.status === "fulfilled")
          setProfiles(selectedData(profilesResult.value));
        await refreshAccount(currentActor);
      } catch (error) {
        if (mounted)
          setFeedback({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo iniciar BuqFit.",
          });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void initialize();
    return () => {
      mounted = false;
    };
  }, [refreshAccount]);

  async function signIn(profileId: string): Promise<void> {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await buqfitApi.post<unknown>("/dev/session", {
        profileId,
      });
      const nextActor = actorFromPayload(result);
      if (!nextActor)
        throw new Error("El servidor no devolvió el perfil seleccionado.");
      setActor(nextActor);
      setSessionOpen(false);
      setPage("explore");
      await refreshAccount(nextActor);
      setFeedback({
        kind: "success",
        message: `Sesión iniciada como ${nextActor.name}.`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function signOut(): Promise<void> {
    setBusy(true);
    try {
      await buqfitApi.delete("/dev/session");
      setActor(null);
      setAgenda([]);
      setRequests([]);
      setPage("explore");
      setSessionOpen(false);
      setFeedback({ kind: "info", message: "Has cerrado la sesión local." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cerrar la sesión.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function reloadAccount(): Promise<void> {
    await refreshAccount(actor);
    await refreshCatalog();
  }

  const unreadCount = requests.filter(
    (request) => request.recipientActorId === actor?.actorId && !request.readAt,
  ).length;

  return (
    <div className="bqf-app">
      <a className="bqf-skip" href="#bqf-main">
        Saltar al contenido
      </a>
      <header className="bqf-header">
        <button
          aria-label="BuqFit, explorar"
          className="bqf-brand"
          onClick={() => setPage("explore")}
          type="button"
        >
          <span className="bqf-brand-mark" aria-hidden="true">
            B
          </span>
          <span>BuqFit</span>
        </button>
        <nav aria-label="Navegación principal" className="bqf-nav">
          <button
            aria-current={page === "explore" ? "page" : undefined}
            onClick={() => setPage("explore")}
            type="button"
          >
            Explorar
          </button>
          {actor && (
            <button
              aria-current={page === "agenda" ? "page" : undefined}
              onClick={() => setPage("agenda")}
              type="button"
            >
              Agenda
            </button>
          )}
          {hasRole(actor, "professional") && (
            <button
              aria-current={page === "professional" ? "page" : undefined}
              onClick={() => setPage("professional")}
              type="button"
            >
              Mi perfil
            </button>
          )}
          {hasRole(actor, "space_manager") && (
            <button
              aria-current={page === "spaces" ? "page" : undefined}
              onClick={() => setPage("spaces")}
              type="button"
            >
              Espacios
            </button>
          )}
          {actor && (
            <button
              aria-current={page === "requests" ? "page" : undefined}
              onClick={() => setPage("requests")}
              type="button"
            >
              Solicitudes
              {unreadCount > 0 && (
                <span className="bqf-count">{unreadCount}</span>
              )}
            </button>
          )}
        </nav>
        <button
          aria-label={
            actor
              ? `Perfil local de ${actor.name}`
              : "Perfil local: modo público"
          }
          className="bqf-profile"
          onClick={() => setSessionOpen(true)}
          type="button"
        >
          <span className="bqf-avatar">
            {actor ? initials(actor.name) : "·"}
          </span>
          <span className="bqf-profile-copy">
            <small>{actor ? getRoleLabel(actor.roles) : "Modo público"}</small>
            <strong>{actor?.name ?? "Elegir perfil"}</strong>
          </span>
          <span aria-hidden="true" className="bqf-chevron">
            ⌄
          </span>
        </button>
      </header>

      <main className="bqf-main" id="bqf-main">
        <div className="bqf-demo-banner">
          <span aria-hidden="true">●</span>
          <div>
            <strong>Entorno local de prueba</strong>
            <span>Perfiles y pagos simulados. No se procesa dinero real.</span>
          </div>
        </div>
        {feedback && (
          <div className={`bqf-alert bqf-alert-${feedback.kind}`} role="status">
            <span>{feedback.message}</span>
            <button
              aria-label="Cerrar aviso"
              onClick={() => setFeedback(null)}
              type="button"
            >
              ×
            </button>
          </div>
        )}
        {loading ? (
          <section className="bqf-loading" aria-live="polite">
            Cargando BuqFit…
          </section>
        ) : (
          <>
            {page === "explore" && (
              <ExplorePage
                actor={actor}
                catalog={catalog}
                onLogin={() => setSessionOpen(true)}
                onRefresh={refreshCatalog}
                onCheckout={(value) => setCheckout(value)}
                onError={(message) => setFeedback({ kind: "error", message })}
                onSuccess={(message) =>
                  setFeedback({ kind: "success", message })
                }
              />
            )}
            {page === "agenda" && actor && (
              <AgendaPage
                actor={actor}
                agenda={agenda}
                onRefresh={reloadAccount}
                onFeedback={setFeedback}
              />
            )}
            {page === "professional" && actor && (
              <ProfessionalPage
                actor={actor}
                catalog={catalog}
                onFeedback={setFeedback}
              />
            )}
            {page === "spaces" && actor && (
              <SpacesPage
                actor={actor}
                spaces={catalog.spaces}
                onFeedback={setFeedback}
              />
            )}
            {page === "requests" && actor && (
              <RequestsPage
                actor={actor}
                requests={requests}
                onRefresh={reloadAccount}
                onFeedback={setFeedback}
              />
            )}
          </>
        )}
      </main>
      <footer className="bqf-footer">
        <strong>BuqFit</strong>
        <span>Un espacio para moverte mejor.</span>
        <span>Primera versión local · datos sintéticos</span>
      </footer>

      {sessionOpen && (
        <ProfileDialog
          actor={actor}
          profiles={profiles}
          busy={busy}
          onClose={() => setSessionOpen(false)}
          onSelect={signIn}
          onSignOut={actor ? signOut : undefined}
        />
      )}
      {checkout && (
        <CheckoutDialog
          checkout={checkout}
          busy={busy}
          onClose={() => setCheckout(null)}
          onPay={async (outcome) => {
            setBusy(true);
            try {
              const result = await buqfitApi.post<CheckoutPaymentResult>(
                `/dev/checkouts/${checkout.checkoutId}/pay`,
                { outcome },
                buqfitApi.idempotencyKey(),
              );
              setCheckout((current) =>
                current
                  ? {
                      ...current,
                      status: result.status,
                      totalCents: result.totalCents,
                    }
                  : current,
              );
              if (result.status === "paid") {
                setFeedback({
                  kind: "success",
                  message:
                    "Pago simulado correcto. La reserva quedó guardada en PostgreSQL.",
                });
                await refreshAccount(actor);
              } else if (result.status === "expired") {
                setFeedback({
                  kind: "error",
                  message:
                    "La retención caducó. El horario ya no está reservado.",
                });
              } else {
                setFeedback({
                  kind: "error",
                  message: "El pago simulado falló y la retención se liberó.",
                });
              }
            } catch (error) {
              setFeedback({
                kind: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "No se pudo procesar el pago.",
              });
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function ProfileDialog({
  actor,
  profiles,
  busy,
  onClose,
  onSelect,
  onSignOut,
}: {
  actor: BuqFitActor | null;
  profiles: DemoProfile[];
  busy: boolean;
  onClose: () => void;
  onSelect: (profileId: string) => void;
  onSignOut?: () => void;
}) {
  return (
    <div
      className="bqf-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="bqf-profile-title"
        aria-modal="true"
        className="bqf-dialog"
        role="dialog"
      >
        <div className="bqf-dialog-head">
          <div>
            <span className="bqf-kicker">ACCESO LOCAL</span>
            <h2 id="bqf-profile-title">
              {actor ? "Cambiar de perfil" : "Elige un perfil de prueba"}
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            className="bqf-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <p>
          La sesión se guarda en el servidor mediante una cookie segura. No
          necesitas crear una cuenta.
        </p>
        <div className="bqf-profile-list">
          {profiles.map((profile) => (
            <button
              className="bqf-profile-option"
              disabled={busy}
              key={profile.id}
              onClick={() => onSelect(profile.id)}
              type="button"
            >
              <span className="bqf-avatar">{initials(profile.name)}</span>
              <span>
                <strong>{profile.name}</strong>
                <small>{getRoleLabel(profile.roles)}</small>
              </span>
              <b aria-hidden="true">→</b>
            </button>
          ))}
          {!profiles.length && (
            <p className="bqf-empty">
              No se han cargado perfiles locales. Comprueba que PostgreSQL tiene
              las semillas aplicadas.
            </p>
          )}
        </div>
        {onSignOut && (
          <button
            className="bqf-link-button"
            disabled={busy}
            onClick={onSignOut}
            type="button"
          >
            Cerrar sesión
          </button>
        )}
      </section>
    </div>
  );
}

function ExplorePage({
  actor,
  catalog,
  onLogin,
  onRefresh,
  onCheckout,
  onError,
  onSuccess,
}: {
  actor: BuqFitActor | null;
  catalog: Catalog;
  onLogin: () => void;
  onRefresh: (query?: string) => Promise<void>;
  onCheckout: (checkout: Checkout) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [serviceId, setServiceId] = useState(catalog.services[0]?.id ?? "");
  const [mode, setMode] = useState<Service["modalities"][number]>("room");
  const [date, setDate] = useState(dateAfter(1));
  const [areaLocationId, setAreaLocationId] = useState(
    catalog.locations.find((location) => location.slug === "ruzafa")?.id ?? "",
  );
  const [seats, setSeats] = useState(1);
  const [repeatCount, setRepeatCount] = useState(1);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [spaceChoiceByMinute, setSpaceChoiceByMinute] = useState<
    Record<number, string>
  >({});
  const [pickedClassIds, setPickedClassIds] = useState<string[]>([]);
  const [localBusy, setLocalBusy] = useState(false);

  const service =
    catalog.services.find((item) => item.id === serviceId) ?? null;
  const dateRange = useMemo(
    () => ({ from: dateAfter(0), to: dateAfter(60) }),
    [],
  );

  useEffect(() => {
    if (!serviceId && catalog.services[0]) setServiceId(catalog.services[0].id);
  }, [catalog.services, serviceId]);

  useEffect(() => {
    if (!service) return;
    if (!service.modalities.includes(mode))
      setMode(service.modalities[0] ?? "online");
    setSeats(
      service.format === "individual"
        ? 1
        : Math.min(2, service.groupCapacity ?? 2),
    );
  }, [serviceId, service, mode]);

  useEffect(() => {
    if (catalog.locations.length && !areaLocationId)
      setAreaLocationId(catalog.locations[0].id);
  }, [catalog.locations, areaLocationId]);

  async function searchCatalog(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    setSearching(true);
    try {
      await onRefresh(query);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo buscar.");
    } finally {
      setSearching(false);
    }
  }

  const loadClasses = useCallback(async () => {
    if (!service || service.format !== "group") {
      setClasses([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });
      const result = await buqfitApi.get<
        ClassSession[] | { sessions?: ClassSession[] }
      >(`/classes?${params}`);
      setClasses(
        selectedData(result).filter(
          (session) => session.serviceId === service.id,
        ),
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las clases.",
      );
    }
  }, [dateRange.from, dateRange.to, onError, service]);

  async function loadAvailability(): Promise<void> {
    if (!service) return;
    setAvailabilityLoading(true);
    setSlots([]);
    setSpaceChoiceByMinute({});
    try {
      const params = new URLSearchParams({
        serviceId: service.id,
        mode,
        date,
        areaLocationId,
        seats: String(seats),
      });
      const result = await buqfitApi.get<
        AvailabilitySlot[] | { slots?: AvailabilitySlot[] }
      >(`/availability?${params}`);
      const options = selectedData(result);
      setSlots(options);
      const defaults = Object.fromEntries(
        options.map((option) => [
          option.startMinute,
          option.spaces[0]?.id ?? "",
        ]),
      );
      setSpaceChoiceByMinute(defaults);
      if (!options.length)
        onError(
          "No encontramos horarios que cumplan la agenda, el desplazamiento y el espacio elegido.",
        );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No se pudo consultar la disponibilidad.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  async function createIndividualCheckout(
    slot: AvailabilitySlot,
  ): Promise<void> {
    if (!actor) {
      onLogin();
      return;
    }
    if (!service) return;
    setLocalBusy(true);
    try {
      const selections: Array<{
        date: string;
        startMinute: number;
        spaceId?: string;
      }> = [];
      for (let index = 0; index < repeatCount; index += 1) {
        const targetDate = plusDays(date, index * 7);
        const targetSlot =
          index === 0
            ? slot
            : await findMatchingSlot(targetDate, slot.startMinute);
        if (!targetSlot)
          throw new Error(
            `El ${formatDate(targetDate)} no tiene ese horario disponible. Reduce las repeticiones o elige otra hora.`,
          );
        const selectedSpaceId =
          mode === "room" || mode === "gym"
            ? index === 0
              ? spaceChoiceByMinute[slot.startMinute]
              : targetSlot.spaces[0]?.id
            : undefined;
        if ((mode === "room" || mode === "gym") && !selectedSpaceId)
          throw new Error("Elige un espacio disponible.");
        selections.push({
          date: targetDate,
          startMinute: slot.startMinute,
          ...(selectedSpaceId ? { spaceId: selectedSpaceId } : {}),
        });
      }
      const result = await buqfitApi.post<Checkout>(
        "/checkouts",
        {
          serviceId: service.id,
          mode,
          seats,
          slots: selections,
        },
        buqfitApi.idempotencyKey(),
      );
      onCheckout(result);
      onSuccess(
        "Hemos retenido el horario durante 10 minutos. Revisa el desglose antes de simular el pago.",
      );
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "No se pudo crear la reserva.",
      );
    } finally {
      setLocalBusy(false);
    }
  }

  async function findMatchingSlot(
    targetDate: string,
    startMinute: number,
  ): Promise<AvailabilitySlot | null> {
    if (!service) return null;
    const params = new URLSearchParams({
      serviceId: service.id,
      mode,
      date: targetDate,
      areaLocationId,
      seats: String(seats),
    });
    const result = await buqfitApi.get<
      AvailabilitySlot[] | { slots?: AvailabilitySlot[] }
    >(`/availability?${params}`);
    return (
      selectedData(result).find(
        (option) => option.startMinute === startMinute,
      ) ?? null
    );
  }

  async function bookClasses(): Promise<void> {
    if (!actor) {
      onLogin();
      return;
    }
    if (!service || !pickedClassIds.length) return;
    const selectedClasses = classes.filter((session) =>
      pickedClassIds.includes(session.id),
    );
    setLocalBusy(true);
    try {
      const result = await buqfitApi.post<Checkout>(
        "/checkouts",
        {
          serviceId: service.id,
          mode: "room",
          seats,
          slots: selectedClasses.map((session) => ({
            date: session.date,
            startMinute: session.startMinute,
            spaceId: session.spaceId,
            classSessionId: session.id,
          })),
        },
        buqfitApi.idempotencyKey(),
      );
      onCheckout(result);
      onSuccess("Plazas retenidas durante 10 minutos.");
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No se pudieron reservar esas plazas.",
      );
    } finally {
      setLocalBusy(false);
    }
  }

  async function joinWaitlist(session: ClassSession): Promise<void> {
    if (!actor) {
      onLogin();
      return;
    }
    try {
      await buqfitApi.post(`/classes/${session.id}/waitlist`, { seats });
      onSuccess(
        "Te has apuntado a la lista de espera. No se ha reservado ni cobrado ninguna plaza.",
      );
      await loadClasses();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No se pudo entrar en la lista de espera.",
      );
    }
  }

  return (
    <div className="bqf-explore">
      <section className="bqf-hero">
        <div className="bqf-hero-copy">
          <span className="bqf-kicker">BIENESTAR, A TU RITMO</span>
          <h1>
            Tu próxima sesión empieza <em>por encontrar el lugar.</em>
          </h1>
          <p>
            Descubre profesionales, horarios y espacios. El precio y la
            disponibilidad se confirman en el servidor antes de reservar.
          </p>
          <div className="bqf-hero-tags">
            <span>◷ Horarios disponibles</span>
            <span>⌖ Valencia y en línea</span>
            <span>◇ Reserva en un solo paso</span>
          </div>
        </div>
        <div className="bqf-hero-card">
          <span className="bqf-card-kicker">BUQFIT CONECTA</span>
          <div className="bqf-orbit">
            <span>Cliente</span>
            <i />
            <span>Profesional</span>
            <i />
            <span>Espacio</span>
          </div>
          <p>Una reserva, coordinada de principio a fin.</p>
          <div className="bqf-hero-stat">
            <strong>
              {catalog.professionals.length.toString().padStart(2, "0")}
            </strong>
            <span>profesionales para empezar a explorar</span>
          </div>
        </div>
      </section>

      <section
        aria-label="Buscar profesionales y sesiones"
        className="bqf-search-box"
      >
        <form
          className="bqf-search-form"
          onSubmit={(event) => void searchCatalog(event)}
        >
          <label className="bqf-search-label" htmlFor="bqf-search">
            ¿Qué te gustaría hacer?
          </label>
          <div className="bqf-search-row">
            <span aria-hidden="true">⌕</span>
            <input
              id="bqf-search"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Pilates, fisioterapia, entrenamiento…"
              value={query}
            />
            <button
              className="bqf-button bqf-button-dark"
              disabled={searching}
              type="submit"
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
          <div className="bqf-search-caption">
            <span>Explora sin iniciar sesión</span>
            <span>Reserva cuando encuentres tu opción</span>
          </div>
        </form>
        <div className="bqf-search-side">
          <span className="bqf-kicker">A TU MANERA</span>
          <strong>Sesiones presenciales o en línea.</strong>
          <span>Elige profesional, fecha y modalidad.</span>
        </div>
      </section>

      <section
        className="bqf-booking-section"
        aria-labelledby="bqf-booking-heading"
      >
        <div className="bqf-section-heading">
          <div>
            <span className="bqf-kicker">RESERVA</span>
            <h2 id="bqf-booking-heading">Encuentra una sesión</h2>
          </div>
          <span className="bqf-step-pill">
            01 / 03 · Elige servicio y horario
          </span>
        </div>
        <div className="bqf-booking-grid">
          <div className="bqf-booking-form">
            <div className="bqf-field">
              <label htmlFor="bqf-service">Servicio</label>
              <select
                id="bqf-service"
                onChange={(event) => {
                  setServiceId(event.currentTarget.value);
                  setSlots([]);
                  setPickedClassIds([]);
                }}
                value={serviceId}
              >
                {catalog.services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.professionalName}
                  </option>
                ))}
              </select>
            </div>
            {service && (
              <div className="bqf-selected-service">
                <span className="bqf-avatar bqf-avatar-lime">
                  {initials(service.professionalName)}
                </span>
                <div>
                  <strong>{service.professionalName}</strong>
                  <span>
                    {service.professionalHeadline} · {service.professionalZone}
                  </span>
                </div>
                <span className="bqf-rating">
                  ★ {service.professionalRating.toFixed(1)}
                </span>
              </div>
            )}
            <div className="bqf-form-row">
              <div className="bqf-field">
                <label htmlFor="bqf-mode">Modalidad</label>
                <select
                  id="bqf-mode"
                  onChange={(event) => {
                    setMode(event.currentTarget.value as typeof mode);
                    setSlots([]);
                  }}
                  value={mode}
                >
                  {BOOKING_MODES.filter((option) =>
                    service?.modalities.includes(option.value),
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bqf-field">
                <label htmlFor="bqf-date">Fecha de inicio</label>
                <input
                  id="bqf-date"
                  min={dateAfter(1)}
                  onChange={(event) => {
                    setDate(event.currentTarget.value);
                    setPickedClassIds([]);
                  }}
                  type="date"
                  value={date}
                />
              </div>
            </div>
            <div className="bqf-form-row">
              <div className="bqf-field">
                <label htmlFor="bqf-seats">
                  {service?.format === "group" ? "Plazas" : "Personas"}
                </label>
                <input
                  id="bqf-seats"
                  min="1"
                  max={service?.groupCapacity ?? 1}
                  onChange={(event) => {
                    setSeats(Number(event.currentTarget.value));
                    setSlots([]);
                  }}
                  type="number"
                  value={seats}
                />
              </div>
              <div className="bqf-field">
                <label htmlFor="bqf-area">Zona de referencia</label>
                <select
                  id="bqf-area"
                  onChange={(event) => {
                    setAreaLocationId(event.currentTarget.value);
                    setSlots([]);
                  }}
                  value={areaLocationId}
                >
                  {catalog.locations
                    .filter((location) => !location.isOnline)
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {service?.format === "individual" && (
              <div className="bqf-field bqf-repeat-field">
                <label htmlFor="bqf-repeat">Repetir semanalmente</label>
                <select
                  id="bqf-repeat"
                  onChange={(event) =>
                    setRepeatCount(Number(event.currentTarget.value))
                  }
                  value={repeatCount}
                >
                  <option value="1">Una sesión</option>
                  <option value="2">2 semanas</option>
                  <option value="3">3 semanas</option>
                  <option value="4">4 semanas</option>
                </select>
                <small>
                  El servidor vuelve a comprobar cada fecha antes de retenerlas.
                </small>
              </div>
            )}
            <button
              className="bqf-button bqf-button-primary bqf-full"
              disabled={!service || availabilityLoading || localBusy}
              onClick={() => void loadAvailability()}
              type="button"
            >
              {availabilityLoading
                ? "Comprobando agenda…"
                : "Ver horarios disponibles"}
            </button>
            <p className="bqf-private-note">
              <strong>Privacidad:</strong> el calendario del profesional
              permanece privado; aquí solo aparecen las opciones viables.
            </p>
          </div>
          <div className="bqf-times-panel">
            {service?.format === "group" ? (
              <>
                <div className="bqf-times-heading">
                  <span className="bqf-kicker">CLASES PRÓXIMAS</span>
                  <h3>Plazas y fechas</h3>
                  <p>El aforo se comprueba en cada reserva.</p>
                </div>
                {!classes.length ? (
                  <div className="bqf-empty">
                    No hay clases publicadas para este servicio en las próximas
                    semanas.
                  </div>
                ) : (
                  <div className="bqf-class-list">
                    {classes.map((session) => {
                      const full = session.availableSeats <= 0;
                      const selected = pickedClassIds.includes(session.id);
                      return (
                        <article
                          className={`bqf-class-card${selected ? " is-selected" : ""}`}
                          key={session.id}
                        >
                          <div className="bqf-class-date">
                            <strong>
                              {new Date(`${session.date}T12:00:00`).getDate()}
                            </strong>
                            <span>
                              {new Intl.DateTimeFormat("es-ES", {
                                month: "short",
                              }).format(new Date(`${session.date}T12:00:00`))}
                            </span>
                          </div>
                          <div className="bqf-class-details">
                            <strong>
                              {formatDate(session.date)} ·{" "}
                              {formatTime(session.startMinute)}
                            </strong>
                            <span>
                              {session.professionalName} · {session.spaceName}
                            </span>
                            <small>
                              {full
                                ? "Completa"
                                : `${session.availableSeats} plazas disponibles`}{" "}
                              · aforo ${session.capacity}
                            </small>
                          </div>
                          {full ? (
                            <button
                              className="bqf-button bqf-button-outline bqf-small"
                              onClick={() => void joinWaitlist(session)}
                              type="button"
                            >
                              Lista de espera
                            </button>
                          ) : (
                            <label className="bqf-check-class">
                              <input
                                checked={selected}
                                onChange={() =>
                                  setPickedClassIds((current) =>
                                    selected
                                      ? current.filter(
                                          (id) => id !== session.id,
                                        )
                                      : [...current, session.id],
                                  )
                                }
                                type="checkbox"
                              />
                              <span>{selected ? "Elegida" : "Elegir"}</span>
                            </label>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
                {pickedClassIds.length > 0 && (
                  <button
                    className="bqf-button bqf-button-primary bqf-full"
                    disabled={localBusy}
                    onClick={() => void bookClasses()}
                    type="button"
                  >
                    Continuar con {pickedClassIds.length} fecha
                    {pickedClassIds.length === 1 ? "" : "s"}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="bqf-times-heading">
                  <span className="bqf-kicker">HORARIOS DISPONIBLES</span>
                  <h3>{formatDate(date)}</h3>
                  <p>
                    Bloques de {service?.durationMinutes ?? 0} min · horario
                    local
                  </p>
                </div>
                {!slots.length ? (
                  <div className="bqf-empty">
                    <span className="bqf-empty-icon">◷</span>
                    <strong>Elige un día para ver opciones.</strong>
                    <span>
                      Solo mostramos horarios que cumplen agenda, desplazamiento
                      y disponibilidad del espacio.
                    </span>
                  </div>
                ) : (
                  <div className="bqf-slot-list">
                    {slots.map((slot) => (
                      <div
                        className="bqf-slot-row"
                        key={`${slot.date}-${slot.startMinute}`}
                      >
                        <button
                          className="bqf-slot-button"
                          onClick={() => void createIndividualCheckout(slot)}
                          disabled={localBusy}
                          type="button"
                        >
                          <strong>{formatTime(slot.startMinute)}</strong>
                          <span>{formatTime(slot.endMinute)}</span>
                          <b aria-hidden="true">→</b>
                        </button>
                        {(mode === "room" || mode === "gym") &&
                          slot.spaces.length > 0 && (
                            <div className="bqf-slot-space">
                              <label htmlFor={`bqf-space-${slot.startMinute}`}>
                                en
                              </label>
                              <select
                                id={`bqf-space-${slot.startMinute}`}
                                onChange={(event) =>
                                  setSpaceChoiceByMinute((current) => ({
                                    ...current,
                                    [slot.startMinute]:
                                      event.currentTarget.value,
                                  }))
                                }
                                value={
                                  spaceChoiceByMinute[slot.startMinute] ??
                                  slot.spaces[0].id
                                }
                              >
                                {slot.spaces.map((space) => (
                                  <option key={space.id} value={space.id}>
                                    {space.name} ·{" "}
                                    {money(space.pricePerOccurrenceCents)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="bqf-pricing-note">
              <span>€</span>
              <p>
                Precio final calculado por BuqFit al crear el checkout. Incluye
                el desglose antes de simular el pago.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="bqf-discovery-title" className="bqf-discovery">
        <div className="bqf-section-heading">
          <div>
            <span className="bqf-kicker">PARA DESCUBRIR</span>
            <h2 id="bqf-discovery-title">Servicios destacados</h2>
          </div>
          <span className="bqf-muted">{catalog.services.length} servicios</span>
        </div>
        <div className="bqf-service-grid">
          {catalog.services.map((item, index) => (
            <article
              className={`bqf-service-card bqf-service-card-${(index % 4) + 1}`}
              key={item.id}
            >
              <div className="bqf-service-art">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i aria-hidden="true" />
              </div>
              <div className="bqf-service-body">
                <div className="bqf-service-meta">
                  <span>{item.category}</span>
                  <span>★ {item.professionalRating.toFixed(1)}</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="bqf-service-bottom">
                  <span>{item.professionalName}</span>
                  <strong>Desde {money(item.priceCents)}</strong>
                </div>
                <button
                  className="bqf-text-action"
                  onClick={() => {
                    setServiceId(item.id);
                    setSlots([]);
                    window.scrollTo({ top: 360, behavior: "smooth" });
                  }}
                  type="button"
                >
                  Elegir este servicio <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
        {!catalog.services.length && (
          <div className="bqf-empty">
            No hay servicios para mostrar. Intenta otra búsqueda.
          </div>
        )}
        {catalog.spaces.length > 0 && (
          <div className="bqf-space-strip">
            <div>
              <span className="bqf-kicker">ESPACIOS DISPONIBLES</span>
              <h3>El sitio también forma parte de la sesión.</h3>
            </div>
            <div className="bqf-space-chips">
              {catalog.spaces.slice(0, 5).map((space) => (
                <span key={space.id}>
                  <b>{space.kind === "gym" ? "⌂" : "◇"}</b>
                  {space.name}
                  <small>{space.locationName}</small>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
      {!actor && (
        <section className="bqf-signin-cta">
          <div>
            <span className="bqf-kicker">¿LISTA PARA RESERVAR?</span>
            <h2>Prueba el recorrido con un perfil local.</h2>
            <p>
              La sesión se guarda en el servidor y puedes cambiar entre cliente,
              profesional y gestor.
            </p>
          </div>
          <button
            className="bqf-button bqf-button-dark"
            onClick={onLogin}
            type="button"
          >
            Elegir perfil de prueba <span>→</span>
          </button>
        </section>
      )}
    </div>
  );
}

function AgendaPage({
  actor,
  agenda,
  onRefresh,
  onFeedback,
}: {
  actor: BuqFitActor;
  agenda: AgendaEvent[];
  onRefresh: () => Promise<void>;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [sendingFor, setSendingFor] = useState<{
    occurrenceId: string;
    kind: "client" | "space_manager";
  } | null>(null);
  const [body, setBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const sorted = [...agenda].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
  );

  async function cancel(event: AgendaEvent): Promise<void> {
    if (
      !window.confirm(`¿Cancelar solo la sesión del ${formatDate(event.date)}?`)
    )
      return;
    setBusyId(event.occurrenceId);
    try {
      await buqfitApi.post(`/occurrences/${event.occurrenceId}/cancel`, {});
      onFeedback({
        kind: "success",
        message:
          "Se canceló esa fecha. Las demás sesiones de la serie permanecen.",
      });
      await onRefresh();
    } catch (error) {
      onFeedback({
        kind: "error",
        message:
          error instanceof Error ? error.message : "No se pudo cancelar.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function sendRequest(event: AgendaEvent): Promise<void> {
    if (!sendingFor) return;
    setBusyId(event.occurrenceId);
    try {
      await buqfitApi.post("/information-requests", {
        bookingOccurrenceId: sendingFor.occurrenceId,
        recipientKind: sendingFor.kind,
        body: body.trim(),
      });
      onFeedback({
        kind: "success",
        message:
          "Solicitud enviada. El destinatario podrá leerla desde Solicitudes.",
      });
      setSendingFor(null);
      setBody("");
      await onRefresh();
    } catch (error) {
      onFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la solicitud.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const canSendRequest = hasRole(actor, "professional");
  return (
    <section className="bqf-page bqf-agenda-page">
      <div className="bqf-page-hero">
        <div>
          <span className="bqf-kicker">TU ACTIVIDAD</span>
          <h1>Agenda</h1>
          <p>
            Las sesiones que puedes consultar según tu perfil. La información
            privada de otros participantes no se muestra.
          </p>
        </div>
        <div className="bqf-agenda-count">
          <strong>
            {sorted.filter((event) => event.status === "confirmed").length}
          </strong>
          <span>sesiones confirmadas</span>
        </div>
      </div>
      {!sorted.length ? (
        <div className="bqf-empty bqf-empty-large">
          <strong>Aún no hay sesiones en tu agenda.</strong>
          <span>
            Cuando una reserva se confirme, aparecerá aquí y seguirá guardada
            tras reiniciar BuqFit.
          </span>
        </div>
      ) : (
        <div className="bqf-agenda-list">
          {sorted.map((event) => (
            <article className="bqf-agenda-card" key={event.occurrenceId}>
              <div className="bqf-agenda-date">
                <strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong>
                <span>
                  {new Intl.DateTimeFormat("es-ES", { month: "short" }).format(
                    new Date(`${event.date}T12:00:00`),
                  )}
                </span>
                <small>{formatDate(event.date)}</small>
              </div>
              <div className="bqf-agenda-main">
                <div className="bqf-agenda-title">
                  <div>
                    <span className="bqf-kicker">
                      {event.status === "confirmed"
                        ? "CONFIRMADA"
                        : event.status === "cancelled"
                          ? "CANCELADA"
                          : "PENDIENTE"}
                    </span>
                    <h2>{event.serviceName}</h2>
                  </div>
                  <span className={`bqf-status bqf-status-${event.status}`}>
                    {event.status === "confirmed"
                      ? "Confirmada"
                      : event.status === "cancelled"
                        ? "Cancelada"
                        : "Pendiente"}
                  </span>
                </div>
                <div className="bqf-agenda-facts">
                  <span>
                    ◷ {formatTime(event.start)}–{formatTime(event.end)}
                  </span>
                  <span>◉ {event.professionalName}</span>
                  {event.spaceName && <span>◇ {event.spaceName}</span>}
                  <span>
                    {event.seats} plaza{event.seats === 1 ? "" : "s"}
                  </span>
                </div>
                {hasRole(actor, "client") &&
                  event.clientActorId === actor.actorId && (
                    <p className="bqf-agenda-private">
                      Cliente: {event.clientName}
                    </p>
                  )}
                <div className="bqf-agenda-actions">
                  {event.status === "confirmed" &&
                    event.clientActorId === actor.actorId && (
                      <button
                        className="bqf-button bqf-button-outline bqf-small"
                        disabled={busyId === event.occurrenceId}
                        onClick={() => void cancel(event)}
                        type="button"
                      >
                        Cancelar esta fecha
                      </button>
                    )}
                  {canSendRequest &&
                    event.status === "confirmed" &&
                    event.professionalId === actor.professionalId && (
                      <>
                        <button
                          className="bqf-text-action"
                          onClick={() => {
                            setSendingFor({
                              occurrenceId: event.occurrenceId,
                              kind: "client",
                            });
                            setBody("");
                          }}
                          type="button"
                        >
                          Solicitar información al cliente
                        </button>
                        {event.spaceId && (
                          <button
                            className="bqf-text-action"
                            onClick={() => {
                              setSendingFor({
                                occurrenceId: event.occurrenceId,
                                kind: "space_manager",
                              });
                              setBody("");
                            }}
                            type="button"
                          >
                            Solicitar al gestor del espacio
                          </button>
                        )}
                      </>
                    )}
                </div>
                {sendingFor?.occurrenceId === event.occurrenceId && (
                  <form
                    className="bqf-request-composer"
                    onSubmit={(submitEvent) => {
                      submitEvent.preventDefault();
                      void sendRequest(event);
                    }}
                  >
                    <label htmlFor={`bqf-request-${event.occurrenceId}`}>
                      Solicitud para{" "}
                      {sendingFor.kind === "client"
                        ? event.clientName
                        : "el gestor del espacio"}
                    </label>
                    <textarea
                      id={`bqf-request-${event.occurrenceId}`}
                      maxLength={1200}
                      minLength={1}
                      onChange={(inputEvent) =>
                        setBody(inputEvent.currentTarget.value)
                      }
                      placeholder="Escribe la información concreta que necesitas…"
                      required
                      value={body}
                    />
                    <div className="bqf-request-actions">
                      <small>
                        {body.length}/1200 · solo texto, sin chat ni respuesta
                        abierta
                      </small>
                      <button
                        className="bqf-button bqf-button-primary bqf-small"
                        disabled={busyId === event.occurrenceId || !body.trim()}
                        type="submit"
                      >
                        Enviar solicitud
                      </button>
                      <button
                        className="bqf-link-button"
                        onClick={() => setSendingFor(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfessionalPage({
  actor,
  catalog,
  onFeedback,
}: {
  actor: BuqFitActor;
  catalog: Catalog;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [preferences, setPreferences] =
    useState<ProfessionalPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const professional = catalog.professionals.find(
    (item) => item.id === actor.professionalId,
  );
  useEffect(() => {
    let active = true;
    buqfitApi
      .get<ProfessionalPreferences>("/professional/preferences")
      .then((value) => {
        if (active) setPreferences(value);
      })
      .catch((error: unknown) =>
        onFeedback({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las preferencias.",
        }),
      );
    return () => {
      active = false;
    };
  }, [actor.professionalId, onFeedback]);

  function patch(patchValue: Partial<ProfessionalPreferences>): void {
    setPreferences((current) =>
      current ? { ...current, ...patchValue } : current,
    );
  }

  function toggleMode(
    mode: ProfessionalPreferences["modalities"][number],
  ): void {
    if (!preferences) return;
    patch({
      modalities: preferences.modalities.includes(mode)
        ? preferences.modalities.filter((item) => item !== mode)
        : [...preferences.modalities, mode],
    });
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!preferences) return;
    setBusy(true);
    try {
      const saved = await buqfitApi.patch<ProfessionalPreferences>(
        "/professional/preferences",
        preferences,
      );
      setPreferences(saved);
      onFeedback({
        kind: "success",
        message:
          "Preferencias actualizadas. La disponibilidad futura las tendrá en cuenta.",
      });
    } catch (error) {
      onFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!hasRole(actor, "professional")) return <NoAccess />;
  return (
    <section className="bqf-page">
      <div className="bqf-page-hero">
        <div>
          <span className="bqf-kicker">PERFIL PROFESIONAL</span>
          <h1>Tu forma de trabajar.</h1>
          <p>
            Configura la zona, los desplazamientos y las modalidades que el
            servidor usará para calcular huecos viables.
          </p>
        </div>
        <div className="bqf-preference-stat">
          <span>RADIO MÁXIMO</span>
          <strong>{preferences?.maxRadiusKm ?? "—"} km</strong>
          <small>desde tu ubicación base</small>
        </div>
      </div>
      <div className="bqf-settings-grid">
        <form
          className="bqf-panel bqf-preferences-form"
          onSubmit={(event) => void save(event)}
        >
          <div className="bqf-panel-heading">
            <div>
              <span className="bqf-kicker">PREFERENCIAS</span>
              <h2>Agenda y desplazamientos</h2>
            </div>
            <span className="bqf-local-tag">Guardado en PostgreSQL</span>
          </div>
          {!preferences ? (
            <p>Cargando preferencias…</p>
          ) : (
            <>
              <div className="bqf-field">
                <label htmlFor="bqf-base-location">Ubicación base</label>
                <select
                  id="bqf-base-location"
                  onChange={(event) =>
                    patch({ baseLocationId: event.currentTarget.value })
                  }
                  value={preferences.baseLocationId}
                >
                  {catalog.locations
                    .filter((location) => !location.isOnline)
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="bqf-form-row">
                <NumberField
                  id="bqf-radius"
                  label="Radio máximo (km)"
                  value={preferences.maxRadiusKm}
                  max={200}
                  onChange={(value) => patch({ maxRadiusKm: value })}
                />
                <NumberField
                  id="bqf-travel"
                  label="Desplazamiento máximo (min)"
                  value={preferences.maxTravelMinutes}
                  max={360}
                  onChange={(value) => patch({ maxTravelMinutes: value })}
                />
              </div>
              <NumberField
                id="bqf-buffer"
                label="Margen entre sesiones (min)"
                value={preferences.bufferMinutes}
                max={180}
                onChange={(value) => patch({ bufferMinutes: value })}
              />
              <fieldset className="bqf-modality-fieldset">
                <legend>Modalidades que ofreces</legend>
                <div className="bqf-modality-grid">
                  {BOOKING_MODES.map((item) => (
                    <label key={item.value}>
                      <input
                        checked={preferences.modalities.includes(item.value)}
                        onChange={() => toggleMode(item.value)}
                        type="checkbox"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                className="bqf-button bqf-button-primary"
                disabled={busy}
                type="submit"
              >
                {busy ? "Guardando…" : "Guardar preferencias"}
              </button>
            </>
          )}
        </form>
        <aside className="bqf-panel bqf-professional-card">
          <span className="bqf-avatar bqf-avatar-lime bqf-avatar-large">
            {initials(professional?.name ?? actor.name)}
          </span>
          <span className="bqf-kicker">
            {professional?.headline ?? "Profesional"}
          </span>
          <h2>{professional?.name ?? actor.name}</h2>
          <p>{professional?.bio ?? "Tu perfil profesional."}</p>
          <span className="bqf-location-pill">
            ⌖ {professional?.publicZone ?? "València"}
          </span>
          <div className="bqf-tags">
            {(professional?.categories ?? []).map((category) => (
              <span key={category}>{category}</span>
            ))}
          </div>
          <div className="bqf-divider" />
          <span className="bqf-kicker">SERVICIOS PUBLICADOS</span>
          <ul className="bqf-service-list">
            {catalog.services
              .filter((item) => item.professionalId === actor.professionalId)
              .map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <strong>{money(item.priceCents)}</strong>
                </li>
              ))}
          </ul>
          <p className="bqf-privacy-note">
            La agenda privada no se enseña al público. BuqFit publica solo los
            huecos que cumplen tus horarios y el tiempo de viaje.
          </p>
        </aside>
      </div>
    </section>
  );
}

function NumberField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="bqf-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        max={max}
        min="0"
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        type="number"
        value={value}
      />
    </div>
  );
}

function SpacesPage({
  actor,
  spaces,
  onFeedback,
}: {
  actor: BuqFitActor;
  spaces: Space[];
  onFeedback: (feedback: Feedback) => void;
}) {
  const [ownedSpaces, setOwnedSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [metrics, setMetrics] = useState<SpaceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const ownedSpaceRows = ownedSpaces.length
    ? ownedSpaces
    : spaces.filter((space) => actor.spaceIds.includes(space.id));

  useEffect(() => {
    let active = true;
    buqfitApi
      .get<Space[] | { spaces?: Space[] }>("/my-spaces")
      .then((result) => {
        if (!active) return;
        const rows = selectedData(result);
        setOwnedSpaces(rows);
        if (rows[0]) setSelectedSpaceId(rows[0].id);
      })
      .catch((error: unknown) =>
        onFeedback({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los espacios.",
        }),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actor.actorId, onFeedback]);

  useEffect(() => {
    if (!selectedSpaceId) {
      setMetrics(null);
      return;
    }
    let active = true;
    const from = startOfToday();
    const to = dateAfter(30);
    buqfitApi
      .get<SpaceMetrics>(
        `/my-spaces/${selectedSpaceId}/metrics?from=${from}&to=${to}`,
      )
      .then((value) => {
        if (active) setMetrics(value);
      })
      .catch((error: unknown) =>
        onFeedback({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las métricas.",
        }),
      );
    return () => {
      active = false;
    };
  }, [onFeedback, selectedSpaceId]);

  if (!hasRole(actor, "space_manager")) return <NoAccess />;
  const selected = ownedSpaceRows.find((space) => space.id === selectedSpaceId);
  const utilization = Math.min(
    100,
    Math.max(0, metrics?.utilizationPercent ?? 0),
  );
  return (
    <section className="bqf-page">
      <div className="bqf-page-hero">
        <div>
          <span className="bqf-kicker">GESTIÓN DE ESPACIOS</span>
          <h1>Tu espacio en movimiento.</h1>
          <p>
            Consulta reservas confirmadas y una estimación de uso e ingresos
            desde los datos persistidos.
          </p>
        </div>
        <div className="bqf-preference-stat">
          <span>INVENTARIO VINCULADO</span>
          <strong>{ownedSpaceRows.length.toString().padStart(2, "0")}</strong>
          <small>espacios</small>
        </div>
      </div>
      {loading ? (
        <div className="bqf-empty">Cargando inventario…</div>
      ) : !ownedSpaceRows.length ? (
        <NoAccess message="Esta cuenta no tiene espacios vinculados." />
      ) : (
        <>
          <div className="bqf-space-select-row">
            <label htmlFor="bqf-owned-space">Espacio</label>
            <select
              id="bqf-owned-space"
              onChange={(event) =>
                setSelectedSpaceId(event.currentTarget.value)
              }
              value={selectedSpaceId}
            >
              {ownedSpaceRows.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name} · {space.locationName}
                </option>
              ))}
            </select>
            <span>Próximos 30 días</span>
          </div>
          {selected && (
            <section className="bqf-space-overview">
              <div className="bqf-space-overview-art">
                <span className="bqf-kicker">
                  {selected.kind === "gym" ? "GIMNASIO" : "SALA"} ·{" "}
                  {selected.locationName}
                </span>
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
                <div className="bqf-tags">
                  {selected.amenities.map((amenity) => (
                    <span key={amenity}>{amenity}</span>
                  ))}
                </div>
              </div>
              <div className="bqf-space-capacity">
                <span className="bqf-kicker">USO DEL ESPACIO</span>
                <strong>{utilization}%</strong>
                <div className="bqf-progress">
                  <span style={{ width: `${utilization}%` }} />
                </div>
                <small>
                  {metrics?.bookedMinutes ?? 0} min reservados de{" "}
                  {metrics?.openMinutes ?? 0} min abiertos
                </small>
              </div>
            </section>
          )}
          <div className="bqf-metrics-grid">
            <MetricCard
              label="Reservas confirmadas"
              value={String(metrics?.confirmedOccurrences ?? 0)}
              foot="en el periodo seleccionado"
            />
            <MetricCard
              label="Tiempo reservado"
              value={`${((metrics?.bookedMinutes ?? 0) / 60).toLocaleString("es-ES", { maximumFractionDigits: 1 })} h`}
              foot="según las fechas elegidas"
            />
            <MetricCard
              label="Ingresos brutos"
              value={money(metrics?.grossEarningsCents ?? 0)}
              foot="reservas pagadas del espacio"
            />
            <MetricCard
              label="Estimación neta"
              value={money(metrics?.estimatedOwnerEarningsCents ?? 0)}
              foot="tras la comisión de muestra"
              highlight
            />
          </div>
          <p className="bqf-note">
            Las métricas excluyen retenciones y pagos fallidos. Las tarifas y
            comisiones siguen siendo datos de prueba.
          </p>
        </>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  foot,
  highlight = false,
}: {
  label: string;
  value: string;
  foot: string;
  highlight?: boolean;
}) {
  return (
    <article className={`bqf-metric-card${highlight ? " is-highlight" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{foot}</small>
    </article>
  );
}

function RequestsPage({
  actor,
  requests,
  onRefresh,
  onFeedback,
}: {
  actor: BuqFitActor;
  requests: InformationRequest[];
  onRefresh: () => Promise<void>;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const related = requests
    .filter(
      (request) =>
        request.senderActorId === actor.actorId ||
        request.recipientActorId === actor.actorId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function markRead(request: InformationRequest): Promise<void> {
    setBusyId(request.id);
    try {
      await buqfitApi.patch(`/information-requests/${request.id}/read`, {});
      await onRefresh();
    } catch (error) {
      onFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo marcar como leída.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="bqf-page">
      <div className="bqf-page-hero">
        <div>
          <span className="bqf-kicker">INFORMACIÓN DE RESERVA</span>
          <h1>Solicitudes</h1>
          <p>
            El profesional puede pedir información al cliente o al gestor
            vinculado a una reserva. El destinatario puede leerla; aquí no hay
            chat ni respuestas.
          </p>
        </div>
        <div className="bqf-preference-stat">
          <span>NO LEÍDAS</span>
          <strong>
            {
              related.filter(
                (request) =>
                  request.recipientActorId === actor.actorId && !request.readAt,
              ).length
            }
          </strong>
          <small>para este perfil</small>
        </div>
      </div>
      {!related.length ? (
        <div className="bqf-empty bqf-empty-large">
          <strong>No hay solicitudes.</strong>
          <span>
            Las solicitudes relacionadas con tus reservas aparecerán aquí.
          </span>
        </div>
      ) : (
        <div className="bqf-request-list">
          {related.map((request) => {
            const received = request.recipientActorId === actor.actorId;
            return (
              <article
                className={`bqf-request-card${received && !request.readAt ? " is-unread" : ""}`}
                key={request.id}
              >
                <div className="bqf-request-top">
                  <span
                    className={`bqf-request-direction ${received ? "is-incoming" : "is-outgoing"}`}
                  >
                    {received ? "Recibida" : "Enviada"}
                  </span>
                  <time dateTime={request.createdAt}>
                    {new Intl.DateTimeFormat("es-ES", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(request.createdAt))}
                  </time>
                </div>
                <h2>
                  {request.serviceName} · {formatDate(request.serviceDate)}
                </h2>
                <p className="bqf-request-participants">
                  {received
                    ? `De ${request.senderName}`
                    : `Para ${request.recipientName}`}{" "}
                  · reserva vinculada
                </p>
                <div className="bqf-request-body">{request.body}</div>
                {received && !request.readAt && (
                  <button
                    className="bqf-button bqf-button-outline bqf-small"
                    disabled={busyId === request.id}
                    onClick={() => void markRead(request)}
                    type="button"
                  >
                    Marcar como leída
                  </button>
                )}
                {received && request.readAt && (
                  <small className="bqf-read-state">Leída</small>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CheckoutDialog({
  checkout,
  busy,
  onClose,
  onPay,
}: {
  checkout: Checkout;
  busy: boolean;
  onClose: () => void;
  onPay: (outcome: "success" | "failure" | "expired") => Promise<void>;
}) {
  const canPay = checkout.status === "pending";
  return (
    <div
      className="bqf-overlay bqf-checkout-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        aria-labelledby="bqf-checkout-title"
        aria-modal="true"
        className="bqf-dialog bqf-checkout-dialog"
        role="dialog"
      >
        <div className="bqf-dialog-head">
          <div>
            <span className="bqf-kicker">CHECKOUT LOCAL</span>
            <h2 id="bqf-checkout-title">Revisa tu reserva</h2>
          </div>
          <button
            aria-label="Cerrar"
            className="bqf-close"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <p>
          El precio ha sido calculado por el servidor. Las fechas y plazas
          quedan retenidas durante 10 minutos.
        </p>
        {checkout.holdExpiresAt && (
          <div className="bqf-hold-timer">
            <span>Retención hasta</span>
            <strong>
              {new Intl.DateTimeFormat("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(checkout.holdExpiresAt))}
            </strong>
          </div>
        )}
        <div className="bqf-checkout-dates">
          {checkout.occurrences.map((occurrence) => (
            <span key={occurrence.id}>
              {formatDate(occurrence.date)} · {formatTime(occurrence.start)}–
              {formatTime(occurrence.end)}
            </span>
          ))}
        </div>
        <ul className="bqf-price-lines">
          {checkout.lines.map((line, index) => (
            <li key={`${line.occurrenceId}-${line.kind}-${index}`}>
              <span>{line.description}</span>
              <strong>{money(line.amountCents)}</strong>
            </li>
          ))}
        </ul>
        <div className="bqf-checkout-total">
          <span>Total</span>
          <strong>{money(checkout.totalCents)}</strong>
        </div>
        {canPay ? (
          <div className="bqf-payment-options">
            <span className="bqf-kicker">ELIGE EL RESULTADO DE PRUEBA</span>
            <div className="bqf-payment-buttons">
              <button
                className="bqf-button bqf-button-primary"
                disabled={busy}
                onClick={() => void onPay("success")}
                type="button"
              >
                {busy ? "Procesando…" : "Pago correcto"}
              </button>
              <button
                className="bqf-button bqf-button-outline"
                disabled={busy}
                onClick={() => void onPay("failure")}
                type="button"
              >
                Simular fallo
              </button>
              <button
                className="bqf-button bqf-button-danger"
                disabled={busy}
                onClick={() => void onPay("expired")}
                type="button"
              >
                Simular caducidad
              </button>
            </div>
            <small>
              La pasarela es ficticia y no solicita datos bancarios.
            </small>
          </div>
        ) : (
          <div className={`bqf-checkout-result bqf-result-${checkout.status}`}>
            <strong>
              {checkout.status === "paid"
                ? "Reserva confirmada"
                : checkout.status === "expired"
                  ? "Retención caducada"
                  : "Pago fallido"}
            </strong>
            <span>
              {checkout.status === "paid"
                ? "La reserva quedó guardada en la base local."
                : "No se ha confirmado ni cobrado una reserva."}
            </span>
            <button
              className="bqf-button bqf-button-dark"
              onClick={onClose}
              type="button"
            >
              Cerrar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function NoAccess({
  message = "Este perfil no tiene acceso a esta sección.",
}: {
  message?: string;
}) {
  return (
    <div className="bqf-empty bqf-empty-large">
      <strong>Sección no disponible</strong>
      <span>{message}</span>
    </div>
  );
}
