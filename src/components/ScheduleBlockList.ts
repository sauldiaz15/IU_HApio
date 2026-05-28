import { getResources, getScheduleBlocks, deleteScheduleBlock, ScheduleBlock } from '../api/hapio';

export function renderScheduleBlockList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Gestión de Bloques de Horario</h2>
            <p>Visualiza y administra bloques de tiempo específicos (disponibilidad o bloqueos).</p>
        </div>

        <div class="card" style="margin-bottom: 2rem;">
            <div class="form-group" style="margin-bottom: 0;">
                <label for="resource-filter">Filtrar por Recurso</label>
                <select id="resource-filter" name="resource-filter">
                    <option value="" disabled selected>Cargando recursos...</option>
                </select>
            </div>
        </div>

        <div id="block-list-content">
            <div class="status-message info" style="display: block;">
                Selecciona un recurso para ver sus bloques de horario.
            </div>
        </div>
    `;

    const resourceFilter = container.querySelector('#resource-filter') as HTMLSelectElement;
    const listContent = container.querySelector('#block-list-content') as HTMLElement;

    /**
     * Load initial resources for the filter
     */
    async function loadResources() {
        try {
            const response = await getResources();
            const resources = response.data;

            resourceFilter.innerHTML = '<option value="" disabled selected>Selecciona un recurso</option>';
            resources.forEach(r => {
                const option = document.createElement('option');
                option.value = r.id;
                option.textContent = r.name;
                resourceFilter.appendChild(option);
            });
        } catch (error: any) {
            listContent.innerHTML = `<div class="status-message error" style="display: block;">Error: ${error.message}</div>`;
        }
    }

    /**
     * Load blocks for the selected resource
     */
    async function loadBlocks(resourceId: string) {
        listContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await getScheduleBlocks(resourceId);
            const blocks = response.data;

            if (blocks.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align: center; color: #64748b; padding: 2rem;">
                            No hay bloques de horario creados para este recurso.
                        </p>
                    </div>
                `;
                return;
            }

            renderTable(blocks, resourceId);
        } catch (error: any) {
            listContent.innerHTML = `<div class="status-message error" style="display: block;">Error al cargar bloques: ${error.message}</div>`;
        }
    }

    /** Extrae fecha y hora directamente del ISO string para no convertir al huso local del navegador */
    function formatISO(iso: string): string {
        if (!iso) return '-';
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!match) return iso;
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year}, ${hour}:${minute}`;
    }

    function renderTable(blocks: ScheduleBlock[], resourceId: string) {
        listContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Localización</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th class="text-center">Estado</th>
                            <th class="text-center" style="width: 100px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blocks.map(block => {
            const locationName = (block as any).location?.name || 'Desconocida';
            const startsAt = formatISO(block.starts_at);
            const endsAt = formatISO(block.ends_at);
            const statusBadge = block.is_available
                ? '<span class="badge badge-info">Disponible</span>'
                : '<span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.1); color: #f87171;">Bloqueado</span>';

            return `
                                <tr>
                                    <td><strong>${locationName}</strong></td>
                                    <td>${startsAt}</td>
                                    <td>${endsAt}</td>
                                    <td class="text-center">${statusBadge}</td>
                                    <td class="text-center">
                                        <button class="btn btn-danger btn-sm delete-block" data-id="${block.id}">
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

        // Delete handlers
        const deleteButtons = listContent.querySelectorAll('.delete-block');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget as HTMLButtonElement;
                const blockId = button.dataset.id!;

                if (confirm('¿Estás seguro de que deseas eliminar este bloque de horario?')) {
                    try {
                        button.disabled = true;
                        button.textContent = '...';
                        await deleteScheduleBlock(resourceId, blockId);
                        loadBlocks(resourceId);
                    } catch (error: any) {
                        alert(`Error: ${error.message}`);
                        button.disabled = false;
                        button.textContent = 'Eliminar';
                    }
                }
            });
        });
    }

    resourceFilter.addEventListener('change', () => {
        if (resourceFilter.value) {
            loadBlocks(resourceFilter.value);
        }
    });

    loadResources();
}
