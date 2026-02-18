import { getResources, getLocations, createScheduleBlock, ScheduleBlockData } from '../api/hapio';

export function renderScheduleBlockForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Bloque de Horario</h2>
            <p>Define un periodo de disponibilidad o bloqueo específico para un recurso.</p>
        </div>

        <div class="card">
            <form id="block-form" class="form">
                <div class="form-section">
                    <h3>Configuración del Bloque</h3>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="resource">Recurso <span class="required-mark">*</span></label>
                            <select id="resource" name="resource" required>
                                <option value="" disabled selected>Cargando recursos...</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="location_id">Localización <span class="required-mark">*</span></label>
                            <select id="location_id" name="location_id" required>
                                <option value="" disabled selected>Cargando localizaciones...</option>
                            </select>
                        </div>
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
                            <small class="field-legend">Si está desactivado, el recurso estará bloqueado durante este periodo.</small>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="is_available" name="is_available" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>
    
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Bloque</button>
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

    // Load Resources and Locations
    async function loadSelectors() {
        try {
            const [resourcesRes, locationsRes] = await Promise.all([
                getResources(),
                getLocations()
            ]);

            const resources = resourcesRes.data;
            const locations = locationsRes.data;

            resourceSelect.innerHTML = '<option value="" disabled selected>Selecciona un recurso</option>';
            resources.forEach(r => {
                const option = document.createElement('option');
                option.value = r.id;
                option.textContent = r.name;
                resourceSelect.appendChild(option);
            });

            locationSelect.innerHTML = '<option value="" disabled selected>Selecciona una localización</option>';
            locations.forEach(l => {
                const option = document.createElement('option');
                option.value = l.id;
                option.textContent = l.name;
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

        // Convert datetime-local to ISO 8601 with local timezone offset (Y-m-d\TH:i:sP)
        // e.g. 2026-02-23T12:00:00-03:00
        // new Date().toISOString() returns UTC (Z), but Hapio requires local timezone offset
        const startVal = formData.get('starts_at') as string;
        const endVal = formData.get('ends_at') as string;

        function toLocalISOString(dateStr: string): string {
            const date = new Date(dateStr);
            const pad = (n: number) => String(n).padStart(2, '0');
            const tzo = -date.getTimezoneOffset();
            const sign = tzo >= 0 ? '+' : '-';
            const absOffset = Math.abs(tzo);
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
                `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
                `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
        }

        const blockData: ScheduleBlockData = {
            location_id: formData.get('location_id') as string,
            starts_at: toLocalISOString(startVal),
            ends_at: toLocalISOString(endVal),
            is_available: (form.querySelector('#is_available') as HTMLInputElement).checked
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            await createScheduleBlock(resourceId, blockData);

            messageEl.textContent = '¡Bloque de horario creado con éxito!';
            messageEl.className = 'message success';
            form.reset();
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Bloque';
        }
    });

    loadSelectors();
}
