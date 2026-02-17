import { getServices, updateService, deleteService, Service } from '../api/hapio';

export function renderServiceList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Gestión de Servicios</h2>
            <p>Listado de todos los servicios disponibles en el proyecto.</p>
        </div>
        <div id="service-list-content">
            <div class="loading-spinner"></div>
        </div>
    `;

    const listContent = container.querySelector('#service-list-content') as HTMLElement;

    /**
     * Helper to parse ISO 8601 duration to human readable format
     */
    function parseISOToHuman(val: string | number | null | undefined): string {
        if (val === null || val === undefined || val === '') return '-';

        if (typeof val === 'number') {
            return `${val} d${val !== 1 ? 'ías' : 'ía'}`;
        }

        const iso = val as string;

        // Handle Days (P[n]D)
        const daysMatch = iso.match(/P(\d+)D/);
        if (daysMatch && !iso.includes('T')) {
            const days = parseInt(daysMatch[1]);
            return `${days} d${days !== 1 ? 'ías' : 'ía'}`;
        }

        // Handle Time (PT[n]H[n]M)
        let result = '';
        const hoursMatch = iso.match(/(\d+)H/);
        const minutesMatch = iso.match(/(\d+)M/);

        if (hoursMatch) result += `${hoursMatch[1]}h `;
        if (minutesMatch) result += `${minutesMatch[1]}m`;

        return result.trim() || iso;
    }

    async function loadServices() {
        try {
            const response = await getServices();
            const services = response.data;

            if (services.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align: center; color: #64748b; padding: 2rem;">
                            No hay servicios creados todavía.
                        </p>
                    </div>
                `;
                return;
            }

            renderTable(services);
        } catch (error: any) {
            listContent.innerHTML = `
                <div class="status-message error" style="display: block;">
                    Error al cargar los servicios: ${error.message}
                </div>
            `;
        }
    }

    function renderTable(services: Service[]) {
        listContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 80px;">Estado</th>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Duración / Días</th>
                            <th>Precio</th>
                            <th class="text-center" style="width: 100px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${services.map(service => {
            let durationInfo = '-';
            if (service.type === 'fixed') {
                durationInfo = parseISOToHuman(service.duration);
            } else if (service.type === 'flexible') {
                const min = parseISOToHuman(service.min_duration);
                const max = parseISOToHuman(service.max_duration);
                durationInfo = max !== '-' ? `${min} - ${max}` : `Desde ${min}`;
            } else if (service.type === 'day') {
                const min = parseISOToHuman(service.min_days);
                const max = parseISOToHuman(service.max_days);
                durationInfo = max !== '-' ? `${min} - ${max}` : `Desde ${min}`;
            }

            return `
                                <tr>
                                    <td class="text-center">
                                        <label class="switch">
                                            <input type="checkbox" class="service-toggle" 
                                                data-id="${service.id}" 
                                                ${service.enabled ? 'checked' : ''}>
                                            <span class="slider"></span>
                                        </label>
                                    </td>
                                    <td><strong>${service.name}</strong></td>
                                    <td><span class="badge badge-info">${service.type}</span></td>
                                    <td>${durationInfo}</td>
                                    <td>${service.price ? `$${service.price}` : '-'}</td>
                                    <td class="text-center">
                                        <button class="btn btn-danger btn-sm delete-service" data-id="${service.id}">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for toggles
        const toggles = listContent.querySelectorAll('.service-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const checkbox = e.target as HTMLInputElement;
                const serviceId = checkbox.dataset.id!;
                const isEnabled = checkbox.checked;

                try {
                    checkbox.disabled = true;
                    await updateService(serviceId, { enabled: isEnabled });
                } catch (error: any) {
                    alert(`Error al actualizar el servicio: ${error.message}`);
                    checkbox.checked = !isEnabled; // Rollback
                } finally {
                    checkbox.disabled = false;
                }
            });
        });

        // Add event listeners for delete buttons
        const deleteButtons = listContent.querySelectorAll('.delete-service');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = btn as HTMLButtonElement;
                const serviceId = button.dataset.id!;

                if (confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
                    try {
                        button.disabled = true;
                        button.textContent = '...';
                        await deleteService(serviceId);
                        loadServices(); // Refresh the list
                    } catch (error: any) {
                        alert(`Error al eliminar el servicio: ${error.message}`);
                        button.disabled = false;
                        button.textContent = 'Eliminar';
                    }
                }
            });
        });
    }

    loadServices();
}
