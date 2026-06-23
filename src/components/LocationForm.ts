import { createLocation, LocationData, ResourceSelectionStrategy } from '../api/hapio';

export function renderLocationForm(container: HTMLElement): void {
    container.innerHTML = `
    <div class="form-container">
      <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem; text-align: center; color: white;">
        Crear Localización
      </h1>
      <form id="location-form">
        <div class="form-group">
          <label for="name">Nombre de la Sede / Localización</label>
          <input type="text" id="name" name="name" placeholder="Ej. Consultorio Norte" required maxlength="100">
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label for="time_zone">Zona Horaria</label>
            <select id="time_zone" name="time_zone" required>
              <option value="" disabled selected>Cargando zonas horarias...</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="strategy">Estrategia de Asignación</label>
            <select id="strategy" name="resource_selection_strategy" required>
              <option value="randomize">Aleatorio (Randomize)</option>
              <option value="prioritize">Priorizar (Prioritize)</option>
              <option value="equalize">Equilibrar (Equalize)</option>
            </select>
          </div>
        </div>

        <!-- Dirección Detallada (Metadatos) -->
        <div style="
            font-size: 0.9rem;
            font-weight: 700;
            color: #818cf8;
            margin: 1.75rem 0 1rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 0.4rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        ">
            <span>📍</span> Dirección de la Sede (Metadatos)
        </div>

        <div class="form-group">
          <label for="address_street">AV / Calle / Manzana</label>
          <input type="text" id="address_street" name="address_street" placeholder="Ej. Av. de los Álamos o Manzana 14" required>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label for="address_number">Número</label>
            <input type="text" id="address_number" name="address_number" placeholder="Ej. 1024" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="address_floor">Piso</label>
            <input type="text" id="address_floor" name="address_floor" placeholder="Ej. 4 (Opcional)">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="address_local">Local / Depto</label>
            <input type="text" id="address_local" name="address_local" placeholder="Ej. A (Opcional)">
          </div>
        </div>
        
        <button type="submit" id="submit-btn" style="
            width: 100%;
            padding: 0.85rem;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        ">Crear Localización</button>
      </form>
      <div id="status-message" class="status-message"></div>
    </div>
  `;

    // Dynamic Timezone Loading
    const timeZoneSelect = container.querySelector('#time_zone') as HTMLSelectElement;
    try {
        const timeZones = Intl.supportedValuesOf('timeZone').filter(tz => tz.startsWith('America/'));
        const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        timeZoneSelect.innerHTML = timeZones.map(tz =>
            `<option value="${tz}" ${tz === localTimeZone ? 'selected' : ''}>${tz}</option>`
        ).join('');

        if (!timeZoneSelect.value && timeZones.length > 0) {
            timeZoneSelect.value = timeZones[0];
        }
    } catch (e) {
        console.error('Error loading time zones:', e);
        timeZoneSelect.innerHTML = `
          <option value="America/Bogota">America/Bogota</option>
          <option value="America/Mexico_City">America/Mexico_City</option>
          <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
          <option value="America/New_York">America/New_York</option>
        `;
    }

    const form = container.querySelector('#location-form') as HTMLFormElement;
    const statusEl = container.querySelector('#status-message') as HTMLDivElement;
    const submitBtn = container.querySelector('#submit-btn') as HTMLButtonElement;

    form.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        // Reset status
        statusEl.className = 'status-message';
        statusEl.innerText = '';

        const formData = new FormData(form);
        const data: LocationData = {
            name: formData.get('name') as string,
            time_zone: formData.get('time_zone') as string,
            resource_selection_strategy: formData.get('resource_selection_strategy') as ResourceSelectionStrategy,
            metadata: {
                address: {
                    street: formData.get('address_street') as string,
                    number: formData.get('address_number') as string,
                    floor: (formData.get('address_floor') as string) || null,
                    local: (formData.get('address_local') as string) || null
                }
            }
        };

        submitBtn.disabled = true;
        submitBtn.innerText = 'Creando...';

        try {
            const result = await createLocation(data);
            console.log('Location created:', result);

            statusEl.className = 'status-message success';
            statusEl.innerText = `¡Éxito! Localización "${result.name}" creada. (ID: ${result.id})`;
            form.reset();
        } catch (error: any) {
            console.error('Error:', error);
            statusEl.className = 'status-message error';
            statusEl.innerText = `Error: ${error.message}`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Crear Localización';
        }
    });
}
