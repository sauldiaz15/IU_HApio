import { createResource, ResourceData } from '../api/hapio';

export function renderResourceForm(container: HTMLElement): void {
    container.innerHTML = `
        <div class="view-header">
            <h2>Crear Nuevo Especialista</h2>
            <p>Añade un nuevo especialista para gestionar tus reservas.</p>
        </div>

        <div class="card">
            <form id="resource-form" class="form">
                <div class="form-group">
                    <label for="name">Nombre del Especialista <span class="required-mark">*</span></label>
                    <input type="text" id="name" name="name" required placeholder="Ej. Dr. Alejandro Gómez">
                </div>

                <div class="form-section" style="margin-top: 1.5rem; margin-bottom: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem; color: #10b981;">Datos de Identificación y Contacto</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="document">Documento de Identidad</label>
                            <input type="text" id="document" name="document" placeholder="Ej. V-12345678">
                        </div>
                        <div class="form-group">
                            <label for="mpps">Registro MPPS (Acreditación)</label>
                            <input type="text" id="mpps" name="mpps" placeholder="Ej. MPPS-98765">
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="phone">Teléfono</label>
                            <input type="tel" id="phone" name="phone" placeholder="Ej. +58 412 1234567">
                        </div>
                        <div class="form-group">
                            <label for="email">Correo Electrónico</label>
                            <input type="email" id="email" name="email" placeholder="Ej. doctor@clinica.com">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="max_simultaneous_bookings">Reservas Simultáneas Máximas</label>
                    <input type="number" id="max_simultaneous_bookings" name="max_simultaneous_bookings" min="1" placeholder="Ej. 1 (dejar vacío para sin límite)">
                </div>

                <div class="form-group">
                    <div class="toggle-container">
                        <span class="label-text">Habilitar especialista</span>
                        <label class="switch">
                            <input type="checkbox" id="enabled" name="enabled" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div id="form-message" class="message hidden"></div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Crear Especialista</button>
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
            enabled: formData.get('enabled') === 'on',
            metadata: {
                document: (formData.get('document') as string || '').trim(),
                mpps: (formData.get('mpps') as string || '').trim(),
                phone: (formData.get('phone') as string || '').trim(),
                email: (formData.get('email') as string || '').trim(),
            }
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            messageEl.className = 'message hidden';

            await createResource(resourceData);

            messageEl.textContent = '¡Especialista creado con éxito!';
            messageEl.className = 'message success';
            form.reset();
        } catch (error: any) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Especialista';
        }
    });
}
