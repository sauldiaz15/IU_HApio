import { getResources, getLocations, getResourceSchedule, ResourceScheduleSpan } from '../api/hapio';

/** Fecha actual en formato YYYY-MM-DD */
function todayStr(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Añade N días a una fecha YYYY-MM-DD */
function addDaysStr(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Formatea una fecha ISO a algo legible (ej. 14/05/2026, 09:00 - 18:00) */
function formatScheduleSpan(span: ResourceScheduleSpan): string {
    const start = new Date(span.starts_at);
    const end = new Date(span.ends_at);

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`;
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

    return `<strong>${dateStr}</strong>: ${startTime} - ${endTime}`;
}

/** Convierte date (YYYY-MM-DD) + time (HH:MM) a ISO 8601 con offset local */
function buildISO(date: string, time: string): string {
    const d = new Date(`${date}T${time}:00`);
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const tz = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
    return `${date}T${time}:00${tz}`;
}

export function renderResourceSchedule(container: HTMLElement): void {
    const defaultFrom = todayStr();
    const defaultTo = addDaysStr(defaultFrom, 7);

    container.innerHTML = `
        <div class="view-header">
            <h2>Horarios del Recurso</h2>
            <p>Consulta la disponibilidad calculada de un recurso, basándose en sus bloques de horario y bloques recurrentes configurados.</p>
        </div>

        <div class="card">
            <form id="schedule-filter-form" class="form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="schedule-resource">Recurso</label>
                        <select id="schedule-resource" name="resource_id" required>
                            <option value="">Cargando recursos...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="schedule-location">Localización</label>
                        <select id="schedule-location" name="location_id" required>
                            <option value="">Cargando localizaciones...</option>
                        </select>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label for="schedule-from">Desde (Fecha)</label>
                        <input type="date" id="schedule-from" name="from_date" value="${defaultFrom}" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-to">Hasta (Fecha)</label>
                        <input type="date" id="schedule-to" name="to_date" value="${defaultTo}" required>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 1rem;">
                    <button type="submit" id="schedule-search-btn" class="btn btn-primary">Ver Disponibilidad</button>
                </div>
            </form>
        </div>

        <div id="schedule-results" class="card hidden" style="margin-top: 2rem;">
            <h3>Resultados de Disponibilidad</h3>
            <div id="schedule-list" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <!-- Resultados insertados aqui -->
            </div>
        </div>
    `;

    const form = container.querySelector('#schedule-filter-form') as HTMLFormElement;
    const resourceSelect = form.querySelector('#schedule-resource') as HTMLSelectElement;
    const locationSelect = form.querySelector('#schedule-location') as HTMLSelectElement;
    const fromInput = form.querySelector('#schedule-from') as HTMLInputElement;
    const toInput = form.querySelector('#schedule-to') as HTMLInputElement;
    const resultsCard = container.querySelector('#schedule-results') as HTMLElement;
    const scheduleList = container.querySelector('#schedule-list') as HTMLElement;
    const searchBtn = form.querySelector('#schedule-search-btn') as HTMLButtonElement;

    async function loadSelects() {
        try {
            const [resResp, locResp] = await Promise.all([
                getResources(), getLocations()
            ]);

            resourceSelect.innerHTML = resResp.data.length
                ? resResp.data.map(r => `<option value="${r.id}">${r.name}</option>`).join('')
                : '<option value="">No hay recursos disponibles</option>';

            locationSelect.innerHTML = locResp.data.length
                ? locResp.data.map(l => `<option value="${l.id}">${l.name}</option>`).join('')
                : '<option value="">No hay localizaciones disponibles</option>';

        } catch (error) {
            console.error('Error cargando selects para schedule:', error);
            resourceSelect.innerHTML = '<option value="">Error al cargar</option>';
            locationSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const resourceId = resourceSelect.value;
        const locationId = locationSelect.value;
        const fromDate = fromInput.value;
        const toDate = toInput.value;

        if (!resourceId || !locationId || !fromDate || !toDate) {
            return;
        }

        try {
            searchBtn.disabled = true;
            searchBtn.textContent = 'Buscando...';
            resultsCard.classList.remove('hidden');
            scheduleList.innerHTML = '<p style="color: var(--text-secondary);">Consultando la API de Hapio...</p>';

            // Convert to full ISO times as required by Hapio
            const fromISO = buildISO(fromDate, '00:00');
            const toISO = buildISO(toDate, '23:59');

            const resp = await getResourceSchedule(resourceId, {
                location: locationId,
                from: fromISO,
                to: toISO
            });

            const spans = resp.data;

            if (spans.length === 0) {
                scheduleList.innerHTML = '<p style="color: var(--error);">No hay horarios libres o configurados en este rango de fechas para el recurso seleccionado en esa localización.</p>';
            } else {
                scheduleList.innerHTML = spans.map(span =>
                    `<div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 6px; background-color: var(--bg-color);">
                        ${formatScheduleSpan(span)}
                    </div>`
                ).join('');
            }

        } catch (error: any) {
            scheduleList.innerHTML = `<p style="color: var(--error);">Error al consultar disponibilidad: ${error.message}</p>`;
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Ver Disponibilidad';
        }
    });

    loadSelects();
}
