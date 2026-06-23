import {
    getServices,
    updateService,
    deleteService,
    getResources,
    getResourceServices,
    associateResourceService,
    removeResourceService,
    Service,
    Resource,
} from '../api/hapio';

export function renderServiceList(container: HTMLElement): void {
    container.innerHTML = `
        <style>
            .main-content {
                overflow: hidden !important;
            }
        </style>
        <div class="view-header" style="margin-bottom: 1rem;">
            <h2>Gestión de Servicios</h2>
            <p style="margin-bottom: 0;">Selecciona un servicio de la lista para ver sus detalles, configurar su estado y asociarlo con los recursos disponibles.</p>
        </div>

        <div class="services-split-layout" style="
            display: flex;
            gap: 1.5rem;
            height: calc(100vh - 180px);
            align-items: stretch;
        ">
            <!-- Left Side: Services List (Master) -->
            <div id="services-master" style="
                width: 360px;
                flex-shrink: 0;
                background: rgba(30, 41, 59, 0.25);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                border-radius: 16px;
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                overflow-y: auto;
            ">
                <div class="loading-spinner"></div>
            </div>

            <!-- Right Side: Service Details & Resource Associations (Detail) -->
            <div id="services-detail" style="
                flex: 1;
                background: var(--card-bg, #1e293b);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                border-radius: 16px;
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            ">
                <div class="empty-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--text-secondary, #94a3b8);
                    text-align: center;
                    gap: 1.25rem;
                ">
                    <span style="font-size: 3.5rem; opacity: 0.7;">👈</span>
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; color: white; font-size: 1.15rem;">Ningún servicio seleccionado</h3>
                        <p style="margin: 0; font-size: 0.85rem; max-width: 300px; line-height: 1.6;">
                            Selecciona un servicio en la barra de la izquierda para ver su información y asignar recursos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    const masterContainer = container.querySelector('#services-master') as HTMLElement;
    const detailContainer = container.querySelector('#services-detail') as HTMLElement;

    let servicesList: Service[] = [];
    let selectedServiceId: string | null = null;

    // Helpers
    const serviceTypeLabels: Record<string, string> = {
        'fixed': 'Fijo', 'flexible': 'Flexible', 'day': 'Día completo'
    };

    const typeColors: Record<string, string> = {
        fixed: 'rgba(99,102,241,0.15)', flexible: 'rgba(234,179,8,0.15)', day: 'rgba(34,197,94,0.15)',
    };
    const typeTextColors: Record<string, string> = {
        fixed: '#818cf8', flexible: '#eab308', day: '#22c55e',
    };

    function parseISOToHuman(val: string | number | null | undefined): string {
        if (val === null || val === undefined || val === '') return '-';
        if (typeof val === 'number') return `${val} d${val !== 1 ? 'ías' : 'ía'}`;
        const iso = val as string;
        let result = '';
        const daysMatch = iso.match(/P(\d+)D/);
        if (daysMatch) { const d = parseInt(daysMatch[1]); result += `${d} d${d !== 1 ? 'ías' : 'ía'} `; }
        if (iso.includes('T')) {
            const h = iso.match(/(\d+)H/);
            const m = iso.match(/(\d+)M/);
            const s = iso.match(/(\d+)S/);
            if (h) result += `${h[1]}h `;
            if (m) result += `${m[1]}m `;
            if (s && result === '') result += `${s[1]}s`;
        }
        return result.trim() || iso;
    }

    function getDurationText(service: Service): string {
        if (service.type === 'fixed') {
            return parseISOToHuman(service.duration);
        } else if (service.type === 'flexible') {
            const min = parseISOToHuman(service.min_duration);
            const max = parseISOToHuman(service.max_duration);
            return max !== '-' ? `${min} - ${max}` : `Desde ${min}`;
        } else if (service.type === 'day') {
            const min = parseISOToHuman(service.min_days);
            const max = parseISOToHuman(service.max_days);
            return max !== '-' ? `${min} - ${max}` : `Desde ${min}`;
        }
        return '-';
    }

    // Main loader
    async function loadServices(autoSelectFirst = true) {
        masterContainer.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await getServices();
            servicesList = response.data || [];
            
            if (servicesList.length === 0) {
                masterContainer.innerHTML = `
                    <p style="text-align:center; color:var(--text-secondary); padding:2rem; font-size:0.9rem; margin:0;">
                        No hay servicios creados.
                    </p>
                `;
                renderEmptyState();
                return;
            }

            renderMasterList();

            // Auto-select
            if (autoSelectFirst && servicesList.length > 0) {
                // If we had a selected service, try to keep it, otherwise select first
                const exists = servicesList.some(s => s.id === selectedServiceId);
                const nextId = exists ? selectedServiceId : servicesList[0].id;
                selectService(nextId!);
            } else if (selectedServiceId) {
                const exists = servicesList.some(s => s.id === selectedServiceId);
                if (exists) {
                    selectService(selectedServiceId);
                } else {
                    renderEmptyState();
                }
            }
        } catch (error: any) {
            masterContainer.innerHTML = `
                <div class="status-message error" style="display:block; margin:0; font-size:0.85rem;">
                    Error: ${error.message}
                </div>
            `;
        }
    }

    // Render left panel
    function renderMasterList() {
        masterContainer.innerHTML = servicesList.map(service => {
            const typeLabel = serviceTypeLabels[service.type] || service.type;
            const durationText = getDurationText(service);
            const isSelected = service.id === selectedServiceId;
            
            return `
                <div class="service-item-row" data-id="${service.id}" style="
                    background: ${isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 41, 59, 0.4)'};
                    border: 1px solid ${isSelected ? 'rgba(99, 102, 241, 0.5)' : 'var(--border-color, rgba(255, 255, 255, 0.08))'};
                    border-left: 3px solid ${isSelected ? '#818cf8' : 'transparent'};
                    border-radius: 12px;
                    padding: 0.85rem 1rem;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    transition: all 0.2s ease;
                    opacity: ${service.enabled ? '1' : '0.6'};
                " onmouseover="if(this.dataset.selected !== 'true') this.style.borderColor='rgba(99, 102, 241, 0.35)'"
                   onmouseout="if(this.dataset.selected !== 'true') this.style.borderColor='var(--border-color, rgba(255,255,255,0.08))'">
                    
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
                        <span style="font-weight: 600; font-size: 0.95rem; color: white; word-break: break-word;">
                            ${service.name}
                        </span>
                        <span style="
                            font-size: 0.65rem;
                            font-weight: 600;
                            padding: 0.15rem 0.45rem;
                            border-radius: 20px;
                            background: ${typeColors[service.type] || 'rgba(99,102,241,0.15)'};
                            color: ${typeTextColors[service.type] || '#818cf8'};
                            flex-shrink: 0;
                        ">${typeLabel}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">
                        <span style="display: flex; align-items: center; gap: 0.3rem;">
                            <span>⏱</span> ${durationText}
                        </span>
                        ${service.price ? `
                        <span style="display: flex; align-items: center; gap: 0.2rem;">
                            <span>$</span>${parseFloat(service.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Apply selected marker datasets
        masterContainer.querySelectorAll<HTMLElement>('.service-item-row').forEach(row => {
            const id = row.dataset.id!;
            if (id === selectedServiceId) {
                row.dataset.selected = 'true';
            }
            row.addEventListener('click', () => {
                selectService(id);
            });
        });
    }

    function renderEmptyState() {
        selectedServiceId = null;
        detailContainer.innerHTML = `
            <div class="empty-state" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--text-secondary, #94a3b8);
                text-align: center;
                gap: 1.25rem;
            ">
                <span style="font-size: 3.5rem; opacity: 0.7;">👈</span>
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; color: white; font-size: 1.15rem;">Ningún servicio seleccionado</h3>
                    <p style="margin: 0; font-size: 0.85rem; max-width: 300px; line-height: 1.6;">
                        Selecciona un servicio en la barra de la izquierda para ver su información y asignar recursos.
                    </p>
                </div>
            </div>
        `;
    }

    // Select a service and load detail pane
    function selectService(id: string) {
        selectedServiceId = id;
        
        // Update active class in DOM immediately for snappy feel
        masterContainer.querySelectorAll<HTMLElement>('.service-item-row').forEach(row => {
            const isCurrent = row.dataset.id === id;
            row.dataset.selected = isCurrent ? 'true' : 'false';
            row.style.background = isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 41, 59, 0.4)';
            row.style.borderColor = isCurrent ? 'rgba(99, 102, 241, 0.5)' : 'var(--border-color, rgba(255, 255, 255, 0.08))';
            row.style.borderLeftColor = isCurrent ? '#818cf8' : 'transparent';
        });

        const service = servicesList.find(s => s.id === id);
        if (!service) {
            renderEmptyState();
            return;
        }

        renderDetailPane(service);
    }

    // Render right detail view
    function renderDetailPane(service: Service) {
        const typeLabel = serviceTypeLabels[service.type] || service.type;
        const durationText = getDurationText(service);
        const priceDisplay = service.price
            ? `$${parseFloat(service.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : null;

        detailContainer.innerHTML = `
            <!-- Header Block -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1rem;
                border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                padding-bottom: 1.25rem;
            ">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.4rem;">
                        <h3 style="margin: 0; font-size: 1.4rem; font-weight: 700; color: white; word-break: break-word;">
                            ${service.name}
                        </h3>
                        <span style="
                            font-size: 0.72rem;
                            font-weight: 600;
                            padding: 0.15rem 0.55rem;
                            border-radius: 20px;
                            background: ${typeColors[service.type] || 'rgba(99,102,241,0.15)'};
                            color: ${typeTextColors[service.type] || '#818cf8'};
                        ">${typeLabel}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">
                        ID: <code style="font-family: monospace; font-size: 0.78rem; background: rgba(255,255,255,0.05); padding: 0.1rem 0.3rem; border-radius: 4px;">${service.id}</code>
                    </p>
                </div>
                
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
                    <span id="detail-enabled-label" style="
                        font-size: 0.8rem;
                        font-weight: 600;
                        color: ${service.enabled ? '#22c55e' : 'var(--text-secondary)'};
                    ">${service.enabled ? 'Habilitado' : 'Deshabilitado'}</span>
                    <label class="switch" style="margin: 0;">
                        <input type="checkbox" id="detail-service-toggle" ${service.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <!-- Details Attributes Row -->
            <div style="
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                background: rgba(15, 23, 42, 0.2);
                padding: 0.75rem 1rem;
                border-radius: 10px;
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                font-size: 0.8rem;
            ">
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--text-secondary);">⏱ Duración:</span>
                    <strong style="color: white;">${durationText}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--text-secondary);">💲 Precio:</span>
                    <strong style="color: white;">${priceDisplay || 'Sin costo'}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--text-secondary);">⚙ Tipo:</span>
                    <strong style="color: white;">${typeLabel}</strong>
                </div>
                ${service.bookable_interval ? `
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--text-secondary);">🔄 Intervalo:</span>
                    <strong style="color: white;">${parseISOToHuman(service.bookable_interval)}</strong>
                </div>` : ''}
                ${service.buffer_time_before ? `
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--text-secondary);">⏳ Buffer Ant:</span>
                    <strong style="color: white;">${parseISOToHuman(service.buffer_time_before)}</strong>
                </div>` : ''}
                ${service.buffer_time_after ? `
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--text-secondary);">⏳ Buffer Post:</span>
                    <strong style="color: white;">${parseISOToHuman(service.buffer_time_after)}</strong>
                </div>` : ''}
            </div>

            <!-- Resource Associations Section -->
            <div style="
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                flex: 1;
                min-height: 0;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: white; display: flex; align-items: center; gap: 0.5rem;">
                        <span>👥</span> Recursos del Servicio
                    </h4>
                    <span id="detail-resources-count" style="
                        font-size: 0.7rem;
                        color: var(--text-secondary);
                        font-weight: 600;
                        background: rgba(255, 255, 255, 0.05);
                        padding: 0.2rem 0.6rem;
                        border-radius: 20px;
                    ">Cargando...</span>
                </div>

                <!-- Live Search Box -->
                <div style="position: relative;">
                    <input type="text" id="resource-search" placeholder="Buscar recurso por nombre..." style="
                        padding: 0.6rem 1rem 0.6rem 2.2rem;
                        background: rgba(15, 23, 42, 0.35);
                        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                        border-radius: 10px;
                        color: white;
                        font-size: 0.82rem;
                        width: 100%;
                        box-sizing: border-box;
                    ">
                    <span style="
                        position: absolute;
                        left: 0.8rem;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 0.85rem;
                        color: var(--text-secondary);
                    ">🔍</span>
                </div>

                <!-- Resources List Container -->
                <div id="detail-resource-list" style="
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding-right: 0.25rem;
                    scrollbar-width: thin;
                ">
                    <div class="loading-spinner" style="margin: 2rem auto;"></div>
                </div>
            </div>

            <!-- Footer Block: Delete Button -->
            <div style="
                border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                padding-top: 1.25rem;
                display: flex;
                justify-content: flex-end;
            ">
                <button id="detail-delete-btn" class="btn btn-danger btn-sm" style="
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.55rem 1.25rem;
                    font-weight: 600;
                    font-size: 0.82rem;
                ">
                    🗑️ Eliminar Servicio
                </button>
            </div>
        `;

        // Event listener: Service Habilitar/Deshabilitar toggle
        const serviceToggle = detailContainer.querySelector('#detail-service-toggle') as HTMLInputElement;
        const enabledLabel = detailContainer.querySelector('#detail-enabled-label') as HTMLElement;
        serviceToggle.addEventListener('change', async () => {
            const isEnabled = serviceToggle.checked;
            serviceToggle.disabled = true;
            try {
                await updateService(service.id, { enabled: isEnabled });
                // Update local model
                service.enabled = isEnabled;
                if (enabledLabel) {
                    enabledLabel.textContent = isEnabled ? 'Habilitado' : 'Deshabilitado';
                    enabledLabel.style.color = isEnabled ? '#22c55e' : 'var(--text-secondary)';
                }
                // Refresh only the left list to sync status styling
                renderMasterList();
            } catch (err: any) {
                alert(`Error al actualizar el servicio: ${err.message}`);
                serviceToggle.checked = !isEnabled;
            } finally {
                serviceToggle.disabled = false;
            }
        });

        // Event listener: Delete button
        const deleteBtn = detailContainer.querySelector('#detail-delete-btn') as HTMLButtonElement;
        deleteBtn.addEventListener('click', async () => {
            if (confirm(`¿Estás seguro de que deseas eliminar el servicio "${service.name}"?`)) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Eliminando...';
                try {
                    await deleteService(service.id);
                    // Clear select and reload
                    selectedServiceId = null;
                    await loadServices(true);
                } catch (err: any) {
                    alert(`Error al eliminar el servicio: ${err.message}`);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = '🗑️ Eliminar Servicio';
                }
            }
        });

        // Load & check resource associations
        loadResourceAssociations(service.id, service.name);
    }

    // Load resources and check which are linked
    async function loadResourceAssociations(serviceId: string, serviceName: string) {
        const resListContainer = detailContainer.querySelector('#detail-resource-list') as HTMLElement;
        const resCountLabel = detailContainer.querySelector('#detail-resources-count') as HTMLElement;
        
        try {
            const allResResp = await getResources();
            const allResources = allResResp.data ?? [];

            if (allResources.length === 0) {
                resListContainer.innerHTML = `
                    <p style="text-align:center; color:var(--text-secondary); padding:1.5rem; font-size:0.85rem; margin:0;">
                        No hay recursos creados.
                    </p>
                `;
                if (resCountLabel) resCountLabel.textContent = '0 asignados';
                return;
            }

            // Fan-out check
            const linkedChecks = await Promise.allSettled(
                allResources.map(r => getResourceServices(r.id))
            );

            const linkedResourceIds = new Set<string>();
            linkedChecks.forEach((result, i) => {
                if (result.status === 'fulfilled') {
                    const svcs = result.value?.data ?? [];
                    const isLinked = svcs.some((s: any) => {
                        const sid = s.id ?? s.service_id ?? s.uuid ?? '';
                        return sid === serviceId || s.name === serviceName;
                    });
                    if (isLinked) linkedResourceIds.add(allResources[i].id);
                } else {
                    console.warn(`[Detail] Error recursos "${allResources[i].name}":`, (result as any).reason?.message);
                }
            });

            // Update associated counter
            if (resCountLabel) {
                resCountLabel.textContent = `${linkedResourceIds.size} de ${allResources.length} asignados`;
            }

            // Render resources list
            renderResourceRows(serviceId, allResources, linkedResourceIds, resListContainer, resCountLabel);

            // Enable search filter
            const searchInput = detailContainer.querySelector('#resource-search') as HTMLInputElement;
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const query = searchInput.value.toLowerCase().trim();
                    resListContainer.querySelectorAll<HTMLElement>('.res-assoc-row').forEach(row => {
                        const name = row.dataset.name!.toLowerCase();
                        if (name.includes(query)) {
                            row.style.display = 'flex';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });
            }

        } catch (err: any) {
            resListContainer.innerHTML = `
                <div style="color: #f87171; text-align: center; font-size: 0.85rem; padding: 1.5rem;">
                    Error al cargar recursos: ${err.message}
                </div>
            `;
        }
    }

    // Render resource list with association switches
    function renderResourceRows(
        serviceId: string,
        resources: Resource[],
        linkedIds: Set<string>,
        containerEl: HTMLElement,
        countLabelEl: HTMLElement
    ) {
        containerEl.innerHTML = resources.map(res => {
            const linked = linkedIds.has(res.id);
            const checkId = `detail-res-toggle-${res.id}`;
            return `
                <div class="res-assoc-row" id="res-row-${res.id}" data-name="${res.name}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 0.75rem 0.9rem;
                    border-radius: 10px;
                    background: ${linked ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)'};
                    border: 1px solid ${linked ? 'rgba(99, 102, 241, 0.25)' : 'var(--border-color, rgba(255, 255, 255, 0.08))'};
                    transition: all 0.2s ease;
                ">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.88rem; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${res.name}
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.1rem;">
                            ${res.enabled ? '🟢 Activo' : '🔴 Inactivo'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
                        <span id="res-label-${res.id}" style="
                            font-size: 0.72rem;
                            font-weight: 600;
                            color: ${linked ? '#818cf8' : 'var(--text-secondary)'};
                        ">${linked ? 'Asignado' : 'No asignado'}</span>
                        <label class="switch" style="margin: 0;">
                            <input type="checkbox" id="${checkId}"
                                class="res-assoc-toggle"
                                data-resource-id="${res.id}"
                                ${linked ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');

        // Toggles listeners
        containerEl.querySelectorAll<HTMLInputElement>('.res-assoc-toggle').forEach(toggle => {
            toggle.addEventListener('change', async () => {
                const resourceId = toggle.dataset.resourceId!;
                const isNowLinked = toggle.checked;
                toggle.disabled = true;

                const row = containerEl.querySelector(`#res-row-${resourceId}`) as HTMLElement;
                const label = containerEl.querySelector(`#res-label-${resourceId}`) as HTMLElement;

                try {
                    if (isNowLinked) {
                        await associateResourceService(resourceId, serviceId);
                        linkedIds.add(resourceId);
                    } else {
                        await removeResourceService(resourceId, serviceId);
                        linkedIds.delete(resourceId);
                    }
                    
                    // Instant UI feedback
                    if (row) {
                        row.style.background = isNowLinked ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)';
                        row.style.borderColor = isNowLinked ? 'rgba(99, 102, 241, 0.25)' : 'var(--border-color, rgba(255, 255, 255, 0.08))';
                    }
                    if (label) {
                        label.textContent = isNowLinked ? 'Asignado' : 'No asignado';
                        label.style.color = isNowLinked ? '#818cf8' : 'var(--text-secondary)';
                    }
                    if (countLabelEl) {
                        countLabelEl.textContent = `${linkedIds.size} de ${resources.length} asignados`;
                    }
                } catch (err: any) {
                    alert(`Error al cambiar asignación: ${err.message}`);
                    toggle.checked = !isNowLinked;
                } finally {
                    toggle.disabled = false;
                }
            });
        });
    }

    loadServices(true);
}
