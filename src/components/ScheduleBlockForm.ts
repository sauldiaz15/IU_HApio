import { getResources, getLocations, createScheduleBlock, ScheduleBlockData } from '../api/hapio';

export function renderScheduleBlockForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Turno Excepcional</h2>
            <p>Define un periodo de disponibilidad o bloqueo específico para un especialista.</p>
        </div>

        <div class="card">
            <form id="block-form" class="form">
                <div class="form-section">
                    <h3>Configuración del Turno Excepcional</h3>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="resource">Especialista <span class="required-mark">*</span></label>
                            <select id="resource" name="resource" required>
                                <option value="" disabled selected>Cargando especialistas...</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="location_id">Consultorio <span class="required-mark">*</span></label>
                            <select id="location_id" name="location_id" required>
                                <option value="" disabled selected>Cargando consultorios...</option>
                            </select>
                        </div>
                    </div>

                    <div id="tz-notice" style="display:none; background: var(--surface-2, #1e293b); border-left: 3px solid #6366f1; padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.82rem; color: var(--text-secondary, #94a3b8); margin-bottom: 0.5rem;">
                        🌐 Las horas se interpretan en la zona horaria del consultorio: <strong id="tz-name"></strong>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="starts_at">Fecha y Hora de Inicio <span class="required-mark">*</span></label>
                            <input type="datetime-local" id="starts_at" name="starts_at" required>
                        </div>

                        <div class="form-group">
                            <label for="ends_at">Fecha y Hora de Fin <span class="required-mark">*</span></label>
                            <input type="datetime-local" id="ends_at" name="ends_at" required>
                        </div>
                    </div>

                    <div class="toggle-container" style="margin-top: 1rem;">
                        <div class="label-text">
                            <strong>¿Está Disponible?</strong>
                            <small class="field-legend">Si está desactivado, el especialista estará bloqueado durante este periodo.</small>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="is_available" name="is_available" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>
    
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Turno Excepcional</button>
                    <button type="reset" class="btn btn-secondary">Limpiar</button>
                </div>
            </form>
        </div>
    `;

    const form = container.querySelector('#block-form') as HTMLFormElement;
    const resourceSelect = form.querySelector('#resource') as HTMLSelectElement;
    const locationSelect = form.querySelector('#location_id') as HTMLSelectElement;
    const messageEl = container.querySelector('#form-message') as HTMLElement;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const tzNotice = container.querySelector('#tz-notice') as HTMLElement;
    const tzNameEl = container.querySelector('#tz-name') as HTMLElement;

    // Mapa de location_id → timezone IANA (ej. "America/La_Paz")
    const locationTimezones: Record<string, string> = {};

    /**
     * Convierte un valor datetime-local ("YYYY-MM-DDTHH:MM") a ISO 8601 con el
     * offset real de la zona horaria IANA de la localización seleccionada.
     *
     * Problema que resuelve: el navegador usa su propio offset (-03:00), pero la
     * sede puede estar en otra zona (ej. America/La_Paz = -04:00). Si el usuario
     * escribe "18:00" queriendo decir "6pm en la sede", debemos enviarlo como
     * "18:00:00-04:00" y no como "18:00:00-03:00" (que sería otra hora UTC).
     */
    function buildISOWithLocationTZ(dateTimeLocal: string, ianaTimezone: string): string {
        const [datePart, timePart] = dateTimeLocal.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);

        // Instanciar una fecha para calcular el offset de esa zona en esa fecha
        // (importante: algunos lugares tienen DST y el offset cambia)
        const localDate = new Date(year, month - 1, day, hour, minute, 0);

        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: ianaTimezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
            timeZoneName: 'shortOffset'
        });

        // "shortOffset" devuelve algo como "GMT-4" o "GMT+5:30"
        const parts = formatter.formatToParts(localDate);
        const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
        const offsetMatch = tzName.match(/GMT([+-]\d+(?::\d+)?)?/);

        let offsetStr = '+00:00';
        if (offsetMatch && offsetMatch[1]) {
            const raw = offsetMatch[1]; // ej. "-4" o "+5:30"
            const [h, m = '0'] = raw.replace(/[+-]/, '').split(':');
            const sign = raw.startsWith('-') ? '-' : '+';
            offsetStr = `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }

        const pad = (n: number) => String(n).padStart(2, '0');
        return `${datePart}T${pad(hour)}:${pad(minute)}:00${offsetStr}`;
    }

    // Mostrar aviso de zona horaria al cambiar la localización
    locationSelect.addEventListener('change', () => {
        const tz = locationTimezones[locationSelect.value];
        if (tz) {
            tzNameEl.textContent = tz;
            tzNotice.style.display = 'block';
        } else {
            tzNotice.style.display = 'none';
        }
    });

    // Load Resources and Locations
    async function loadSelectors() {
        try {
            const [resourcesRes, locationsRes] = await Promise.all([
                getResources(),
                getLocations()
            ]);

            const resources = resourcesRes.data;
            const locations = locationsRes.data;

            resourceSelect.innerHTML = '<option value="" disabled selected>Selecciona un especialista</option>';
            resources.forEach(r => {
                const option = document.createElement('option');
                option.value = r.id;
                option.textContent = r.name;
                resourceSelect.appendChild(option);
            });

            locationSelect.innerHTML = '<option value="" disabled selected>Selecciona un consultorio</option>';
            locations.forEach(l => {
                const option = document.createElement('option');
                option.value = l.id;
                option.textContent = l.name;
                // Guardar la zona horaria IANA de cada sede para usarla al enviar
                locationTimezones[l.id] = l.time_zone;
                locationSelect.appendChild(option);
            });

        } catch (error: any) {
            messageEl.textContent = `Error al cargar datos: ${error.message}`;
            messageEl.className = 'message error';
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const resourceId = formData.get('resource') as string;
        const locationId = formData.get('location_id') as string;

        const startVal = formData.get('starts_at') as string;
        const endVal = formData.get('ends_at') as string;

        // Usar la zona horaria IANA real de la sede seleccionada
        const ianaTimezone = locationTimezones[locationId] || Intl.DateTimeFormat().resolvedOptions().timeZone;

        const blockData: ScheduleBlockData = {
            location_id: locationId,
            starts_at: buildISOWithLocationTZ(startVal, ianaTimezone),
            ends_at: buildISOWithLocationTZ(endVal, ianaTimezone),
            is_available: (form.querySelector('#is_available') as HTMLInputElement).checked
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            await createScheduleBlock(resourceId, blockData);

            messageEl.innerHTML = `
                ✅ <strong>Turno excepcional creado con éxito.</strong><br>
                Zona horaria del consultorio: <code>${ianaTimezone}</code><br>
                Inicio: <code>${blockData.starts_at}</code> → Fin: <code>${blockData.ends_at}</code>
            `;
            messageEl.className = 'message success';
            form.reset();
            tzNotice.style.display = 'none';
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Turno Excepcional';
        }
    });

    loadSelectors();
}
