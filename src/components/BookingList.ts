import { getBookings, cancelBooking, Booking } from '../api/hapio';

/** Navega a otra vista usando el evento global definido en main.ts */
function navigateTo(view: string): void {
    document.dispatchEvent(new CustomEvent('navigate-view', { detail: { view } }));
}

export function renderBookingList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Listado de Reservas</h2>
            <p>Consulta y gestiona todas las reservas. Haz click en <strong>Ver</strong> para ver el detalle o editar.</p>
        </div>

        <div class="card" style="margin-bottom: 1rem;">
            <div class="form-grid" style="align-items: flex-end; gap: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="filter-starts-from">Desde</label>
                    <input type="date" id="filter-starts-from">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="filter-starts-to">Hasta</label>
                    <input type="date" id="filter-starts-to">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="filter-status">Estado</label>
                    <select id="filter-status">
                        <option value="">Todos</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="temporary">Temporal</option>
                    </select>
                </div>
                <button id="btn-filter" class="btn btn-primary" style="height: fit-content;">Buscar</button>
                <button id="btn-clear-filter" class="btn btn-secondary" style="height: fit-content;">Limpiar</button>
            </div>
        </div>

        <div id="booking-list-content">
            <div class="card" style="text-align: center; color: #94a3b8; padding: 2.5rem; border: 1px dashed rgba(168, 85, 247, 0.4); background-color: rgba(168, 85, 247, 0.05);">
                <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #c084fc;">👋 Consulta de Reservaciones</p>
                <p style="font-size: 0.9rem; max-width: 480px; margin: 0 auto; color: #94a3b8;">Por favor, introduzca los parámetros de búsqueda (fecha o estado) y haga clic en <strong style="color: #c084fc;">Buscar</strong> para consultar la lista de reservaciones.</p>
            </div>
        </div>
    `;

    const listContent = container.querySelector('#booking-list-content') as HTMLElement;
    const filterFrom = container.querySelector('#filter-starts-from') as HTMLInputElement;
    const filterTo = container.querySelector('#filter-starts-to') as HTMLInputElement;
    const filterStatus = container.querySelector('#filter-status') as HTMLSelectElement;
    const btnFilter = container.querySelector('#btn-filter') as HTMLButtonElement;
    const btnClear = container.querySelector('#btn-clear-filter') as HTMLButtonElement;

    const statusLabels: Record<string, string> = {
        confirmed: 'Confirmada',
        cancelled: 'Cancelada',
        temporary: 'Temporal',
    };

    const statusBadgeClass: Record<string, string> = {
        confirmed: 'badge badge-success',
        cancelled: 'badge badge-danger',
        temporary: 'badge badge-warning',
    };

    function formatDateTime(iso: string): string {
        if (!iso) return '-';
        // Extraemos la fecha y hora directamente del string ISO para no sufrir
        // conversiones al huso horario local del navegador.
        // El formato de la API es: "2026-05-28T09:00:00-04:00" o "...Z"
        // Tomamos la parte fija: YYYY-MM-DDTHH:MM
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!match) return iso;
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year}, ${hour}:${minute}`;
    }

    async function loadBookings(params: Record<string, string> = {}) {
        listContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await getBookings(params);
            const bookings = response.data;

            if (bookings.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align: center; color: #64748b; padding: 2rem;">
                            No se encontraron reservas con los filtros aplicados.
                        </p>
                    </div>
                `;
                return;
            }

            renderTable(bookings);
        } catch (error: any) {
            listContent.innerHTML = `
                <div class="status-message error" style="display: block;">
                    Error al cargar las reservas: ${error.message}
                </div>
            `;
        }
    }

    function renderTable(bookings: Booking[]) {
        listContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th>Estado</th>
                            <th>Cliente</th>
                            <th>Motivo</th>
                            <th class="text-center" style="width: 200px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(b => {
            const status = (b as any).status || 'confirmed';
            const badgeClass = statusBadgeClass[status] || 'badge badge-info';
            const label = statusLabels[status] || status;
            const customerName = b.customer?.name || '-';
            const customerReason = (b.customer as any)?.reason || '-';
            const shortId = b.id.substring(0, 8) + '…';
            const isCancelled = status === 'cancelled';
            return `
                                <tr class="booking-row" data-id="${b.id}" style="cursor: pointer;" title="Click para ver detalle">
                                    <td>
                                        <span title="${b.id}" style="font-family: monospace; font-size: 0.8rem; cursor: help;">${shortId}</span>
                                    </td>
                                    <td>${formatDateTime(b.starts_at)}</td>
                                    <td>${formatDateTime(b.ends_at)}</td>
                                    <td><span class="${badgeClass}">${label}</span></td>
                                    <td>${customerName}</td>
                                    <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${customerReason}">${customerReason}</td>
                                    <td class="text-center" style="white-space: nowrap;">
                                        <button class="btn btn-secondary btn-sm view-booking" data-id="${b.id}" title="Ver detalle y editar">
                                            👁 Ver
                                        </button>
                                        ${!isCancelled ? `
                                        <button class="btn btn-danger btn-sm cancel-booking" data-id="${b.id}" title="Cancelar reserva" style="margin-left: 0.25rem;">
                                            ✕ Cancelar
                                        </button>` : '<span style="color:#64748b; font-size:0.8rem; margin-left:0.25rem;">—</span>'}
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
                <p style="text-align:right; color:#64748b; font-size:0.82rem; margin-top: 0.5rem;">
                    ${bookings.length} reserva${bookings.length !== 1 ? 's' : ''} encontrada${bookings.length !== 1 ? 's' : ''}
                </p>
            </div>
        `;

        // "Ver detalle" buttons
        listContent.querySelectorAll('.view-booking').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookingId = (e.currentTarget as HTMLButtonElement).dataset.id!;
                localStorage.setItem('edit_booking_id', bookingId);
                navigateTo('bookings-edit');
            });
        });

        // Row click → same as "Ver"
        listContent.querySelectorAll<HTMLTableRowElement>('.booking-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't trigger if a button inside the row was clicked
                if ((e.target as HTMLElement).closest('button')) return;
                const bookingId = row.dataset.id!;
                localStorage.setItem('edit_booking_id', bookingId);
                navigateTo('bookings-edit');
            });
        });

        // Cancel buttons
        listContent.querySelectorAll('.cancel-booking').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const button = e.currentTarget as HTMLButtonElement;
                const bookingId = button.dataset.id!;

                if (!confirm('¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer.')) return;

                try {
                    button.disabled = true;
                    button.textContent = '...';
                    await cancelBooking(bookingId);
                    // Reload with current filters
                    buildParamsAndLoad();
                } catch (error: any) {
                    alert(`Error al cancelar la reserva: ${error.message}`);
                    button.disabled = false;
                    button.textContent = '✕';
                }
            });
        });
    }

    function buildParamsAndLoad() {
        const params: Record<string, string> = {};
        if (filterFrom.value) params['starts_at[gte]'] = new Date(filterFrom.value).toISOString();
        if (filterTo.value) params['starts_at[lte]'] = new Date(filterTo.value + 'T23:59:59').toISOString();
        if (filterStatus.value) params['status'] = filterStatus.value;

        // Apply access control scoping
        const sessionStr = localStorage.getItem('hapio_portal_session');
        let isUser = false;
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session.role === 'user' && session.resourceId) {
                params['resource'] = session.resourceId;
                isUser = true;
            }
        }

        // For non-users, we require at least one user-specified filter.
        // For users (doctors), having their resource ID is enough to trigger a search.
        if (Object.keys(params).length === 0 || (!isUser && Object.keys(params).length === 0)) {
            listContent.innerHTML = `
                <div class="card" style="text-align: center; color: #94a3b8; padding: 2.5rem; border: 1px dashed rgba(239, 68, 68, 0.4); background-color: rgba(239, 68, 68, 0.05);">
                    <p style="color: #f87171; font-weight: 600; margin-bottom: 0.5rem;">⚠️ Parámetros de búsqueda requeridos</p>
                    <p style="font-size: 0.9rem; max-width: 480px; margin: 0 auto; color: #94a3b8;">Por favor, especifique al menos un filtro (fecha de inicio, fecha de fin o estado) antes de buscar.</p>
                </div>
            `;
            return;
        }

        loadBookings(params);
    }

    btnFilter.addEventListener('click', buildParamsAndLoad);
    btnClear.addEventListener('click', () => {
        filterFrom.value = '';
        filterTo.value = '';
        filterStatus.value = '';
        
        const sessionStr = localStorage.getItem('hapio_portal_session');
        const session = sessionStr ? JSON.parse(sessionStr) : null;
        if (session && session.role === 'user') {
            buildParamsAndLoad();
        } else {
            listContent.innerHTML = `
                <div class="card" style="text-align: center; color: #94a3b8; padding: 2.5rem; border: 1px dashed rgba(168, 85, 247, 0.4); background-color: rgba(168, 85, 247, 0.05);">
                    <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #c084fc;">👋 Consulta de Reservaciones</p>
                    <p style="font-size: 0.9rem; max-width: 480px; margin: 0 auto; color: #94a3b8;">Por favor, introduzca los parámetros de búsqueda (fecha o estado) y haga clic en <strong style="color: #c084fc;">Buscar</strong> para consultar la lista de reservaciones.</p>
                </div>
            `;
        }
    });

    // Auto-load bookings on initialization if logged in as a User
    const sessionStr = localStorage.getItem('hapio_portal_session');
    if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.role === 'user') {
            buildParamsAndLoad();
        }
    }
}
