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
        <div class="view-header">
            <h2>Gestión de Servicios</h2>
            <p>Listado de todos los servicios disponibles en el proyecto. Puedes asociar cada servicio a uno o más recursos.</p>
        </div>
        <div id="service-list-content">
            <div class="loading-spinner"></div>
        </div>

        <!-- Modal: Asociar Recursos -->
        <div id="assoc-modal-overlay" style="
            display: none; position: fixed; inset: 0; z-index: 1000;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            align-items: center; justify-content: center;
        ">
            <div id="assoc-modal" style="
                background: var(--card-bg, #1e293b); border: 1px solid var(--border-color);
                border-radius: 16px; padding: 2rem; width: 100%; max-width: 480px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.5); position: relative;
            ">
                <button id="assoc-modal-close" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; color: var(--text-secondary);
                    font-size: 1.4rem; cursor: pointer; line-height: 1;
                ">&times;</button>
                <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem;">
                    <span style="font-size:1.3rem;">🔗</span>
                    <h3 style="margin:0; font-size:1.1rem;">Recursos del Servicio</h3>
                </div>
                <p id="assoc-modal-subtitle" style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:1.25rem;"></p>
                <div id="assoc-modal-loading" style="color:var(--text-secondary); font-size:0.9rem;">Cargando recursos...</div>
                <div id="assoc-modal-list" style="flex-direction:column; gap:0.6rem; max-height:340px; overflow-y:auto; display:none;"></div>
            </div>
        </div>
    `;

    const listContent   = container.querySelector('#service-list-content') as HTMLElement;
    const modalOverlay  = container.querySelector('#assoc-modal-overlay') as HTMLElement;
    const modalClose    = container.querySelector('#assoc-modal-close') as HTMLButtonElement;
    const modalSubtitle = container.querySelector('#assoc-modal-subtitle') as HTMLElement;
    const modalLoading  = container.querySelector('#assoc-modal-loading') as HTMLElement;
    const modalList     = container.querySelector('#assoc-modal-list') as HTMLElement;

    // ─── Cerrar modal ──────────────────────────────────────────────────────────
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    function openModal()  { modalOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    function closeModal() { modalOverlay.style.display = 'none'; document.body.style.overflow = ''; }

    // ─── Helpers de formato ────────────────────────────────────────────────────
    const serviceTypeLabels: Record<string, string> = {
        'fixed': 'Fijo', 'flexible': 'Flexible', 'day': 'Día completo'
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

    // ─── Carga principal ───────────────────────────────────────────────────────
    async function loadServices() {
        listContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await getServices();
            const services = response.data;
            if (services.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align:center; color:#64748b; padding:2rem;">No hay servicios creados todavía.</p>
                    </div>
                `;
                return;
            }
            renderCards(services);
        } catch (error: any) {
            listContent.innerHTML = `<div class="status-message error" style="display:block;">Error al cargar los servicios: ${error.message}</div>`;
        }
    }

    // ─── Grid de tarjetas ─────────────────────────────────────────────────────
    function renderCards(services: Service[]) {
        const typeColors: Record<string, string> = {
            fixed: 'rgba(99,102,241,0.15)', flexible: 'rgba(234,179,8,0.15)', day: 'rgba(34,197,94,0.15)',
        };
        const typeTextColors: Record<string, string> = {
            fixed: '#818cf8', flexible: '#eab308', day: '#22c55e',
        };

        listContent.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.25rem;">
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

                    const typeLabel    = serviceTypeLabels[service.type] || service.type;
                    const priceDisplay = service.price
                        ? `$${parseFloat(service.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : null;

                    return `
                        <div style="
                            background:var(--card-bg,#1e293b); border:1px solid var(--border-color);
                            border-radius:14px; padding:1.25rem 1.25rem 1rem;
                            display:flex; flex-direction:column; gap:0.75rem;
                            transition:box-shadow 0.2s,border-color 0.2s; position:relative;
                        " onmouseover="this.style.boxShadow='0 8px 30px rgba(0,0,0,0.25)';this.style.borderColor='rgba(99,102,241,0.35)'"
                           onmouseout="this.style.boxShadow='';this.style.borderColor='var(--border-color)'">

                            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:700;font-size:1rem;line-height:1.3;word-break:break-word;">${service.name}</div>
                                    <div style="margin-top:0.35rem;">
                                        <span style="display:inline-block;font-size:0.72rem;font-weight:600;padding:0.2rem 0.6rem;border-radius:20px;background:${typeColors[service.type]||'rgba(99,102,241,0.15)'};color:${typeTextColors[service.type]||'#818cf8'};">${typeLabel}</span>
                                    </div>
                                </div>
                                <label class="switch" style="flex-shrink:0;margin-top:2px;">
                                    <input type="checkbox" class="service-toggle" data-id="${service.id}" ${service.enabled ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>

                            <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                                <div style="display:flex;align-items:center;gap:0.4rem;">
                                    <span style="font-size:0.95rem;">⏱</span>
                                    <span style="font-size:0.82rem;color:var(--text-secondary);">${durationInfo}</span>
                                </div>
                                ${priceDisplay ? `<div style="display:flex;align-items:center;gap:0.4rem;"><span style="font-size:0.95rem;">💲</span><span style="font-size:0.82rem;color:var(--text-secondary);">${priceDisplay}</span></div>` : ''}
                            </div>

                            <div style="height:1px;background:var(--border-color);margin:0 -0.25rem;"></div>

                            <div style="display:flex;gap:0.5rem;">
                                <button class="btn btn-sm associate-service"
                                    data-id="${service.id}" data-name="${service.name}"
                                    style="flex:1;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.35);color:#818cf8;font-weight:600;font-size:0.8rem;"
                                >👥 Recursos</button>
                                <button class="btn btn-danger btn-sm delete-service" data-id="${service.id}" style="font-size:0.8rem;">Eliminar</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Toggle habilitado/deshabilitado
        listContent.querySelectorAll('.service-toggle').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const cb        = e.currentTarget as HTMLInputElement;
                const serviceId = cb.dataset.id!;
                const isEnabled = cb.checked;
                try {
                    cb.disabled = true;
                    await updateService(serviceId, { enabled: isEnabled });
                } catch (error: any) {
                    alert(`Error al actualizar el servicio: ${error.message}`);
                    cb.checked = !isEnabled;
                } finally {
                    cb.disabled = false;
                }
            });
        });

        // Eliminar
        listContent.querySelectorAll('.delete-service').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button    = e.currentTarget as HTMLButtonElement;
                const serviceId = button.dataset.id!;
                if (confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
                    try {
                        button.disabled    = true;
                        button.textContent = '...';
                        await deleteService(serviceId);
                        loadServices();
                    } catch (error: any) {
                        alert(`Error al eliminar el servicio: ${error.message}`);
                        button.disabled    = false;
                        button.textContent = 'Eliminar';
                    }
                }
            });
        });

        // Abrir modal de recursos
        listContent.querySelectorAll<HTMLButtonElement>('.associate-service').forEach(btn => {
            btn.addEventListener('click', () => openAssocModal(btn.dataset.id!, btn.dataset.name!));
        });
    }

    // ─── Modal: abrir y cargar recursos ───────────────────────────────────────
    async function openAssocModal(serviceId: string, serviceName: string) {
        modalSubtitle.textContent  = `Servicio: ${serviceName}`;
        modalLoading.style.display = 'block';
        modalList.style.display    = 'none';
        modalLoading.textContent   = 'Cargando recursos...';
        openModal();

        try {
            const allResResp   = await getResources();
            const allResources = allResResp.data ?? [];

            if (allResources.length === 0) {
                modalLoading.textContent = 'No hay recursos creados en el sistema.';
                return;
            }

            // Fan-out: para cada recurso obtenemos sus servicios y vemos si incluye el actual
            const linkedChecks = await Promise.allSettled(
                allResources.map(r => getResourceServices(r.id))
            );

            const linkedResourceIds = new Set<string>();
            linkedChecks.forEach((result, i) => {
                if (result.status === 'fulfilled') {
                    const svcs = result.value?.data ?? [];
                    // Comprobamos por múltiples campos que Hapio puede usar
                    const isLinked = svcs.some((s: any) => {
                        const sid = s.id ?? s.service_id ?? s.uuid ?? '';
                        return sid === serviceId || s.name === serviceName;
                    });
                    if (isLinked) linkedResourceIds.add(allResources[i].id);
                } else {
                    console.warn(`[Modal] Error recursos "${allResources[i].name}":`, (result as any).reason?.message);
                }
            });

            renderModalList(serviceId, serviceName, allResources, linkedResourceIds);

            modalLoading.style.display = 'none';
            modalList.style.display    = 'flex';

        } catch (err: any) {
            modalLoading.textContent = `Error al cargar recursos: ${err.message}`;
        }
    }

    // ─── Modal: renderizar lista con sliders ──────────────────────────────────
    function renderModalList(serviceId: string, serviceName: string, resources: Resource[], linkedIds: Set<string>) {
        modalList.innerHTML = resources.map(res => {
            const linked  = linkedIds.has(res.id);
            const checkId = `res-toggle-${res.id}`;
            return `
                <div id="res-row-${res.id}" style="
                    display:flex; align-items:center; justify-content:space-between;
                    gap:1rem; padding:0.85rem 1rem; border-radius:10px;
                    background:${linked ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)'};
                    border:1px solid ${linked ? 'rgba(34,197,94,0.25)' : 'var(--border-color)'};
                    transition:background 0.25s,border-color 0.25s;
                ">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.15rem;">${res.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">
                            ${res.enabled ? '🟢 Activo' : '🔴 Inactivo'}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.6rem;flex-shrink:0;">
                        <span id="res-label-${res.id}" style="
                            font-size:0.75rem;font-weight:600;
                            color:${linked ? '#22c55e' : 'var(--text-secondary)'};
                            transition:color 0.2s;
                        ">${linked ? 'Asociado' : 'No asociado'}</span>
                        <label class="switch" style="margin:0;">
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

        // Event listeners para los sliders
        modalList.querySelectorAll<HTMLInputElement>('.res-assoc-toggle').forEach(toggle => {
            toggle.addEventListener('change', async () => {
                const resourceId  = toggle.dataset.resourceId!;
                const isNowLinked = toggle.checked;
                toggle.disabled   = true;

                const row   = modalList.querySelector(`#res-row-${resourceId}`) as HTMLElement;
                const label = modalList.querySelector(`#res-label-${resourceId}`) as HTMLElement;

                try {
                    if (isNowLinked) {
                        await associateResourceService(resourceId, serviceId);
                    } else {
                        await removeResourceService(resourceId, serviceId);
                    }
                    // Actualizar visual sin recargar
                    if (row) {
                        row.style.background  = isNowLinked ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)';
                        row.style.borderColor = isNowLinked ? 'rgba(34,197,94,0.25)' : 'var(--border-color)';
                    }
                    if (label) {
                        label.textContent = isNowLinked ? 'Asociado' : 'No asociado';
                        label.style.color = isNowLinked ? '#22c55e' : 'var(--text-secondary)';
                    }
                } catch (err: any) {
                    alert(`Error al ${isNowLinked ? 'asociar' : 'desasociar'}: ${err.message}`);
                    toggle.checked = !isNowLinked; // revertir
                } finally {
                    toggle.disabled = false;
                }
            });
        });
    }

    loadServices();
}
