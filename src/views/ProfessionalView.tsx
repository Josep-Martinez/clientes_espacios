import { PageHeading } from '../components/AppChrome.tsx';
import { DEMO_LOCATIONS, DEMO_PROFESSIONALS, DEMO_SERVICES } from '../data/demoData.ts';
import { DEMO_BOOKING_MODE_LABELS } from '../data/demoConfig.ts';
import type { BookingMode, ProfessionalPreferences } from '../domain/models.ts';
import type { DemoStore } from '../state/useDemoStore.ts';

const modalityChoices: BookingMode[] = ['room', 'gym', 'home', 'online'];

export function ProfessionalView({ demo, professionalId }: { demo: DemoStore; professionalId: string }) {
  const professional = DEMO_PROFESSIONALS.find((item) => item.id === professionalId);
  const preferences = professional
    ? demo.state.preferencesByProfessional[professional.id] ?? professional.preferences
    : null;

  function updatePreferences(patch: Partial<ProfessionalPreferences>): void {
    if (!professional || !preferences) return;
    demo.updatePreferences(professional.id, { ...preferences, ...patch });
  }

  function toggleModality(modality: BookingMode): void {
    if (!preferences) return;
    const modalities = preferences.modalities.includes(modality)
      ? preferences.modalities.filter((item) => item !== modality)
      : [...preferences.modalities, modality];
    updatePreferences({ modalities });
  }

  return (
    <div className="role-view professional-view" id="inicio">
      <div className="role-intro-grid">
        <PageHeading
          title="Tu perfil profesional."
          description="Revisa tu presentación y ajusta las condiciones de trabajo que determinan qué sesiones aparecen al explorar."
        />
        <div className="role-summary-card professional-summary">
          <span className="eyebrow">RADIO DE TRABAJO</span>
          <strong>{preferences?.maxRadiusKm ?? 0} km</strong>
          <span>Desde tu ubicación base</span>
          <div className="summary-micro-line"><span /><span /><span /></div>
        </div>
      </div>

      <section className="professional-layout" aria-label="Perfil y preferencias de profesional">
        <article className="panel-card preference-card">
          <div className="panel-card-heading">
            <div>
              <span className="eyebrow">PREFERENCIAS DE MUESTRA</span>
              <h2>Preferencias de trabajo</h2>
              <p>Los cambios afectan a las horas y modalidades disponibles para tus servicios en esta demo.</p>
            </div>
            <span className="demo-tag">Editable en esta sesión</span>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="professional-base">Ubicación base</label>
              <select id="professional-base" onChange={(event) => updatePreferences({ baseLocationId: event.currentTarget.value })} value={preferences?.baseLocationId ?? ''}>
                {DEMO_LOCATIONS.filter((item) => item.id !== 'online').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                <option value="online">En línea</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="professional-radius">Radio máximo (km)</label>
              <input id="professional-radius" max="40" min="0" onChange={(event) => updatePreferences({ maxRadiusKm: Number(event.currentTarget.value) })} type="number" value={preferences?.maxRadiusKm ?? 0} />
            </div>
            <div className="field">
              <label htmlFor="professional-travel">Desplazamiento máximo (min)</label>
              <input id="professional-travel" max="180" min="0" onChange={(event) => updatePreferences({ maxTravelMinutes: Number(event.currentTarget.value) })} type="number" value={preferences?.maxTravelMinutes ?? 0} />
            </div>
            <div className="field">
              <label htmlFor="professional-buffer">Margen entre sesiones (min)</label>
              <input id="professional-buffer" max="120" min="0" onChange={(event) => updatePreferences({ bufferMinutes: Number(event.currentTarget.value) })} type="number" value={preferences?.bufferMinutes ?? 0} />
            </div>
          </div>
          <fieldset className="preference-modalities">
            <legend>Modalidades disponibles</legend>
            <p>Configuras lo que ofreces; las salas siguen formando parte del inventario del gestor.</p>
            <div className="modality-toggles">
              {modalityChoices.map((modality) => (
                <label className="toggle-choice" key={modality}>
                  <input checked={preferences?.modalities.includes(modality) ?? false} onChange={() => toggleModality(modality)} type="checkbox" />
                  <span>{DEMO_BOOKING_MODE_LABELS[modality]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="privacy-hint"><strong>Privacidad:</strong> tu agenda privada no aparece en el buscador del cliente.</p>
        </article>

        <aside className="profile-card">
          {professional ? (
            <>
              <div className="profile-card-top">
                <span className="avatar avatar-large" aria-hidden="true">{professional.initials}</span>
                <span className="rating-chip">★ {professional.rating.toFixed(1)} <small>({professional.reviewCount})</small></span>
              </div>
              <span className="eyebrow">{professional.headline}</span>
              <h2>{professional.name}</h2>
              <p>{professional.bio}</p>
              <div className="profile-location"><span aria-hidden="true">⌖</span> {professional.publicZone}</div>
              <div className="category-chips">{professional.categories.map((category) => <span key={category}>{category}</span>)}</div>
              <div className="profile-divider" />
              <span className="eyebrow">SERVICIOS PUBLICADOS</span>
              <ul className="profile-services">
                {DEMO_SERVICES.filter((service) => service.professionalId === professional.id).map((service) => (
                  <li key={service.id}>
                    <span>{service.name}</span>
                    <strong>{(service.priceCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : <p>No hay perfiles demo disponibles.</p>}
        </aside>
      </section>
    </div>
  );
}
