import { getLocations, deleteLocation } from '../api/hapio.js';

export function renderLocationList(container) {
  container.innerHTML = `
    <div class="list-container">
      <h1>All Locations</h1>
      <div id="locations-status" class="status-message"></div>
      <div id="loading" class="loading-spinner"></div>
      <div id="locations-grid" class="locations-grid"></div>
    </div>
  `;

  const gridEl = container.querySelector('#locations-grid');
  const loaderEl = container.querySelector('#loading');
  const statusEl = container.querySelector('#locations-status');

  async function loadLocations() {
    try {
      loaderEl.style.display = 'block';
      gridEl.innerHTML = '';
      statusEl.style.display = 'none';

      const response = await getLocations();
      loaderEl.style.display = 'none';
      
      const locations = response.data;
      
      if (locations.length === 0) {
        statusEl.className = 'status-message success';
        statusEl.innerText = 'No locations found. Create one to get started!';
        statusEl.style.display = 'block';
        return;
      }

      gridEl.innerHTML = locations.map(loc => `
        <div class="location-card" data-id="${loc.id}">
          <button class="card-menu-btn">⋮</button>
          <div class="dropdown-menu">
            <div class="dropdown-item delete" data-action="delete">
              <span>🗑️</span> Eliminar
            </div>
          </div>
          <div class="location-name">${loc.name}</div>
          <div class="location-info"><strong>Time Zone:</strong> ${loc.time_zone}</div>
          <div class="location-info"><strong>Strategy:</strong> ${loc.resource_selection_strategy}</div>
          <div class="location-tag">${loc.enabled ? 'Enabled' : 'Disabled'}</div>
          ${loc.id ? `<div class="location-info" style="margin-top: 0.5rem; font-family: monospace; font-size: 0.7rem;">ID: ${loc.id}</div>` : ''}
        </div>
      `).join('');

      setupEventListeners();
      
    } catch (error) {
      console.error('Error loading locations:', error);
      loaderEl.style.display = 'none';
      statusEl.className = 'status-message error';
      statusEl.innerText = `Error loading locations: ${error.message}`;
      statusEl.style.display = 'block';
    }
  }

  function setupEventListeners() {
    // Menu buttons
    const menuBtns = gridEl.querySelectorAll('.card-menu-btn');
    menuBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other menus
        gridEl.querySelectorAll('.dropdown-menu.show').forEach(m => {
          if (m !== btn.nextElementSibling) m.classList.remove('show');
        });
        btn.nextElementSibling.classList.toggle('show');
      });
    });

    // Close menus on click outside
    document.addEventListener('click', () => {
      gridEl.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    });

    // Delete actions
    const deleteBtns = gridEl.querySelectorAll('[data-action="delete"]');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const card = btn.closest('.location-card');
        const id = card.dataset.id;
        const name = card.querySelector('.location-name').innerText;

        if (confirm(`¿Estás seguro de que quieres eliminar la localización "${name}"?`)) {
          try {
            statusEl.className = 'status-message success';
            statusEl.innerText = `Eliminando "${name}"...`;
            statusEl.style.display = 'block';
            
            await deleteLocation(id);
            
            statusEl.innerText = `Localización "${name}" eliminada correctamente.`;
            // Refresh list
            loadLocations();
          } catch (error) {
            console.error('Delete error:', error);
            statusEl.className = 'status-message error';
            statusEl.innerText = `Error al eliminar: ${error.message}`;
            statusEl.style.display = 'block';
          }
        }
      });
    });
  }

  loadLocations();
}
