// Este archivo contiene la función para renderizar las mesas en pantalla y asociar los eventos de UI principales.
// Principio SOLID: Responsabilidad Única (SRP). Solo renderiza y asocia eventos de UI de las mesas.

import { toggleContador, cargarEstadoContadores, intervalesMesa } from './mesasContadores.js';
import { openPedidoModal } from './pedidos.js';
import { addVisualizarEvent } from './visualizar.js';
import { abrirTransferirModal } from './transferir.js';
import { mostrarTotalesMesa } from './totales.js';

// Recibe el array de mesas y el contenedor donde se mostrarán
export function renderMesas(mesas, mesasContainer) {
    mesasContainer.innerHTML = '';
    if (mesas.length === 0) {
        mesasContainer.innerHTML = '<p>No hay mesas registradas en la base de datos.</p>';
        return;
    }

    // Cargar estado guardado de contadores
    const estadoContadores = cargarEstadoContadores();

    // --- NUEVO: Persistencia de visibilidad del botón "Ver Totales" por mesa ---
    let verTotalesVisible = {};
    try {
        verTotalesVisible = JSON.parse(localStorage.getItem('verTotalesVisible') || '{}');
    } catch { verTotalesVisible = {}; }

    mesas.forEach(mesa => {
        const tieneAlquilerActivo = mesa.estado === 'Ocupada';

        const mesaCard = document.createElement('div');
        mesaCard.className = 'info-card';
        mesaCard.innerHTML = `
            <div class="mesa-image-container">
                <img src="/images/mesadepoll.jpg" alt="Mesa ${mesa.numero_mesa}" class="mesa-image">
            </div>
            <div class="mesa-details">
                <h3>Mesa ${mesa.numero_mesa}</h3>
                <div class="mesa-botones">
                    ${tieneAlquilerActivo ? `
                        <div class="grupo-detener">
                            <button class="detener-btn" data-mesa="${mesa.id_mesa}">Detener</button>
                        </div>
                        <div class="grupo-pedida-visualizar">
                            <button class="pedida-btn" data-mesa="${mesa.id_mesa}">Pedida</button>
                            <button class="visualizar-btn" data-mesa="${mesa.id_mesa}">Visualizar</button>
                        </div>
                        <div class="grupo-pasar-tiempo">
                            <button class="pasar-tiempo-btn" data-mesa="${mesa.id_mesa}">Pasar tiempo a otra mesa</button>
                        </div>
                        <div class="grupo-ver-totales">
                            <button class="ver-totales-btn" data-mesa="${mesa.id_mesa}" style="display:inline-block;">Ver Totales</button>
                        </div>
                    ` : `
                        <div class="grupo-iniciar">
                            <button class="start-btn" data-mesa="${mesa.id_mesa}">Iniciar</button>
                        </div>
                    `}
                </div>
            </div>
        `;
        mesasContainer.appendChild(mesaCard);

        // --- Solución: NO accedas a elementos que no existen ---
        // El error ocurre porque intentas acceder a un elemento (por ejemplo, un contador visual)
        // que no está en el DOM. Si tienes código como:
        // contador.textContent = ...;
        // asegúrate de que el elemento existe antes de modificarlo.

        // Ejemplo seguro:
        // const contador = mesaCard.querySelector('.contador-tiempo');
        // if (contador) contador.textContent = '00:00:00';

        // Inicializa el estado del contador si estaba corriendo antes del reload
        const estadoMesa = estadoContadores[mesa.id_mesa];
        if (estadoMesa) {
            intervalesMesa[mesa.id_mesa] = {
                segundos: estadoMesa.segundos,
                intervalId: null
            };
            // --- Solución definitiva: verifica existencia antes de modificar ---
            // Si estaba corriendo, reanuda el contador y botones
            if (estadoMesa.corriendo) {
                const startBtn = mesaCard.querySelector('.start-btn');
                const pedidaBtn = mesaCard.querySelector('.pedida-btn');
                const visualizarBtn = mesaCard.querySelector('.visualizar-btn');
                if (startBtn) startBtn.textContent = 'Detener';
                if (pedidaBtn) pedidaBtn.classList.remove('hidden');
                if (visualizarBtn) visualizarBtn.classList.remove('hidden');
                // Solo inicia el intervalo si no existe
                if (!intervalesMesa[mesa.id_mesa].intervalId) {
                    // Si necesitas lógica adicional, agrégala aquí
                }
            }
        }
    });

    // Evento para botón "Iniciar"
    document.querySelectorAll('.start-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const mesaId = e.target.dataset.mesa;
            // Solo intenta iniciar el alquiler, NO llames a toggleContador aquí
            await iniciarAlquiler(mesaId);
            // NO llames a toggleContador(mesaId, e.target);
            // La recarga de la página actualizará el estado visual correctamente
        });
    });

    // Evento para botón "Detener"
    document.querySelectorAll('.detener-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const mesaId = e.target.dataset.mesa;
            // Simula el click en el botón "Detener" de toggleContador
            toggleContador(mesaId, { textContent: 'Detener', dataset: { mesa: mesaId } });
        });
    });

    // Evento para botón "Pedida" (abre el modal)
    document.querySelectorAll('.pedida-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const mesaId = e.target.dataset.mesa;
            openPedidoModal(mesaId);
        });
    });

    // Evento para botón "Visualizar"
    addVisualizarEvent();

    // Evento para botón "Pasar tiempo a otra mesa"
    document.querySelectorAll('.pasar-tiempo-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const mesaId = e.target.dataset.mesa;
            abrirTransferirModal(mesaId, mesas);
        });
    });

    // Evento para botón "Ver Totales"
    document.querySelectorAll('.ver-totales-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const mesaId = e.target.dataset.mesa;
            await mostrarTotalesMesa(mesaId);
        });
    });
}

// Función para iniciar un alquiler de mesa
async function iniciarAlquiler(id_mesa) {
    const usuarioActual = JSON.parse(localStorage.getItem('usuarioActual'));
    if (!usuarioActual || !usuarioActual.id) {
        if (typeof snackbar === 'function') {
            snackbar('No hay usuario logueado. Por favor, inicia sesión.', 'error');
        } else if (typeof mostrarSnackbar === 'function') {
            mostrarSnackbar('No hay usuario logueado. Por favor, inicia sesión.', 'error');
        } else {
            alert('No hay usuario logueado. Por favor, inicia sesión.');
        }
        return;
    }
    try {
        const res = await fetch('/api/alquileres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_mesa })
        });
        const data = await res.json();
        if (!res.ok) {
            // Usa snackbar o alert, pero NO recargues ni refresques la UI
            const msg = data && data.error ? data.error : 'No se pudo iniciar el alquiler.';
            if (typeof snackbar === 'function') {
                snackbar(msg, 'error');
            } else if (typeof mostrarSnackbar === 'function') {
                mostrarSnackbar(msg, 'error');
            } else {
                alert(msg);
            }
            return; // Detén aquí, no sigas con la lógica de refresco
        }
        // Solo si fue exitoso, refresca la UI o recarga la página
        location.reload(); // <-- AQUÍ, solo si fue exitoso
        // o llama a renderMesas() si prefieres no recargar toda la página
    } catch (err) {
        if (typeof snackbar === 'function') {
            snackbar('Error de conexión al iniciar el alquiler.', 'error');
        } else if (typeof mostrarSnackbar === 'function') {
            mostrarSnackbar('Error de conexión al iniciar el alquiler.', 'error');
        } else {
            alert('Error de conexión al iniciar el alquiler.');
        }
    }
}