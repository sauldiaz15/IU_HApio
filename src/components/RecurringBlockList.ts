import {
    getResources,
    getResource,
    getRecurringSchedules,
    getRecurringScheduleBlocks,
    deleteRecurringScheduleBlock,
    updateRecurringScheduleBlock,
    Resource,
    RecurringSchedule,
    RecurringScheduleBlock,
} from '../api/hapio';

const WEEKDAY_LABELS: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

const WEEKDAY_ORDER: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 7,
};

export function renderRecurringBlockList(container: HTMLElement): void {
    // Current state for editing
    let editingBlockId: string | null = null;

    container.innerHTML = `
        <div class="view-header">
            <h2>Turnos Recurrentes</h2>
            <p>Visualiza y administra los turnos de horario semanales de cada horario recurrente.</p>
        </div>

        <div class="card" style="margin-bottom: 2rem;">
            <div class="form-grid">
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="rbl-resource">Especialista</label>
                    <select id="rbl-resource">
                        <option value="" disabled selected>Cargando especialistas…</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label for="rbl-schedule">Horario Recurrente</label>
                    <select id="rbl-schedule" disabled>
                        <option value="" disabled selected>Selecciona un especialista primero</option>
                    </select>
                </div>
            </div>
        </div>

        <div id="rbl-content">
            <div class="status-message info" style="display: block;">
                Selecciona un especialista y un horario para ver sus turnos recurrentes.
            </div>
        </div>
    `;

    const resourceSel = container.querySelector('#rbl-resource') as HTMLSelectElement;
    const scheduleSel = container.querySelector('#rbl-schedule') as HTMLSelectElement;
    const listContent = container.querySelector('#rbl-content') as HTMLElement;

    // ── Load resources ────────────────────────────────────────────────────────
    async function loadResources() {
        try {
            const sessionStr = localStorage.getItem('hapio_portal_session');
            let isUser = false;
            let loggedResourceId = '';
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session.role === 'user' && session.resourceId) {
                    isUser = true;
                    loggedResourceId = session.resourceId;
                }
            }

            const res = await getResources();
            resourceSel.innerHTML = '';
            if (!isUser) {
                resourceSel.innerHTML = '<option value="" disabled selected>Selecciona un especialista</option>';
            }

            res.data.forEach((r: Resource) => {
                if (isUser && r.id !== loggedResourceId) return;
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.name;
                if (isUser) opt.selected = true;
                resourceSel.appendChild(opt);
            });

            if (isUser) {
                resourceSel.disabled = true;
                // Dispatch change event to load schedules
                resourceSel.dispatchEvent(new Event('change'));
            }
        } catch (err: any) {
            listContent.innerHTML = `<div class="status-message error" style="display:block;">Error al cargar especialistas: ${err.message}</div>`;
        }
    }

    // ── Load schedules when resource changes ──────────────────────────────────
    resourceSel.addEventListener('change', async () => {
        const resourceId = resourceSel.value;
        scheduleSel.disabled = true;
        scheduleSel.innerHTML = '<option value="" disabled selected>Cargando horarios…</option>';
        listContent.innerHTML = '<div class="status-message info" style="display:block;">Selecciona un horario para ver sus turnos.</div>';

        try {
            const [res, resource] = await Promise.all([
                getRecurringSchedules(resourceId),
                getResource(resourceId)
            ]);
            const scheduleNames = resource.metadata?.schedule_names || {};

            scheduleSel.innerHTML = '<option value="" disabled selected>Selecciona un horario</option>';

            if (res.data.length === 0) {
                scheduleSel.innerHTML = '<option value="" disabled selected>Sin horarios recurrentes</option>';
                listContent.innerHTML = '<div class="status-message info" style="display:block;">Este especialista no tiene horarios recurrentes.</div>';
                return;
            }

            res.data.forEach((s: RecurringSchedule) => {
                const opt = document.createElement('option');
                opt.value = s.id;
                const name = scheduleNames[s.id] || `Horario ${s.id.slice(0, 8)}…`;
                opt.textContent = `${name} (desde ${s.start_date})`;
                scheduleSel.appendChild(opt);
            });
            scheduleSel.disabled = false;
        } catch (err: any) {
            listContent.innerHTML = `<div class="status-message error" style="display:block;">Error al cargar horarios: ${err.message}</div>`;
        }
    });

    // ── Load blocks when schedule changes ─────────────────────────────────────
    scheduleSel.addEventListener('change', () => {
        const resourceId = resourceSel.value;
        const scheduleId = scheduleSel.value;
        if (resourceId && scheduleId) {
            editingBlockId = null;
            loadBlocks(resourceId, scheduleId);
        }
    });

    // ── Load blocks ───────────────────────────────────────────────────────────
    async function loadBlocks(resourceId: string, scheduleId: string) {
        listContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const res = await getRecurringScheduleBlocks(resourceId, scheduleId);
            const blocks = res.data;

            if (blocks.length === 0) {
                listContent.innerHTML = `
                    <div class="card">
                        <p style="text-align:center; color:#64748b; padding:2rem;">
                            No hay turnos recurrentes para este horario.
                        </p>
                    </div>
                `;
                return;
            }

            // Sort by weekday order
            const sorted = [...blocks].sort(
                (a, b) => (WEEKDAY_ORDER[a.weekday] ?? 9) - (WEEKDAY_ORDER[b.weekday] ?? 9)
            );

            renderTable(sorted, resourceId, scheduleId);
        } catch (err: any) {
            listContent.innerHTML = `<div class="status-message error" style="display:block;">Error al cargar turnos: ${err.message}</div>`;
        }
    }

    // ── Render table ──────────────────────────────────────────────────────────
    function renderTable(blocks: RecurringScheduleBlock[], resourceId: string, scheduleId: string) {
        listContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Día</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th class="text-center" style="width:180px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blocks.map(block => {
            const isEditing = editingBlockId === block.id;
            const dayLabel = WEEKDAY_LABELS[block.weekday] ?? block.weekday;
            // Strip seconds for display: "09:00:00" → "09:00"
            const startDisplay = block.start_time.slice(0, 5);
            const endDisplay = block.end_time.slice(0, 5);

            if (isEditing) {
                return `
                    <tr class="editing-row">
                        <td><span class="badge badge-info">${dayLabel}</span></td>
                        <td><input type="time" class="edit-start" value="${startDisplay}"></td>
                        <td><input type="time" class="edit-end" value="${endDisplay}"></td>
                        <td class="text-center">
                            <button class="btn btn-primary btn-sm save-edit" data-id="${block.id}">✓</button>
                            <button class="btn btn-secondary btn-sm cancel-edit">✕</button>
                        </td>
                    </tr>
                `;
            }

            return `
                                <tr>
                                    <td>
                                        <span class="badge badge-info" style="font-size:0.8rem;">${dayLabel}</span>
                                    </td>
                                    <td><strong>${startDisplay}</strong></td>
                                    <td><strong>${endDisplay}</strong></td>
                                    <td class="text-center">
                                        <button class="btn btn-secondary btn-sm start-edit" data-id="${block.id}" style="margin-right:0.25rem;">Editar</button>
                                        <button class="btn btn-danger btn-sm delete-recurring-block"
                                                data-id="${block.id}">
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

        // Attach Event Listeners
        attachTableListeners(blocks, resourceId, scheduleId);
    }

    function attachTableListeners(blocks: RecurringScheduleBlock[], resourceId: string, scheduleId: string) {
        // Start Edit
        listContent.querySelectorAll<HTMLButtonElement>('.start-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                editingBlockId = btn.dataset.id!;
                renderTable(blocks, resourceId, scheduleId);
            });
        });

        // Cancel Edit
        listContent.querySelectorAll<HTMLButtonElement>('.cancel-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                editingBlockId = null;
                renderTable(blocks, resourceId, scheduleId);
            });
        });

        // Save Edit
        listContent.querySelectorAll<HTMLButtonElement>('.save-edit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const blockId = btn.dataset.id!;
                const row = btn.closest('tr')!;
                const startInput = row.querySelector('.edit-start') as HTMLInputElement;
                const endInput = row.querySelector('.edit-end') as HTMLInputElement;

                const toApiTime = (t: string) => t.length === 5 ? `${t}:00` : t;
                const data = {
                    start_time: toApiTime(startInput.value),
                    end_time: toApiTime(endInput.value)
                };

                btn.disabled = true;
                btn.textContent = '…';

                try {
                    await updateRecurringScheduleBlock(resourceId, scheduleId, blockId, data);
                    editingBlockId = null;
                    loadBlocks(resourceId, scheduleId);
                } catch (err: any) {
                    alert(`Error al actualizar: ${err.message}`);
                    btn.disabled = false;
                    btn.textContent = '✓';
                }
            });
        });

        // Delete handlers
        listContent.querySelectorAll<HTMLButtonElement>('.delete-recurring-block').forEach(btn => {
            btn.addEventListener('click', async () => {
                const blockId = btn.dataset.id!;
                if (!confirm('¿Eliminar este turno recurrente?')) return;

                btn.disabled = true;
                btn.textContent = '…';
                try {
                    await deleteRecurringScheduleBlock(resourceId, scheduleId, blockId);
                    loadBlocks(resourceId, scheduleId);
                } catch (err: any) {
                    alert(`Error: ${err.message}`);
                    btn.disabled = false;
                    btn.textContent = 'Eliminar';
                }
            });
        });
    }

    loadResources();
}
