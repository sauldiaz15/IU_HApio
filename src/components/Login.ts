import { getResources } from '../api/hapio';
import { supabase, isSupabaseConfigured } from '../api/supabase';

export interface UserSession {
    username: string;
    role: 'admin' | 'user';
    resourceId?: string;
    resourceName?: string;
}

export function renderLogin(container: HTMLElement, onLoginSuccess: (session: UserSession) => void): void {
    if (isSupabaseConfigured) {
        // ─── SUPABASE MODE ───────────────────────────────────────────────────
        container.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="login-logo"></div>
                        <h2>Portal Citas Hapio</h2>
                        <p style="color: var(--primary-light); font-weight: 500; font-size: 0.82rem; background: rgba(168, 85, 247, 0.1); padding: 0.3rem 0.8rem; border-radius: 99px; display: inline-block; margin-top: 0.5rem; border: 1px solid rgba(168, 85, 247, 0.2);">
                            🔒 Autenticación Supabase
                        </p>
                    </div>

                    <form id="login-form">
                        <div class="form-group">
                            <label for="login-email">Correo Electrónico</label>
                            <div class="input-icon-wrapper">
                                <span class="input-icon">✉️</span>
                                <input type="email" id="login-email" required placeholder="correo@clinica.com">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="login-password">Contraseña</label>
                            <div class="input-icon-wrapper">
                                <span class="input-icon">🔒</span>
                                <input type="password" id="login-password" required placeholder="••••••••">
                                <button type="button" class="password-toggle" id="btn-toggle-password" title="Mostrar/ocultar contraseña">👁️</button>
                            </div>
                        </div>

                        <div id="login-error-msg" class="status-message error" style="margin-bottom: 1.5rem; margin-top: 0; display: none;"></div>

                        <button type="submit" class="login-btn" id="btn-submit-login">
                            🔑 Iniciar Sesión
                        </button>
                    </form>
                </div>
            </div>
        `;

        const form = container.querySelector('#login-form') as HTMLFormElement;
        const emailInput = container.querySelector('#login-email') as HTMLInputElement;
        const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
        const togglePasswordBtn = container.querySelector('#btn-toggle-password') as HTMLButtonElement;
        const errorMsg = container.querySelector('#login-error-msg') as HTMLDivElement;
        const submitBtn = container.querySelector('#btn-submit-login') as HTMLButtonElement;

        togglePasswordBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePasswordBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                togglePasswordBtn.textContent = '👁️';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Iniciando sesión...';

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                const user = data.user;
                if (!user) throw new Error('No se pudieron recuperar los detalles del usuario.');

                const metadata = user.user_metadata || {};
                const role = metadata.role === 'admin' ? 'admin' : 'user';
                const resourceId = metadata.resource_id || '';
                const resourceName = metadata.name || user.email || 'Usuario';

                if (role === 'user' && !resourceId) {
                    throw new Error('Su cuenta no tiene asignado un ID de Recurso de Hapio en sus metadatos.');
                }

                const session: UserSession = {
                    username: resourceName,
                    role,
                    resourceId: role === 'user' ? resourceId : undefined,
                    resourceName: role === 'user' ? resourceName : undefined
                };

                onLoginSuccess(session);
            } catch (err: any) {
                console.error('Supabase Login error:', err);
                errorMsg.textContent = err.message || 'Error al conectar con Supabase.';
                errorMsg.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '🔑 Iniciar Sesión';
            }
        });

    } else {
        // ─── DEMO MODE ───────────────────────────────────────────────────────
        let currentRole: 'admin' | 'user' = 'admin';

        container.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="login-logo"></div>
                        <h2>Portal Citas Hapio</h2>
                        <p style="color: #f59e0b; font-weight: 500; font-size: 0.82rem; background: rgba(245, 158, 11, 0.1); padding: 0.3rem 0.8rem; border-radius: 99px; display: inline-block; margin-top: 0.5rem; border: 1px solid rgba(245, 158, 11, 0.2);">
                            ⚠️ Modo Demostración (Local)
                        </p>
                    </div>

                    <div class="login-tabs">
                        <button class="login-tab active" id="tab-admin">Administrador</button>
                        <button class="login-tab" id="tab-user">Usuario</button>
                    </div>

                    <form id="login-form">
                        <div id="login-fields-container">
                            <!-- Admin Fields (Default) -->
                            <div class="form-group">
                                <label for="login-username">Usuario / Email</label>
                                <div class="input-icon-wrapper">
                                    <span class="input-icon">👤</span>
                                    <input type="text" id="login-username" value="admin" required placeholder="admin o correo electrónico">
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="login-password">Contraseña</label>
                            <div class="input-icon-wrapper">
                                <span class="input-icon">🔒</span>
                                <input type="password" id="login-password" value="admin" required placeholder="••••••••">
                                <button type="button" class="password-toggle" id="btn-toggle-password" title="Mostrar/ocultar contraseña">👁️</button>
                            </div>
                        </div>

                        <div id="login-error-msg" class="status-message error" style="margin-bottom: 1.5rem; margin-top: 0;"></div>

                        <button type="submit" class="login-btn">
                            🔑 Iniciar Sesión
                        </button>
                    </form>
                </div>
            </div>
        `;

        const tabAdmin = container.querySelector('#tab-admin') as HTMLButtonElement;
        const tabUser = container.querySelector('#tab-user') as HTMLButtonElement;
        const fieldsContainer = container.querySelector('#login-fields-container') as HTMLDivElement;
        const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
        const togglePasswordBtn = container.querySelector('#btn-toggle-password') as HTMLButtonElement;
        const errorMsg = container.querySelector('#login-error-msg') as HTMLDivElement;
        const form = container.querySelector('#login-form') as HTMLFormElement;

        let cachedResources: any[] = [];
        let isLoadingResources = false;

        async function loadSpecialistsDropdown() {
            fieldsContainer.innerHTML = `
                <div class="form-group">
                    <label for="login-specialist">Seleccione su Especialista</label>
                    <div class="input-icon-wrapper">
                        <span class="input-icon">🩺</span>
                        <select id="login-specialist" required>
                            <option value="" disabled selected>Cargando especialistas...</option>
                        </select>
                    </div>
                </div>
            `;
            const select = fieldsContainer.querySelector('#login-specialist') as HTMLSelectElement;

            if (cachedResources.length > 0) {
                populateSelect(select, cachedResources);
                return;
            }

            if (isLoadingResources) return;
            isLoadingResources = true;

            try {
                const resp = await getResources();
                cachedResources = resp.data || [];
                populateSelect(select, cachedResources);
            } catch (err: any) {
                console.error('Error loading specialists for login:', err);
                select.innerHTML = `<option value="" disabled selected>⚠️ Error al cargar especialistas</option>`;
                errorMsg.textContent = 'No se pudieron cargar los especialistas de Hapio. Verifique su API Key o conexión.';
                errorMsg.style.display = 'block';
            } finally {
                isLoadingResources = false;
            }
        }

        function populateSelect(select: HTMLSelectElement, resources: any[]) {
            select.innerHTML = '<option value="" disabled selected>— Seleccione Especialista —</option>';
            if (resources.length === 0) {
                select.innerHTML += '<option value="" disabled>No se encontraron especialistas</option>';
                return;
            }
            resources.forEach(r => {
                select.innerHTML += `<option value="${r.id}">${r.name}</option>`;
            });
        }

        function switchRole(role: 'admin' | 'user') {
            currentRole = role;
            errorMsg.style.display = 'none';

            if (role === 'admin') {
                tabAdmin.classList.add('active');
                tabUser.classList.remove('active');
                fieldsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="login-username">Usuario / Email</label>
                        <div class="input-icon-wrapper">
                            <span class="input-icon">👤</span>
                            <input type="text" id="login-username" value="admin" required placeholder="admin o correo electrónico">
                        </div>
                    </div>
                `;
                passwordInput.value = 'admin';
            } else {
                tabAdmin.classList.remove('active');
                tabUser.classList.add('active');
                loadSpecialistsDropdown();
                passwordInput.value = 'user';
            }
        }

        tabAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            switchRole('admin');
        });

        tabUser.addEventListener('click', (e) => {
            e.preventDefault();
            switchRole('user');
        });

        togglePasswordBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePasswordBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                togglePasswordBtn.textContent = '👁️';
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            errorMsg.style.display = 'none';

            const password = passwordInput.value.trim();

            if (currentRole === 'admin') {
                const usernameInput = container.querySelector('#login-username') as HTMLInputElement;
                const username = usernameInput.value.trim();

                if ((username === 'admin' || username === 'admin@clinica.com') && password === 'admin') {
                    const session: UserSession = {
                        username: 'Administrador',
                        role: 'admin'
                    };
                    onLoginSuccess(session);
                } else {
                    errorMsg.textContent = 'Usuario o contraseña incorrectos para Administrador (prueba usuario: admin / clave: admin)';
                    errorMsg.style.display = 'block';
                }
            } else {
                const select = container.querySelector('#login-specialist') as HTMLSelectElement;
                const resourceId = select.value;

                if (!resourceId) {
                    errorMsg.textContent = 'Por favor, seleccione un especialista de la lista.';
                    errorMsg.style.display = 'block';
                    return;
                }

                const selectedOption = select.options[select.selectedIndex];
                const resourceName = selectedOption.text;

                if (password === 'user' || password === 'doctor' || password === 'especialista') {
                    const session: UserSession = {
                        username: resourceName,
                        role: 'user',
                        resourceId,
                        resourceName
                    };
                    onLoginSuccess(session);
                } else {
                    errorMsg.textContent = 'Contraseña incorrecta para Usuario (prueba clave: user)';
                    errorMsg.style.display = 'block';
                }
            }
        });
    }
}

