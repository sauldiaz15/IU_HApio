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
            <h2>Gestión de Especialidades</h2>
            <p style="margin-bottom: 0;">Selecciona una especialidad de la lista para ver sus detalles, configurar su estado y asociarla con los especialistas disponibles.</p>
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
                transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
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
                        <h3 style="margin: 0 0 0.5rem 0; color: white; font-size: 1.15rem;">Ninguna especialidad seleccionada</h3>
                        <p style="margin: 0; font-size: 0.85rem; max-width: 300px; line-height: 1.6;">
                            Selecciona una especialidad en la barra de la izquierda para ver su información y asignar especialistas.
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
                        No hay especialidades creadas.
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
        const groups: Record<string, Service[]> = {};
        
        servicesList.forEach(service => {
            let parsedMetadata: any = {};
            if (service.metadata) {
                try {
                    parsedMetadata = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
                } catch (e) {}
            }
            const cat = parsedMetadata?.category || 'Sin Categoría';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(service);
        });

        // Generate grouped HTML
        masterContainer.innerHTML = Object.entries(groups).map(([catName, services]) => {
            const servicesHtml = services.map(service => {
                const typeLabel = serviceTypeLabels[service.type] || service.type;
                const durationText = getDurationText(service);
                const isSelected = service.id === selectedServiceId;
                const displayName = service.name.length > 12 
                    ? service.name.substring(0, 12) + '...' 
                    : service.name;
                
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
                            <span title="${service.name}" style="font-weight: 600; font-size: 0.95rem; color: white; word-break: break-word;">
                                ${displayName}
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
                            <span style="display: flex; align-items: center; gap: 0.35rem;">
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

            return `
                <div class="category-group" style="margin-bottom: 1.25rem;">
                    <div class="category-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.4rem 0.25rem;
                        border-bottom: 1px solid rgba(255,255,255,0.05);
                        margin-bottom: 0.65rem;
                    ">
                        <span style="font-weight: 700; font-size: 0.8rem; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.35rem;">
                            <span>📁</span> ${catName}
                        </span>
                        <span style="font-size: 0.7rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 0.1rem 0.4rem; border-radius: 10px; font-weight: 600;">
                            ${services.length} ${services.length === 1 ? 'servicio' : 'servicios'}
                        </span>
                    </div>
                    <div class="category-services-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${servicesHtml}
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
        masterContainer.style.width = '360px'; // Expand sidebar when empty
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
                    <h3 style="margin: 0 0 0.5rem 0; color: white; font-size: 1.15rem;">Ninguna especialidad seleccionada</h3>
                    <p style="margin: 0; font-size: 0.85rem; max-width: 300px; line-height: 1.6;">
                        Selecciona una especialidad en la barra de la izquierda para ver su información y asignar especialistas.
                    </p>
                </div>
            </div>
        `;
    }

    // Select a service and load detail pane
    function selectService(id: string) {
        selectedServiceId = id;
        masterContainer.style.width = '240px'; // Shrink sidebar when active to give detail pane space
        
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

        let parsedMetadata: any = {};
        if (service.metadata) {
            try {
                parsedMetadata = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
            } catch (e) {
                console.warn('Error parsing service metadata:', e);
            }
        }
        const category = parsedMetadata?.category || '';

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
                        ${category ? `
                        <span style="
                            font-size: 0.72rem;
                            font-weight: 600;
                            padding: 0.15rem 0.55rem;
                            border-radius: 20px;
                            background: rgba(16, 185, 129, 0.15);
                            color: #10b981;
                        ">🏷️ ${category}</span>
                        ` : ''}
                    </div>
                    <p style="margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--text-secondary);">
                        ID: <code style="font-family: monospace; font-size: 0.78rem; background: rgba(255,255,255,0.05); padding: 0.1rem 0.3rem; border-radius: 4px;">${service.id}</code>
                    </p>
                </div>
                
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; flex-shrink: 0;">
                    <!-- Toggle Switch -->
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
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
                    <!-- Actions Row -->
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button id="detail-edit-btn" class="btn btn-secondary btn-sm" style="
                            display: flex;
                            align-items: center;
                            gap: 0.4rem;
                            padding: 0.45rem 1rem;
                            font-weight: 600;
                            font-size: 0.8rem;
                            background: rgba(255, 255, 255, 0.05);
                            color: white;
                        ">
                            ✏️ Editar
                        </button>
                        <button id="detail-delete-btn" class="btn btn-danger btn-sm" style="
                            display: flex;
                            align-items: center;
                            gap: 0.4rem;
                            padding: 0.45rem 1rem;
                            font-weight: 600;
                            font-size: 0.8rem;
                        ">
                            🗑️ Eliminar
                        </button>
                    </div>
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
                        <span>👥</span> Especialistas de la Especialidad
                    </h4>
                    <span id="detail-resources-count" style="
                        font-size: 0.7rem;
                        color: var(--text-secondary);
                        font-weight: 600;
                        background: rgba(255, 255, 255, 0.05);
                        padding: 0.2rem 0.6rem;
                        border-radius: 20px;
                    ">Sin consultar</span>
                </div>

                <!-- Live Search Box -->
                <div style="position: relative;">
                    <input type="text" id="resource-search" placeholder="Buscar especialista por nombre..." style="
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
                    <div id="assoc-placeholder" style="
                        text-align: center;
                        padding: 2rem 1.5rem;
                        background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%);
                        border: 2px dashed rgba(99, 102, 241, 0.15);
                        border-radius: 16px;
                        margin: 0.5rem 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 1rem;
                    ">
                        <button id="btn-load-assoc" class="btn btn-primary" style="
                            padding: 0.65rem 1.25rem;
                            font-size: 0.8rem;
                            font-weight: 700;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            gap: 0.4rem;
                            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                        ">
                            <span>🔍</span> Cargar Especialistas
                        </button>
                        <div style="margin-top: 0.25rem;">
                            <h5 style="margin: 0 0 0.35rem 0; color: white; font-size: 0.95rem; font-weight: 700;">Gestionar Especialistas</h5>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 0.78rem; line-height: 1.4; max-width: 260px; margin-left: auto; margin-right: auto;">
                                Consulta y asocia de forma rápida los médicos calificados para brindar esta especialidad.
                            </p>
                        </div>
                    </div>
                </div>
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
                alert(`Error al actualizar la especialidad: ${err.message}`);
                serviceToggle.checked = !isEnabled;
            } finally {
                serviceToggle.disabled = false;
            }
        });

        // Event listener: Delete button
        const deleteBtn = detailContainer.querySelector('#detail-delete-btn') as HTMLButtonElement;
        deleteBtn.addEventListener('click', () => {
            showConfirmModal(
                'Eliminar Especialidad',
                `¿Estás seguro de que deseas eliminar la especialidad "${service.name}"? Esta acción no se puede deshacer.`,
                async () => {
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = 'Eliminando...';
                    try {
                        await deleteService(service.id);
                        selectedServiceId = null;
                        await loadServices(true);
                    } catch (err: any) {
                        alert(`Error al eliminar la especialidad: ${err.message}`);
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = '🗑️ Eliminar';
                    }
                }
            );
        });

        // Event listener: Edit button
        const editBtn = detailContainer.querySelector('#detail-edit-btn') as HTMLButtonElement;
        editBtn.addEventListener('click', () => {
            openEditServiceModal(service, async () => {
                await loadServices(false);
                selectService(service.id);
            });
        });

        // Load & check resource associations on demand
        const btnLoadAssoc = detailContainer.querySelector('#btn-load-assoc') as HTMLButtonElement | null;
        if (btnLoadAssoc) {
            btnLoadAssoc.addEventListener('click', () => {
                const listContainer = detailContainer.querySelector('#detail-resource-list') as HTMLElement;
                if (listContainer) {
                    listContainer.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';
                }
                loadResourceAssociations(service.id, service.name);
            });
        }
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
                        No hay especialistas creados.
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
                    Error al cargar especialistas: ${err.message}
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
            const initials = res.name ? res.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
            
            return `
                <div class="res-assoc-row" id="res-row-${res.id}" data-name="${res.name}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 0.85rem 1.1rem;
                    border-radius: 12px;
                    background: ${linked ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.3)'};
                    border: 1px solid ${linked ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)'};
                    box-shadow: ${linked ? '0 4px 12px rgba(99, 102, 241, 0.05)' : 'none'};
                    transition: all 0.2s ease;
                ">
                    <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0;">
                        <!-- Avatar initials -->
                        <div class="res-avatar" style="
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            background: ${linked ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255, 255, 255, 0.05)'};
                            color: ${linked ? 'white' : 'var(--text-secondary)'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 700;
                            font-size: 0.78rem;
                            border: 1px solid ${linked ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)'};
                            flex-shrink: 0;
                            transition: all 0.2s ease;
                        ">
                            ${initials}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${res.name}
                            </div>
                            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem; display: flex; align-items: center; gap: 0.35rem;">
                                ${res.enabled ? '<span style="color: #22c55e;">🟢 Activo</span>' : '<span style="color: #ef4444;">🔴 Inactivo</span>'}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;">
                        <span id="res-label-${res.id}" style="
                            font-size: 0.7rem;
                            font-weight: 700;
                            padding: 0.2rem 0.55rem;
                            border-radius: 20px;
                            background: ${linked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
                            color: ${linked ? '#818cf8' : 'var(--text-secondary)'};
                            border: 1px solid ${linked ? 'rgba(99, 102, 241, 0.25)' : 'transparent'};
                            transition: all 0.2s ease;
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
                const avatar = row?.querySelector('.res-avatar') as HTMLElement;

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
                        row.style.background = isNowLinked ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.3)';
                        row.style.borderColor = isNowLinked ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)';
                        row.style.boxShadow = isNowLinked ? '0 4px 12px rgba(99, 102, 241, 0.05)' : 'none';
                    }
                    if (label) {
                        label.textContent = isNowLinked ? 'Asignado' : 'No asignado';
                        label.style.background = isNowLinked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                        label.style.color = isNowLinked ? '#818cf8' : 'var(--text-secondary)';
                        label.style.borderColor = isNowLinked ? 'rgba(99, 102, 241, 0.25)' : 'transparent';
                    }
                    if (avatar) {
                        avatar.style.background = isNowLinked ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255, 255, 255, 0.05)';
                        avatar.style.color = isNowLinked ? 'white' : 'var(--text-secondary)';
                        avatar.style.borderColor = isNowLinked ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)';
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

    // ─── Modal para Agregar Categoría ───────────────────────────────────────
    function openAddCategoryModal(selectEl: HTMLSelectElement) {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.background = 'rgba(15, 23, 42, 0.8)';
        backdrop.style.backdropFilter = 'blur(6px)';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.zIndex = '1100'; // Higher than the edit modal
        
        backdrop.innerHTML = `
            <div class="card" style="width: 400px; padding: 2rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5); border: 1px solid rgba(255,255,255,0.08); background: var(--card-bg, #1e293b);">
                <h3 style="margin-top: 0; color: white; font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem;">Crear Nueva Categoría</h3>
                <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 1.25rem;">
                    Ingresa el nombre de la nueva categoría para agrupar especialidades.
                </p>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="modal-category-name">Nombre de Categoría</label>
                    <input type="text" id="modal-category-name" placeholder="Ej. Odontología" style="width:100%; box-sizing:border-box;">
                    <span id="modal-category-error" style="color: #f87171; font-size: 0.75rem; margin-top: 0.25rem; display: none;"></span>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                    <button type="button" id="modal-cancel-btn" class="btn btn-secondary" style="background: rgba(255,255,255,0.05); color: white;">Cancelar</button>
                    <button type="button" id="modal-save-btn" class="btn btn-primary">Crear</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        
        const input = backdrop.querySelector('#modal-category-name') as HTMLInputElement;
        const errorEl = backdrop.querySelector('#modal-category-error') as HTMLElement;
        const cancelBtn = backdrop.querySelector('#modal-cancel-btn') as HTMLButtonElement;
        const saveBtn = backdrop.querySelector('#modal-save-btn') as HTMLButtonElement;
        
        input.focus();
        
        const closeModal = () => {
            document.body.removeChild(backdrop);
        };
        
        cancelBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });
        
        const handleSave = () => {
            const value = input.value.trim();
            if (!value) {
                errorEl.textContent = 'El nombre no puede estar vacío.';
                errorEl.style.display = 'block';
                return;
            }
            
            // Check duplication (case-insensitive)
            let duplicate = false;
            Array.from(selectEl.options).forEach(opt => {
                if (opt.value.toLowerCase() === value.toLowerCase()) {
                    duplicate = true;
                }
            });
            
            if (duplicate) {
                errorEl.textContent = 'Esta categoría ya existe.';
                errorEl.style.display = 'block';
                return;
            }
            
            // Add to combobox and select it
            const newOpt = document.createElement('option');
            newOpt.value = value;
            newOpt.textContent = value;
            newOpt.selected = true;
            selectEl.appendChild(newOpt);
            
            closeModal();
        };
        
        saveBtn.addEventListener('click', handleSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSave();
        });
    }

    // ─── Modal para Editar Especialidad ─────────────────────────────────────
    function openEditServiceModal(service: Service, onSaved: () => void) {
        let parsedMetadata: any = {};
        if (service.metadata) {
            try {
                parsedMetadata = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
            } catch (e) {}
        }
        const currentCategory = parsedMetadata?.category || '';

        // Collect all existing categories from servicesList
        const categoriesSet = new Set<string>();
        servicesList.forEach(s => {
            let meta: any = {};
            if (s.metadata) {
                try {
                    meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
                } catch (e) {}
            }
            if (meta?.category) {
                categoriesSet.add(meta.category);
            }
        });

        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.background = 'rgba(15, 23, 42, 0.8)';
        backdrop.style.backdropFilter = 'blur(6px)';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.zIndex = '1000';

        backdrop.innerHTML = `
            <div class="card" style="width: 500px; padding: 2.5rem; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5); border: 1px solid rgba(255,255,255,0.08); max-height: 90vh; overflow-y: auto; background: var(--card-bg, #1e293b);">
                <h3 style="margin-top: 0; color: white; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Editar Especialidad</h3>
                <form id="modal-edit-form" class="form" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div class="form-group" style="margin: 0;">
                        <label for="edit-name">Nombre de la Especialidad</label>
                        <input type="text" id="edit-name" name="name" required value="${service.name}">
                    </div>
                    
                    <div class="form-group" style="margin: 0;">
                        <label for="edit-category">Categoría</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <select id="edit-category" name="category" style="flex: 1;">
                                <option value="">-- Selecciona una categoría (Opcional) --</option>
                                ${Array.from(categoriesSet).map(cat => `<option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>${cat}</option>`).join('')}
                            </select>
                            <button type="button" id="edit-btn-add-category" class="btn btn-secondary" style="padding: 0.75rem 1rem; border-radius: 12px; font-weight: bold; background: rgba(255,255,255,0.05); color: white;">
                                ➕
                            </button>
                        </div>
                    </div>

                    <div class="form-group" style="margin: 0;">
                        <label for="edit-price">Precio</label>
                        <input type="number" id="edit-price" name="price" step="0.001" value="${service.price || ''}" placeholder="Ej. 25.000 (opcional)">
                    </div>

                    <div id="modal-edit-error" style="color: #f87171; font-size: 0.8rem; display: none;"></div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                        <button type="button" id="edit-cancel-btn" class="btn btn-secondary" style="background: rgba(255,255,255,0.05); color: white;">Cancelar</button>
                        <button type="submit" id="edit-save-btn" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(backdrop);

        const formEl = backdrop.querySelector('#modal-edit-form') as HTMLFormElement;
        const categorySelect = backdrop.querySelector('#edit-category') as HTMLSelectElement;
        const btnAddCategory = backdrop.querySelector('#edit-btn-add-category') as HTMLButtonElement;
        const cancelBtn = backdrop.querySelector('#edit-cancel-btn') as HTMLButtonElement;
        const errorEl = backdrop.querySelector('#modal-edit-error') as HTMLElement;

        // Add category click
        btnAddCategory.addEventListener('click', () => {
            openAddCategoryModal(categorySelect);
        });

        const closeModal = () => {
            document.body.removeChild(backdrop);
        };

        cancelBtn.addEventListener('click', closeModal);

        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';

            const formData = new FormData(formEl);
            const name = (formData.get('name') as string).trim();
            const categoryVal = (formData.get('category') as string || '').trim();
            const priceVal = formData.get('price') ? (parseFloat(formData.get('price') as string)).toFixed(3) : null;

            if (!name) {
                errorEl.textContent = 'El nombre es obligatorio.';
                errorEl.style.display = 'block';
                return;
            }

            const updateData: any = {
                name,
                price: priceVal,
                metadata: {
                    category: categoryVal || undefined
                }
            };

            try {
                const saveBtn = formEl.querySelector('#edit-save-btn') as HTMLButtonElement;
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';

                await updateService(service.id, updateData);
                closeModal();
                onSaved();
            } catch (err: any) {
                const saveBtn = formEl.querySelector('#edit-save-btn') as HTMLButtonElement;
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardando Cambios';
                errorEl.textContent = `Error: ${err.message}`;
                errorEl.style.display = 'block';
            }
        });
    }

    // ─── Modal de Confirmación Personalizado ────────────────────────────────
    function showConfirmModal(title: string, message: string, onConfirm: () => void) {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.background = 'rgba(15, 23, 42, 0.8)';
        backdrop.style.backdropFilter = 'blur(4px)';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.zIndex = '1100';

        backdrop.innerHTML = `
            <div class="card" style="width: 400px; padding: 2.25rem; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5); border: 1px solid rgba(255,255,255,0.08); background: var(--card-bg, #1e293b); text-align: center; border-radius: 16px;">
                <span style="font-size: 2.8rem; display: block; margin-bottom: 0.75rem;">⚠️</span>
                <h3 style="margin-top: 0; color: white; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${title}</h3>
                <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.75rem;">${message}</p>
                <div style="display: flex; justify-content: center; gap: 0.75rem;">
                    <button type="button" id="confirm-cancel-btn" class="btn btn-secondary" style="background: rgba(255,255,255,0.05); color: white;">Cancelar</button>
                    <button type="button" id="confirm-ok-btn" class="btn btn-danger">Eliminar</button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        const cancelBtn = backdrop.querySelector('#confirm-cancel-btn') as HTMLButtonElement;
        const okBtn = backdrop.querySelector('#confirm-ok-btn') as HTMLButtonElement;

        const closeModal = () => {
            document.body.removeChild(backdrop);
        };

        cancelBtn.addEventListener('click', closeModal);
        okBtn.addEventListener('click', () => {
            closeModal();
            onConfirm();
        });
    }

    loadServices(true);
}
