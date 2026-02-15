import { getLocations, deleteLocation, updateLocation, Location } from '../api/hapio';

export function renderLocationList(container: HTMLElement): void {
    container.innerHTML = `
    <div class="list-container">
      <h1>All Locations</h1>
      <div id="locations-status" class="status-message"></div>
      <div id="loading" class="loading-spinner"></div>
      <div id="locations-grid" class="locations-grid"></div>
    </div>
  `;

    const gridEl = container.querySelector('#locations-grid') as HTMLDivElement;
    const loaderEl = container.querySelector('#loading') as HTMLDivElement;
    const statusEl = container.querySelector('#locations-status') as HTMLDivElement;

    async function loadLocations(): Promise<void> {
        try {
            loaderEl.style.display = 'block';
            gridEl.innerHTML = '';
            statusEl.style.display = 'none';

            const response = await getLocations();
            loaderEl.style.display = 'none';

            const locations: Location[] = response.data;

            if (locations.length === 0) {
                statusEl.className = 'status-message success';
                statusEl.innerText = 'No locations found. Create one to get started!';
                statusEl.style.display = 'block';
                return;
            }

            gridEl.innerHTML = locations.map(loc => `
        <div class="location-card" data-id="${loc.id}">
          <button class="card-menu-btn" title="Opciones">⋮</button>
          <div class="dropdown-menu">
            <button class="dropdown-item delete" data-action="delete">
               Eliminar
            </button>
          </div>
          <div class="location-name">${loc.name}</div>
          <div class="location-info"><strong>Time Zone:</strong> ${loc.time_zone}</div>
          <div class="location-info"><strong>Strategy:</strong> ${loc.resource_selection_strategy}</div>
          
          <div class="location-status-container">
            <span class="status-label">${loc.enabled ? 'Enabled' : 'Disabled'}</span>
            <label class="switch">
              <input type="checkbox" data-action="toggle-status" ${loc.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          ${loc.id ? `<div class="location-info" style="margin-top: 0.5rem; font-family: monospace; font-size: 0.7rem;">ID: ${loc.id}</div>` : ''}
        </div>
      `).join('');

        } catch (error: any) {
            console.error('Error loading locations:', error);
            loaderEl.style.display = 'none';
            statusEl.className = 'status-message error';
            statusEl.innerText = `Error loading locations: ${error.message}`;
            statusEl.style.display = 'block';
        }
    }

    function setupEventListeners(): void {
        console.log('Setting up LocationList event listeners');

        // Single delegated listener for the grid
        gridEl.addEventListener('click', async (e: Event) => {
            const target = e.target as HTMLElement;
            console.log('Location list click target:', target);

            // 1. Menu buttons (⋮)
            if (target.classList.contains('card-menu-btn')) {
                e.stopPropagation();
                const menu = target.nextElementSibling as HTMLElement;
                console.log('Toggling menu');
                // Close other menus
                gridEl.querySelectorAll('.dropdown-menu.show').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                menu.classList.toggle('show');
                return;
            }

            // 2. Delete actions
            const deleteBtn = target.closest('[data-action="delete"]') as HTMLElement;
            if (deleteBtn) {
                console.log('Delete action detected');
                e.stopPropagation();

                // Close menu first so it's not "stuck" while confirm is open
                const menu = deleteBtn.closest('.dropdown-menu') as HTMLElement;
                menu.classList.remove('show');

                const card = deleteBtn.closest('.location-card') as HTMLDivElement;
                const id = card.dataset.id!;
                const name = (card.querySelector('.location-name') as HTMLElement).innerText;

                // Minimal delay to ensure menu visual update before blocking UI
                setTimeout(async () => {
                    const confirmed = confirm(`¿Estás seguro de que quieres eliminar la localización "${name}"?`);
                    console.log('Delete confirmed:', confirmed);

                    if (confirmed) {
                        try {
                            statusEl.className = 'status-message success';
                            statusEl.innerText = `Eliminando "${name}"...`;
                            statusEl.style.display = 'block';

                            await deleteLocation(id);

                            statusEl.innerText = `Localización "${name}" eliminada correctamente.`;
                            loadLocations();
                        } catch (error: any) {
                            console.error('Delete error:', error);
                            statusEl.className = 'status-message error';
                            statusEl.innerText = `Error al eliminar: ${error.message}`;
                            statusEl.style.display = 'block';
                        }
                    }
                }, 10);
                return;
            }
        });

        // Toggle status listener (separate because it's a 'change' event)
        gridEl.addEventListener('change', async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.dataset.action === 'toggle-status') {
                const card = target.closest('.location-card') as HTMLDivElement;
                const id = card.dataset.id!;
                const name = (card.querySelector('.location-name') as HTMLElement).innerText;
                const enabled = target.checked;
                const label = card.querySelector('.status-label') as HTMLSpanElement;

                console.log('Toggling status for', name, 'to', enabled);

                try {
                    label.innerText = enabled ? 'Enabling...' : 'Disabling...';
                    target.disabled = true;
                    await updateLocation(id, { enabled });
                    label.innerText = enabled ? 'Enabled' : 'Disabled';
                    target.disabled = false;
                } catch (error: any) {
                    console.error('Update status error:', error);
                    target.checked = !enabled;
                    label.innerText = !enabled ? 'Enabled' : 'Disabled';
                    target.disabled = false;
                    statusEl.className = 'status-message error';
                    statusEl.innerText = `Error al actualizar estado de "${name}": ${error.message}`;
                    statusEl.style.display = 'block';
                }
            }
        });

        // Close menus on click outside
        const documentClickHandler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.location-card')) {
                gridEl.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
            }
        };
        document.addEventListener('click', documentClickHandler);

        // Note: In a larger app, we'd need to remove this listener when the component is destroyed.
    }

    // Initial setup
    setupEventListeners();
    loadLocations();
}
