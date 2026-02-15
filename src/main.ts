import './style.css'
import { renderLocationForm } from './components/LocationForm'
import { renderLocationList } from './components/LocationList'

const app = document.querySelector('#app') as HTMLElement;

function renderApp(): void {
    app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo"></div>
        <span class="sidebar-title">Hapio Portal</span>
      </div>
      
      <nav class="sidebar-menu">
        <div class="menu-item">
          <div class="menu-header">Localización</div>
          <div class="sub-menu">
            <div class="nav-link active" data-view="list">
              <span class="nav-link-icon">.</span>
              Ver Localizaciones
            </div>
            <div class="nav-link" data-view="create">
              <span class="nav-link-icon">.</span>
              Crear Nueva
            </div>
          </div>
        </div>
      </nav>
    </aside>
    
    <main class="main-content">
      <div id="content"></div>
    </main>
  `;

    const content = app.querySelector('#content') as HTMLElement;
    const navLinks = app.querySelectorAll<HTMLElement>('.nav-link');

    function switchView(viewName: string): void {
        // Update active state in sidebar
        navLinks.forEach(link => {
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Clear and render new view
        content.innerHTML = '';
        if (viewName === 'create') {
            renderLocationForm(content);
        } else {
            renderLocationList(content);
        }
    }

    // Event Listeners for sidebar links
    navLinks.forEach(link => {
        link.addEventListener('click', () => switchView(link.dataset.view!));
    });

    // Initial View
    switchView('list');
}

renderApp();
