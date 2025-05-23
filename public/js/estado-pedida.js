// Utilidad global para obtener el estado de una pedida desde localStorage
function obtenerEstadoPedida(mesaId, keyPedida, estadoPorDefecto) {
    const estados = JSON.parse(localStorage.getItem('estadosPedidas') || '{}');
    return estados[`${mesaId}_${keyPedida}`] || estadoPorDefecto;
}

// Utilidad global para cambiar el estado de una pedida en localStorage
function cambiarEstadoPedida(mesaId, keyPedida, nuevoEstado) {
    const estados = JSON.parse(localStorage.getItem('estadosPedidas') || '{}');
    estados[`${mesaId}_${keyPedida}`] = nuevoEstado;
    localStorage.setItem('estadosPedidas', JSON.stringify(estados));
}

// Modal de confirmación para cambiar estado de pedida (sin botón cerrar)
function mostrarModalConfirmarCambioEstadoPedida(modo, callback) {
    // modo: 'aPagada' o 'aPorPagar'
    if (document.getElementById('modalConfirmarCambioEstadoPedida')) return;

    const modal = document.createElement('div');
    modal.id = 'modalConfirmarCambioEstadoPedida';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(20, 20, 30, 0.92)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '4000';

    let pregunta = '';
    if (modo === 'aPagada') {
        pregunta = '¿Deseas colocar esta pedida como "Ya Pagada"?';
    } else {
        pregunta = '¿Deseas deshacer el estado de "Ya Pagada" y volver a "Por Pagar"?';
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width:340px;text-align:center;position:relative;background:#fff;color:#232946;">
            <h2 style="margin-bottom:1.2rem;color:#232946;">${pregunta}</h2>
            <div style="display:flex;gap:1.2rem;justify-content:center;">
                <button id="confirmarCambioEstadoPedidaBtn" style="background:linear-gradient(90deg,#43e97b 60%,#38f9d7 100%);color:#232946;font-weight:600;padding:0.7rem 2.2rem;border:none;border-radius:0.7rem;font-size:1.13rem;">Sí</button>
                <button id="cancelarCambioEstadoPedidaBtn" style="background:#e0e7ef;color:#232946;font-weight:600;padding:0.7rem 2.2rem;border:none;border-radius:0.7rem;font-size:1.13rem;">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('cancelarCambioEstadoPedidaBtn').onclick = function() {
        modal.remove();
    };
    document.getElementById('confirmarCambioEstadoPedidaBtn').onclick = function() {
        modal.remove();
        if (typeof callback === 'function') callback();
    };
    modal.addEventListener('mousedown', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Evento para .btn-pagar-pedida con lógica de confirmación y cambio de estado
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-pagar-pedida')) {
        e.preventDefault();
        const btn = e.target;
        const mesaId = btn.getAttribute('data-mesa');
        const keyPedida = btn.getAttribute('data-key');
        const estadoActual = obtenerEstadoPedida(mesaId, keyPedida, btn.textContent.trim());
        const esPagada = estadoActual === 'Ya Pagada';

        if (!esPagada) {
            mostrarModalConfirmarCambioEstadoPedida('aPagada', function() {
                cambiarEstadoPedida(mesaId, keyPedida, 'Ya Pagada');
                // Guardar el id de la mesa para reabrir el modal de totales tras reload
                localStorage.setItem('mesaTotalesReabrir', mesaId);
                location.reload();
            });
        } else {
            mostrarModalConfirmarCambioEstadoPedida('aPorPagar', function() {
                cambiarEstadoPedida(mesaId, keyPedida, 'Por Pagar');
                localStorage.setItem('mesaTotalesReabrir', mesaId);
                location.reload();
            });
        }
    }
});

// Al cargar la página, si hay una mesa para reabrir el modal de totales, hazlo automáticamente
document.addEventListener('DOMContentLoaded', function() {
    const mesaId = localStorage.getItem('mesaTotalesReabrir');
    if (mesaId && typeof window.mostrarTotalesMesa === 'function') {
        // Espera a que el DOM y los scripts estén listos
        setTimeout(() => {
            // Si el select de mesas existe (supervisor-edicion), selecciónalo también
            const selectMesa = document.getElementById('selectMesaEdit');
            if (selectMesa) {
                selectMesa.value = mesaId;
                // Si tienes un evento change para cargar la tabla, disparemoslo
                const event = new Event('change', { bubbles: true });
                selectMesa.dispatchEvent(event);
            }
            // Mostrar el modal de totales de inmediato
            window.mostrarTotalesMesa(mesaId);
            localStorage.removeItem('mesaTotalesReabrir');
        }, 400);
    }
});

// Mejorar el cierre del modal de totales: cerrar al hacer clic fuera o agregar botón salir
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    const modal = document.getElementById('modalTotalesMesa');
    if (modal) {
        // Cerrar al hacer clic fuera del contenido
        modal.addEventListener('mousedown', function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });
        // Agregar botón salir si no existe
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && !modalContent.querySelector('.btn-cerrar-totales')) {
            const btnSalir = document.createElement('button');
            btnSalir.textContent = 'Salir';
            btnSalir.className = 'btn-cerrar-totales';
            btnSalir.style = 'margin-top:1.2rem;background:#e74c3c;color:#fff;padding:0.7rem 2.2rem;border-radius:0.7rem;font-size:1.1rem;border:none;cursor:pointer;';
            btnSalir.onclick = function() {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            };
            modalContent.appendChild(btnSalir);
        }
    }
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.obtenerEstadoPedida = obtenerEstadoPedida;
}
