import { createBooking, getResources, getServices, getLocations, BookingData, associateResourceService, getResourceSchedule } from '../api/hapio';

const SLOT_DURATION_MIN = 30; // duración predeterminada visual si no hay API

// (Función quitada: los turnos ahora vienen dinámicamente de la API)

/** Añade N minutos a un string "HH:MM" (usado como respaldo si la API no da ends_at) */
function addMinutesToTime(time: string, minutes: number): string | null {
    const [h, m] = time.split(':').map(Number);
    const totalMin = h * 60 + m + minutes;
    if (totalMin >= 24 * 60) return null; // no cabe en el mismo día
    const nh = Math.floor(totalMin / 60);
    const nm = totalMin % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
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

/** Fecha de hoy en formato YYYY-MM-DD */
function todayStr(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function renderBookingForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Nueva Reserva</h2>
            <p>Registra una nueva reserva asignando un recurso, servicio y franja horaria.</p>
        </div>

        <div class="card">
            <form id="booking-form" class="form">

                <div class="form-section">
                    <h3>Asignación</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="booking-resource">Recurso</label>
                            <select id="booking-resource" name="resource_id" required>
                                <option value="">Cargando recursos...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="booking-service">Servicio</label>
                            <select id="booking-service" name="service_id" required>
                                <option value="">Cargando servicios...</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="booking-location">Localización</label>
                        <select id="booking-location" name="location_id" required>
                            <option value="">Cargando localizaciones...</option>
                        </select>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Franja Horaria</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                        Los turnos tienen una duración de <strong>${SLOT_DURATION_MIN} minutos</strong>.
                        La hora de fin se calcula automáticamente.
                    </p>

                    <div class="form-group">
                        <label for="booking-date">Fecha de la cita</label>
                        <input type="date" id="booking-date" name="booking_date" required min="${todayStr()}">
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="booking-start-time">Hora de Inicio</label>
                            <select id="booking-start-time" name="start_time" required disabled>
                                <option value="">Completa opciones para ver horas</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="booking-end-time">Hora de Fin <small style="color: var(--text-secondary);">(automático)</small></label>
                            <select id="booking-end-time" name="end_time" disabled>
                                <option value="">Se calculará al elegir inicio</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Datos del Cliente (Opcional)</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="booking-customer-name">Nombre del Cliente</label>
                            <input type="text" id="booking-customer-name" name="customer_name" placeholder="Ej. Juan Pérez">
                        </div>
                        <div class="form-group">
                            <label for="booking-customer-email">Email del Cliente</label>
                            <input type="email" id="booking-customer-email" name="customer_email" placeholder="Ej. juan@ejemplo.com">
                        </div>
                    </div>
                </div>

                <div id="booking-form-message" class="message hidden"></div>

                <div class="form-actions">
                    <button type="submit" id="booking-submit-btn" class="btn btn-primary">Crear Reserva</button>
                    <button type="reset" class="btn btn-secondary">Limpiar</button>
                </div>
            </form>
        </div>
    `;

    const form = container.querySelector('#booking-form') as HTMLFormElement;
    const resourceSelect = form.querySelector('#booking-resource') as HTMLSelectElement;
    const serviceSelect = form.querySelector('#booking-service') as HTMLSelectElement;
    const locationSelect = form.querySelector('#booking-location') as HTMLSelectElement;
    const dateInput = form.querySelector('#booking-date') as HTMLInputElement;
    const startTimeSel = form.querySelector('#booking-start-time') as HTMLSelectElement;
    const endTimeSel = form.querySelector('#booking-end-time') as HTMLSelectElement;
    const messageEl = container.querySelector('#booking-form-message') as HTMLElement;
    const submitBtn = form.querySelector('#booking-submit-btn') as HTMLButtonElement;

    // Default: today
    dateInput.value = todayStr();

    // ─── Carga de Horarios Disponibles ─────────────────────────────────────
    async function updateAvailableSlots() {
        const resId = resourceSelect.value;
        const srvId = serviceSelect.value;
        const locId = locationSelect.value;
        const date = dateInput.value;

        if (!resId || !srvId || !locId || !date) {
            startTimeSel.innerHTML = '<option value="">Completa recurso, servicio, sede y fecha</option>';
            startTimeSel.disabled = true;
            endTimeSel.innerHTML = '<option value="">Primero elige inicio</option>';
            return;
        }

        try {
            startTimeSel.innerHTML = '<option value="">Buscando horarios libres...</option>';
            startTimeSel.disabled = true;
            endTimeSel.innerHTML = '<option value="">Primero elige inicio</option>';

            // Vincular de antemano para evitar el error de Hapio "resource is not associated" al calcular slots
            await associateResourceService(resId, srvId);

            const fromISO = buildISO(date, '00:00');
            const toISO = buildISO(date, '23:59');

            const resp = await getResourceSchedule(resId, {
                location: locId,
                from: fromISO,
                to: toISO
            });

            const spans = resp.data;

            if (spans.length === 0) {
                startTimeSel.innerHTML = '<option value="">Sin turnos (El horario del recurso puede estar cerrado o lleno)</option>';
                return;
            }

            const options = ['<option value="">-- Seleccionar hora --</option>'];
            const pad = (n: number) => String(n).padStart(2, '0');

            spans.forEach(span => {
                let current = new Date(span.starts_at);
                const end = new Date(span.ends_at);

                // Fraccionamos el span continuo en bloques de SLOT_DURATION_MIN
                while (current.getTime() + SLOT_DURATION_MIN * 60000 <= end.getTime()) {
                    const sh = pad(current.getHours());
                    const sm = pad(current.getMinutes());

                    const next = new Date(current.getTime() + SLOT_DURATION_MIN * 60000);
                    const eh = pad(next.getHours());
                    const em = pad(next.getMinutes());

                    options.push(`<option value="${sh}:${sm}" data-end="${eh}:${em}">${sh}:${sm}</option>`);

                    current = next;
                }
            });

            if (options.length === 1) { // Solo contiene el '-- Seleccionar hora --'
                startTimeSel.innerHTML = '<option value="">El tiempo libre restante no ajusta a turnos de 30 mins</option>';
            } else {
                startTimeSel.innerHTML = options.join('');
                startTimeSel.disabled = false;
            }

        } catch (error: any) {
            startTimeSel.innerHTML = '<option value="">Error obteniendo horarios</option>';
            endTimeSel.innerHTML = '<option value=""></option>';
            console.error('Error fetching slots:', error);
        }
    }

    [resourceSelect, serviceSelect, locationSelect, dateInput].forEach(el => {
        el.addEventListener('change', updateAvailableSlots);
    });

    // ─── Auto-relleno de hora fin ─────────────────────────────────────────────
    startTimeSel.addEventListener('change', () => {
        const option = startTimeSel.options[startTimeSel.selectedIndex];
        const startVal = option.value;
        if (!startVal) {
            endTimeSel.innerHTML = '<option value="">Selecciona hora de inicio</option>';
            return;
        }

        // Si la API provee final a través de data-end, lo usamos. Si no, calculamos +30 min.
        let endVal = option.dataset.end || null;
        if (!endVal || endVal === 'NaN:NaN') {
            endVal = addMinutesToTime(startVal, SLOT_DURATION_MIN);
        }

        if (!endVal) {
            endTimeSel.innerHTML = '<option value="">Pasa de medianoche — elige otro inicio</option>';
            startTimeSel.setCustomValidity('El turno supera la medianoche. Elige un horario anterior.');
        } else {
            startTimeSel.setCustomValidity('');
            endTimeSel.innerHTML = `<option value="${endVal}" selected>${endVal}</option>`;
        }
    });

    // ─── Reset limpia también el select de fin ────────────────────────────────
    form.addEventListener('reset', () => {
        setTimeout(() => {
            endTimeSel.innerHTML = '<option value="">Se calculará al elegir inicio</option>';
            startTimeSel.innerHTML = '<option value="">Completa opciones para ver horas</option>';
            startTimeSel.disabled = true;
            dateInput.value = todayStr();
        }, 0);
    });

    // ─── Carga de selectores dinámicos ────────────────────────────────────────
    async function loadSelects() {
        try {
            const [resResp, svcResp, locResp] = await Promise.all([
                getResources(), getServices(), getLocations()
            ]);

            resourceSelect.innerHTML = resResp.data.length
                ? resResp.data.map(r => `<option value="${r.id}">${r.name}</option>`).join('')
                : '<option value="">No hay recursos disponibles</option>';

            serviceSelect.innerHTML = svcResp.data.length
                ? svcResp.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
                : '<option value="">No hay servicios disponibles</option>';

            locationSelect.innerHTML = locResp.data.length
                ? locResp.data.map(l => `<option value="${l.id}">${l.name}</option>`).join('')
                : '<option value="">No hay localizaciones disponibles</option>';

        } catch (error: any) {
            resourceSelect.innerHTML = '<option value="">Error al cargar</option>';
            serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
            locationSelect.innerHTML = '<option value="">Error al cargar</option>';
            messageEl.textContent = `Error al cargar los datos: ${error.message}`;
            messageEl.className = 'message error';
        }

        // Llamar inmediatamente a updateAvailableSlots después de popular los selects
        updateAvailableSlots();
    }

    // ─── Submit ───────────────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const date = dateInput.value;
        const startTime = startTimeSel.value;
        const endTime = endTimeSel.value;

        if (!date || !startTime || !endTime) {
            messageEl.textContent = 'Por favor selecciona la fecha y la hora de inicio.';
            messageEl.className = 'message error';
            return;
        }

        const formData = new FormData(form);
        const customerName = (formData.get('customer_name') as string).trim();
        const customerEmail = (formData.get('customer_email') as string).trim();

        const bookingData: BookingData = {
            resource_id: formData.get('resource_id') as string,
            service_id: formData.get('service_id') as string,
            location_id: formData.get('location_id') as string,
            starts_at: buildISO(date, startTime),
            ends_at: buildISO(date, endTime),
            ignore_bookable_slots: true,
        };

        if (customerName || customerEmail) {
            bookingData.customer = {};
            if (customerName) bookingData.customer.name = customerName;
            if (customerEmail) bookingData.customer.email = customerEmail;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            // Ensure the resource and service are associated before booking
            await associateResourceService(bookingData.resource_id, bookingData.service_id);

            const created = await createBooking(bookingData);

            messageEl.innerHTML = `
                ✅ <strong>Reserva creada con éxito.</strong><br>
                Turno: <strong>${startTime} → ${endTime}</strong> del <strong>${date}</strong><br>
                ID: <code>${created.id}</code>
            `;
            messageEl.className = 'message success';
            form.reset();

        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Reserva';
        }
    });

    loadSelects();
}
