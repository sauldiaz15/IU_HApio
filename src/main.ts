import './style.css'
import { renderLocationForm } from './components/LocationForm'
import { renderLocationList } from './components/LocationList'
import { renderResourceList } from './components/ResourceList'
import { renderResourceForm } from './components/ResourceForm'
import { renderHome } from './components/Home'

const app = document.querySelector('#app') as HTMLElement;

function renderApp(): void {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header" data-view="home">
        <div class="sidebar-logo"></div>
        <span class="sidebar-title">Hapio Portal</span>
      </div>
      
      <nav class="sidebar-menu">
        <div class="menu-item expanded" id="menu-loc">
          <div class="menu-header">
            <span>Localización</span>
            <span class="menu-arrow">▼</span>
          </div>
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

        <div class="menu-item" id="menu-res">
          <div class="menu-header">
            <span>Recursos</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="resources-list">
              <span class="nav-link-icon">.</span>
              Ver Recursos
            </div>
            <div class="nav-link" data-view="resources-create">
              <span class="nav-link-icon">.</span>
              Crear Nuevo Recurso
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
  const menuItems = app.querySelectorAll<HTMLElement>('.menu-item');
  const sidebarHeader = app.querySelector('.sidebar-header') as HTMLElement;

  // Sidebar header link
  sidebarHeader.addEventListener('click', () => switchView('home'));

  // Menu toggle logic
  menuItems.forEach(item => {
    const header = item.querySelector('.menu-header') as HTMLElement;
    header.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });

  function switchView(viewName: string): void {
    // Update active state in sidebar
    navLinks.forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add('active');
        // Ensure parent menu is expanded
        link.closest('.menu-item')?.classList.add('expanded');
      } else {
        link.classList.remove('active');
      }
    });

    // Clear and render new view
    content.innerHTML = '';
    if (viewName === 'create') {
      renderLocationForm(content);
    } else if (viewName === 'resources-list') {
      renderResourceList(content);
    } else if (viewName === 'resources-create') {
      renderResourceForm(content);
    } else if (viewName === 'home') {
      renderHome(content);
    } else {
      renderLocationList(content);
    }
  }

  // Event Listeners for sidebar links
  navLinks.forEach(link => {
    link.addEventListener('click', () => switchView(link.dataset.view!));
  });

  // Initial View
  switchView('home');
}

renderApp();
