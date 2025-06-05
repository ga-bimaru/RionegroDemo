document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const usuario = form.usuario.value.trim();
        const contrasena = form.contrasena.value.trim();

        // Simulación: usuario "admin", contraseña "1234"
        if (usuario === 'admin' && contrasena === '1234') {
            errorDiv.style.display = 'none';
            window.location.href = 'finanzas.html';
        } else {
            errorDiv.textContent = 'Usuario o contraseña incorrectos.';
            errorDiv.style.display = 'block';
        }
    });
});
