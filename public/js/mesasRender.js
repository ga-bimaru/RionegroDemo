// Este archivo contiene la función para renderizar las mesas en pantalla y asociar los eventos de UI principales.
// Principio SOLID: Responsabilidad Única (SRP). Solo renderiza y asocia eventos de UI de las mesas.

import { toggleContador, cargarEstadoContadores } from './mesasContadores.js';
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

        // Inicializa el estado del contador si estaba corriendo antes del reload
        const estadoMesa = estadoContadores[mesa.id_mesa];
        if (estadoMesa) {
            intervalesMesa[mesa.id_mesa] = {
                segundos: estadoMesa.segundos,
                intervalId: null
            };
            // Solo intenta actualizar el contador si existe
            // const contador = document.getElementById(`contador-${mesa.id_mesa}`);
            // if (contador) {
            //     const segundos = estadoMesa.segundos;
            //     const horas = Math.floor(segundos / 3600).toString().padStart(2, '0');
            //     const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
            //     const segs = (segundos % 60).toString().padStart(2, '0');
            //     contador.textContent = `${horas}:${minutos}:${segs}`;
            // }

            // Si estaba corriendo, reanuda el contador y botones
            if (estadoMesa.corriendo) {
                const startBtn = mesaCard.querySelector('.start-btn');
                const pedidaBtn = mesaCard.querySelector('.pedida-btn');
                const visualizarBtn = mesaCard.querySelector('.visualizar-btn');
                startBtn.textContent = 'Detener';
                pedidaBtn.classList.remove('hidden');
                visualizarBtn.classList.remove('hidden');
                // Solo inicia el intervalo si no existe
                if (!intervalesMesa[mesa.id_mesa].intervalId) {
                    // Ya no existe el contador, así que no hagas nada aquí
                    // Si necesitas lógica adicional, agrégala aquí
                }
            }
        }
    });

    // Evento para botón "Iniciar"
    document.querySelectorAll('.start-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const mesaId = e.target.dataset.mesa;
            toggleContador(mesaId, e.target);
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