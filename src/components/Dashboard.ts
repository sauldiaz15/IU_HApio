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


        </div>
    `;

    const locationsEl = container.querySelector('#stat-locations') as HTMLElement;
    const resourcesEl = container.querySelector('#stat-resources') as HTMLElement;
    const servicesEl = container.querySelector('#stat-services') as HTMLElement;
    const bookingsEl = container.querySelector('#stat-bookings') as HTMLElement;

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
        } catch (error: any) {
            console.error('Error al cargar estadísticas:', error);
            const errMsg = `<span class="error">Error</span>`;
            locationsEl.innerHTML = errMsg;
            resourcesEl.innerHTML = errMsg;
            servicesEl.innerHTML = errMsg;
            bookingsEl.innerHTML = errMsg;
        }
    }

    loadStats();
}
