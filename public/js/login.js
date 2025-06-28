document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');

    if (!form) return; // Si no hay formulario, no hacer nada

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const correoInput = document.getElementById('correo');
        const passwordInput = document.getElementById('password');
        if (!correoInput || !passwordInput) {
            if (errorDiv) {
                errorDiv.textContent = 'Formulario incompleto.';
                errorDiv.style.display = 'block';
            }
            return;
        }
        const correo = correoInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ correo, password })
            });
            const data = await res.json();
            if (data.ok && data.usuario) {
                // Guarda el usuario completo (incluyendo id) en localStorage
                localStorage.setItem('usuarioActual', JSON.stringify(data.usuario));
                window.location.href = 'index.html';
            } else {
                if (errorDiv) {
                    errorDiv.textContent = data.error || 'Usuario o contraseña incorrectos.';
                    errorDiv.style.display = 'block';
                }
            }
        } catch (err) {
            if (errorDiv) {
                errorDiv.textContent = 'Error de conexión con el servidor.';
                errorDiv.style.display = 'block';
            }
        }
    });
});

