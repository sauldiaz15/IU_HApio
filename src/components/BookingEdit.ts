import { getBookings, updateBooking, cancelBooking, getResources, getServices, getLocations, Booking, associateResourceService } from '../api/hapio';

/** Navega a otra vista usando el evento global definido en main.ts */
function navigateTo(view: string): void {
    document.dispatchEvent(new CustomEvent('navigate-view', { detail: { view } }));
}

/** Formatea ISO datetime a string localizado */
function formatDateTime(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/** Convierte ISO a valor de datetime-local input (YYYY-MM-DDTHH:MM) */
function toLocalInput(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convierte datetime-local input a ISO con offset local */
function toISOWithOffset(val: string): string {
    if (!val) return '';
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMin);
    const tzOffset = `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tzOffset}`;
}

export function renderBookingEdit(container: HTMLElement): void {
    container.innerHTML = `
        <!-- Breadcrumb -->
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; font-size: 0.875rem; color: var(--text-secondary);">
            <button id="btn-back-to-list" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 0.35rem;">
                ← Volver al Listado
            </button>
        </div>

        <!-- Loading / detail area -->
        <div id="booking-detail-area">
            <div class="card" style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);">
                <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                <p>Cargando detalle de la reserva…</p>
            </div>
        </div>
    `;

    const btnBack = container.querySelector('#btn-back-to-list') as HTMLButtonElement;
    const detailArea = container.querySelector('#booking-detail-area') as HTMLElement;

    btnBack.addEventListener('click', () => navigateTo('bookings-list'));

    // ─── Renderiza el detalle + formulario de edición para una reserva ────────
    function renderDetail(booking: Booking, resources: any[], services: any[], locations: any[]) {
        const status = (booking as any).status || 'confirmed';
        const isCancelled = status === 'cancelled';

        const statusLabel: Record<string, string> = {
            confirmed: 'Confirmada', cancelled: 'Cancelada', temporary: 'Temporal'
        };
        const statusColor: Record<string, string> = {
            confirmed: 'var(--success)', cancelled: 'var(--error)', temporary: 'var(--warning)'
        };
        const statusBg: Record<string, string> = {
            confirmed: 'rgba(34,197,94,0.12)', cancelled: 'rgba(239,68,68,0.12)', temporary: 'rgba(234,179,8,0.12)'
        };

        const resourceName = resources.find(r => r.id === booking.resource_id)?.name || booking.resource_id || '-';
        const serviceName = services.find(s => s.id === booking.service_id)?.name || booking.service_id || '-';
        const locationName = locations.find(l => l.id === (booking as any).location_id)?.name || (booking as any).location_id || '-';

        detailArea.innerHTML = `
            <!-- Header de la reserva -->
            <div class="card" style="margin-bottom: 1.5rem; border-left: 4px solid ${statusColor[status] || '#94a3b8'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                            <h2 style="margin: 0; font-size: 1.25rem;">Detalle de Reserva</h2>
                            <span style="
                                display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px;
                                background: ${statusBg[status] || '#f1f5f9'};
                                color: ${statusColor[status] || '#64748b'};
                                font-weight: 600; font-size: 0.8rem; letter-spacing: 0.03em;
                            ">${statusLabel[status] || status}</span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 0; font-family: monospace;">
                            ID: ${booking.id}
                        </p>
                    </div>
                    ${!isCancelled ? `
                    <button id="btn-cancel-booking" class="btn btn-danger btn-sm" data-id="${booking.id}">
                        Cancelar Reserva
                    </button>` : ''}
                </div>
            </div>

            <!-- Info summary -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="card" style="padding: 1.25rem;">
                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 0.5rem;">📅 Fecha y Hora</div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${formatDateTime(booking.starts_at)}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">→ ${formatDateTime(booking.ends_at)}</div>
                </div>
                <div class="card" style="padding: 1.25rem;">
                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 0.5rem;">🏥 Asignación</div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${resourceName}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">${serviceName}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">📍 ${locationName}</div>
                </div>
                <div class="card" style="padding: 1.25rem;">
                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 0.5rem;">👤 Paciente</div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${booking.customer?.name || '—'}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">${booking.customer?.email || ''}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">${(booking.customer as any)?.phone || ''}</div>
                    ${(booking.customer as any)?.reason ? `<div style="margin-top:0.4rem; font-size:0.82rem; color: var(--primary); font-style: italic;">Motivo: ${(booking.customer as any).reason}</div>` : ''}
                </div>
            </div>

            <!-- Formulario de edición -->
            ${!isCancelled ? `
            <div class="card">
                <h3 style="margin-top: 0; margin-bottom: 1.25rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    ✏️ Editar Información
                </h3>
                <form id="booking-edit-form" class="form">

                    <div class="form-section">
                        <h3>Asignación</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-resource">Recurso</label>
                                <select id="edit-resource" name="resource_id" required>
                                    ${resources.map(r => `<option value="${r.id}" ${booking.resource_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-service">Servicio</label>
                                <select id="edit-service" name="service_id" required>
                                    ${services.map(s => `<option value="${s.id}" ${booking.service_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-location">Localización</label>
                            <select id="edit-location" name="location_id" required>
                                ${locations.map(l => `<option value="${l.id}" ${(booking as any).location_id === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Franja Horaria</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-starts-at">Inicio</label>
                                <input type="datetime-local" id="edit-starts-at" name="starts_at" value="${toLocalInput(booking.starts_at)}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-ends-at">Fin</label>
                                <input type="datetime-local" id="edit-ends-at" name="ends_at" value="${toLocalInput(booking.ends_at)}" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Datos del Paciente</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-customer-name">Nombre Completo</label>
                                <input type="text" id="edit-customer-name" name="customer_name" value="${booking.customer?.name || ''}" placeholder="Ej. Juan Pérez">
                            </div>
                            <div class="form-group">
                                <label for="edit-customer-email">Email</label>
                                <input type="email" id="edit-customer-email" name="customer_email" value="${booking.customer?.email || ''}" placeholder="Ej. juan@ejemplo.com">
                            </div>
                            <div class="form-group">
                                <label for="edit-customer-phone">Teléfono</label>
                                <input type="tel" id="edit-customer-phone" name="customer_phone" value="${(booking.customer as any)?.phone || ''}" placeholder="Ej. +58 412 1234567">
                            </div>
                            <div class="form-group">
                                <label for="edit-customer-reason">Motivo de Consulta</label>
                                <input type="text" id="edit-customer-reason" name="customer_reason" value="${(booking.customer as any)?.reason || ''}" placeholder="Ej. Chequeo general">
                            </div>
                        </div>
                    </div>

                    <div id="edit-form-message" class="message hidden"></div>

                    <div class="form-actions">
                        <button type="submit" id="edit-submit-btn" class="btn btn-primary">Guardar Cambios</button>
                        <button type="button" id="btn-back-form" class="btn btn-secondary">← Volver al Listado</button>
                    </div>
                </form>
            </div>
            ` : `
            <div class="card" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p style="font-size: 1.1rem;">⛔ Esta reserva está cancelada y no puede editarse.</p>
                <button id="btn-back-cancelled" class="btn btn-secondary" style="margin-top: 1rem;">← Volver al Listado</button>
            </div>
            `}
        `;

        // Cancel booking button
        const btnCancel = detailArea.querySelector('#btn-cancel-booking');
        if (btnCancel) {
            btnCancel.addEventListener('click', async () => {
                if (!confirm('¿Seguro que deseas cancelar esta reserva? La acción no puede deshacerse.')) return;
                try {
                    (btnCancel as HTMLButtonElement).disabled = true;
                    (btnCancel as HTMLButtonElement).textContent = 'Cancelando...';
                    await cancelBooking(booking.id);
                    // Re-render to show cancelled state
                    await loadAndRender(booking.id);
                } catch (err: any) {
                    alert(`Error al cancelar: ${err.message}`);
                    (btnCancel as HTMLButtonElement).disabled = false;
                    (btnCancel as HTMLButtonElement).textContent = 'Cancelar Reserva';
                }
            });
        }

        // Back buttons
        detailArea.querySelector('#btn-back-form')?.addEventListener('click', () => navigateTo('bookings-list'));
        detailArea.querySelector('#btn-back-cancelled')?.addEventListener('click', () => navigateTo('bookings-list'));

        // Edit form submit
        const editForm = detailArea.querySelector('#booking-edit-form') as HTMLFormElement | null;
        if (editForm) {
            const editMessage = editForm.querySelector('#edit-form-message') as HTMLElement;
            const editSubmitBtn = editForm.querySelector('#edit-submit-btn') as HTMLButtonElement;

            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const fd = new FormData(editForm);
                const customerName = (fd.get('customer_name') as string).trim();
                const customerEmail = (fd.get('customer_email') as string).trim();
                const customerPhone = (fd.get('customer_phone') as string).trim();
                const customerReason = (fd.get('customer_reason') as string).trim();

                const patchData: any = {
                    resource_id: fd.get('resource_id') as string,
                    service_id: fd.get('service_id') as string,
                    location_id: fd.get('location_id') as string,
                    starts_at: toISOWithOffset(fd.get('starts_at') as string),
                    ends_at: toISOWithOffset(fd.get('ends_at') as string),
                    ignore_bookable_slots: true,
                };

                if (customerName || customerEmail || customerPhone || customerReason) {
                    patchData.customer = {};
                    if (customerName) patchData.customer.name = customerName;
                    if (customerEmail) patchData.customer.email = customerEmail;
                    if (customerPhone) patchData.customer.phone = customerPhone;
                    if (customerReason) patchData.customer.reason = customerReason;
                }

                try {
                    editSubmitBtn.disabled = true;
                    editSubmitBtn.textContent = 'Guardando...';
                    editMessage.className = 'message hidden';

                    if (patchData.resource_id && patchData.service_id) {
                        await associateResourceService(patchData.resource_id, patchData.service_id);
                    }

                    await updateBooking(booking.id, patchData);

                    editMessage.innerHTML = '✅ <strong>Reserva actualizada correctamente.</strong>';
                    editMessage.className = 'message success';

                    // Re-render detail with updated data
                    setTimeout(() => loadAndRender(booking.id), 800);
                } catch (error: any) {
                    editMessage.textContent = `Error: ${error.message}`;
                    editMessage.className = 'message error';
                } finally {
                    editSubmitBtn.disabled = false;
                    editSubmitBtn.textContent = 'Guardar Cambios';
                }
            });
        }
    }

    // ─── Carga la reserva por ID y renderiza el detalle ───────────────────────
    async function loadAndRender(bookingId: string) {
        detailArea.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);">
                <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                <p>Cargando reserva…</p>
            </div>
        `;

        try {
            const [bookingsResp, resResp, svcResp, locResp] = await Promise.all([
                getBookings(),
                getResources(),
                getServices(),
                getLocations(),
            ]);

            const booking = bookingsResp.data.find(b => b.id === bookingId);

            if (!booking) {
                detailArea.innerHTML = `
                    <div class="card" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <p style="font-size: 1.1rem;">⚠️ No se encontró la reserva con ID: <code>${bookingId}</code></p>
                        <button id="btn-not-found-back" class="btn btn-secondary" style="margin-top: 1rem;">← Volver al Listado</button>
                    </div>
                `;
                detailArea.querySelector('#btn-not-found-back')?.addEventListener('click', () => navigateTo('bookings-list'));
                return;
            }

            renderDetail(booking, resResp.data, svcResp.data, locResp.data);
        } catch (error: any) {
            detailArea.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem; color: var(--error);">
                    <p>Error al cargar la reserva: ${error.message}</p>
                    <button id="btn-error-back" class="btn btn-secondary" style="margin-top: 1rem;">← Volver al Listado</button>
                </div>
            `;
            detailArea.querySelector('#btn-error-back')?.addEventListener('click', () => navigateTo('bookings-list'));
        }
    }

    // ─── Entry point: leer ID desde localStorage (viene del BookingList) ──────
    const savedId = localStorage.getItem('edit_booking_id');
    if (savedId) {
        localStorage.removeItem('edit_booking_id');
        loadAndRender(savedId);
    } else {
        // No hay ID: mostrar pantalla de búsqueda manual
        detailArea.innerHTML = `
            <div class="card" style="max-width: 480px; margin: 2rem auto; text-align: center; padding: 2.5rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 1rem;">
                    Ingresa el ID de una reserva para ver su detalle, o vuelve al listado para seleccionarla.
                </p>
                <div style="display: flex; gap: 0.75rem; justify-content: center; margin-bottom: 1rem;">
                    <input type="text" id="manual-booking-id" placeholder="ID de la reserva…" style="flex: 1; max-width: 280px;">
                    <button id="btn-manual-search" class="btn btn-primary">Buscar</button>
                </div>
                <div id="manual-search-msg" class="message hidden"></div>
                <hr style="margin: 1.5rem 0; border-color: var(--border);">
                <button id="btn-go-to-list" class="btn btn-secondary">← Ir al Listado de Reservas</button>
            </div>
        `;

        const manualInput = detailArea.querySelector('#manual-booking-id') as HTMLInputElement;
        const btnManualSearch = detailArea.querySelector('#btn-manual-search') as HTMLButtonElement;
        const manualMsg = detailArea.querySelector('#manual-search-msg') as HTMLElement;

        const doManualSearch = () => {
            const id = manualInput.value.trim();
            if (!id) {
                manualMsg.textContent = 'Por favor ingresa un ID de reserva.';
                manualMsg.className = 'message error';
                return;
            }
            loadAndRender(id);
        };

        btnManualSearch.addEventListener('click', doManualSearch);
        manualInput.addEventListener('keydown', e => { if (e.key === 'Enter') doManualSearch(); });
        detailArea.querySelector('#btn-go-to-list')?.addEventListener('click', () => navigateTo('bookings-list'));
    }
}
