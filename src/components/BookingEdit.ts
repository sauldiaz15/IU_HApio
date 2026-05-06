import { getBookings, updateBooking, getResources, getServices, getLocations, Booking, associateResourceService } from '../api/hapio';

export function renderBookingEdit(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Editar Reserva</h2>
            <p>Busca una reserva por su ID y modifica sus datos.</p>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
            <div class="form-group" style="margin-bottom: 0;">
                <label for="search-booking-id">ID de la Reserva</label>
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                    <input type="text" id="search-booking-id" placeholder="Ej. 3a1b2c4d-…" style="flex:1;">
                    <button id="btn-search-booking" class="btn btn-primary" style="white-space: nowrap;">Buscar</button>
                </div>
            </div>
            <div id="search-message" class="message hidden" style="margin-top:0.75rem;"></div>
        </div>

        <div id="booking-edit-form-wrapper" style="display:none;">
            <div class="card">
                <form id="booking-edit-form" class="form">
                    <div class="form-section">
                        <h3>Asignación</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-resource">Recurso</label>
                                <select id="edit-resource" name="resource_id" required>
                                    <option value="">Cargando...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-service">Servicio</label>
                                <select id="edit-service" name="service_id" required>
                                    <option value="">Cargando...</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-location">Localización</label>
                            <select id="edit-location" name="location_id" required>
                                <option value="">Cargando...</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Franja Horaria</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-starts-at">Inicio de la Reserva</label>
                                <input type="datetime-local" id="edit-starts-at" name="starts_at" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-ends-at">Fin de la Reserva</label>
                                <input type="datetime-local" id="edit-ends-at" name="ends_at" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Datos del Cliente (Opcional)</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-customer-name">Nombre del Cliente</label>
                                <input type="text" id="edit-customer-name" name="customer_name" placeholder="Ej. Juan Pérez">
                            </div>
                            <div class="form-group">
                                <label for="edit-customer-email">Email del Cliente</label>
                                <input type="email" id="edit-customer-email" name="customer_email" placeholder="Ej. juan@ejemplo.com">
                            </div>
                        </div>
                    </div>

                    <div id="edit-form-message" class="message hidden"></div>

                    <div class="form-actions">
                        <button type="submit" id="edit-submit-btn" class="btn btn-primary">Guardar Cambios</button>
                        <button type="button" id="btn-cancel-edit" class="btn btn-secondary">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="bookings-quick-list" style="margin-top: 1.5rem;">
            <div class="view-header" style="padding-bottom: 0.5rem;">
                <h3 style="color: var(--text-secondary); font-size: 1rem;">Reservas recientes</h3>
            </div>
            <div id="quick-list-content">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

    const searchInput = container.querySelector('#search-booking-id') as HTMLInputElement;
    const btnSearch = container.querySelector('#btn-search-booking') as HTMLButtonElement;
    const searchMessage = container.querySelector('#search-message') as HTMLElement;
    const formWrapper = container.querySelector('#booking-edit-form-wrapper') as HTMLElement;
    const editForm = container.querySelector('#booking-edit-form') as HTMLFormElement;
    const editResourceSel = editForm.querySelector('#edit-resource') as HTMLSelectElement;
    const editServiceSel = editForm.querySelector('#edit-service') as HTMLSelectElement;
    const editLocationSel = editForm.querySelector('#edit-location') as HTMLSelectElement;
    const editStartsAt = editForm.querySelector('#edit-starts-at') as HTMLInputElement;
    const editEndsAt = editForm.querySelector('#edit-ends-at') as HTMLInputElement;
    const editCustName = editForm.querySelector('#edit-customer-name') as HTMLInputElement;
    const editCustEmail = editForm.querySelector('#edit-customer-email') as HTMLInputElement;
    const editMessage = editForm.querySelector('#edit-form-message') as HTMLElement;
    const editSubmitBtn = editForm.querySelector('#edit-submit-btn') as HTMLButtonElement;
    const btnCancelEdit = editForm.querySelector('#btn-cancel-edit') as HTMLButtonElement;
    const quickListContent = container.querySelector('#quick-list-content') as HTMLElement;

    let currentBookingId = '';

    // Helper: ISO date string → local datetime-local input value
    const toLocalInput = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    async function loadSelectOptions(currentBooking?: Booking) {
        try {
            const [resResp, svcResp, locResp] = await Promise.all([
                getResources(), getServices(), getLocations()
            ]);

            editResourceSel.innerHTML = resResp.data.map(r =>
                `<option value="${r.id}" ${currentBooking?.resource_id === r.id ? 'selected' : ''}>${r.name}</option>`
            ).join('') || '<option value="">Sin recursos</option>';

            editServiceSel.innerHTML = svcResp.data.map(s =>
                `<option value="${s.id}" ${currentBooking?.service_id === s.id ? 'selected' : ''}>${s.name}</option>`
            ).join('') || '<option value="">Sin servicios</option>';

            editLocationSel.innerHTML = locResp.data.map(l =>
                `<option value="${l.id}" ${(currentBooking as any)?.location_id === l.id ? 'selected' : ''}>${l.name}</option>`
            ).join('') || '<option value="">Sin localizaciones</option>';
        } catch (err: any) {
            console.error('Error cargando selects:', err);
        }
    }

    function populateForm(booking: Booking) {
        currentBookingId = booking.id;
        editStartsAt.value = toLocalInput(booking.starts_at);
        editEndsAt.value = toLocalInput(booking.ends_at);
        editCustName.value = booking.customer?.name || '';
        editCustEmail.value = booking.customer?.email || '';
        editMessage.className = 'message hidden';
        formWrapper.style.display = 'block';
        formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function searchBooking(id: string) {
        if (!id.trim()) {
            searchMessage.textContent = 'Por favor ingresa un ID de reserva.';
            searchMessage.className = 'message error';
            return;
        }

        searchMessage.textContent = 'Buscando...';
        searchMessage.className = 'message hidden';
        btnSearch.disabled = true;

        try {
            const resp = await getBookings();
            const found = resp.data.find(b => b.id === id.trim());
            if (!found) {
                searchMessage.textContent = `No se encontró ninguna reserva con el ID: ${id}`;
                searchMessage.className = 'message error';
                formWrapper.style.display = 'none';
                return;
            }

            await loadSelectOptions(found);
            populateForm(found);
            searchMessage.className = 'message hidden';
        } catch (error: any) {
            searchMessage.textContent = `Error al buscar: ${error.message}`;
            searchMessage.className = 'message error';
        } finally {
            btnSearch.disabled = false;
        }
    }

    btnSearch.addEventListener('click', () => searchBooking(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchBooking(searchInput.value);
    });

    btnCancelEdit.addEventListener('click', () => {
        formWrapper.style.display = 'none';
        currentBookingId = '';
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentBookingId) return;

        // Format required by API: Y-m-d\TH:i:sP → e.g. 2026-05-05T20:00:00-03:00
        const toISO = (val: string): string => {
            if (!val) return '';
            const d = new Date(val);
            const pad = (n: number) => String(n).padStart(2, '0');
            const offsetMin = -d.getTimezoneOffset();
            const sign = offsetMin >= 0 ? '+' : '-';
            const absOffset = Math.abs(offsetMin);
            const tzOffset = `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tzOffset}`;
        };
        const customerName = editCustName.value.trim();
        const customerEmail = editCustEmail.value.trim();

        const patchData: any = {
            resource_id: editResourceSel.value,
            service_id: editServiceSel.value,
            location_id: editLocationSel.value,
            starts_at: toISO(editStartsAt.value),
            ends_at: toISO(editEndsAt.value),
            ignore_bookable_slots: true,
        };

        if (customerName || customerEmail) {
            patchData.customer = {};
            if (customerName) patchData.customer.name = customerName;
            if (customerEmail) patchData.customer.email = customerEmail;
        }

        try {
            editSubmitBtn.disabled = true;
            editSubmitBtn.textContent = 'Guardando...';
            editMessage.className = 'message hidden';

            // Automaticamente vinculamos el recurso con el servicio
            if (patchData.resource_id && patchData.service_id) {
                await associateResourceService(patchData.resource_id, patchData.service_id);
            }

            await updateBooking(currentBookingId, patchData);

            editMessage.innerHTML = '✅ <strong>Reserva actualizada correctamente.</strong>';
            editMessage.className = 'message success';
            loadQuickList();
        } catch (error: any) {
            editMessage.textContent = `Error: ${error.message}`;
            editMessage.className = 'message error';
        } finally {
            editSubmitBtn.disabled = false;
            editSubmitBtn.textContent = 'Guardar Cambios';
        }
    });

    // Quick list at the bottom
    async function loadQuickList() {
        quickListContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const resp = await getBookings();
            const bookings = resp.data.slice(0, 10); // show latest 10

            if (bookings.length === 0) {
                quickListContent.innerHTML = `<p style="color:#64748b; padding:1rem;">No hay reservas disponibles.</p>`;
                return;
            }

            const formatDateTime = (iso: string) => {
                const d = new Date(iso);
                return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            };

            quickListContent.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Inicio</th>
                                <th>Fin</th>
                                <th>Cliente</th>
                                <th class="text-center">Seleccionar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map(b => `
                                <tr>
                                    <td><span style="font-family:monospace;font-size:.8rem;" title="${b.id}">${b.id.substring(0, 8)}…</span></td>
                                    <td>${formatDateTime(b.starts_at)}</td>
                                    <td>${formatDateTime(b.ends_at)}</td>
                                    <td>${b.customer?.name || '-'}</td>
                                    <td class="text-center">
                                        <button class="btn btn-secondary btn-sm quick-select" data-id="${b.id}">
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            quickListContent.querySelectorAll('.quick-select').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
                    searchInput.value = id;
                    await searchBooking(id);
                });
            });
        } catch (error: any) {
            quickListContent.innerHTML = `<p style="color:#ef4444;">Error al cargar reservas: ${error.message}</p>`;
        }
    }

    loadQuickList();
    loadSelectOptions();
}
