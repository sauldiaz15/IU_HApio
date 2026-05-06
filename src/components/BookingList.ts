import { getBookings, cancelBooking, Booking } from '../api/hapio';

export function renderBookingList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Listado de Reservas</h2>
            <p>Consulta y gestiona todas las reservas registradas en el proyecto.</p>
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
            <div class="loading-spinner"></div>
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
        const d = new Date(iso);
        return d.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
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
                            <th class="text-center" style="width: 110px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(b => {
            const status = (b as any).status || 'confirmed';
            const badgeClass = statusBadgeClass[status] || 'badge badge-info';
            const label = statusLabels[status] || status;
            const customerName = b.customer?.name || '-';
            const shortId = b.id.substring(0, 8) + '…';
            const isCancelled = status === 'cancelled';
            return `
                                <tr>
                                    <td>
                                        <span title="${b.id}" style="font-family: monospace; font-size: 0.8rem; cursor: help;">${shortId}</span>
                                    </td>
                                    <td>${formatDateTime(b.starts_at)}</td>
                                    <td>${formatDateTime(b.ends_at)}</td>
                                    <td><span class="${badgeClass}">${label}</span></td>
                                    <td>${customerName}</td>
                                    <td class="text-center">
                                        ${!isCancelled ? `
                                        <button class="btn btn-danger btn-sm cancel-booking" data-id="${b.id}">
                                            Cancelar
                                        </button>` : '<span style="color:#64748b; font-size:0.8rem;">—</span>'}
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

        // Cancel buttons
        listContent.querySelectorAll('.cancel-booking').forEach(btn => {
            btn.addEventListener('click', async (e) => {
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
                    button.textContent = 'Cancelar';
                }
            });
        });
    }

    function buildParamsAndLoad() {
        const params: Record<string, string> = {};
        if (filterFrom.value) params['starts_at[gte]'] = new Date(filterFrom.value).toISOString();
        if (filterTo.value) params['starts_at[lte]'] = new Date(filterTo.value + 'T23:59:59').toISOString();
        if (filterStatus.value) params['status'] = filterStatus.value;
        loadBookings(params);
    }

    btnFilter.addEventListener('click', buildParamsAndLoad);
    btnClear.addEventListener('click', () => {
        filterFrom.value = '';
        filterTo.value = '';
        filterStatus.value = '';
        loadBookings();
    });

    loadBookings();
}
