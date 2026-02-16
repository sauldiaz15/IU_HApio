import { createResource, ResourceData } from '../api/hapio';

export function renderResourceForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Nuevo Recurso</h2>
            <p>Añade un nuevo recurso para gestionar tus reservas.</p>
        </div>

        <div class="card">
            <form id="resource-form" class="form">
                <div class="form-group">
                    <label for="name">Nombre del Recurso</label>
                    <input type="text" id="name" name="name" required placeholder="Ej. Sala de Conferencias A">
                </div>

                <div class="form-group">
                    <label for="max_simultaneous_bookings">Reservas Simultáneas Máximas</label>
                    <input type="number" id="max_simultaneous_bookings" name="max_simultaneous_bookings" min="1" placeholder="Ej. 1 (dejar vacío para sin límite)">
                </div>

                <div class="form-group">
                    <div class="toggle-container">
                        <span class="label-text">Habilitar recurso</span>
                        <label class="switch">
                            <input type="checkbox" id="enabled" name="enabled" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Recurso</button>
                    <button type="reset" class="btn btn-secondary">Limpiar</button>
                </div>
            </form>
        </div>
    `;

    const form = container.querySelector('#resource-form') as HTMLFormElement;
    const messageEl = container.querySelector('#form-message') as HTMLElement;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const resourceData: ResourceData = {
            name: formData.get('name') as string,
            max_simultaneous_bookings: formData.get('max_simultaneous_bookings')
                ? parseInt(formData.get('max_simultaneous_bookings') as string)
                : null,
            enabled: formData.get('enabled') === 'on'
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            await createResource(resourceData);

            messageEl.textContent = '¡Recurso creado con éxito!';
            messageEl.className = 'message success';
            form.reset();
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Recurso';
        }
    });
}
