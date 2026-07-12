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
            <h2>Gestión de Especialistas</h2>
            <p>Administra la información, especialidades y horarios de los especialistas.</p>
        </div>

        <div class="resource-layout" style="display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; margin-top: 1.5rem;">
            <!-- Left Panel: Specialist Names List -->
            <div class="card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem; margin-bottom: 0.25rem;">
                    <h3 style="margin: 0; font-size: 1rem; color: #10b981;">Especialistas</h3>
                    <span id="resource-count" class="badge badge-info" style="font-size:0.75rem;">0</span>
                </div>
                <!-- Search filter -->
                <div>
                    <input type="text" id="resource-search" placeholder="🔍 Buscar especialista..." style="width: 100%; padding: 0.5rem 0.75rem; font-size: 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(15,23,42,0.3); color: white; box-sizing: border-box;">
                </div>
                <!-- Scrollable names list -->
                <div id="resource-names-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 550px; overflow-y: auto; padding-right: 2px;">
                    <div class="loading-spinner"></div>
                </div>
            </div>

            <!-- Right Panel: Profile Details, Edit & Delete -->
            <div id="resource-details-panel" class="card" style="min-height: 480px; display: flex; flex-direction: column;">
                <!-- Placeholder when no specialist is selected -->
                <div id="details-placeholder" style="text-align: center; color: var(--text-secondary); padding: 4rem 2rem; margin: auto;">
                    <span style="font-size: 3rem; display: block; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(16,185,129,0.2));">🩺</span>
                    <h4 style="margin: 0 0 0.5rem 0; color: white;">Ningún Especialista Seleccionado</h4>
                    <p style="font-size: 0.85rem; max-width: 340px; margin: 0 auto; line-height: 1.5;">
                        Selecciona un especialista de la lista de la izquierda para ver su perfil, especialidades asociadas, consultorios y horarios.
                    </p>
                </div>

                <!-- Content container (hidden by default) -->
                <div id="details-content" style="padding: 1.5rem; display: none; flex-direction: column; gap: 1.25rem;">
                    <!-- Detail Header -->
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1rem;">
                        <h3 id="detail-resource-name" style="margin: 0 0 0.25rem 0; font-size: 1.35rem; color: white;">Nombre</h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-secondary);">
                            <code id="detail-resource-id" style="background: rgba(16,185,129,0.12); color: #10b981; padding: 2px 6px; border-radius: 4px;">ID</code>
                            <span>•</span>
                            <span id="detail-resource-status-badge">Estado</span>
                        </div>
                    </div>

                    <!-- Inner Detail Sections -->
                    <div id="details-inner-container"></div>
                </div>
            </div>
        </div>
    `;

    const namesContainer = container.querySelector('#resource-names-list') as HTMLElement;
    const searchInput = container.querySelector('#resource-search') as HTMLInputElement;
    const resourceCount = container.querySelector('#resource-count') as HTMLElement;
    const detailsPlaceholder = container.querySelector('#details-placeholder') as HTMLElement;
    const detailsContent = container.querySelector('#details-content') as HTMLElement;
    const detailName = container.querySelector('#detail-resource-name') as HTMLElement;
    const detailId = container.querySelector('#detail-resource-id') as HTMLElement;
    const detailStatusBadge = container.querySelector('#detail-resource-status-badge') as HTMLElement;
    const detailsInner = container.querySelector('#details-inner-container') as HTMLElement;

    let selectedResourceId: string | null = null;
    let resourcesList: Resource[] = [];

    // ─── Load resources list ───────────────────────────────────────────────────
    async function loadResources() {
        try {
            namesContainer.innerHTML = '<div class="loading-spinner"></div>';
            const response = await getResources();
            resourcesList = response.data || [];
            
            resourceCount.textContent = resourcesList.length.toString();
            filterAndRenderList();
        } catch (error: any) {
            namesContainer.innerHTML = `
                <div class="status-message error" style="display: block; font-size: 0.85rem; padding: 1rem;">
                    Error al cargar especialistas: ${error.message}
                </div>
            `;
        }
    }

    // ─── Filter and render names list ──────────────────────────────────────────
    function filterAndRenderList() {
        const query = searchInput.value.toLowerCase().trim();
        const filtered = resourcesList.filter(r => r.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            namesContainer.innerHTML = `
                <p style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 1.5rem 0;">
                    No se encontraron especialistas.
                </p>
            `;
            return;
        }

        namesContainer.innerHTML = filtered.map(r => `
            <div class="resource-name-item" data-id="${r.id}" style="
                display: flex; align-items: center; justify-content: space-between;
                padding: 0.75rem 1rem; border-radius: 8px;
                background: ${selectedResourceId === r.id ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.01)'};
                border: 1px solid ${selectedResourceId === r.id ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.04)'};
                cursor: pointer; transition: all 0.2s ease;
            ">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.9rem; color: ${selectedResourceId === r.id ? '#10b981' : 'white'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${r.name}
                    </div>
                    ${r.metadata?.mpps || r.metadata?.document ? `
                        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 3px; display: flex; gap: 0.4rem; flex-wrap: wrap;">
                            ${r.metadata.mpps ? `<span>🩺 MPPS: ${r.metadata.mpps}</span>` : ''}
                            ${r.metadata.document ? `<span>🪪 ${r.metadata.document}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 0.5rem;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r.enabled ? '#10b981' : '#64748b'}; display: inline-block;"></span>
                </div>
            </div>
        `).join('');

        // Attach select handlers
        namesContainer.querySelectorAll('.resource-name-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id')!;
                if (selectedResourceId !== id) {
                    selectedResourceId = id;
                    filterAndRenderList(); // redraw highlights
                    const selected = resourcesList.find(r => r.id === id)!;
                    
                    // Show details
                    detailsPlaceholder.style.display = 'none';
                    detailsContent.style.display = 'flex';
                    loadResourceStatus(selected);
                }
            });
        });
    }

    // ─── Load selected specialist status details ───────────────────────────────
    async function loadResourceStatus(resource: Resource) {
        detailName.textContent = resource.name;
        detailId.textContent = resource.id;

        if (resource.enabled) {
            detailStatusBadge.innerHTML = '<span style="color: #10b981; font-weight:600;">● Habilitado</span>';
        } else {
            detailStatusBadge.innerHTML = '<span style="color: #94a3b8; font-weight:600;">● Deshabilitado</span>';
        }

        const doc = resource.metadata?.document || '—';
        const mpps = resource.metadata?.mpps || '—';
        const phone = resource.metadata?.phone || '—';
        const email = resource.metadata?.email || '—';
        const maxBookings = resource.max_simultaneous_bookings || 'Sin límite';

        const metadataHtml = `
            <div id="metadata-section-card" style="
                background: rgba(34, 197, 94, 0.08);
                padding: 1.25rem;
                border-radius: 10px;
                border: 1px solid rgba(34, 197, 94, 0.25);
                margin-bottom: 0.35rem;
            ">
                <h4 style="margin:0 0 0.75rem 0; font-size:0.9rem; color:#10b981; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.4rem;">Información del Especialista</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.15rem;">🪪 Documento de Identidad</div>
                        <div style="font-weight:600; font-size:0.875rem; color:white;">${doc}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.15rem;">🩺 Acreditación (MPPS)</div>
                        <div style="font-weight:600; font-size:0.875rem; color:white;">${mpps}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.15rem;">📞 Teléfono de Contacto</div>
                        <div style="font-weight:600; font-size:0.875rem; color:white;">${phone}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.15rem;">✉️ Correo Electrónico</div>
                        <div style="font-weight:600; font-size:0.875rem; color:white; word-break:break-all;">${email}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.15rem;">🔢 Reservas Simultáneas Máximas</div>
                        <div style="font-weight:600; font-size:0.875rem; color:white;">${maxBookings}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.15rem;">📅 Creado el</div>
                        <div style="font-weight:600; font-size:0.875rem; color:white;">${new Date(resource.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <!-- Actions Footer -->
                <div style="margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px dashed rgba(34, 197, 94, 0.15); display: flex; justify-content: flex-end; gap: 1rem; align-items: center;">
                    <button id="btn-edit-resource" style="background: none; border: none; color: #34d399; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0; font-weight: 600; transition: color 0.2s;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#34d399'">
                        ✏️ Editar Datos
                    </button>
                    <span style="color: rgba(34, 197, 94, 0.3); font-size: 0.8rem;">|</span>
                    <button id="btn-delete-resource" style="background: none; border: none; color: #f87171; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0; font-weight: 600; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#f87171'">
                        🗑️ Eliminar Especialista
                    </button>
                </div>
            </div>
        `;

        detailsInner.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.65rem;">
                ${metadataHtml}
                <div id="dependencies-section" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.65rem;">
                    <div id="dependencies-placeholder" style="text-align: center; padding: 1.5rem; background: rgba(30, 41, 59, 0.2); border: 1px dashed rgba(255, 255, 255, 0.05); border-radius: 10px;">
                        <button id="btn-load-dependencies" style="background: none; border: none; color: #10b981; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0.5rem 1rem; transition: color 0.2s;" onmouseover="this.style.color='#34d399'" onmouseout="this.style.color='#10b981'">
                            🔗 Ver dependencias (especialidades, consultorios y horarios)
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind actions immediately (since they only use the resource object)
        const editBtn = detailsInner.querySelector('#btn-edit-resource') as HTMLButtonElement;
        const deleteBtn = detailsInner.querySelector('#btn-delete-resource') as HTMLButtonElement;
        const btnLoadDeps = detailsInner.querySelector('#btn-load-dependencies') as HTMLButtonElement;
        const depsSection = detailsInner.querySelector('#dependencies-section') as HTMLElement;

        editBtn.addEventListener('click', () => {
            renderEditForm(resource);
        });

        deleteBtn.addEventListener('click', async () => {
            try {
                const proceed = window.confirm(`¿Estás seguro de que deseas eliminar al especialista "${resource.name}"? Esta acción no se puede deshacer y borrará toda su disponibilidad.`);
                if (!proceed) return;

                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Eliminando...';
                await deleteResource(resource.id);

                selectedResourceId = null;
                detailsPlaceholder.style.display = 'block';
                detailsContent.style.display = 'none';

                loadResources();
            } catch (error: any) {
                alert(`Error al eliminar especialista: ${error.message}`);
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️ Eliminar Especialista';
            }
        });

        btnLoadDeps.addEventListener('click', async () => {
            depsSection.innerHTML = '<div class="loading-spinner"></div>';
            const resourceId = resource.id;

            try {
                const [servicesResp, allServicesResp, schedulesResp, blocksResp] = await Promise.allSettled([
                    getResourceServices(resourceId),
                    getServices(),
                    getRecurringSchedules(resourceId),
                    getScheduleBlocks(resourceId),
                ]);

                const serviceLinks  = servicesResp.status     === 'fulfilled' ? (servicesResp.value?.data     ?? []) : [];
                const allServices   = allServicesResp.status  === 'fulfilled' ? (allServicesResp.value?.data  ?? []) : [];
                const schedules     = schedulesResp.status    === 'fulfilled' ? (schedulesResp.value?.data    ?? []) : [];
                const blocks        = blocksResp.status       === 'fulfilled' ? (blocksResp.value?.data       ?? []) : [];

                const serviceMap = new Map(allServices.map((s: any) => [s.id, s]));
                const services = serviceLinks.map((link: any) => {
                    const linkedId = link.service_id ?? link.id ?? link;
                    return serviceMap.get(linkedId) ?? link;
                });

                // Styling helpers
                const color = (ok: boolean, optional?: boolean) =>
                    ok ? '#22c55e' : optional ? '#10b981' : '#ef4444';
                const bg = (ok: boolean, optional?: boolean) =>
                    ok ? 'rgba(34,197,94,0.08)' : optional ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.08)';
                const border = (ok: boolean, optional?: boolean) =>
                    ok ? 'rgba(34,197,94,0.25)' : optional ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.25)';
                const badge = (ok: boolean, optional?: boolean) =>
                    ok ? '✅' : optional ? '🔷' : '❌';

                // ── Accordion 1: Especialidades asociadas ─────────────────────────
                const svcOk     = services.length > 0;
                const svcDetail = svcOk
                    ? `${services.length} especialidad(es) asociada(s) — haz clic para expandir`
                    : 'Sin especialidades vinculadas';

                const servicesCardsHtml = svcOk
                    ? services.map((s: any) => `
                        <div style="
                            display:flex; align-items:flex-start; gap:0.7rem;
                            padding:0.7rem 0.85rem; border-radius:8px;
                            background:rgba(16,185,129,0.05);
                            border:1px solid rgba(16,185,129,0.15);
                        ">
                            <span style="font-size:1.1rem; line-height:1;">🧩</span>
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
                        <div id="svc-header" style="
                            display:flex; align-items:flex-start; gap:0.85rem;
                            padding:0.85rem 1rem;
                            cursor:${svcOk ? 'pointer' : 'default'};
                            user-select:none;
                        ">
                            <span style="font-size:1.25rem; line-height:1;">${badge(svcOk)}</span>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:600; font-size:0.875rem; color:${color(svcOk)}; margin-bottom:0.2rem;">
                                    <span style="margin-right:0.4rem;">🧩</span>Especialidades asociadas
                                    ${svcOk ? `<span style="margin-left:0.5rem; font-size:0.75rem; opacity:0.7;" id="svc-chevron">▼</span>` : ''}
                                </div>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">${svcDetail}</div>
                            </div>
                        </div>
                        <div id="svc-body" style="display:none; padding: 0 1rem 1rem 1rem;">
                            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                                ${servicesCardsHtml}
                            </div>
                        </div>
                    </div>`;

                // ── Accordion 2: Horarios & Turnos Excepcionales ────────────────────
                const flatItems = [
                    {
                        icon: '📅', label: 'Horarios recurrentes (Schedules)',
                        ok: schedules.length > 0, optional: false,
                        detail: schedules.length > 0
                            ? `${schedules.length} horario(s) configurado(s)`
                            : 'Sin horarios recurrentes',
                    },
                    {
                        icon: '📋', label: 'Turnos excepcionales',
                        ok: blocks.length > 0, optional: true,
                        detail: blocks.length > 0
                            ? `${blocks.length} turno(s) excepcional(es)`
                            : 'Sin turnos excepcionales (opcional)',
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

                // ── Accordion 3: Localizaciones ───────────────────────────────────
                const locationMap = new Map<string, any>();
                schedules.forEach((s: any) => {
                    if (s.location?.id) locationMap.set(s.location.id, s.location);
                });
                const resourceLocations = Array.from(locationMap.values());

                const locOk     = resourceLocations.length > 0;
                const locDetail = locOk
                    ? `${resourceLocations.length} consultorio(s) vinculado(s) — haz clic para expandir`
                    : 'Sin consultorios asignados (configura un horario recurrente primero)';

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
                            background:rgba(16,185,129,0.05);
                            border:1px solid rgba(16,185,129,0.15);
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
                                    ⚖️ Selección de especialista: <strong>${strategyLabel[l.resource_selection_strategy] ?? l.resource_selection_strategy ?? '—'}</strong>
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
                                    <span style="margin-right:0.4rem;">📍</span>Consultorios disponibles
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

                depsSection.innerHTML = `
                    ${svcItemHtml}
                    ${flatHtml}
                    ${locItemHtml}
                `;

                // Bind accordion click toggle handlers dynamically
                if (svcOk) {
                    const svcHeader  = depsSection.querySelector('#svc-header')  as HTMLElement;
                    const svcBody    = depsSection.querySelector('#svc-body')    as HTMLElement;
                    const svcChevron = depsSection.querySelector('#svc-chevron') as HTMLElement;

                    svcHeader.addEventListener('click', () => {
                        const expanded = svcBody.style.display === 'block';
                        svcBody.style.display  = expanded ? 'none' : 'block';
                        svcChevron.textContent = expanded ? '▼' : '▲';
                    });
                }

                if (locOk) {
                    const locHeader  = depsSection.querySelector('#loc-header')  as HTMLElement;
                    const locBody    = depsSection.querySelector('#loc-body')    as HTMLElement;
                    const locChevron = depsSection.querySelector('#loc-chevron') as HTMLElement;

                    locHeader.addEventListener('click', () => {
                        const expanded = locBody.style.display === 'block';
                        locBody.style.display  = expanded ? 'none' : 'block';
                        locChevron.textContent = expanded ? '▼' : '▲';
                    });
                }

            } catch (err: any) {
                depsSection.innerHTML = `<div class="status-message error" style="display:block;">Error al cargar dependencias: ${err.message}</div>`;
            }
        });
    }

    // ─── Render Edit Mode ──────────────────────────────────────────────────────
    function renderEditForm(resource: Resource) {

        const doc = resource.metadata?.document || '';
        const mpps = resource.metadata?.mpps || '';
        const phone = resource.metadata?.phone || '';
        const email = resource.metadata?.email || '';

        detailsInner.innerHTML = `
            <form id="edit-resource-form" class="form" style="display: flex; flex-direction: column; gap: 1rem; background: rgba(15, 23, 42, 0.2); padding: 1.25rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #10b981;">Editar Datos del Especialista</h3>
                
                <div class="form-group">
                    <label for="edit-name">Nombre <span class="required-mark">*</span></label>
                    <input type="text" id="edit-name" value="${resource.name}" required style="width:100%; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:white;">
                </div>

                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                    <div class="form-group">
                        <label for="edit-max-bookings">Reservas Simultáneas Máximas</label>
                        <input type="number" id="edit-max-bookings" value="${resource.max_simultaneous_bookings || ''}" min="1" placeholder="Sin límite" style="width:100%; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:white;">
                    </div>
                    <div class="form-group" style="display:flex; align-items:center;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 1.2rem; cursor: pointer; user-select: none;">
                            <span style="font-size: 0.85rem; font-weight: 500; color: #94a3b8;">Habilitar especialista</span>
                            <label class="switch" style="transform: scale(0.8); transform-origin: left center;">
                                <input type="checkbox" id="edit-enabled" ${resource.enabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; margin-top:0.5rem;">
                    <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: var(--text-secondary);">Datos de Identificación y Contacto</h4>
                    <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                        <div class="form-group">
                            <label for="edit-doc">Documento de Identidad</label>
                            <input type="text" id="edit-doc" value="${doc}" style="width:100%; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:white;">
                        </div>
                        <div class="form-group">
                            <label for="edit-mpps">Registro MPPS</label>
                            <input type="text" id="edit-mpps" value="${mpps}" style="width:100%; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:white;">
                        </div>
                    </div>
                    <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-top: 0.5rem;">
                        <div class="form-group">
                            <label for="edit-phone">Teléfono</label>
                            <input type="tel" id="edit-phone" value="${phone}" style="width:100%; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:white;">
                        </div>
                        <div class="form-group">
                            <label for="edit-email">Correo Electrónico</label>
                            <input type="email" id="edit-email" value="${email}" style="width:100%; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:white;">
                        </div>
                    </div>
                </div>

                <div id="edit-error-msg" class="message error hidden" style="margin-top: 0.5rem;"></div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top:1rem;">
                    <button type="button" id="btn-cancel-edit" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" id="btn-save-edit" class="btn btn-primary">Guardar Cambios</button>
                </div>
            </form>
        `;

        const cancelBtn = detailsInner.querySelector('#btn-cancel-edit') as HTMLButtonElement;
        cancelBtn.addEventListener('click', () => {
            loadResourceStatus(resource);
        });

        const editForm = detailsInner.querySelector('#edit-resource-form') as HTMLFormElement;
        editForm.addEventListener('submit', async (formEvt) => {
            formEvt.preventDefault();
            const saveBtn = detailsInner.querySelector('#btn-save-edit') as HTMLButtonElement;
            const errorMsg = detailsInner.querySelector('#edit-error-msg') as HTMLElement;
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
            errorMsg.className = 'message error hidden';

            const nameVal = (detailsInner.querySelector('#edit-name') as HTMLInputElement).value.trim();
            const maxVal = (detailsInner.querySelector('#edit-max-bookings') as HTMLInputElement).value.trim();
            const enabledVal = (detailsInner.querySelector('#edit-enabled') as HTMLInputElement).checked;
            const docVal = (detailsInner.querySelector('#edit-doc') as HTMLInputElement).value.trim();
            const mppsVal = (detailsInner.querySelector('#edit-mpps') as HTMLInputElement).value.trim();
            const phoneVal = (detailsInner.querySelector('#edit-phone') as HTMLInputElement).value.trim();
            const emailVal = (detailsInner.querySelector('#edit-email') as HTMLInputElement).value.trim();

            try {
                const updatedResourceData = {
                    name: nameVal,
                    max_simultaneous_bookings: maxVal ? parseInt(maxVal) : null,
                    enabled: enabledVal,
                    metadata: {
                        ...(resource.metadata || {}),
                        document: docVal,
                        mpps: mppsVal,
                        phone: phoneVal,
                        email: emailVal,
                    }
                };

                const updated = await updateResource(resource.id, updatedResourceData);

                // Update in local cache
                resource.name = updated.name;
                resource.max_simultaneous_bookings = updated.max_simultaneous_bookings;
                resource.enabled = updated.enabled;
                resource.metadata = updated.metadata;

                // Re-render list to reflect changes in sidebar
                filterAndRenderList();

                // Re-render details in read mode
                loadResourceStatus(resource);
            } catch (err: any) {
                errorMsg.textContent = `Error al guardar cambios: ${err.message}`;
                errorMsg.classList.remove('hidden');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Cambios';
            }
        });
    }

    // Initialize list loading
    loadResources();
}
