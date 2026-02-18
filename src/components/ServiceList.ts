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
     * Helper to map service types to Spanish labels
     */
    const serviceTypeLabels: Record<string, string> = {
        'fixed': 'Fijo',
        'flexible': 'Flexible',
        'day': 'Día completo'
    };

    /**
     * Helper to parse ISO 8601 duration to human readable format
     */
    function parseISOToHuman(val: string | number | null | undefined): string {
        if (val === null || val === undefined || val === '') return '-';

        if (typeof val === 'number') {
            return `${val} d${val !== 1 ? 'ías' : 'ía'}`;
        }

        const iso = val as string;
        let result = '';

        // Handle Days (P[n]D)
        const daysMatch = iso.match(/P(\d+)D/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1]);
            result += `${days} d${days !== 1 ? 'ías' : 'ía'} `;
        }

        // Handle Time (PT[n]H[n]M)
        if (iso.includes('T')) {
            const hoursMatch = iso.match(/(\d+)H/);
            const minutesMatch = iso.match(/(\d+)M/);
            const secondsMatch = iso.match(/(\d+)S/);

            if (hoursMatch) result += `${hoursMatch[1]}h `;
            if (minutesMatch) result += `${minutesMatch[1]}m `;
            if (secondsMatch && result === '') result += `${secondsMatch[1]}s`; // Only show seconds if nothing else
        }

        return result.trim() || iso;
    }

    async function loadServices() {
        try {
            // Show loading spinner when refreshing
            listContent.innerHTML = '<div class="loading-spinner"></div>';

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

            const typeLabel = serviceTypeLabels[service.type] || service.type;
            const priceDisplay = service.price ? `$${parseFloat(service.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';

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
                                    <td><span class="badge badge-info">${typeLabel}</span></td>
                                    <td>${durationInfo}</td>
                                    <td>${priceDisplay}</td>
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
                const checkbox = e.currentTarget as HTMLInputElement;
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
                const button = e.currentTarget as HTMLButtonElement;
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
