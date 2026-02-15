import { createLocation, LocationData, ResourceSelectionStrategy } from '../api/hapio';

export function renderLocationForm(container: HTMLElement): void {
    container.innerHTML = `
    <div class="form-container">
      <h1>Create Location</h1>
      <form id="location-form">
        <div class="form-group">
          <label for="name">Location Name</label>
          <input type="text" id="name" name="name" placeholder="e.g. Headquarters" required maxlength="100">
        </div>
        
        <div class="form-group">
          <label for="time_zone">Time Zone</label>
          <select id="time_zone" name="time_zone" required>
            <option value="" disabled selected>Loading time zones...</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="strategy">Resource Selection Strategy</label>
          <select id="strategy" name="resource_selection_strategy" required>
            <option value="randomize">Randomize</option>
            <option value="prioritize">Prioritize</option>
            <option value="equalize">Equalize</option>
          </select>
        </div>
        
        <button type="submit" id="submit-btn">Create Location</button>
      </form>
      <div id="status-message" class="status-message"></div>
    </div>
  `;

    // Dynamic Timezone Loading
    const timeZoneSelect = container.querySelector('#time_zone') as HTMLSelectElement;
    try {
        const timeZones = Intl.supportedValuesOf('timeZone');
        const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        timeZoneSelect.innerHTML = timeZones.map(tz =>
            `<option value="${tz}" ${tz === localTimeZone ? 'selected' : ''}>${tz}</option>`
        ).join('');

        // If local timezone is not in the list (rare), ensure something is selected
        if (!timeZoneSelect.value && timeZones.length > 0) {
            timeZoneSelect.value = timeZones[0];
        }
    } catch (e) {
        console.error('Error loading time zones:', e);
        timeZoneSelect.innerHTML = `
      <option value="UTC">UTC</option>
      <option value="Europe/Madrid">Europe/Madrid</option>
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
            resource_selection_strategy: formData.get('resource_selection_strategy') as ResourceSelectionStrategy
        };

        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating...';

        try {
            const result = await createLocation(data);
            console.log('Location created:', result);

            statusEl.className = 'status-message success';
            statusEl.innerText = `Success! Location "${result.name}" created. (ID: ${result.id})`;
            form.reset();
        } catch (error: any) {
            console.error('Error:', error);
            statusEl.className = 'status-message error';
            statusEl.innerText = `Error: ${error.message}`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Create Location';
        }
    });
}
