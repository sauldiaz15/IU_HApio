import { createService, ServiceData, ServiceType } from '../api/hapio';

export function renderServiceForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Nuevo Servicio</h2>
            <p>Define un servicio que tus clientes podrán reservar.</p>
        </div>

        <div class="card">
            <form id="service-form" class="form">
                <div class="form-section">
                    <h3>Información General</h3>
                    <div class="form-group">
                        <label for="name">Nombre del Servicio</label>
                        <input type="text" id="name" name="name" required placeholder="Ej. Corte de pelo Caballero">
                    </div>

                    <div class="form-group">
                        <label for="type">Tipo de Servicio</label>
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
                        <small class="field-legend" id="price-legend">Precio fijo por servicio.</small>
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
                        <span class="label-text">Habilitar servicio</span>
                        <label class="switch">
                            <input type="checkbox" id="enabled" name="enabled" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>
    
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Servicio</button>
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
            priceLegend.textContent = 'Precio fijo por servicio.';
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

        const serviceData: ServiceData = {
            name: formData.get('name') as string,
            type: type,
            enabled: formData.get('enabled') === 'on',
            price: formData.get('price') ? (parseFloat(formData.get('price') as string)).toFixed(3) : null,
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

            messageEl.textContent = '¡Servicio creado con éxito!';
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
            submitBtn.textContent = 'Crear Servicio';
        }
    });
}
