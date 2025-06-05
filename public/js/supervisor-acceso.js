document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formSupervisor');
    const docInput = document.getElementById('docSupervisor');
    const mensajeError = document.getElementById('mensajeError');
    const btnCancelar = document.getElementById('btnCancelar');

    // Solo permitir números y máximo 10 dígitos
    docInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        mensajeError.textContent = '';
        const documento = docInput.value.trim();
        if (!/^\d{1,10}$/.test(documento)) {
            mensajeError.textContent = 'Ingrese solo números (máximo 10 dígitos).';
            docInput.focus();
            return;
        }
        try {
            const res = await fetch('/api/validar-supervisor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documento })
            });
            if (!res.ok) {
                if (res.status === 404) {
                    mensajeError.textContent = 'No se encontró la ruta /api/validar-supervisor. Verifica que el servidor esté corriendo y la ruta exista.';
                } else {
                    mensajeError.textContent = 'Error del servidor: ' + res.status;
                }
                return;
            }
            const data = await res.json();
            if (data && typeof data.autorizado !== 'undefined') {
                if (data.autorizado) {
                    window.location.href = `finanzas.html?documento=${encodeURIComponent(documento)}`;
                } else {
                    mensajeError.textContent = 'Acceso denegado. Documento incorrecto o sin permisos.';
                    docInput.value = '';
                    docInput.focus();
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
