// Este archivo solo se encarga de obtener y mostrar las mesas en pantalla.
// Importa las funciones necesarias de los otros módulos.

import { sincronizarContadoresConAlquileres } from './mesasContadores.js';
import { renderMesas } from './mesasRender.js';

document.addEventListener('DOMContentLoaded', async () => {
    const mesasContainer = document.getElementById('mesasContainer');

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