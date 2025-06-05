document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const nombre = document.getElementById('nombre');
    const telefono = document.getElementById('telefono');
    const mensaje = document.getElementById('mensaje');

    // Solo letras para nombre
    nombre.addEventListener('input', function() {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
    });

    // Solo números para teléfono
    telefono.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        mensaje.className = '';
        mensaje.style.display = 'none';

        // Validación extra
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombre.value.trim())) {
            mensaje.textContent = 'El nombre solo debe contener letras.';
            mensaje.className = 'error';
            mensaje.style.display = 'block';
            return;
        }
        if (!/^[0-9]{7,15}$/.test(telefono.value.trim())) {
            mensaje.textContent = 'El teléfono solo debe contener números (7 a 15 dígitos).';
            mensaje.className = 'error';
            mensaje.style.display = 'block';
            return;
        }

        const datos = {
            nombre: form.nombre.value,
            correo: form.correo.value,
            telefono: form.telefono.value,
            password: form.password.value
        };
        const res = await fetch('/api/registro', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
        });
        const data = await res.json();
        if (data.ok) {
            mensaje.textContent = 'Usuario creado correctamente';
            mensaje.className = 'ok';
            mensaje.style.display = 'block';
            form.reset();
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            mensaje.textContent = data.error || 'Error al registrar.';
            mensaje.className = 'error';
            mensaje.style.display = 'block';
        }
    });
});
