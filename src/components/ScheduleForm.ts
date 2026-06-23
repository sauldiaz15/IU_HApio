import { getResources, getLocations, getServices, createRecurringSchedule, RecurringScheduleData, getResource, updateResource } from '../api/hapio';

export function renderScheduleForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Horario Recurrente</h2>
            <p>Define cuándo un recurso está disponible de forma periódica y qué servicios ofrece en ese turno.</p>
        </div>

        <div class="card">
            <form id="schedule-form" class="form">
                <div class="form-section">
                    <h3>Información del Horario</h3>
                    
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label for="name">Nombre / Etiqueta del Horario</label>
                        <input type="text" id="name" name="name" placeholder="Ej. Lunes a Viernes - Turno Mañana">
                        <small class="field-legend">Una etiqueta descriptiva para identificar fácilmente este horario.</small>
                    </div>
                    
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

                <!-- ── Servicios disponibles en este turno ── -->
                <div class="form-section">
                    <h3>Servicios disponibles en este turno</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                        Selecciona los servicios que el recurso ofrece durante este horario. El wizard de reservas solo mostrará estos servicios cuando el turno esté activo.
                    </p>
                    <div id="services-checkboxes" class="services-checkbox-grid">
                        <p style="color: var(--text-secondary);">Cargando servicios...</p>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>
    
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Horario</button>
                    <button type="reset" class="btn btn-secondary">Limpiar</button>
                </div>
            </form>
        </div>

        <style>
            .services-checkbox-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 0.75rem;
            }
            .service-check-item {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                padding: 0.65rem 0.9rem;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                transition: border-color 0.2s, background 0.2s;
                background: var(--bg-color);
                user-select: none;
            }
            .service-check-item:hover {
                border-color: var(--accent-color);
                background: color-mix(in srgb, var(--accent-color) 8%, transparent);
            }
            .service-check-item input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: var(--accent-color);
                flex-shrink: 0;
            }
            .service-check-item.checked {
                border-color: var(--accent-color);
                background: color-mix(in srgb, var(--accent-color) 12%, transparent);
            }
            .service-check-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--text-primary);
            }
        </style>
    `;

    const form           = container.querySelector('#schedule-form') as HTMLFormElement;
    const resourceSelect = form.querySelector('#resource') as HTMLSelectElement;
    const locationSelect = form.querySelector('#location_id') as HTMLSelectElement;
    const servicesGrid   = container.querySelector('#services-checkboxes') as HTMLElement;
    const messageEl      = container.querySelector('#form-message') as HTMLElement;
    const submitBtn      = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    // ─── Carga de selects y checkboxes ───────────────────────────────────────
    async function loadSelectors() {
        try {
            const [resourcesRes, locationsRes, servicesRes] = await Promise.all([
                getResources(),
                getLocations(),
                getServices(),
            ]);

            const resources = resourcesRes.data;
            const locations = locationsRes.data;
            const services  = servicesRes.data;

            // Recursos
            resourceSelect.innerHTML = '<option value="" disabled selected>Selecciona un recurso</option>';
            resources.forEach(r => {
                const option = document.createElement('option');
                option.value = r.id;
                option.textContent = r.name;
                resourceSelect.appendChild(option);
            });

            // Localizaciones
            locationSelect.innerHTML = '<option value="" disabled selected>Selecciona una localización</option>';
            locations.forEach(l => {
                const option = document.createElement('option');
                option.value = l.id;
                option.textContent = l.name;
                locationSelect.appendChild(option);
            });

            // Servicios como checkboxes
            if (services.length === 0) {
                servicesGrid.innerHTML = '<p style="color: var(--text-secondary);">No hay servicios disponibles. Crea uno primero.</p>';
            } else {
                servicesGrid.innerHTML = services.map(s => `
                    <label class="service-check-item" for="svc-${s.id}">
                        <input type="checkbox" id="svc-${s.id}" name="services" value="${s.id}">
                        <span class="service-check-label">${s.name}</span>
                    </label>
                `).join('');

                // Actualizar clase CSS al marcar/desmarcar
                servicesGrid.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', () => {
                        cb.closest('.service-check-item')?.classList.toggle('checked', cb.checked);
                    });
                });
            }

        } catch (error: any) {
            messageEl.textContent = `Error al cargar datos: ${error.message}`;
            messageEl.className = 'message error';
        }
    }

    // ─── Submit ───────────────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData   = new FormData(form);
        const resourceId = formData.get('resource') as string;
        const nameVal    = (formData.get('name') as string) || '';

        // Recoger IDs de servicios seleccionados
        const selectedServices = Array.from(
            form.querySelectorAll<HTMLInputElement>('input[name="services"]:checked')
        ).map(cb => cb.value);

        const scheduleData: RecurringScheduleData = {
            location_id: formData.get('location_id') as string,
            start_date:  formData.get('start_date') as string,
            end_date:    (formData.get('end_date') as string) || null,
            interval:    parseInt(formData.get('interval') as string) || 1,
            // Guardar servicios en metadata (para compatibilidad de la API)
            metadata: {
                services: selectedServices,
            },
        };

        try {
            submitBtn.disabled    = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className   = 'message hidden';

            // 1. Crear el horario recurrente
            const createdSchedule = await createRecurringSchedule(resourceId, scheduleData);

            // 2. Guardar el nombre/etiqueta en los metadatos del Recurso
            if (nameVal) {
                try {
                    const resource = await getResource(resourceId);
                    const metadata = resource.metadata || {};
                    const scheduleNames = metadata.schedule_names || {};
                    
                    scheduleNames[createdSchedule.id] = nameVal;
                    metadata.schedule_names = scheduleNames;

                    await updateResource(resourceId, { metadata });
                } catch (metaErr) {
                    console.error('Error al guardar la etiqueta en los metadatos del recurso:', metaErr);
                }
            }

            messageEl.textContent = '¡Horario recurrente creado con éxito!';
            messageEl.className   = 'message success';
            form.reset();
            // Limpiar estado visual de checkboxes
            servicesGrid.querySelectorAll('.service-check-item').forEach(el => el.classList.remove('checked'));
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className   = 'message error';
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Crear Horario';
        }
    });

    loadSelectors();
}
