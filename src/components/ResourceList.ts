import {
    getResources,
    updateResource,
    deleteResource,
    getResourceServices,
    getServices,
    getRecurringSchedules,
    getScheduleBlocks,
    Resource,
} from '../api/hapio';

export function renderResourceList(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Gestión de Recursos</h2>
            <p>Selecciona un recurso para ver su estado de configuración detallado.</p>
        </div>
        <div id="resource-list-content">
            <div class="loading-spinner"></div>
        </div>

        <!-- Panel Maestro-Detalle: Estado del Recurso -->
        <div id="resource-status-card" class="card hidden" style="margin-top: 2rem;">
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.25rem;">
                <span style="font-size:1.4rem;">🔍</span>
                <h3 style="margin:0;" id="resource-status-title">Estado del Recurso</h3>
            </div>
            <div id="resource-status-loading" style="color: var(--text-secondary); font-size:0.9rem;">Analizando configuración...</div>
            <div id="resource-status-list" style="display:none;"></div>
        </div>
    `;

    const listContent    = container.querySelector('#resource-list-content') as HTMLElement;
    const statusCard     = container.querySelector('#resource-status-card') as HTMLElement;
    const statusLoading  = container.querySelector('#resource-status-loading') as HTMLElement;
    const statusListEl   = container.querySelector('#resource-status-list') as HTMLElement;
    const statusTitle    = container.querySelector('#resource-status-title') as HTMLElement;

    let selectedResourceId: string | null = null;

    // ─── Carga de lista ────────────────────────────────────────────────────────
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
                            <th style="width: 200px;">ID</th>
                            <th class="text-center" style="width: 80px;">Estado</th>
                            <th>Nombre</th>
                            <th>Reservas Máx.</th>
                            <th>Creado</th>
                            <th class="text-center" style="width: 100px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr class="resource-row" data-id="${resource.id}" data-name="${resource.name}"
                                style="cursor: pointer; transition: background 0.15s;">
                                <td>
                                    <code style="font-size: 0.72rem; background: rgba(16,185,129,0.12); color: #10b981; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${resource.id}</code>
                                </td>
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

        // ── Selección de fila (maestro → detalle) ──────────────────────────────
        const rows = listContent.querySelectorAll<HTMLTableRowElement>('.resource-row');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Ignorar si el clic fue en el toggle o en el botón de eliminar
                const target = e.target as HTMLElement;
                if (target.closest('.resource-toggle') || target.closest('.delete-resource')) return;

                const resourceId   = row.dataset.id!;
                const resourceName = row.dataset.name!;

                // Resaltar fila seleccionada
                rows.forEach(r => r.style.background = '');
                row.style.background = 'rgba(16,185,129,0.1)';

                if (selectedResourceId !== resourceId) {
                    selectedResourceId = resourceId;
                    loadResourceStatus(resourceId, resourceName);
                }
            });
        });

        // ── Toggles de estado ──────────────────────────────────────────────────
        const toggles = listContent.querySelectorAll('.resource-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const checkbox   = e.target as HTMLInputElement;
                const resourceId = checkbox.dataset.id!;
                const isEnabled  = checkbox.checked;

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

        // ── Botones de eliminar ────────────────────────────────────────────────
        const deleteButtons = listContent.querySelectorAll('.delete-resource');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button     = e.target as HTMLButtonElement;
                const resourceId = button.dataset.id!;

                if (confirm('¿Estás seguro de que deseas eliminar este recurso? Esta acción no se puede deshacer.')) {
                    try {
                        button.disabled    = true;
                        button.textContent = '...';
                        await deleteResource(resourceId);

                        // Si el recurso eliminado era el seleccionado, ocultar detalle
                        if (selectedResourceId === resourceId) {
                            selectedResourceId = null;
                            statusCard.classList.add('hidden');
                        }

                        loadResources();
                    } catch (error: any) {
                        alert(`Error al eliminar el recurso: ${error.message}`);
                        button.disabled    = false;
                        button.textContent = 'Eliminar';
                    }
                }
            });
        });
    }

    // ─── Panel de Detalle: Estado del Recurso ──────────────────────────────────
    async function loadResourceStatus(resourceId: string, resourceName: string) {
        statusTitle.textContent = `Estado del Recurso — ${resourceName}`;
        statusCard.classList.remove('hidden');
        statusLoading.style.display = 'block';
        statusListEl.style.display  = 'none';
        statusListEl.innerHTML      = '';

        // Scroll suave hacia el panel
        setTimeout(() => statusCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

        try {
            const [servicesResp, allServicesResp, schedulesResp, blocksResp] = await Promise.allSettled([
                getResourceServices(resourceId),
                getServices(),
                getRecurringSchedules(resourceId),
                getScheduleBlocks(resourceId),
            ]);

            // Los vínculos resource→service solo traen IDs; cruzamos con el catálogo completo
            const serviceLinks  = servicesResp.status     === 'fulfilled' ? (servicesResp.value?.data     ?? []) : [];
            const allServices   = allServicesResp.status  === 'fulfilled' ? (allServicesResp.value?.data  ?? []) : [];
            const schedules     = schedulesResp.status    === 'fulfilled' ? (schedulesResp.value?.data    ?? []) : [];
            const blocks        = blocksResp.status       === 'fulfilled' ? (blocksResp.value?.data       ?? []) : [];

            // Construir mapa id→Service del catálogo
            const serviceMap = new Map(allServices.map((s: any) => [s.id, s]));

            // Enriquecer cada vínculo con los datos completos del servicio
            const services = serviceLinks.map((link: any) => {
                const linkedId = link.service_id ?? link.id ?? link;
                return serviceMap.get(linkedId) ?? link;
            });

            // ── Helper: color variables by status ──────────────────────────────
            const color = (ok: boolean, optional?: boolean) =>
                ok ? '#22c55e' : optional ? '#10b981' : '#ef4444';
            const bg = (ok: boolean, optional?: boolean) =>
                ok ? 'rgba(34,197,94,0.08)' : optional ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.08)';
            const border = (ok: boolean, optional?: boolean) =>
                ok ? 'rgba(34,197,94,0.25)' : optional ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.25)';
            const badge = (ok: boolean, optional?: boolean) =>
                ok ? '✅' : optional ? '🔷' : '❌';

            // ── Item 1: Servicios (expandible) ─────────────────────────────────
            const svcOk     = services.length > 0;
            const svcDetail = svcOk
                ? `${services.length} servicio(s) asociado(s) — haz clic para expandir`
                : 'Sin servicios vinculados';

            const servicesCardsHtml = svcOk
                ? services.map((s: any) => `
                    <div style="
                        display:flex; align-items:flex-start; gap:0.7rem;
                        padding:0.7rem 0.85rem; border-radius:8px;
                        background:rgba(16,185,129,0.07);
                        border:1px solid rgba(16,185,129,0.18);
                    ">
                        <span style="font-size:1.1rem; line-height:1.4;">🧩</span>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.85rem; color:#6ee7b7; margin-bottom:0.15rem;">
                                ${s.name}
                            </div>
                            ${s.description ? `<div style="font-size:0.78rem; color:var(--text-secondary);">${s.description}</div>` : ''}
                            ${s.duration != null ? `<div style="font-size:0.75rem; color:#64748b; margin-top:0.2rem;">⏱ Duración: <strong>${s.duration} min</strong></div>` : ''}
                        </div>
                    </div>`).join('')
                : '';

            const svcItemHtml = `
                <div id="svc-accordion" style="
                    border-radius: 10px;
                    background: ${bg(svcOk)};
                    border: 1px solid ${border(svcOk)};
                    overflow: hidden;
                ">
                    <!-- Header clicable -->
                    <div id="svc-header" style="
                        display:flex; align-items:flex-start; gap:0.85rem;
                        padding:0.85rem 1rem;
                        cursor:${svcOk ? 'pointer' : 'default'};
                        user-select:none;
                    ">
                        <span style="font-size:1.25rem; line-height:1;">${badge(svcOk)}</span>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.875rem; color:${color(svcOk)}; margin-bottom:0.2rem;">
                                <span style="margin-right:0.4rem;">🧩</span>Servicios asociados
                                ${svcOk ? `<span style="margin-left:0.5rem; font-size:0.75rem; opacity:0.7;" id="svc-chevron">▼</span>` : ''}
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">${svcDetail}</div>
                        </div>
                    </div>
                    <!-- Panel expandible -->
                    <div id="svc-body" style="
                        display:none;
                        padding: 0 1rem 1rem 1rem;
                        display:none;
                    ">
                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            ${servicesCardsHtml}
                        </div>
                    </div>
                </div>`;

            // ── Items planos: Horarios + Bloques ───────────────────────────────
            const flatItems = [
                {
                    icon: '📅', label: 'Horarios recurrentes (Schedules)',
                    ok: schedules.length > 0, optional: false,
                    detail: schedules.length > 0
                        ? `${schedules.length} horario(s) configurado(s)`
                        : 'Sin horarios recurrentes',
                },
                {
                    icon: '📋', label: 'Bloques de horario puntuales',
                    ok: blocks.length > 0, optional: true,
                    detail: blocks.length > 0
                        ? `${blocks.length} bloque(s) puntual(es)`
                        : 'Sin bloques puntuales (opcional)',
                },
            ];

            const flatHtml = flatItems.map(item => `
                <div style="
                    display:flex; align-items:flex-start; gap:0.85rem;
                    padding:0.85rem 1rem; border-radius:10px;
                    background:${bg(item.ok, item.optional)};
                    border:1px solid ${border(item.ok, item.optional)};
                ">
                    <span style="font-size:1.25rem; line-height:1;">${badge(item.ok, item.optional)}</span>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.875rem; color:${color(item.ok, item.optional)}; margin-bottom:0.2rem;">
                            <span style="margin-right:0.4rem;">${item.icon}</span>${item.label}
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); word-break:break-word;">${item.detail}</div>
                    </div>
                </div>`).join('');

            // ── Item: Localizaciones (expandible) ──────────────────────────────
            // Hapio embebe el objeto `location` completo dentro de cada schedule.
            // Deduplicamos por id para no mostrar duplicados si hay varios schedules
            // apuntando a la misma localización.
            const locationMap = new Map<string, any>();
            schedules.forEach((s: any) => {
                if (s.location?.id) locationMap.set(s.location.id, s.location);
            });
            const resourceLocations = Array.from(locationMap.values());

            const locOk     = resourceLocations.length > 0;
            const locDetail = locOk
                ? `${resourceLocations.length} localización(es) vinculada(s) — haz clic para expandir`
                : 'Sin localizaciones asignadas (configura un horario recurrente primero)';

            const strategyLabel: Record<string, string> = {
                randomize:  'Aleatoria',
                prioritize: 'Por prioridad',
                equalize:   'Igualitaria',
            };

            const locationsCardsHtml = locOk
                ? resourceLocations.map((l: any) => `
                    <div style="
                        display:flex; align-items:flex-start; gap:0.7rem;
                        padding:0.7rem 0.85rem; border-radius:8px;
                        background:rgba(16,185,129,0.07);
                        border:1px solid rgba(16,185,129,0.18);
                    ">
                        <span style="font-size:1.1rem; line-height:1.4;">📍</span>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.85rem; color:#6ee7b7; margin-bottom:0.2rem;">
                                ${l.name}
                            </div>
                            <div style="font-size:0.78rem; color:var(--text-secondary);">
                                🌐 Zona horaria: <strong>${l.time_zone ?? '—'}</strong>
                            </div>
                            <div style="font-size:0.75rem; color:#64748b; margin-top:0.15rem;">
                                ⚖️ Selección de recurso: <strong>${strategyLabel[l.resource_selection_strategy] ?? l.resource_selection_strategy ?? '—'}</strong>
                            </div>
                        </div>
                    </div>`).join('')
                : '';

            const locItemHtml = `
                <div id="loc-accordion" style="
                    border-radius:10px;
                    background:${bg(locOk)};
                    border:1px solid ${border(locOk)};
                    overflow:hidden;
                ">
                    <div id="loc-header" style="
                        display:flex; align-items:flex-start; gap:0.85rem;
                        padding:0.85rem 1rem;
                        cursor:${locOk ? 'pointer' : 'default'};
                        user-select:none;
                    ">
                        <span style="font-size:1.25rem; line-height:1;">${badge(locOk)}</span>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.875rem; color:${color(locOk)}; margin-bottom:0.2rem;">
                                <span style="margin-right:0.4rem;">📍</span>Localizaciones disponibles
                                ${locOk ? `<span style="margin-left:0.5rem; font-size:0.75rem; opacity:0.7;" id="loc-chevron">▼</span>` : ''}
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">${locDetail}</div>
                        </div>
                    </div>
                    <div id="loc-body" style="display:none; padding:0 1rem 1rem 1rem;">
                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            ${locationsCardsHtml}
                        </div>
                    </div>
                </div>`;

            statusListEl.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:0.65rem;">
                    ${svcItemHtml}
                    ${flatHtml}
                    ${locItemHtml}
                </div>
            `;

            // ── Toggle acordeón de servicios ───────────────────────────────────
            if (svcOk) {
                const svcHeader  = statusListEl.querySelector('#svc-header')  as HTMLElement;
                const svcBody    = statusListEl.querySelector('#svc-body')    as HTMLElement;
                const svcChevron = statusListEl.querySelector('#svc-chevron') as HTMLElement;

                svcHeader.addEventListener('click', () => {
                    const expanded = svcBody.style.display === 'block';
                    svcBody.style.display  = expanded ? 'none' : 'block';
                    svcChevron.textContent = expanded ? '▼' : '▲';
                });
            }

            // ── Toggle acordeón de localizaciones ─────────────────────────────
            if (locOk) {
                const locHeader  = statusListEl.querySelector('#loc-header')  as HTMLElement;
                const locBody    = statusListEl.querySelector('#loc-body')    as HTMLElement;
                const locChevron = statusListEl.querySelector('#loc-chevron') as HTMLElement;

                locHeader.addEventListener('click', () => {
                    const expanded = locBody.style.display === 'block';
                    locBody.style.display  = expanded ? 'none' : 'block';
                    locChevron.textContent = expanded ? '▼' : '▲';
                });
            }

            statusLoading.style.display = 'none';
            statusListEl.style.display  = 'block';

        } catch (err: any) {
            statusLoading.textContent = `Error al analizar el recurso: ${err.message}`;
        }
    }

    loadResources();
}
