// Este archivo contiene la lógica para visualizar detalles de una mesa.

import { mostrarDetalleMesa, inicializarVisualizarMesa } from './visualizarMesa.js';

export function addVisualizarEvent() {
    // Inicializa el modal y obtiene referencias
    if (typeof window.addVisualizarEvent === 'function') {
        window.addVisualizarEvent();
        return;
    }

    // Fallback: implementación básica si no existe la función global
    let visualizarModal = document.getElementById('visualizarModal');
    if (!visualizarModal) {
        visualizarModal = document.createElement('div');
        visualizarModal.id = 'visualizarModal';
        visualizarModal.className = 'modal hidden';
        visualizarModal.innerHTML = `
            <div class="modal-content" style="max-width:700px;">
                <span class="close-btn" id="closeVisualizarModal">&times;</span>
                <h2>Detalle de Mesa</h2>
                <div id="visualizarDetalle"></div>
            </div>
        `;
        document.body.appendChild(visualizarModal);
    }
    const visualizarDetalle = document.getElementById('visualizarDetalle');
    const closeVisualizarModal = document.getElementById('closeVisualizarModal');
    let visualizarIntervalRef = { current: null };

    closeVisualizarModal.onclick = () => {
        visualizarModal.classList.add('hidden');
        visualizarModal.style.display = 'none';
        if (visualizarIntervalRef.current) {
            clearInterval(visualizarIntervalRef.current);
            visualizarIntervalRef.current = null;
        }
    };

    document.querySelectorAll('.visualizar-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const mesaId = e.target.dataset.mesa;
            await mostrarDetalleMesa(mesaId, visualizarDetalle, visualizarModal, visualizarIntervalRef);
        });
    });
}
