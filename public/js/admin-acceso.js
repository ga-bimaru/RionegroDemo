document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formAdmin');
    const claveInput = document.getElementById('claveAdmin');
    const mensajeError = document.getElementById('mensajeError');
    const btnCancelar = document.getElementById('btnCancelar');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        mensajeError.textContent = '';
        const clave = claveInput.value.trim();
        if (!clave) {
            mensajeError.textContent = 'Ingrese la clave.';
            claveInput.focus();
            return;
        }
        try {
            const res = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave })
            });
            if (!res.ok) {
                mensajeError.textContent = 'Error del servidor: ' + res.status;
                return;
            }
            const data = await res.json();
            if (data && typeof data.ok !== 'undefined') {
                if (data.ok) {
                    window.location.href = 'administrador.html';
                } else {
                    mensajeError.textContent = data.error || 'Acceso denegado.';
                    claveInput.value = '';
                    claveInput.focus();
                }
            } else {
                mensajeError.textContent = 'Respuesta inesperada del servidor.';
            }
        } catch (err) {
            mensajeError.textContent = 'Error de conexión con el servidor: ' + (err.message || err);
        }
    });

    btnCancelar.addEventListener('click', function() {
        window.location.href = 'index.html';
    });
});
