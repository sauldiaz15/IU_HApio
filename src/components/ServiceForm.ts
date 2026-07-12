import { createService, getServices, ServiceData, ServiceType } from '../api/hapio';

export function renderServiceForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Nueva Especialidad</h2>
            <p>Define una especialidad que tus clientes podrán reservar.</p>
        </div>

        <div class="card">
            <form id="service-form" class="form">
                <div class="form-section">
                    <h3>Información General</h3>
                    <div class="form-group">
                        <label for="name">Nombre de la Especialidad</label>
                        <input type="text" id="name" name="name" required placeholder="Ej. Pediatría">
                    </div>

                    <div class="form-group">
                        <label for="category">Categoría</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <select id="category" name="category" style="flex: 1;">
                                <option value="">-- Selecciona una categoría (Opcional) --</option>
                            </select>
                            <button type="button" id="btn-add-category" class="btn btn-secondary" style="padding: 0.75rem 1rem; border-radius: 12px; font-weight: bold; background: rgba(255,255,255,0.05); color: white;">
                                ➕
                            </button>
                        </div>
                        <small class="field-legend">Selecciona una categoría existente o crea una nueva.</small>
                    </div>


                    <div class="form-group">
                        <label for="type">Tipo de Especialidad</label>
                        <select id="type" name="type" required>
                            <option value="fixed">Fijo (Duración definida)</option>
                            <option value="flexible">Flexible (Duración variable)</option>
                            <option value="day">Día completo</option>
                        </select>
                    </div>

                    <div class="form-group" id="fixed-fields">
                        <label for="duration_min">Duración (minutos)</label>
                        <input type="number" id="duration_min" name="duration_min" min="1" value="30" placeholder="Ej. 60">
                    </div>

                    <div id="flexible-fields" style="display: none;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="min_duration_min">Duración Mínima (minutos)</label>
                                <input type="number" id="min_duration_min" name="min_duration_min" min="1" placeholder="Ej. 30">
                            </div>
                            <div class="form-group">
                                <label for="max_duration_min">Duración Máxima (minutos)</label>
                                <input type="number" id="max_duration_min" name="max_duration_min" min="1" placeholder="Ej. 120 (null = sin límite)">
                            </div>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="default_duration_min">Duración por Defecto (minutos)</label>
                                <input type="number" id="default_duration_min" name="default_duration_min" min="1" placeholder="Ej. 45 (opcional)">
                            </div>
                            <div class="form-group">
                                <label for="duration_step_min">Paso de Duración (minutos)</label>
                                <input type="number" id="duration_step_min" name="duration_step_min" min="1" placeholder="Ej. 15">
                            </div>
                        </div>
                    </div>

                    <div id="day-fields" style="display: none;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="start_time">Hora Inicio (hh:mm:ss)</label>
                                <input type="text" id="start_time" name="start_time" placeholder="Ej. 09:00:00">
                            </div>
                            <div class="form-group">
                                <label for="end_time">Hora Fin (hh:mm:ss)</label>
                                <input type="text" id="end_time" name="end_time" placeholder="Ej. 18:00:00">
                            </div>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="min_days">Días Mínimos</label>
                                <input type="number" id="min_days" name="min_days" min="1" value="1" placeholder="Ej. 1">
                            </div>
                            <div class="form-group">
                                <label for="max_days">Días Máximos</label>
                                <input type="number" id="max_days" name="max_days" min="1" placeholder="Ej. 7 (null = sin límite)">
                            </div>
                            <div class="form-group">
                                <label for="default_days">Días por Defecto</label>
                                <input type="number" id="default_days" name="default_days" min="1" placeholder="Ej. 2">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="price">Precio (opcional)</label>
                        <input type="number" id="price" name="price" step="0.001" placeholder="Ej. 25.000">
                        <small class="field-legend" id="price-legend">Precio fijo por especialidad.</small>
                    </div>
                </div>

                
                <div class="form-section collapsible" id="advanced-time-section">
                    <div class="form-section-header">
                        <h3>Configuración de Tiempo (Avanzado)</h3>
                        <span class="section-arrow">▼</span>
                    </div>
                    
                    <div class="form-section-content">
                        <div class="form-group">
                            <div class="label-with-tooltip">
                                <label for="bookable_interval_min">Intervalo Reservable (minutos)</label>
                                <span class="info-icon" title="The bookable interval for the service. Bookable slots for the service will be listed in this interval. If this is null, the sum of the properties duration, buffer_time_before, and buffer_time_after will be used.">?</span>
                            </div>
                            <input type="number" id="bookable_interval_min" name="bookable_interval_min" min="1" placeholder="Ej. 15 (Auto: suma de duración + buffers)">
                            <small class="field-legend">Intervalo en el que se listarán los huecos disponibles.</small>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <div class="label-with-tooltip">
                                    <label for="buffer_time_before_min">Buffer Antes (minutos)</label>
                                    <span class="info-icon" title="The buffer time required before the service.">?</span>
                                </div>
                                <input type="number" id="buffer_time_before_min" name="buffer_time_before_min" min="0" placeholder="Ej. 5 (Auto: 0)">
                            </div>
                            <div class="form-group">
                                <div class="label-with-tooltip">
                                    <label for="buffer_time_after_min">Buffer Después (minutos)</label>
                                    <span class="info-icon" title="The buffer time required after this service.">?</span>
                                </div>
                                <input type="number" id="buffer_time_after_min" name="buffer_time_after_min" min="0" placeholder="Ej. 5 (Auto: 0)">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-section collapsible" id="booking-windows-section">
                    <div class="form-section-header">
                        <h3>Ventanas de Reserva</h3>
                        <span class="section-arrow">▼</span>
                    </div>
                    
                    <div class="form-section-content">
                        <div class="form-grid">
                            <div class="form-group">
                                <div class="label-with-tooltip">
                                    <label for="booking_window_start_min">Ventana de Inicio (minutos)</label>
                                    <span class="info-icon" title="Minimum duration required between the current timestamp and the start of a booking.">?</span>
                                </div>
                                <input type="number" id="booking_window_start_min" name="booking_window_start_min" min="0" placeholder="Ej. 60 (Auto: 0)">
                            </div>
                            <div class="form-group">
                                <div class="label-with-tooltip">
                                    <label for="booking_window_end_min">Ventana de Fin (minutos)</label>
                                    <span class="info-icon" title="Maximum duration allowed between the current timestamp and the start of a booking.">?</span>
                                </div>
                                <input type="number" id="booking_window_end_min" name="booking_window_end_min" min="1" placeholder="Ej. 43200 (Auto: Sin límite)">
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="label-with-tooltip">
                                <label for="cancelation_threshold_min">Umbral de Cancelación (minutos)</label>
                                <span class="info-icon" title="Minimum duration required between the current timestamp and the start of a booking to be allowed to cancel it.">?</span>
                            </div>
                            <input type="number" id="cancelation_threshold_min" name="cancelation_threshold_min" min="0" placeholder="Ej. 1440 (Auto: 0)">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <div class="toggle-container">
                        <span class="label-text">Habilitar especialidad</span>
                        <label class="switch">
                            <input type="checkbox" id="enabled" name="enabled" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>
    
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Especialidad</button>
                    <button type="reset" class="btn btn-secondary">Limpiar</button>
                </div>
            </form>
        </div>
    `;

    const form = container.querySelector('#service-form') as HTMLFormElement;
    const typeSelect = form.querySelector('#type') as HTMLSelectElement;
    const fixedFields = form.querySelector('#fixed-fields') as HTMLElement;
    const flexibleFields = form.querySelector('#flexible-fields') as HTMLElement;
    const dayFields = form.querySelector('#day-fields') as HTMLElement;
    const priceLegend = form.querySelector('#price-legend') as HTMLElement;
    const messageEl = container.querySelector('#form-message') as HTMLElement;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Show/hide fields based on type
    typeSelect.addEventListener('change', () => {
        fixedFields.style.display = 'none';
        flexibleFields.style.display = 'none';
        dayFields.style.display = 'none';

        if (typeSelect.value === 'fixed') {
            fixedFields.style.display = 'block';
            priceLegend.textContent = 'Precio fijo por especialidad.';
        } else if (typeSelect.value === 'flexible') {
            flexibleFields.style.display = 'block';
            priceLegend.textContent = 'Precio basado en duración.';
        } else if (typeSelect.value === 'day') {
            dayFields.style.display = 'block';
            priceLegend.textContent = 'Tarifa por día.';
        }
    });

    // Toggle collapsible sections
    const collapsibleSections = form.querySelectorAll('.form-section.collapsible');
    collapsibleSections.forEach(section => {
        const header = section.querySelector('.form-section-header') as HTMLElement;
        header.addEventListener('click', () => {
            section.classList.toggle('expanded');
        });
    });

    /**
     * Helper to convert minutes to ISO 8601 duration
     */
    function minutesToISO(minutes: number | string | null): string | null {
        if (minutes === null || minutes === '') return null;
        const mins = typeof minutes === 'string' ? parseInt(minutes) : minutes;
        if (isNaN(mins)) return null;

        if (mins < 60) return `PT${mins}M`;
        const hours = Math.floor(mins / 60);
        const remainingMinutes = mins % 60;

        if (hours < 24) {
            if (remainingMinutes === 0) return `PT${hours}H`;
            return `PT${hours}H${remainingMinutes}M`;
        }

        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        let iso = `P${days}DT`;
        if (remainingHours > 0) iso += `${remainingHours}H`;
        if (remainingMinutes > 0) iso += `${remainingMinutes}M`;
        if (iso.endsWith('T')) iso = iso.slice(0, -1); // Remove T if no time part
        return iso;
    }


    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const type = formData.get('type') as ServiceType;

        const category = (formData.get('category') as string || '').trim();

        const serviceData: ServiceData = {
            name: formData.get('name') as string,
            type: type,
            enabled: formData.get('enabled') === 'on',
            price: formData.get('price') ? (parseFloat(formData.get('price') as string)).toFixed(3) : null,
            metadata: {
                category: category || undefined
            },
            // If empty, null triggers automatic calculation (sum of duration + buffers)
            bookable_interval: minutesToISO(formData.get('bookable_interval_min') as string),
            // Buffers default to PT0S (0 minutes)
            buffer_time_before: minutesToISO(formData.get('buffer_time_before_min') as string || '0'),
            buffer_time_after: minutesToISO(formData.get('buffer_time_after_min') as string || '0'),
            // Window start and cancelation threshold default to PT0S (0 minutes)
            booking_window_start: minutesToISO(formData.get('booking_window_start_min') as string || '0'),
            cancelation_threshold: minutesToISO(formData.get('cancelation_threshold_min') as string || '0'),
            // Window end defaults to null (no end)
            booking_window_end: minutesToISO(formData.get('booking_window_end_min') as string)
        };

        if (type === 'fixed') {
            serviceData.duration = minutesToISO(formData.get('duration_min') as string);
        } else if (type === 'flexible') {
            serviceData.min_duration = minutesToISO(formData.get('min_duration_min') as string);
            serviceData.max_duration = minutesToISO(formData.get('max_duration_min') as string);
            serviceData.default_duration = minutesToISO(formData.get('default_duration_min') as string);
            serviceData.duration_step = minutesToISO(formData.get('duration_step_min') as string);
        } else if (type === 'day') {
            const minDays = parseInt(formData.get('min_days') as string);
            const maxDays = formData.get('max_days') ? parseInt(formData.get('max_days') as string) : null;
            const defaultDays = formData.get('default_days') ? parseInt(formData.get('default_days') as string) : null;

            serviceData.min_days = isNaN(minDays) ? 1 : minDays;
            serviceData.max_days = maxDays && !isNaN(maxDays) ? maxDays : null;
            serviceData.default_days = defaultDays && !isNaN(defaultDays) ? defaultDays : null;

            serviceData.start_time = formData.get('start_time') as string || null;
            serviceData.end_time = formData.get('end_time') as string || null;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            await createService(serviceData);

            messageEl.textContent = '¡Especialidad creada con éxito!';
            messageEl.className = 'message success';
            form.reset();
            // Reset visibility
            fixedFields.style.display = 'block';
            dayFields.style.display = 'none';
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Especialidad';
        }
    });

    // Cargar categorías existentes para el select
    async function loadExistingCategories() {
        try {
            const categorySelect = form.querySelector('#category') as HTMLSelectElement;
            const btnAddCategory = form.querySelector('#btn-add-category') as HTMLButtonElement;
            
            const response = await getServices();
            const categories = new Set<string>();
            response.data?.forEach((s: any) => {
                let meta: any = {};
                if (s.metadata) {
                    try {
                        meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
                    } catch (e) {}
                }
                if (meta?.category) {
                    categories.add(meta.category);
                }
            });
            
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categorySelect.appendChild(opt);
            });

            btnAddCategory.addEventListener('click', () => {
                openAddCategoryModal(categorySelect);
            });
        } catch (e) {
            console.error('Error cargando categorías:', e);
        }
    }

    function openAddCategoryModal(selectEl: HTMLSelectElement) {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.background = 'rgba(15, 23, 42, 0.8)';
        backdrop.style.backdropFilter = 'blur(6px)';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.zIndex = '1100';
        
        backdrop.innerHTML = `
            <div class="card" style="width: 400px; padding: 2rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5); border: 1px solid rgba(255,255,255,0.08); background: var(--card-bg, #1e293b);">
                <h3 style="margin-top: 0; color: white; font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem;">Crear Nueva Categoría</h3>
                <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 1.25rem;">
                    Ingresa el nombre de la nueva categoría para agrupar especialidades.
                </p>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="modal-category-name">Nombre de Categoría</label>
                    <input type="text" id="modal-category-name" placeholder="Ej. Odontología" style="width:100%; box-sizing:border-box;">
                    <span id="modal-category-error" style="color: #f87171; font-size: 0.75rem; margin-top: 0.25rem; display: none;"></span>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                    <button type="button" id="modal-cancel-btn" class="btn btn-secondary" style="background: rgba(255,255,255,0.05); color: white;">Cancelar</button>
                    <button type="button" id="modal-save-btn" class="btn btn-primary">Crear</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        
        const input = backdrop.querySelector('#modal-category-name') as HTMLInputElement;
        const errorEl = backdrop.querySelector('#modal-category-error') as HTMLElement;
        const cancelBtn = backdrop.querySelector('#modal-cancel-btn') as HTMLButtonElement;
        const saveBtn = backdrop.querySelector('#modal-save-btn') as HTMLButtonElement;
        
        input.focus();
        
        const closeModal = () => {
            document.body.removeChild(backdrop);
        };
        
        cancelBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });
        
        const handleSave = () => {
            const value = input.value.trim();
            if (!value) {
                errorEl.textContent = 'El nombre no puede estar vacío.';
                errorEl.style.display = 'block';
                return;
            }
            
            // Check duplication (case-insensitive)
            let duplicate = false;
            Array.from(selectEl.options).forEach(opt => {
                if (opt.value.toLowerCase() === value.toLowerCase()) {
                    duplicate = true;
                }
            });
            
            if (duplicate) {
                errorEl.textContent = 'Esta categoría ya existe.';
                errorEl.style.display = 'block';
                return;
            }
            
            // Add to combobox and select it
            const newOpt = document.createElement('option');
            newOpt.value = value;
            newOpt.textContent = value;
            newOpt.selected = true;
            selectEl.appendChild(newOpt);
            
            closeModal();
        };
        
        saveBtn.addEventListener('click', handleSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSave();
        });
    }

    loadExistingCategories();
}
