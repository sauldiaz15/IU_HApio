import './style.css'
import { renderLocationForm } from './components/LocationForm'
import { renderLocationList } from './components/LocationList'
import { renderResourceList } from './components/ResourceList'
import { renderResourceForm } from './components/ResourceForm'
import { renderResourceSchedule } from './components/ResourceSchedule'
import { renderServiceList } from './components/ServiceList'
import { renderServiceForm } from './components/ServiceForm'
import { renderScheduleForm } from './components/ScheduleForm'
import { renderScheduleList } from './components/ScheduleList'
import { renderScheduleBlockForm } from './components/ScheduleBlockForm'
import { renderScheduleBlockList } from './components/ScheduleBlockList'
import { renderRecurringBlockForm } from './components/RecurringBlockForm'
import { renderRecurringBlockList } from './components/RecurringBlockList'
import { renderHome } from './components/Home'
import { renderDashboard } from './components/Dashboard'
import { renderBookingForm } from './components/BookingForm'
import { renderBookingList } from './components/BookingList'
import { renderBookingEdit } from './components/BookingEdit'
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
        <div class="nav-link" data-view="dashboard" data-tooltip="Visión general del sistema">
          <span class="nav-link-icon">📊</span>
          Dashboard
        </div>

        <div class="menu-item expanded" id="menu-loc">
          <div class="menu-header">
            <span>Consultorio</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
          <div class="nav-link active" data-view="list" data-tooltip="Ver y gestionar los consultorios">
              <span class="nav-link-icon">.</span>
              Ver Consultorios
            </div>
            <div class="nav-link" data-view="create" data-tooltip="Registrar un nuevo consultorio">
              <span class="nav-link-icon">.</span>
              Crear Nueva
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-res">
          <div class="menu-header">
            <span>Especialistas</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="resources-list" data-tooltip="Listar especialistas disponibles">
              <span class="nav-link-icon">.</span>
              Ver Especialistas
            </div>
            <div class="nav-link" data-view="resources-create" data-tooltip="Añadir especialista">
              <span class="nav-link-icon">.</span>
              Crear Nuevo Especialista
            </div>
            <div class="nav-link" data-view="resources-schedule" data-tooltip="Ver detalles y horarios del especialista">
              <span class="nav-link-icon">.</span>
              Detalles Del Especialista
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-ser">
          <div class="menu-header">
            <span>Especialidades</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="services-list" data-tooltip="Consultar el catálogo de especialidades">
              <span class="nav-link-icon">.</span>
              Ver Especialidades
            </div>
            <div class="nav-link" data-view="services-create" data-tooltip="Definir una nueva especialidad">
              <span class="nav-link-icon">.</span>
              Nueva Especialidad
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-sch">
          <div class="menu-header">
            <span>Horarios</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="schedules-list" data-tooltip="Lista los horarios semanales creados (Paso 1 de 2). Son el marco que define el consultorio y el período de vigencia. Deben tener Turnos Recurrentes para generar disponibilidad real.">
              <span class="nav-link-icon">.</span>
              Ver Horarios Semanales
            </div>
            <div class="nav-link" data-view="schedules-create" data-tooltip="Crea el marco del horario semanal (Paso 1 de 2): define en qué consultorio aplica y desde cuándo hasta cuándo estará activo. Luego debes agregarle días y horas en Turnos Recurrentes.">
              <span class="nav-link-icon">.</span>
              Crear Horario Semanal
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-blo">
          <div class="menu-header">
            <span>Turnos</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="blocks-list" data-tooltip="Turnos excepcionales para fechas específicas: excepciones al horario habitual del especialista, feriados o días especiales con disponibilidad o bloqueo">
              <span class="nav-link-icon">.</span>
               Ver Turnos Excepcionales
            </div>
            <div class="nav-link" data-view="blocks-create" data-tooltip="Crea un turno excepcional para una fecha y hora exacta: bloquear un día de vacaciones, habilitar una consulta especial un sábado, etc.">
              <span class="nav-link-icon">.</span>
               Crear Turno Excepcional
            </div>
            <div class="nav-link" data-view="blocks-recurring-list" data-tooltip="Turnos recurrentes: el horario semanal base del especialista (ej. lunes a viernes de 9am a 6pm). Se repiten automáticamente cada semana">
              <span class="nav-link-icon">.</span>
               Ver Turnos Recurrentes
            </div>
            <div class="nav-link" data-view="blocks-create-recurring" data-tooltip="Define el horario habitual semanal del especialista: qué días trabaja y en qué horario. Se aplica semana a semana automáticamente">
              <span class="nav-link-icon">.</span>
               Crear Turno Recurrente
            </div>
          </div>
        </div>

        <div class="menu-item" id="menu-bookings">
          <div class="menu-header">
            <span>📅 Reservas</span>
            <span class="menu-arrow">▼</span>
          </div>
          <div class="sub-menu">
            <div class="nav-link" data-view="bookings-create" data-tooltip="Registrar una nueva reserva">
              <span class="nav-link-icon">.</span>
               Crear Nueva Reserva
            </div>
            <div class="nav-link" data-view="bookings-list" data-tooltip="Ver y gestionar todas las reservas">
              <span class="nav-link-icon">.</span>
               Listar Todas Las Reservas
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
    } else if (viewName === 'resources-schedule') {
      renderResourceSchedule(content);
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
    } else if (viewName === 'bookings-create') {
      renderBookingForm(content);
    } else if (viewName === 'bookings-edit') {
      renderBookingEdit(content);
    } else if (viewName === 'bookings-list') {
      renderBookingList(content);
    } else if (viewName === 'home') {
      renderHome(content);
    } else if (viewName === 'dashboard') {
      renderDashboard(content);
    } else {
      renderLocationList(content);
    }
  }

  // Event Listeners for sidebar links
  navLinks.forEach(link => {
    link.addEventListener('click', () => switchView(link.dataset.view!));
  });

  // Global event: any component can dispatch 'navigate-view' to change the current view
  document.addEventListener('navigate-view', (e: Event) => {
    const detail = (e as CustomEvent<{ view: string }>).detail;
    if (detail?.view) switchView(detail.view);
  });

  // Initial View
  switchView('home');

  // Load project info
  async function loadProjectInfo() {
    const projectInfoEl = app.querySelector('#project-info') as HTMLElement;
    const cachedProjectName = localStorage.getItem('hapio_project_name');
    if (cachedProjectName) {
      projectInfoEl.textContent = cachedProjectName;
      projectInfoEl.classList.add('loaded');
      return;
    }

    try {
      const response = await getProject();
      const project = (response as any).data || response;
      const projectName = project.name || `ID: ${project.id}`;
      localStorage.setItem('hapio_project_name', projectName);
      projectInfoEl.textContent = projectName;
      projectInfoEl.classList.add('loaded');
    } catch (error) {
      console.error('Error fetching project info:', error);
      projectInfoEl.textContent = 'Proyecto desconocido';
    }
  }

  loadProjectInfo();
}

renderApp();
