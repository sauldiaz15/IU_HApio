import { getResources, getRecurringSchedules, deleteRecurringSchedule, RecurringSchedule, getResource, updateResource } from '../api/hapio';

export function renderScheduleList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Gestión de Horarios Recurrentes</h2>
            <p>Visualiza y administra los periodos de disponibilidad de tus especialistas.</p>
        </div>

        <div class="card" style="margin-bottom: 2rem;">
            <div class="form-group" style="margin-bottom: 0;">
                <label for="resource-filter">Filtrar por Especialista</label>
                <select id="resource-filter" name="resource-filter">
                    <option value="" disabled selected>Cargando especialistas...</option>
                </select>
            </div>
        </div>

        <div id="schedule-list-content">
            <div class="status-message info" style="display: block;">
                Selecciona un especialista para ver sus horarios.
            </div>
        </div>
    `;

    const resourceFilter = container.querySelector('#resource-filter') as HTMLSelectElement;
    const listContent = container.querySelector('#schedule-list-content') as HTMLElement;

    /**
     * Load initial resources for the filter
     */
    async function loadResources() {
        try {
            const response = await getResources();
            const resources = response.data;

            resourceFilter.innerHTML = '<option value="" disabled selected>Selecciona un especialista</option>';
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
     * Load schedules for the selected resource
     */
    async function loadSchedules(resourceId: string) {
        listContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const [response, resource] = await Promise.all([
                getRecurringSchedules(resourceId),
                getResource(resourceId)
            ]);
            const schedules = response.data;
            const scheduleNames = resource.metadata?.schedule_names || {};

            if (schedules.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align: center; color: #64748b; padding: 2rem;">
                            No hay horarios recurrentes creados para este especialista.
                        </p>
                    </div>
                `;
                return;
            }

            renderTable(schedules, resourceId, scheduleNames);
        } catch (error: any) {
            listContent.innerHTML = `<div class="status-message error" style="display: block;">Error al cargar horarios: ${error.message}</div>`;
        }
    }

    function renderTable(schedules: RecurringSchedule[], resourceId: string, scheduleNames: Record<string, string>) {
        listContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre / Etiqueta</th>
                            <th>Consultorio</th>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th class="text-center">Intervalo</th>
                            <th class="text-center" style="width: 100px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(sch => {
            const nameDisplay = scheduleNames[sch.id] || '<span style="color: var(--text-secondary); font-style: italic;">Sin etiqueta</span>';
            const locationName = (sch as any).location?.name || 'Desconocida';
            const endDateDisplay = sch.end_date || 'Indefinido';
            const intervalDisplay = sch.interval === 1 ? 'Cada semana' : `Cada ${sch.interval} semanas`;

            return `
                                <tr>
                                    <td><strong>${nameDisplay}</strong></td>
                                    <td>${locationName}</td>
                                    <td>${sch.start_date}</td>
                                    <td>${endDateDisplay}</td>
                                    <td class="text-center"><span class="badge badge-info">${intervalDisplay}</span></td>
                                    <td class="text-center">
                                        <button class="btn btn-danger btn-sm delete-schedule" data-id="${sch.id}">
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
        const deleteButtons = listContent.querySelectorAll('.delete-schedule');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget as HTMLButtonElement;
                const scheduleId = button.dataset.id!;

                if (confirm('¿Estás seguro de que deseas eliminar este horario?')) {
                    try {
                        button.disabled = true;
                        button.textContent = '...';
                        
                        // 1. Eliminar el horario recurrente de la API
                        await deleteRecurringSchedule(resourceId, scheduleId);

                        // 2. Limpiar el nombre de los metadatos del recurso
                        try {
                            const resource = await getResource(resourceId);
                            if (resource.metadata?.schedule_names) {
                                delete resource.metadata.schedule_names[scheduleId];
                                await updateResource(resourceId, { metadata: resource.metadata });
                            }
                        } catch (metaErr) {
                            console.error('Error al limpiar el nombre de los metadatos del recurso:', metaErr);
                        }

                        loadSchedules(resourceId);
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
            loadSchedules(resourceFilter.value);
        }
    });

    loadResources();
}
