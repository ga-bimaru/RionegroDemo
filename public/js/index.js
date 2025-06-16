// Este archivo solo se encarga de obtener y mostrar las mesas en pantalla.
// Importa las funciones necesarias de los otros módulos.

import { sincronizarContadoresConAlquileres } from './mesasContadores.js';
import { renderMesas } from './mesasRender.js';

document.addEventListener('DOMContentLoaded', async () => {
    const mesasContainer = document.getElementById('mesasContainer');

    // --- NUEVO: Control de visibilidad de botones de header según rol ---
    function controlarBotonesHeaderPorRol() {
        // Recupera el usuario autenticado de localStorage
        let usuario = null;
        try {
            usuario = JSON.parse(localStorage.getItem('usuarioActual'));
        } catch {}
        // Selecciona los botones del header por clase o href
        const btnAdmin = document.querySelector('a[href="admin-acceso.html"].admin-btn');
        const btnSupervisor = document.querySelector('a[href="supervisor-acceso.html"].admin-btn');
        if (!btnAdmin || !btnSupervisor) return;

        if (!usuario || !usuario.rol) {
            btnAdmin.style.display = 'none';
            btnSupervisor.style.display = 'none';
            return;
        }
        if (usuario.rol === 'Administrador') {
            btnAdmin.style.display = '';
            btnSupervisor.style.display = '';
        } else if (usuario.rol === 'Supervisor') {
            btnAdmin.style.display = 'none';
            btnSupervisor.style.display = '';
        } else if (usuario.rol === 'Empleado') {
            btnAdmin.style.display = 'none';
            btnSupervisor.style.display = 'none';
        } else {
            btnAdmin.style.display = 'none';
            btnSupervisor.style.display = 'none';
        }
    }

    controlarBotonesHeaderPorRol();

    async function obtenerYRenderizarMesas() {
        try {
            const res = await fetch('/api/mesas');
            if (!res.ok) throw new Error('No se pudieron cargar las mesas');
            const mesas = await res.json();
            await sincronizarContadoresConAlquileres(mesas);
            renderMesas(mesas, mesasContainer);
        } catch (err) {
            mesasContainer.innerHTML = '<p style="color:red;">Error al cargar las mesas.</p>';
            console.error(err);
        }
    }

    obtenerYRenderizarMesas();
});