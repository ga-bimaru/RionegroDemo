// Este archivo contiene la lógica de sincronización y control de los contadores de tiempo de las mesas.

// Guarda los intervalos y segundos por mesa
const intervalesMesa = {};

// --- Persistencia del estado de los contadores ---
function guardarEstadoContadores() {
    const estado = {};
    Object.keys(intervalesMesa).forEach(mesa => {
        estado[mesa] = {
            segundos: intervalesMesa[mesa].segundos,
            corriendo: !!intervalesMesa[mesa].intervalId,
            horaInicio: intervalesMesa[mesa].horaInicio // Guardar la hora de inicio
        };
    });
    localStorage.setItem('estadoContadoresMesas', JSON.stringify(estado));
}

// Función auxiliar para cargar estado de contadores
export function cargarEstadoContadores() {
    try {
        const estado = JSON.parse(localStorage.getItem('estadoContadoresMesas')) || {};
        return estado;
    } catch {
        return {};
    }
}

// Sincroniza los contadores locales con los alquileres activos en el backend
export async function sincronizarContadoresConAlquileres(mesas) {
    try {
        // Pide al backend los alquileres activos
        const response = await fetch('/api/alquileres/activos');
        if (!response.ok) throw new Error('Error al obtener alquileres activos');
        const alquileresActivos = await response.json(); // [{id_mesa: 1}, ...]
        const mesasConAlquiler = new Set(alquileresActivos.map(a => String(a.id_mesa)));

        // Limpia los contadores locales de mesas sin alquiler activo
        let estado = cargarEstadoContadores();
        let cambiado = false;
        for (const mesa of mesas) {
            const id = String(mesa.id_mesa);
            if (estado[id] && !mesasConAlquiler.has(id)) {
                delete estado[id];
                cambiado = true;
            }
        }
        if (cambiado) {
            localStorage.setItem('estadoContadoresMesas', JSON.stringify(estado));
        }
    } catch (err) {
        console.error('Error al sincronizar contadores:', err);
    }
}

// --- NUEVO: Modal para ver totales de pedidas ---
function crearModalTotalesMesa() {
    let modal = document.getElementById('modalTotalesMesa');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalTotalesMesa';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:700px;">
                <span class="close-btn" id="closeTotalesMesaModal">&times;</span>
                <h2>Totales de Pedidas</h2>
                <div id="totalesMesaDetalle"></div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closeTotalesMesaModal').onclick = () => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        };
    }
    return modal;
}

// --- NUEVO: Estado de pagado de pedidas por mesa (localStorage) ---
function getPagadasPorMesa(mesaId) {
    const data = JSON.parse(localStorage.getItem('pagadasPorMesa') || '{}');
    return data[mesaId] || [];
}
function setPagadaPorMesa(mesaId, keyPedida, pagada) {
    const data = JSON.parse(localStorage.getItem('pagadasPorMesa') || '{}');
    if (!data[mesaId]) data[mesaId] = [];
    if (pagada && !data[mesaId].includes(keyPedida)) {
        data[mesaId].push(keyPedida);
    } else if (!pagada && data[mesaId].includes(keyPedida)) {
        data[mesaId] = data[mesaId].filter(k => k !== keyPedida);
    }
    localStorage.setItem('pagadasPorMesa', JSON.stringify(data));
}

// --- NUEVO: Valor de la hora para el cálculo del tiempo ---
const VALOR_HORA = 6000;

