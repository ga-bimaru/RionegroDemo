document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const usuario = form.usuario.value.trim();
        const contrasena = form.contrasena.value.trim();

        // --- NUEVO: Login real usando la API ---
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: usuario, password: contrasena })
            });
            const data = await res.json();
            if (data.ok && data.usuario) {
                // Guarda el usuario y rol en localStorage y window
                window.usuarioActual = data.usuario;
                localStorage.setItem('usuarioActual', JSON.stringify(data.usuario));
                // Redirige según el rol
                if (data.usuario.rol === 'Administrador') {
                    window.location.href = 'index.html';
                } else if (data.usuario.rol === 'Supervisor') {
                    window.location.href = 'index.html';
                } else if (data.usuario.rol === 'Empleado') {
                    window.location.href = 'index.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                errorDiv.textContent = data.error || 'Usuario o contraseña incorrectos.';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Error de conexión con el servidor.';
            errorDiv.style.display = 'block';
        }
    });
});
