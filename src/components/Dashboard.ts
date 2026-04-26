import {
    getLocations,
    getResources,
    getServices,
    getBookings
} from '../api/hapio';

export function renderDashboard(container: HTMLElement): void {
    container.innerHTML = `
        <div class="dashboard-view">
            <div class="view-header">
                <h2>Panel de Control</h2>
                <p>Resumen general de tu cuenta de Hapio y métricas clave.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon locations">📍</div>
                    <div class="stat-info">
                        <span class="stat-label">Localizaciones</span>
                        <h3 id="stat-locations">...</h3>
                    </div>
                    <div class="stat-trend neutral">Activas</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon resources">👥</div>
                    <div class="stat-info">
                        <span class="stat-label">Recursos</span>
                        <h3 id="stat-resources">...</h3>
                    </div>
                    <div class="stat-trend neutral">Personal / Salas</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon services">🛠️</div>
                    <div class="stat-info">
                        <span class="stat-label">Servicios</span>
                        <h3 id="stat-services">...</h3>
                    </div>
                    <div class="stat-trend neutral">Catálogo</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bookings">📅</div>
                    <div class="stat-info">
                        <span class="stat-label">Reservas Totales</span>
                        <h3 id="stat-bookings">...</h3>
                    </div>
                    <div class="stat-trend positive">Últimos 30 días</div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="card dashboard-main">
                    <div class="card-header">
                        <h3>Reservas Recientes</h3>
                        <button class="btn btn-secondary btn-sm" id="btn-refresh-bookings">Actualizar</button>
                    </div>
                    <div id="recent-bookings-list" class="recent-list">
                        <div class="loading-spinner"></div>
                    </div>
                </div>

                <div class="card dashboard-side">
                    <div class="card-header">
                        <h3>Acciones Rápidas</h3>
                    </div>
                    <div class="quick-actions">
                        <button class="action-btn" data-view="resources-create">
                            <span class="action-icon">+</span>
                            Nuevo Recurso
                        </button>
                        <button class="action-btn" data-view="services-create">
                            <span class="action-icon">+</span>
                            Nuevo Servicio
                        </button>
                        <button class="action-btn" data-view="create">
                            <span class="action-icon">+</span>
                            Nueva Localización
                        </button>
                        <button class="action-btn" data-view="blocks-create-recurring">
                            <span class="action-icon">+</span>
                            Bloque Recurrente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const locationsEl = container.querySelector('#stat-locations') as HTMLElement;
    const resourcesEl = container.querySelector('#stat-resources') as HTMLElement;
    const servicesEl = container.querySelector('#stat-services') as HTMLElement;
    const bookingsEl = container.querySelector('#stat-bookings') as HTMLElement;
    const bookingsListEl = container.querySelector('#recent-bookings-list') as HTMLElement;
    const refreshBtn = container.querySelector('#btn-refresh-bookings') as HTMLElement;

    async function loadStats() {
        try {
            const [locs, ress, servs, books] = await Promise.all([
                getLocations(),
                getResources(),
                getServices(),
                getBookings()
            ]);

            locationsEl.textContent = locs.data.length.toString();
            resourcesEl.textContent = ress.data.length.toString();
            servicesEl.textContent = servs.data.length.toString();
            bookingsEl.textContent = books.data.length.toString();

            renderRecentBookings(books.data);
        } catch (error: any) {
            console.error('Error al cargar estadísticas:', error);
            const errMsg = `<span class="error">Error</span>`;
            locationsEl.innerHTML = errMsg;
            resourcesEl.innerHTML = errMsg;
            servicesEl.innerHTML = errMsg;
            bookingsEl.innerHTML = errMsg;
            bookingsListEl.innerHTML = `<div class="status-message error" style="display:block;">No se pudieron cargar los datos recientemente.</div>`;
        }
    }

    function renderRecentBookings(bookings: any[]) {
        if (bookings.length === 0) {
            bookingsListEl.innerHTML = `
                <div class="empty-state">
                    <p>No hay reservas registradas paulatinamente.</p>
                </div>
            `;
            return;
        }

        const sorted = [...bookings].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()).slice(0, 5);

        bookingsListEl.innerHTML = `
            <table class="simple-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(b => `
                        <tr>
                            <td>
                                <strong>${b.customer?.name || 'Cliente'}</strong>
                                <div class="text-muted" style="font-size:0.75rem;">${b.customer?.email || 'N/A'}</div>
                            </td>
                            <td>
                                <div>${new Date(b.starts_at).toLocaleDateString()}</div>
                                <div class="text-muted" style="font-size:0.8rem;">${new Date(b.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td>
                                <span class="badge ${b.status === 'confirmed' ? 'badge-success' : 'badge-info'}">${b.status}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Refresh button
    refreshBtn.addEventListener('click', () => {
        bookingsListEl.innerHTML = '<div class="loading-spinner"></div>';
        loadStats();
    });

    // Quick actions delegation to main app switchView
    container.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = (btn as HTMLElement).dataset.view;
            if (view) {
                // Trigger global click on sidebar to simulate navigation
                const navLink = document.querySelector(`.nav-link[data-view="${view}"]`);
                if (navLink) (navLink as HTMLElement).click();
            }
        });
    });

    loadStats();
}