// Puedes exportar aquí también toggleContador si lo necesitas en la UI
export function toggleContador(mesaId, button) {
    const contador = document.getElementById(`contador-${mesaId}`);
    const pedidaBtn = document.querySelector(`.pedida-btn[data-mesa="${mesaId}"]`);
    const visualizarBtn = document.querySelector(`.visualizar-btn[data-mesa="${mesaId}"]`);
    const detenerBtn = document.querySelector(`.detener-btn[data-mesa="${mesaId}"]`);
    const startBtn = document.querySelector(`.start-btn[data-mesa="${mesaId}"]`);
    const pasarTiempoBtn = document.querySelector(`.pasar-tiempo-btn[data-mesa="${mesaId}"]`);
    const verTotalesBtn = document.querySelector(`.ver-totales-btn[data-mesa="${mesaId}"]`);

    // --- NUEVO: Persistencia de visibilidad del botón "Ver Totales" ---
    let verTotalesVisible = {};
    try {
        verTotalesVisible = JSON.parse(localStorage.getItem('verTotalesVisible') || '{}');
    } catch { verTotalesVisible = {}; }

    // --- NUEVO: Obtener el card de la mesa de forma compatible ---
    let card = null;
    document.querySelectorAll('.info-card').forEach(c => {
        const h3 = c.querySelector('.mesa-details h3');
        if (h3 && h3.textContent.trim() === `Mesa ${mesaId}`) {
            card = c;
        }
    });
    if (!card) {
        // fallback: busca por botón
        card = button.closest('.info-card');
    }

    // --- NUEVO: Asegura que existan los contadores visuales ---
    // Elimina la creación automática de los divs .contador-tiempo y .contador-total-tiempo
    // y no los agregues a los info-card, ya que el diseño debe ser como la imagen adjunta
    /*
    let contadorTiempo = card?.querySelector(`.contador-tiempo`);
    let contadorTotal = card?.querySelector(`.contador-total-tiempo`);
    if (!contadorTiempo) {
        contadorTiempo = document.createElement('div');
        contadorTiempo.className = 'contador-tiempo';
        contadorTiempo.style.fontWeight = 'bold';
        contadorTiempo.style.fontSize = '1.15rem';
        contadorTiempo.style.margin = '0.7rem 0 0.2rem 0';
        contadorTiempo.textContent = '00:00:00';
        card?.querySelector('.mesa-details')?.appendChild(contadorTiempo);
    }
    if (!contadorTotal) {
        contadorTotal = document.createElement('div');
        contadorTotal.className = 'contador-total-tiempo';
        contadorTotal.style.fontWeight = 'bold';
        contadorTotal.style.fontSize = '1.13rem';
        contadorTotal.style.color = '#00cfff';
        contadorTotal.style.marginBottom = '0.7rem';
        contadorTotal.textContent = 'Total tiempo: $0';
        card?.querySelector('.mesa-details')?.appendChild(contadorTotal);
    }
    */

    // --- NUEVO: Función para actualizar el contador visual y el total ---
    function actualizarContadorVisual(mesaId) {
        const datos = intervalesMesa[mesaId];
        if (!datos) return;
        let segundos = datos.segundos || 0;
        const horas = Math.floor(segundos / 3600).toString().padStart(2, '0');
        const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
        const segs = (segundos % 60).toString().padStart(2, '0');
        // contadorTiempo.textContent = `${horas}:${minutos}:${segs}`;
        // Calcular total a pagar por tiempo
        const total = Math.round((segundos / 3600) * VALOR_HORA);
        // contadorTotal.textContent = `Total tiempo: $${total.toLocaleString('es-CO')}`;
    }

    if (button.textContent === 'Iniciar') {
        // --- INICIAR ALQUILER ---
        // Solo envía id_mesa, id_usuario y hora_inicio
        const id_usuario = 1; // Cambia esto según tu lógica real
        
        // Obtener la hora actual del servidor para evitar problemas de zona horaria
        fetch('/api/alquileres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_mesa: mesaId,
                id_usuario
                // No enviar hora_inicio, dejar que el servidor la establezca
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert('Error al iniciar el alquiler: ' + data.error);
                if (data.error.includes('Ya existe un alquiler activo')) {
                    recargarPagina(); // Recarga la página si ya hay un alquiler activo
                }
                return;
            }
            
            console.log("Alquiler iniciado con éxito:", data);
            
            // Guardar la hora de inicio recibida del servidor si está disponible
            const horaInicio = data.hora_inicio;
            if (horaInicio) {
                // Convertir a objeto Date para cálculos
                let horaInicioDate;
                try {
                    if (typeof horaInicio === 'string') {
                        // Convertir formato MySQL a objeto Date
                        horaInicioDate = new Date(horaInicio.replace(' ', 'T'));
                        console.log("Hora de inicio convertida:", horaInicioDate);
                    } else {
                        horaInicioDate = new Date(horaInicio);
                    }
                } catch (e) {
                    console.error("Error al parsear la hora de inicio:", e);
                    horaInicioDate = new Date(); // Usar hora actual como fallback
                }
                
                // Calcular segundos transcurridos desde la hora de inicio hasta ahora
                const segundosTranscurridos = Math.max(0, Math.floor((new Date() - horaInicioDate) / 1000));
                console.log("Segundos transcurridos:", segundosTranscurridos);
                
                // Inicializar con los segundos ya transcurridos
                if (!intervalesMesa[mesaId]) {
                    intervalesMesa[mesaId] = {
                        segundos: segundosTranscurridos,
                        intervalId: null
                    };
                } else {
                    intervalesMesa[mesaId].segundos = segundosTranscurridos;
                }
            } else {
                // Si no hay hora de inicio del servidor, usar 0
                if (!intervalesMesa[mesaId]) {
                    intervalesMesa[mesaId] = {
                        segundos: 0,
                        intervalId: null
                    };
                }
            }
            
            // --- INICIA EL CONTADOR VISUAL Y EL TOTAL ---
            if (intervalesMesa[mesaId].intervalId) {
                clearInterval(intervalesMesa[mesaId].intervalId);
            }
            actualizarContadorVisual(mesaId);
            intervalesMesa[mesaId].intervalId = setInterval(() => {
                intervalesMesa[mesaId].segundos++;
                actualizarContadorVisual(mesaId);
                guardarEstadoContadores();
            }, 1000);
            
            // Solo si el alquiler se inicia correctamente, inicia el contador
            button.textContent = 'Detener';
            button.classList.add('hidden');
            if (detenerBtn) detenerBtn.classList.remove('hidden');
            if (pedidaBtn) pedidaBtn.classList.remove('hidden');
            if (visualizarBtn) visualizarBtn.classList.remove('hidden');
            if (pasarTiempoBtn) pasarTiempoBtn.classList.remove('hidden');
            // Mostrar el botón "Ver Totales" solo para esta mesa
            if (verTotalesBtn) verTotalesBtn.style.display = 'inline-block';
            verTotalesVisible[mesaId] = true;
            localStorage.setItem('verTotalesVisible', JSON.stringify(verTotalesVisible));
            recargarPagina(); // Recarga la página tras iniciar el alquiler exitosamente
            // --- RECARGA LA PÁGINA PARA ACTUALIZAR LOS BOTONES ---
            location.reload();
        })
        .catch(err => {
            alert('Error al iniciar el alquiler');
            console.error(err);
        });
    } else {
        mostrarModalDetener(mesaId, async () => {
            // 2. Finalizar el alquiler en el servidor directamente
            try {
                const response = await fetch('/api/alquileres/finalizar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_mesa: mesaId })
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Error al finalizar alquiler: ${errorData}`);
                }

                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }

                // 3. Detener el contador local y resetear la UI
                if (intervalesMesa[mesaId] && intervalesMesa[mesaId].intervalId) {
                    clearInterval(intervalesMesa[mesaId].intervalId);
                    intervalesMesa[mesaId].intervalId = null;
                }
                // --- RESETEA EL CONTADOR VISUAL Y EL TOTAL ---
                if (contadorTiempo) contadorTiempo.textContent = '00:00:00';
                if (contadorTotal) contadorTotal.textContent = 'Total tiempo: $0';
                if (detenerBtn) detenerBtn.classList.add('hidden');
                if (startBtn) {
                    startBtn.classList.remove('hidden');
                    startBtn.textContent = 'Iniciar';
                }
                if (pedidaBtn) pedidaBtn.classList.add('hidden');
                if (visualizarBtn) visualizarBtn.classList.add('hidden');
                if (pasarTiempoBtn) pasarTiempoBtn.classList.add('hidden');
                if (intervalesMesa[mesaId]) {
                    intervalesMesa[mesaId].segundos = 0;
                    intervalesMesa[mesaId].horaInicio = null;
                }
                guardarEstadoContadores();

                // 4. (Opcional) Notificación de éxito
                showNotification('Alquiler finalizado correctamente.');
            } catch (error) {
                console.error('Error al finalizar el alquiler:', error);
                alert('Error al finalizar el alquiler: ' + (error.message || error));
            }
        });
    }
}

// --- NUEVO: Recargar página para evitar ReferenceError ---
function recargarPagina() {
    location.reload();
}

// --- NUEVO: Modal de confirmación para detener alquiler ---
function mostrarModalDetener(mesaId, onConfirm) {
    // Si ya existe el modal, reutilízalo
    let modal = document.getElementById('modalDetenerAlquiler');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDetenerAlquiler';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close-btn" id="closeDetenerAlquilerModal">&times;</span>
                <h3>¿Desea finalizar el alquiler de la mesa ${mesaId}?</h3>
                <div style="margin-top:20px; text-align:right;">
                    <button id="confirmDetenerAlquilerBtn" class="btn btn-danger">Sí, finalizar</button>
                    <button id="cancelDetenerAlquilerBtn" class="btn btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';
    modal.classList.remove('hidden');

    // Cerrar modal
    document.getElementById('closeDetenerAlquilerModal').onclick = cerrar;
    document.getElementById('cancelDetenerAlquilerBtn').onclick = cerrar;

    function cerrar() {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }

    // Confirmar acción
    document.getElementById('confirmDetenerAlquilerBtn').onclick = async () => {
        cerrar();
        if (typeof onConfirm === 'function') {
            await onConfirm();
        }
    };
}

// --- NUEVO: Notificación visual simple ---
function showNotification(message) {
    let notif = document.getElementById('notificacionMesasContadores');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notificacionMesasContadores';
        notif.style.position = 'fixed';
        notif.style.top = '30px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.background = '#eafbe7';
        notif.style.color = '#232946';
        notif.style.padding = '14px 28px';
        notif.style.borderRadius = '12px';
        notif.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
        notif.style.fontSize = '1.08rem';
        notif.style.zIndex = 4000;
        notif.style.display = 'flex';
        notif.style.alignItems = 'center';
        notif.innerHTML = `<span style="font-size:1.5rem;margin-right:10px;">✅</span><span>${message}</span>`;
        document.body.appendChild(notif);
    } else {
        notif.querySelector('span:last-child').textContent = message;
        notif.style.display = 'flex';
    }
    setTimeout(() => {
        notif.style.display = 'none';
    }, 2000);
}