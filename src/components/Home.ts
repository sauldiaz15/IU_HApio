export function renderHome(container: HTMLElement): void {
    container.innerHTML = `
        <div class="home-container">
            <div class="hero-section">
                <!-- Fallback gradient if image fails to load -->
                <div class="hero-overlay">
                    <h1>Bienvenido a Hapio Portal</h1>
                    <p>La plataforma integral para gestionar tus reservas</p>
                </div>
            </div>

            <p class="welcome-text">
                Hapio API es una interfaz de programación (API) que sirve para integrar y gestionar sistemas de reservas y programación de citas o especialistas dentro de aplicaciones o sitios web.
            </p>

            <div class="benefits-grid">
                <div class="benefit-card">
                    <span class="benefit-icon">🤖</span>
                    <h3>Automatizar reservas y citas</h3>
                    <p>Permite a tus clientes reservar especialidades de forma automática y en tiempo real.</p>
                </div>

                <div class="benefit-card">
                    <span class="benefit-icon">🗓️</span>
                    <h3>Gestionar disponibilidad</h3>
                    <p>Consulta, crea, modifica o cancela reservas desde cualquier aplicación conectada.</p>
                </div>

                <div class="benefit-card">
                    <span class="benefit-icon">🔗</span>
                    <h3>Integración Total</h3>
                    <p>Conéctate con CRM, pasarelas de pago y herramientas de terceros fácilmente.</p>
                </div>

                <div class="benefit-card">
                    <span class="benefit-icon">🔔</span>
                    <h3>Notificaciones</h3>
                    <p>Envía confirmaciones y recordatorios automáticos por Email, SMS o Push.</p>
                </div>

                <div class="benefit-card">
                    <span class="benefit-icon">📊</span>
                    <h3>Informes y Análisis</h3>
                    <p>Optimiza tu negocio con datos y estadísticas detalladas sobre tendencias.</p>
                </div>

                <div class="benefit-card">
                    <span class="benefit-icon">🚀</span>
                    <h3>Escalable</h3>
                    <p>Diseñada para cualquier tipo de negocio, escalando según tu demanda.</p>
                </div>
            </div>
        </div>
    `;
}
