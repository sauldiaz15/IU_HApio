import { getResources, updateResource, deleteResource, Resource } from '../api/hapio';

export function renderResourceList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Gestión de Recursos</h2>
            <p>Listado completo de recursos y su estado de disponibilidad.</p>
        </div>
        <div id="resource-list-content">
            <div class="loading-spinner"></div>
        </div>
    `;

    const listContent = container.querySelector('#resource-list-content') as HTMLElement;

    async function loadResources() {
        try {
            const response = await getResources();
            const resources = response.data;

            if (resources.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align: center; color: #64748b; padding: 2rem;">
                            No hay recursos creados todavía.
                        </p>
                    </div>
                `;
                return;
            }

            renderTable(resources);
        } catch (error: any) {
            listContent.innerHTML = `
                <div class="status-message error" style="display: block;">
                    Error al cargar los recursos: ${error.message}
                </div>
            `;
        }
    }

    function renderTable(resources: Resource[]) {
        listContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 80px;">Estado</th>
                            <th>Nombre</th>
                            <th>Reservas Máx.</th>
                            <th>Creado</th>
                            <th class="text-center" style="width: 100px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr>
                                <td class="text-center">
                                    <label class="switch">
                                        <input type="checkbox" class="resource-toggle" 
                                            data-id="${resource.id}" 
                                            ${resource.enabled ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </td>
                                <td><strong>${resource.name}</strong></td>
                                <td>
                                    <span class="badge badge-info">
                                        ${resource.max_simultaneous_bookings || 'Sin límite'}
                                    </span>
                                </td>
                                <td>${new Date(resource.created_at).toLocaleDateString()}</td>
                                <td class="text-center">
                                    <button class="btn btn-danger btn-sm delete-resource" data-id="${resource.id}">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for toggles
        const toggles = listContent.querySelectorAll('.resource-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const checkbox = e.target as HTMLInputElement;
                const resourceId = checkbox.dataset.id!;
                const isEnabled = checkbox.checked;

                try {
                    checkbox.disabled = true;
                    await updateResource(resourceId, { enabled: isEnabled });
                } catch (error: any) {
                    alert(`Error al actualizar el recurso: ${error.message}`);
                    checkbox.checked = !isEnabled; // Rollback
                } finally {
                    checkbox.disabled = false;
                }
            });
        });

        // Add event listeners for delete buttons
        const deleteButtons = listContent.querySelectorAll('.delete-resource');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target as HTMLButtonElement;
                const resourceId = button.dataset.id!;

                if (confirm('¿Estás seguro de que deseas eliminar este recurso? Esta acción no se puede deshacer.')) {
                    try {
                        button.disabled = true;
                        button.textContent = '...';
                        await deleteResource(resourceId);
                        loadResources(); // Refresh the list
                    } catch (error: any) {
                        alert(`Error al eliminar el recurso: ${error.message}`);
                        button.disabled = false;
                        button.textContent = 'Eliminar';
                    }
                }
            });
        });
    }

    loadResources();
}
