import './style.css'
import { renderLocationForm } from './components/LocationForm'
import { renderLocationList } from './components/LocationList'
import { renderResourceList } from './components/ResourceList'
import { renderResourceForm } from './components/ResourceForm'
import { renderServiceList } from './components/ServiceList'
import { renderServiceForm } from './components/ServiceForm'
import { renderScheduleForm } from './components/ScheduleForm'
import { renderScheduleList } from './components/ScheduleList'
import { renderScheduleBlockForm } from './components/ScheduleBlockForm'
import { renderScheduleBlockList } from './components/ScheduleBlockList'
import { renderRecurringBlockForm } from './components/RecurringBlockForm'
import { renderRecurringBlockList } from './components/RecurringBlockList'
import { renderHome } from './components/Home'
import { getProject } from './api/hapio'

const app = document.querySelector('#app') as HTMLElement;

function renderApp(): void {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header" data-view="home">
        <div class="sidebar-logo"></div>
        <div class="sidebar-header-text">
          <span class="sidebar-title">Hapio Portal</span>
          <div id="project-info" class="project-info">Cargando...</div>
        </div>
      </div>
      
      <nav class="sidebar-menu">
        <div class="menu-item expanded" id="menu-loc">
          <div class="menu-header">
            <span>Localización</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
          <div class="nav-link active" data-view="list" data-tooltip="Ver y gestionar las sedes físicas">
              <span class="nav-link-icon">.</span>
              Ver Localizaciones
            </div>
            <div class="nav-link" data-view="create" data-tooltip="Registrar una nueva sede">
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
            <div class="nav-link" data-view="resources-list" data-tooltip="Listar personal o salas disponibles">
              <span class="nav-link-icon">.</span>
              Ver Recursos
            </div>
            <div class="nav-link" data-view="resources-create" data-tooltip="Añadir personal o equipamiento">
              <span class="nav-link-icon">.</span>
              Crear Nuevo Recurso
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-ser">
          <div class="menu-header">
            <span>Servicios</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="services-list" data-tooltip="Consultar el catálogo de servicios">
              <span class="nav-link-icon">.</span>
              Ver Servicios
            </div>
            <div class="nav-link" data-view="services-create" data-tooltip="Definir un nuevo tipo de cita">
              <span class="nav-link-icon">.</span>
              Nuevo Servicio
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-sch">
          <div class="menu-header">
            <span>Horarios</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="schedules-list" data-tooltip="Ver turnos rotativos de recursos">
              <span class="nav-link-icon">.</span>
              Ver Horarios Semanales
            </div>
            <div class="nav-link" data-view="schedules-create" data-tooltip="Establecer un nuevo horario base">
              <span class="nav-link-icon">.</span>
              Crear Horario Semanal
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-blo">
          <div class="menu-header">
            <span>Bloques</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="blocks-list" data-tooltip="Consultar bloques de tiempo específicos">
              <span class="nav-link-icon">.</span>
               Ver Bloques de Horario
            </div>
            <div class="nav-link" data-view="blocks-create" data-tooltip="Añadir un bloque puntual">
              <span class="nav-link-icon">.</span>
               Crear Bloque de Horario
            </div>
            <div class="nav-link" data-view="blocks-recurring-list" data-tooltip="Patrones semanales de disponibilidad">
              <span class="nav-link-icon">.</span>
               Ver Bloques Recurrentes
            </div>
            <div class="nav-link" data-view="blocks-create-recurring" data-tooltip="Definir turnos que se repiten">
              <span class="nav-link-icon">.</span>
               Crear Bloque Recurrente
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
    } else if (viewName === 'services-list') {
      renderServiceList(content);
    } else if (viewName === 'services-create') {
      renderServiceForm(content);
    } else if (viewName === 'schedules-create') {
      renderScheduleForm(content);
    } else if (viewName === 'schedules-list') {
      renderScheduleList(content);
    } else if (viewName === 'blocks-create') {
      renderScheduleBlockForm(content);
    } else if (viewName === 'blocks-recurring-list') {
      renderRecurringBlockList(content);
    } else if (viewName === 'blocks-create-recurring') {
      renderRecurringBlockForm(content);
    } else if (viewName === 'blocks-list') {
      renderScheduleBlockList(content);
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

  // Load project info
  async function loadProjectInfo() {
    const projectInfoEl = app.querySelector('#project-info') as HTMLElement;
    try {
      const response = await getProject();
      const project = (response as any).data || response;
      projectInfoEl.textContent = project.name || `ID: ${project.id}`;
      projectInfoEl.classList.add('loaded');
    } catch (error) {
      console.error('Error fetching project info:', error);
      projectInfoEl.textContent = 'Proyecto desconocido';
    }
  }

  loadProjectInfo();
}

renderApp();
