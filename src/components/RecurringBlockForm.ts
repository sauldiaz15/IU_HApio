import {
    getResources,
    getRecurringSchedules,
    createRecurringScheduleBlock,
    Resource,
    RecurringSchedule,
    RecurringScheduleBlockData,
} from '../api/hapio';

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface TimeSlot {
    start_time: string;
    end_time: string;
}

interface DayConfig {
    enabled: boolean;
    slots: TimeSlot[];
}

const WEEKDAYS: { key: Weekday; label: string }[] = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

export function renderRecurringBlockForm(container: HTMLElement): void {
    // State
    const dayConfigs: Record<Weekday, DayConfig> = {} as any;
    WEEKDAYS.forEach(({ key }) => {
        dayConfigs[key] = {
            enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(key),
            slots: [{ start_time: '09:00', end_time: '18:00' }],
        };
    });

    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Bloque Recurrente</h2>
            <p>Configura franjas horarias semanales para un recurso. Cada bloque se repetirá automáticamente.</p>
        </div>

        <div class="card" style="max-width:860px;">
            <form id="recurring-block-form" class="form">

                <!-- Step 1: Resource & Schedule -->
                <div class="form-section">
                    <h3>1 · Recurso y Horario</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="rb-resource">Recurso <span class="required-mark">*</span></label>
                            <select id="rb-resource" name="resource" required>
                                <option value="" disabled selected>Cargando recursos…</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="rb-schedule">Horario Recurrente <span class="required-mark">*</span></label>
                            <select id="rb-schedule" name="schedule" required disabled>
                                <option value="" disabled selected>Selecciona un recurso primero</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Weekly blocks -->
                <div class="form-section" style="border-bottom:none;">
                    <h3>2 · Franjas Horarias por Día</h3>
                    <p style="font-size:0.85rem;color:#64748b;margin-top:-0.5rem;margin-bottom:1.25rem;">
                        Activa los días y define una o más franjas horarias. Cada franja se enviará como un bloque independiente.
                    </p>
                    <div id="days-container"></div>
                </div>

                <div id="rb-message" class="message hidden"></div>

                <div class="form-actions">
                    <button type="button" id="rb-reset" class="btn btn-secondary">Restablecer</button>
                    <button type="submit" id="rb-submit" class="btn btn-primary">
                        <span id="rb-submit-text">Guardar Bloques</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const form = container.querySelector('#recurring-block-form') as HTMLFormElement;
    const resourceSel = form.querySelector('#rb-resource') as HTMLSelectElement;
    const scheduleSel = form.querySelector('#rb-schedule') as HTMLSelectElement;
    const daysContainer = form.querySelector('#days-container') as HTMLElement;
    const messageEl = container.querySelector('#rb-message') as HTMLElement;
    const submitBtn = form.querySelector('#rb-submit') as HTMLButtonElement;
    const submitText = form.querySelector('#rb-submit-text') as HTMLElement;
    const resetBtn = form.querySelector('#rb-reset') as HTMLButtonElement;

    // ── Render days ───────────────────────────────────────────────────────────
    function renderDays() {
        daysContainer.innerHTML = '';
        WEEKDAYS.forEach(({ key, label }) => {
            const cfg = dayConfigs[key];
            const dayEl = document.createElement('div');
            dayEl.className = `rb-day-card${cfg.enabled ? ' rb-day-enabled' : ''}`;
            dayEl.dataset.day = key;

            dayEl.innerHTML = `
                <div class="rb-day-header">
                    <div class="rb-day-title">
                        <label class="switch" style="margin-right:0.75rem;">
                            <input type="checkbox" class="day-toggle" data-day="${key}" ${cfg.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span class="rb-day-name">${label}</span>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm add-slot-btn" data-day="${key}" ${cfg.enabled ? '' : 'disabled'}>
                        + Franja
                    </button>
                </div>
                <div class="rb-slots-container" id="slots-${key}">
                    ${cfg.slots.map((slot, idx) => renderSlotHTML(key, idx, slot, cfg.enabled)).join('')}
                </div>
            `;
            daysContainer.appendChild(dayEl);
        });

        // Attach events after render
        attachDayEvents();
    }

    function renderSlotHTML(day: Weekday, idx: number, slot: TimeSlot, enabled: boolean): string {
        const canRemove = dayConfigs[day].slots.length > 1;
        return `
            <div class="rb-slot" data-day="${day}" data-idx="${idx}">
                <div class="rb-slot-inner">
                    <div class="rb-slot-field">
                        <label>Inicio</label>
                        <input type="time" class="slot-start" data-day="${day}" data-idx="${idx}"
                               value="${slot.start_time}" ${enabled ? '' : 'disabled'} required>
                    </div>
                    <span class="rb-slot-sep">→</span>
                    <div class="rb-slot-field">
                        <label>Fin</label>
                        <input type="time" class="slot-end" data-day="${day}" data-idx="${idx}"
                               value="${slot.end_time}" ${enabled ? '' : 'disabled'} required>
                    </div>
                    ${canRemove ? `<button type="button" class="btn btn-danger btn-sm remove-slot-btn" data-day="${day}" data-idx="${idx}" ${enabled ? '' : 'disabled'}>✕</button>` : '<div style="width:56px;"></div>'}
                </div>
            </div>
        `;
    }

    function refreshSlots(day: Weekday) {
        const cfg = dayConfigs[day];
        const slotsEl = daysContainer.querySelector(`#slots-${day}`) as HTMLElement;
        slotsEl.innerHTML = cfg.slots.map((slot, idx) => renderSlotHTML(day, idx, slot, cfg.enabled)).join('');
        attachSlotEvents(day);
    }

    function attachSlotEvents(day: Weekday) {
        const slotsEl = daysContainer.querySelector(`#slots-${day}`) as HTMLElement;

        slotsEl.querySelectorAll<HTMLInputElement>('.slot-start').forEach(input => {
            input.addEventListener('change', () => {
                const idx = parseInt(input.dataset.idx!);
                dayConfigs[day].slots[idx].start_time = input.value;
            });
        });

        slotsEl.querySelectorAll<HTMLInputElement>('.slot-end').forEach(input => {
            input.addEventListener('change', () => {
                const idx = parseInt(input.dataset.idx!);
                dayConfigs[day].slots[idx].end_time = input.value;
            });
        });

        slotsEl.querySelectorAll<HTMLButtonElement>('.remove-slot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx!);
                dayConfigs[day].slots.splice(idx, 1);
                refreshSlots(day);
            });
        });
    }

    function attachDayEvents() {
        // Toggle day enable/disable
        daysContainer.querySelectorAll<HTMLInputElement>('.day-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => {
                const day = toggle.dataset.day as Weekday;
                dayConfigs[day].enabled = toggle.checked;
                const card = daysContainer.querySelector(`.rb-day-card[data-day="${day}"]`) as HTMLElement;
                card.classList.toggle('rb-day-enabled', toggle.checked);

                // Enable/disable inputs and buttons inside
                card.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input[type="time"], button.add-slot-btn, button.remove-slot-btn').forEach(el => {
                    (el as HTMLInputElement).disabled = !toggle.checked;
                });
            });
        });

        // Add slot
        daysContainer.querySelectorAll<HTMLButtonElement>('.add-slot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const day = btn.dataset.day as Weekday;
                dayConfigs[day].slots.push({ start_time: '09:00', end_time: '18:00' });
                refreshSlots(day);
            });
        });

        // Initial slot events
        WEEKDAYS.forEach(({ key }) => attachSlotEvents(key));
    }

    // ── Load resources ────────────────────────────────────────────────────────
    async function loadResources() {
        try {
            const res = await getResources();
            resourceSel.innerHTML = '<option value="" disabled selected>Selecciona un recurso</option>';
            res.data.forEach((r: Resource) => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.name;
                resourceSel.appendChild(opt);
            });
        } catch (err: any) {
            showMessage(`Error al cargar recursos: ${err.message}`, 'error');
        }
    }

    // ── Load schedules when resource changes ──────────────────────────────────
    resourceSel.addEventListener('change', async () => {
        const resourceId = resourceSel.value;
        scheduleSel.disabled = true;
        scheduleSel.innerHTML = '<option value="" disabled selected>Cargando horarios…</option>';
        try {
            const res = await getRecurringSchedules(resourceId);
            scheduleSel.innerHTML = '<option value="" disabled selected>Selecciona un horario</option>';
            if (res.data.length === 0) {
                scheduleSel.innerHTML = '<option value="" disabled selected>Sin horarios recurrentes</option>';
                showMessage('Este recurso no tiene horarios recurrentes. Crea uno primero en "Crear Horario Semanal".', 'error');
            } else {
                res.data.forEach((s: RecurringSchedule) => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `Horario ${s.id.slice(0, 8)}… (desde ${s.start_date})`;
                    scheduleSel.appendChild(opt);
                });
                scheduleSel.disabled = false;
                messageEl.className = 'message hidden';
            }
        } catch (err: any) {
            showMessage(`Error al cargar horarios: ${err.message}`, 'error');
        }
    });

    // ── Submit ────────────────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const resourceId = resourceSel.value;
        const scheduleId = scheduleSel.value;

        if (!resourceId || !scheduleId) {
            showMessage('Por favor selecciona un recurso y un horario.', 'error');
            return;
        }

        // Build list of blocks to create
        const blocks: RecurringScheduleBlockData[] = [];
        WEEKDAYS.forEach(({ key }) => {
            const cfg = dayConfigs[key];
            if (!cfg.enabled) return;
            cfg.slots.forEach(slot => {
                if (!slot.start_time || !slot.end_time) return;
                // Hapio requires H:i:s format; HTML time input returns HH:MM, so we append :00
                const toApiTime = (t: string) => t.length === 5 ? `${t}:00` : t;
                blocks.push({
                    weekday: key,
                    start_time: toApiTime(slot.start_time),
                    end_time: toApiTime(slot.end_time),
                });
            });
        });

        if (blocks.length === 0) {
            showMessage('Activa al menos un día y define una franja horaria.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitText.textContent = `Guardando 0 / ${blocks.length}…`;
        messageEl.className = 'message hidden';

        const errors: string[] = [];
        let created = 0;

        for (const block of blocks) {
            try {
                await createRecurringScheduleBlock(resourceId, scheduleId, block);
                created++;
                submitText.textContent = `Guardando ${created} / ${blocks.length}…`;
            } catch (err: any) {
                errors.push(`${block.weekday} ${block.start_time}–${block.end_time}: ${err.message}`);
            }
        }

        submitBtn.disabled = false;
        submitText.textContent = 'Guardar Bloques';

        if (errors.length === 0) {
            showMessage(`✓ ${created} bloque${created !== 1 ? 's' : ''} creado${created !== 1 ? 's' : ''} con éxito.`, 'success');
        } else if (created > 0) {
            showMessage(`⚠ ${created} bloque(s) creados. Errores:\n${errors.join('\n')}`, 'error');
        } else {
            showMessage(`Error al crear bloques:\n${errors.join('\n')}`, 'error');
        }
    });

    // ── Reset ─────────────────────────────────────────────────────────────────
    resetBtn.addEventListener('click', () => {
        WEEKDAYS.forEach(({ key }) => {
            dayConfigs[key] = {
                enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(key),
                slots: [{ start_time: '09:00', end_time: '18:00' }],
            };
        });
        renderDays();
        messageEl.className = 'message hidden';
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function showMessage(text: string, type: 'success' | 'error') {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    renderDays();
    loadResources();
}
