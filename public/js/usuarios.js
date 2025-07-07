// usuarios.js - Gestión de usuarios

document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('usuariosTbody');
    const buscarInput = document.getElementById('buscarUsuario');
    let usuarios = [];

    // Cargar usuarios desde el backend
    async function cargarUsuarios() {
        try {
            const res = await fetch('/api/usuarios');
            if (!res.ok) throw new Error('Error al cargar usuarios');
            usuarios = await res.json();
            renderUsuarios(usuarios);
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="4">Error al cargar usuarios</td></tr>';
        }
    }

    // Renderizar usuarios en la tabla
    function renderUsuarios(lista) {
        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="4">No hay usuarios registrados</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map(u => `
            <tr>
                <td>${u.nombre || ''}</td>
                <td>${u.email || ''}</td>
                <td>${u.documento || ''}</td>
                <td><span class="rol-label rol-${u.rol.toLowerCase()}">${u.rol}</span></td>
                <td>
                    <div style="display:flex;justify-content:center;align-items:center;height:100%;">
                        <button class="btn-editar-usuario" data-id="${u.id_usuario}">✏️ Editar</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Buscar usuarios
    buscarInput.addEventListener('input', function() {
        const val = buscarInput.value.trim().toLowerCase();
        if (!val) {
            renderUsuarios(usuarios);
            return;
        }
        const filtrados = usuarios.filter(u =>
            (u.nombre || '').toLowerCase().includes(val) ||
            (u.email || '').toLowerCase().includes(val) ||
            (u.documento || '').toLowerCase().includes(val)
        );
        renderUsuarios(filtrados);
    });

    // Delegación para guardar rol y editar usuario
    tbody.addEventListener('click', async function(e) {
        const id = e.target.getAttribute('data-id');
        // Ya no hay botón de guardar rol, solo edición
        if (e.target.classList.contains('btn-editar-usuario')) {
            const usuario = usuarios.find(u => String(u.id_usuario) === String(id));
            if (!usuario) return;
            mostrarModalEditarUsuario(usuario);
        }
    });

    // Modal para editar usuario
    function mostrarModalEditarUsuario(usuario) {
        let modal = document.getElementById('modalEditarUsuario');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalEditarUsuario';
            modal.className = 'modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(20,20,30,0.92);z-index:5000;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div class="usuarios-modal-content">
                <button id="closeModalEditarUsuario" class="usuarios-modal-close">&times;</button>
                <h2 class="usuarios-modal-title">Editar Usuario</h2>
                <form id="formEditarUsuario" class="usuarios-modal-form">
                    <div class="usuarios-modal-group">
                        <label for="editNombreUsuario">Nombre</label>
                        <input type="text" id="editNombreUsuario" required />
                    </div>
                    <div class="usuarios-modal-group">
                        <label for="editEmailUsuario">Email</label>
                        <input type="email" id="editEmailUsuario" required />
                    </div>
                    <div class="usuarios-modal-group">
                        <label for="editDocumentoUsuario">Documento</label>
                        <input type="text" id="editDocumentoUsuario" required />
                    </div>
                    <div class="usuarios-modal-group">
                        <label for="editRolUsuario">Rol</label>
                        <select id="editRolUsuario">
                            <option value="Administrador">Administrador</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Empleado">Empleado</option>
                        </select>
                    </div>
                    <div class="usuarios-modal-actions">
                        <button type="button" id="cancelarEditarUsuario" class="cancel-btn">Cancelar</button>
                        <button type="submit" class="confirm-btn">Guardar</button>
                    </div>
                </form>
            </div>
        `;
            document.body.appendChild(modal);
        }
        // Llenar datos
        document.getElementById('editNombreUsuario').value = usuario.nombre || '';
        document.getElementById('editEmailUsuario').value = usuario.email || '';
        document.getElementById('editDocumentoUsuario').value = usuario.documento || '';
        document.getElementById('editRolUsuario').value = usuario.rol || 'Empleado';
        // Mostrar
        modal.style.display = 'flex';
        // Cerrar
        document.getElementById('closeModalEditarUsuario').onclick =
        document.getElementById('cancelarEditarUsuario').onclick = function() {
            modal.style.display = 'none';
        };
        // Guardar
        document.getElementById('formEditarUsuario').onsubmit = async function(e) {
            e.preventDefault();
            const nombre = document.getElementById('editNombreUsuario').value.trim();
            const email = document.getElementById('editEmailUsuario').value.trim();
            const documento = document.getElementById('editDocumentoUsuario').value.trim();
            const rol = document.getElementById('editRolUsuario').value;
            if (!nombre || !email || !rol || !documento) {
                showNotification('Completa todos los campos');
                return;
            }
            try {
                const res = await fetch(`/api/usuarios/${usuario.id_usuario}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, documento, rol })
                });
                if (res.ok) {
                    showNotification('Usuario actualizado correctamente');
                    modal.style.display = 'none';
                    cargarUsuarios();
                } else {
                    showNotification('Error al actualizar el usuario');
                }
            } catch {
                showNotification('Error de red al actualizar el usuario');
            }
        };
    }

    // Notificación simple
    window.showNotification = function(msg) {
        let n = document.getElementById('usuariosNotification');
        if (!n) {
            n = document.createElement('div');
            n.id = 'usuariosNotification';
            n.style.cssText = 'position:fixed;top:20px;right:20px;background:#00cfff;color:#fff;padding:1rem 1.5rem;border-radius:0.7rem;box-shadow:0 4px 16px #00cfff33;z-index:4000;font-weight:600;max-width:300px;transition:all 0.3s;';
            document.body.appendChild(n);
        }
        n.innerHTML = msg;
        n.style.transform = 'translateX(0)';
        setTimeout(() => { n.style.transform = 'translateX(400px)'; }, 2500);
    };

    cargarUsuarios();
});
