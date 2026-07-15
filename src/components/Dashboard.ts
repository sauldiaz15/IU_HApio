import {
    getLocations,
    getResources,
    getServices,
    getBookings,
    getRecurringSchedules,
    getResourceServices
} from '../api/hapio';

export function renderDashboard(container: HTMLElement): void {
    const sessionStr = localStorage.getItem('hapio_portal_session');
    let isUser = false;
    let loggedResourceId = '';
    let loggedResourceName = '';
    if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.role === 'user' && session.resourceId) {
            isUser = true;
            loggedResourceId = session.resourceId;
            loggedResourceName = session.username || 'Usuario';
        }
    }

    container.innerHTML = `
        <div class="dashboard-view">
            <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
                <div>
                    <h2>Panel de Control</h2>
                    <p>${isUser ? `Resumen de actividades para el Dr./Dra. ${loggedResourceName}.` : 'Resumen general de tu cuenta de Hapio y métricas clave.'}</p>
                </div>
                <button id="btn-load-stats" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">📊 Cargar Estadísticas</button>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon locations">📍</div>
                    <div class="stat-info">
                        <span class="stat-label">${isUser ? 'Mis Consultorios' : 'Consultorios'}</span>
                        <h3 id="stat-locations">---</h3>
                    </div>
                    <div class="stat-trend neutral">Activos</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon resources">👥</div>
                    <div class="stat-info">
                        <span class="stat-label">${isUser ? 'Especialista' : 'Especialistas'}</span>
                        <h3 id="stat-resources" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">---</h3>
                    </div>
                    <div class="stat-trend neutral">${isUser ? 'Sesión Activa' : 'Activos'}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon services">🛠️</div>
                    <div class="stat-info">
                        <span class="stat-label">${isUser ? 'Mis Especialidades' : 'Especialidades'}</span>
                        <h3 id="stat-services">---</h3>
                    </div>
                    <div class="stat-trend neutral">${isUser ? 'Asignadas' : 'Catálogo'}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bookings">📅</div>
                    <div class="stat-info">
                        <span class="stat-label">${isUser ? 'Mis Reservas' : 'Reservas Totales'}</span>
                        <h3 id="stat-bookings">---</h3>
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
    const btnLoadStats = container.querySelector('#btn-load-stats') as HTMLButtonElement;

    async function loadStats() {
        btnLoadStats.disabled = true;
        btnLoadStats.textContent = '⏳ Cargando...';
        
        locationsEl.textContent = '...';
        resourcesEl.textContent = '...';
        servicesEl.textContent = '...';
        bookingsEl.textContent = '...';

        try {
            if (isUser) {
                const [schedulesResp, servicesResp, bookingsResp] = await Promise.all([
                    getRecurringSchedules(loggedResourceId),
                    getResourceServices(loggedResourceId),
                    getBookings({ resource: loggedResourceId, status: 'confirmed' }) // Get confirmed bookings
                ]);

                // Filter unique locations from schedules
                const locationMap = new Map<string, any>();
                schedulesResp.data.forEach((s: any) => {
                    if (s.location?.id) locationMap.set(s.location.id, s.location);
                });

                locationsEl.textContent = locationMap.size.toString();
                resourcesEl.textContent = loggedResourceName;
                resourcesEl.style.fontSize = '1.1rem';
                servicesEl.textContent = servicesResp.data.length.toString();
                bookingsEl.textContent = bookingsResp.data.length.toString();
            } else {
                const [locs, ress, servs, books] = await Promise.all([
                    getLocations(),
                    getResources(),
                    getServices(),
                    getBookings()
                ]);

                locationsEl.textContent = locs.data.length.toString();
                resourcesEl.textContent = ress.data.length.toString();
                resourcesEl.style.fontSize = ''; // Default style
                servicesEl.textContent = servs.data.length.toString();
                bookingsEl.textContent = books.data.length.toString();
            }
            
            btnLoadStats.textContent = '🔄 Actualizar Estadísticas';
        } catch (error: any) {
            console.error('Error al cargar estadísticas:', error);
            const errMsg = `<span class="error">Error</span>`;
            locationsEl.innerHTML = errMsg;
            resourcesEl.innerHTML = errMsg;
            servicesEl.innerHTML = errMsg;
            bookingsEl.innerHTML = errMsg;
            
            btnLoadStats.textContent = '⚠️ Reintentar Carga';
        } finally {
            btnLoadStats.disabled = false;
        }
    }

    btnLoadStats.addEventListener('click', loadStats);
    
    // Automatically load stats once
    loadStats();
}
