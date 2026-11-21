import { useMemo, useState } from 'react';
import { DEMO_LOCATIONS, DEMO_SPACES } from '../data/demoData.ts';
import type { SpaceKind } from '../domain/spaces.ts';

type SpaceFilter = 'all' | SpaceKind;

export function ClientSpacesView({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const [filter, setFilter] = useState<SpaceFilter>('all');
  const [query, setQuery] = useState('');
  const spaces = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-ES');
    return DEMO_SPACES.filter((space) => {
      const matchesKind = filter === 'all' || space.kind === filter;
      const matchesQuery = !normalized || [
        space.name,
        space.zoneLabel,
        space.description,
        ...space.equipment,
        ...space.amenities,
      ].join(' ').toLocaleLowerCase('es-ES').includes(normalized);
      return matchesKind && matchesQuery;
    });
  }, [filter, query]);

  return (
    <section className="client-network-section" aria-labelledby="public-spaces-title">
      <div className="directory-heading">
        <div>
          <span className="eyebrow">SALAS Y GIMNASIOS</span>
          <h1 id="public-spaces-title">Un espacio que encaja con tu sesión.</h1>
          <p>Explora las instalaciones y sus características. La información de acceso solo aparece en reservas confirmadas de la demo.</p>
        </div>
        <span className="fake-data-label">Inventario ficticio</span>
      </div>

      <label className="directory-search">
        <span className="visually-hidden">Buscar espacios por nombre, zona o equipamiento</span>
        <span aria-hidden="true">⌕</span>
        <input onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Nombre, zona o equipamiento" type="search" value={query} />
      </label>

      <div className="space-filter-tabs" role="group" aria-label="Tipo de espacio">
        {([
          ['all', 'Todos'],
          ['room', 'Salas'],
          ['gym', 'Gimnasios'],
        ] as const).map(([value, label]) => (
          <button aria-pressed={filter === value} className={filter === value ? 'client-section-tab is-active' : 'client-section-tab'} key={value} onClick={() => setFilter(value)} type="button">{label}</button>
        ))}
      </div>

      {spaces.length ? (
        <div className="public-spaces-grid">
          {spaces.map((space, index) => (
            <article className="public-space-card" key={space.id}>
              <div className={`public-space-art inventory-art-${(index % 4) + 1}`} aria-hidden="true">
                <span className="inventory-art-orbit" /><span className="inventory-art-window" /><span className="inventory-art-floor" />
                <span className="public-space-number">0{index + 1}</span>
              </div>
              <div className="public-space-copy">
                <div className="public-space-heading">
                  <div>
                    <span className="eyebrow">{space.kind === 'gym' ? 'GIMNASIO' : 'SALA'} · {space.zoneLabel}</span>
                    <h2>{space.name}</h2>
                  </div>
                  <strong>{(space.pricePerOccurrenceCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}<small> / uso demo</small></strong>
                </div>
                <p>{space.description}</p>
                <div className="public-space-facts">
                  <span>Hasta <strong>{space.capacity}</strong> personas</span>
                  <span>{DEMO_LOCATIONS.find((location) => location.id === space.locationId)?.name ?? space.zoneLabel}</span>
                  <span>{space.openingHours.weekdays.length} días de apertura por semana</span>
                </div>
                <div className="equipment-chips">{space.equipment.map((item) => <span key={item}>{item}</span>)}</div>
                <div className="public-space-footer">
                  <span>{space.amenities.join(' · ')}</span>
                  {onOpenSearch && <button className="text-button" onClick={onOpenSearch} type="button">Ir a buscar sesiones →</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty"><h2>No encontramos ese espacio</h2><p>Prueba con otra zona o equipamiento.</p></div>
      )}
      <p className="pending-decisions-note">Precios, horarios y disponibilidad son de muestra. No se muestra la dirección exacta ni ningún dato privado del gestor.</p>
    </section>
  );
}
