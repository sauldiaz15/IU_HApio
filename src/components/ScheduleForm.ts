import { getResources, getLocations, createRecurringSchedule, RecurringScheduleData } from '../api/hapio';

export function renderScheduleForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Horario Recurrente</h2>
            <p>Define cuándo un recurso está disponible de forma periódica.</p>
        </div>

        <div class="card">
            <form id="schedule-form" class="form">
                <div class="form-section">
                    <h3>Información del Horario</h3>
                    
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
                            <label for="start_date">Fecha de Inicio <span class="required-mark">*</span></label>
                            <input type="date" id="start_date" name="start_date" required>
                            <small class="field-legend">Fecha en la que entra en vigor el horario.</small>
                        </div>

                        <div class="form-group">
                            <label for="end_date">Fecha de Fin</label>
                            <input type="date" id="end_date" name="end_date">
                            <small class="field-legend">Opcional. Si se deja vacío, será indefinido.</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="interval">Intervalo (Semanas)</label>
                        <input type="number" id="interval" name="interval" min="1" value="1">
                        <small class="field-legend">Ej: 1 = cada semana, 2 = cada dos semanas.</small>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>
    
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Horario</button>
                    <button type="reset" class="btn btn-secondary">Limpiar</button>
                </div>
            </form>
        </div>
    `;

    const form = container.querySelector('#schedule-form') as HTMLFormElement;
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

        const scheduleData: RecurringScheduleData = {
            location_id: formData.get('location_id') as string,
            start_date: formData.get('start_date') as string,
            end_date: formData.get('end_date') as string || null,
            interval: parseInt(formData.get('interval') as string) || 1
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            await createRecurringSchedule(resourceId, scheduleData);

            messageEl.textContent = '¡Horario recurrente creado con éxito!';
            messageEl.className = 'message success';
            form.reset();
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Horario';
        }
    });

    loadSelectors();
}
