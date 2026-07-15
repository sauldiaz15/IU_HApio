import { createBooking, getResources, getResourceServices, getServices, getRecurringSchedules, BookingData, associateResourceService, getResourceSchedule } from '../api/hapio';

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
            <p>Registra una nueva reserva asignando un especialista, especialidad y franja horaria.</p>
        </div>

        <div class="card">
            <form id="booking-form" class="form">

                <div class="form-section">
                    <h3>Asignación</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="booking-resource">Especialista</label>
                            <select id="booking-resource" name="resource_id" required>
                                <option value="">Cargando especialistas...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="booking-service">Especialidad</label>
                            <select id="booking-service" name="service_id" required disabled>
                                <option value="">Primero selecciona un especialista</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="booking-location">Consultorio</label>
                        <select id="booking-location" name="location_id" required>
                            <option value="">Cargando consultorios...</option>
                        </select>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Franja Horaria</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                        Los turnos tienen una duración de <strong>${SLOT_DURATION_MIN} minutos</strong>.
                        La hora de fin se calcula automáticamente.
                    </p>

                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label for="booking-date">Fecha de la cita</label>
                        <input type="date" id="booking-date" name="booking_date" required min="${todayStr()}">
                    </div>

                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <button type="button" id="btn-search-slots" class="btn btn-secondary btn-sm" style="font-weight: 600; width: 100%; border: 1px dashed var(--primary, #6366f1); color: var(--primary, #6366f1); background: transparent; padding: 0.6rem 1rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(99, 102, 241, 0.08)'" onmouseout="this.style.background='transparent'">
                            🔍 Buscar turnos disponibles
                        </button>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="booking-start-time">Hora de Inicio</label>
                            <select id="booking-start-time" name="start_time" required disabled>
                                <option value="">Presiona "Buscar turnos disponibles"</option>
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
                            <label for="booking-customer-name">Nombre Completo</label>
                            <input type="text" id="booking-customer-name" name="customer_name" placeholder="Ej. Juan Pérez">
                        </div>
                        <div class="form-group">
                            <label for="booking-customer-email">Email del Cliente</label>
                            <input type="email" id="booking-customer-email" name="customer_email" placeholder="Ej. juan@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label for="booking-customer-phone">Teléfono</label>
                            <input type="tel" id="booking-customer-phone" name="customer_phone" placeholder="Ej. +58 412 1234567">
                        </div>
                        <div class="form-group">
                            <label for="booking-customer-reason">Motivo de Consulta</label>
                            <input type="text" id="booking-customer-reason" name="customer_reason" placeholder="Ej. Chequeo general">
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
            startTimeSel.innerHTML = '<option value="">Completa especialista, especialidad, consultorio y fecha</option>';
            startTimeSel.disabled = true;
            endTimeSel.innerHTML = '<option value="">Primero elige inicio</option>';
            alert('Por favor selecciona especialista, especialidad, consultorio y fecha antes de buscar.');
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
                startTimeSel.innerHTML = '<option value="">Sin turnos (El horario del especialista puede estar cerrado o lleno)</option>';
                return;
            }

            const options = ['<option value="">-- Seleccionar hora --</option>'];
            const pad = (n: number) => String(n).padStart(2, '0');

            spans.forEach(span => {
                // El formato es ej: "2026-05-08T09:00:00-04:00"
                // Para ignorar la zona horaria del navegador local (-03:00) y ver el 09:00 real,
                // extraemos solo la parte inicial (ej. "2026-05-08T09:00:00") y le aplicamos 'Z' (UTC).
                const timeZoneOffset = span.starts_at.substring(19); // extrae p. ej "-04:00" o "Z"
                const startStrUtc = span.starts_at.substring(0, 19) + "Z";
                const endStrUtc = span.ends_at.substring(0, 19) + "Z";

                let current = new Date(startStrUtc);
                const end = new Date(endStrUtc);

                // Fraccionamos el span continuo en bloques de SLOT_DURATION_MIN usando UTC para no sufrir desvases
                while (current.getTime() + SLOT_DURATION_MIN * 60000 <= end.getTime()) {
                    const sh = pad(current.getUTCHours());
                    const sm = pad(current.getUTCMinutes());

                    const next = new Date(current.getTime() + SLOT_DURATION_MIN * 60000);
                    const eh = pad(next.getUTCHours());
                    const em = pad(next.getUTCMinutes());

                    options.push(`<option value="${sh}:${sm}" data-end="${eh}:${em}" data-offset="${timeZoneOffset}">${sh}:${sm}</option>`);

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

    // Al cambiar el recurso → recargar servicios
    resourceSelect.addEventListener('change', () => {
        loadServicesForResource(resourceSelect.value);
    });

    // Si cambian campos clave, invalidamos los turnos previos y exigimos buscar de nuevo
    [resourceSelect, serviceSelect, locationSelect, dateInput].forEach(el => {
        el.addEventListener('change', () => {
            startTimeSel.innerHTML = '<option value="">Presiona "Buscar turnos disponibles"</option>';
            startTimeSel.disabled = true;
            endTimeSel.innerHTML = '<option value="">Se calculará al elegir inicio</option>';
        });
    });

    // Botón de búsqueda manual de turnos
    const btnSearchSlots = container.querySelector('#btn-search-slots') as HTMLButtonElement;
    btnSearchSlots.addEventListener('click', updateAvailableSlots);

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
            startTimeSel.innerHTML = '<option value="">Presiona "Buscar turnos disponibles"</option>';
            startTimeSel.disabled = true;
            dateInput.value = todayStr();
        }, 0);
    });

    // ─── Carga de servicios Y consultorios según especialista seleccionado ─────────
    async function loadServicesForResource(resourceId: string) {
        serviceSelect.disabled = true;
        serviceSelect.innerHTML = '<option value="">Cargando especialidades...</option>';
        locationSelect.disabled = true;
        locationSelect.innerHTML = '<option value="">Cargando consultorios...</option>';
        // Resetear slots al cambiar recurso
        startTimeSel.innerHTML = '<option value="">Completa opciones para ver horas</option>';
        startTimeSel.disabled = true;
        endTimeSel.innerHTML = '<option value="">Se calculará al elegir inicio</option>';

        if (!resourceId) {
            serviceSelect.innerHTML = '<option value="">Primero selecciona un especialista</option>';
            locationSelect.innerHTML = '<option value="">Primero selecciona un especialista</option>';
            return;
        }

        try {
            const [svcResp, allSvcResp, schedulesResp] = await Promise.all([
                getResourceServices(resourceId),
                getServices(),
                getRecurringSchedules(resourceId),
            ]);

            // ─ Servicios: los vínculos solo traen IDs, cruzamos con el catálogo completo ─
            const serviceLinks  = svcResp.data as any[];
            const allServices   = allSvcResp.data as any[];
            const serviceMap    = new Map(allServices.map((s: any) => [s.id, s]));
            const services      = serviceLinks.map((link: any) => {
                const linkedId = link.service_id ?? link.id ?? link;
                return serviceMap.get(linkedId) ?? link;
            }).filter((s: any) => s?.id && s?.name);

            if (services.length) {
                serviceSelect.innerHTML = '<option value="">-- Seleccionar especialidad --</option>' +
                    services.map((s: any) => `<option value="${s.id}">${s.name}</option>`).join('');
                serviceSelect.disabled = false;
            } else {
                serviceSelect.innerHTML = '<option value="">Sin especialidades asignadas a este especialista</option>';
            }

            // ─ Consultorios: Hapio embebe el objeto `location` completo en cada schedule ─
            const locationMap = new Map<string, any>();
            schedulesResp.data.forEach((s: any) => {
                if (s.location?.id) locationMap.set(s.location.id, s.location);
            });
            const resourceLocations = Array.from(locationMap.values());

            if (resourceLocations.length) {
                locationSelect.innerHTML = '<option value="">-- Seleccionar consultorio --</option>' +
                    resourceLocations.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
                locationSelect.disabled = false;
            } else {
                locationSelect.innerHTML = '<option value="">Sin consultorios vinculados a este especialista</option>';
            }

        } catch (error: any) {
            serviceSelect.innerHTML = '<option value="">Error al cargar especialidades</option>';
            locationSelect.innerHTML = '<option value="">Error al cargar consultorios</option>';
            console.error('Error cargando datos del recurso:', error);
        }
    }

    // ─── Carga de selectores dinámicos ────────────────────────────────────────
    async function loadSelects() {
        try {
            const sessionStr = localStorage.getItem('hapio_portal_session');
            let isUser = false;
            let loggedResourceId = '';
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session.role === 'user' && session.resourceId) {
                    isUser = true;
                    loggedResourceId = session.resourceId;
                }
            }

            const resResp = await getResources();
            let resources = resResp.data;

            if (isUser) {
                resources = resources.filter(r => r.id === loggedResourceId);
            }

            if (resources.length) {
                if (isUser) {
                    resourceSelect.innerHTML = resources.map(r => `<option value="${r.id}" selected>${r.name}</option>`).join('');
                    resourceSelect.disabled = true;
                    loadServicesForResource(loggedResourceId);
                } else {
                    resourceSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un especialista --</option>' +
                        resources.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
                    
                    serviceSelect.innerHTML = '<option value="">Primero selecciona un especialista</option>';
                    serviceSelect.disabled = true;
                    locationSelect.innerHTML = '<option value="">Primero selecciona un especialista</option>';
                    locationSelect.disabled = true;
                }
            } else {
                resourceSelect.innerHTML = '<option value="">No hay especialistas disponibles</option>';
                locationSelect.innerHTML = '<option value="">No hay consultorios disponibles</option>';
            }

        } catch (error: any) {
            resourceSelect.innerHTML = '<option value="">Error al cargar</option>';
            serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
            locationSelect.innerHTML = '<option value="">Error al cargar</option>';
            messageEl.textContent = `Error al cargar los datos: ${error.message}`;
            messageEl.className = 'message error';
        }
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
        const customerPhone = (formData.get('customer_phone') as string).trim();
        const customerReason = (formData.get('customer_reason') as string).trim();

        // Extraer timezone offset original de la opción seleccionada (p. ej. "-04:00")
        const selectedOption = startTimeSel.options[startTimeSel.selectedIndex];
        const offset = selectedOption.dataset.offset;

        // Si tenemos offset original construmos la fecha usando ese offset para respetar la zona horaria del recurso
        let startsAtIso = '';
        let endsAtIso = '';
        if (offset) {
            startsAtIso = `${date}T${startTime}:00${offset}`;
            endsAtIso = `${date}T${endTime}:00${offset}`;
        } else {
            // Backup por si falla (usa hora local)
            startsAtIso = buildISO(date, startTime);
            endsAtIso = buildISO(date, endTime);
        }

        const bookingData: BookingData = {
            resource_id: formData.get('resource_id') as string,
            service_id: formData.get('service_id') as string,
            location_id: formData.get('location_id') as string,
            starts_at: startsAtIso,
            ends_at: endsAtIso,
            ignore_bookable_slots: true,
        };

        if (customerName || customerEmail || customerPhone || customerReason) {
            bookingData.customer = {};
            if (customerName) bookingData.customer.name = customerName;
            if (customerEmail) bookingData.customer.email = customerEmail;
            if (customerPhone) bookingData.customer.phone = customerPhone;
            if (customerReason) bookingData.customer.reason = customerReason;
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
