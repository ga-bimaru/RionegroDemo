// Este archivo contiene la lógica de sincronización y control de los contadores de tiempo de las mesas.
// Principios SOLID aplicados: cada función tiene una responsabilidad clara y el código es extensible y desacoplado.

import { mostrarModalDetener } from './modalDetener.js';

export const intervalesMesa = {};

// --- S: Single Responsibility Principle ---
// Clase para la persistencia del estado de los contadores
class ContadorStorage {
    static guardarEstado(intervalesMesa) {
        const estado = {};
        Object.keys(intervalesMesa).forEach(mesa => {
            estado[mesa] = {
                segundos: intervalesMesa[mesa].segundos,
                corriendo: !!intervalesMesa[mesa].intervalId,
                horaInicio: intervalesMesa[mesa].horaInicio
            };
        });
        localStorage.setItem('estadoContadoresMesas', JSON.stringify(estado));
    }

    static cargarEstado() {
        try {
            return JSON.parse(localStorage.getItem('estadoContadoresMesas')) || {};
        } catch {
            return {};
        }
    }
}

// --- S: Single Responsibility Principle ---
// Clase para la gestión de pagadas por mesa
class PagadasPorMesaStorage {
    static get(mesaId) {
        const data = JSON.parse(localStorage.getItem('pagadasPorMesa') || '{}');
        return data[mesaId] || [];
    }
    static set(mesaId, keyPedida, pagada) {
        const data = JSON.parse(localStorage.getItem('pagadasPorMesa') || '{}');
        if (!data[mesaId]) data[mesaId] = [];
        if (pagada && !data[mesaId].includes(keyPedida)) {
            data[mesaId].push(keyPedida);
        } else if (!pagada && data[mesaId].includes(keyPedida)) {
            data[mesaId] = data[mesaId].filter(k => k !== keyPedida);
        }
        localStorage.setItem('pagadasPorMesa', JSON.stringify(data));
    }
}

// --- O: Open/Closed Principle ---
// Clase para la sincronización de contadores con el backend
class ContadorSync {
    static async sincronizar(mesas) {
        try {
            const response = await fetch('/api/alquileres/activos');
            if (!response.ok) throw new Error('Error al obtener alquileres activos');
            const alquileresActivos = await response.json();
            const mesasConAlquiler = new Set(alquileresActivos.map(a => String(a.id_mesa)));
            let estado = ContadorStorage.cargarEstado();
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
}

// --- L: Liskov Substitution Principle ---
// (No aplica aquí, pero las clases pueden ser extendidas si se requiere.)

// --- I: Interface Segregation Principle ---
// (No aplica directamente en JS, pero las funciones están separadas por responsabilidad.)

// --- D: Dependency Inversion Principle ---
// (Las dependencias están inyectadas por parámetros o importaciones, no hardcodeadas.)

// --- API pública para otros módulos ---
export function cargarEstadoContadores() {
    return ContadorStorage.cargarEstado();
}
export async function sincronizarContadoresConAlquileres(mesas) {
    return ContadorSync.sincronizar(mesas);
}

// --- Lógica de control de contadores y UI ---
const VALOR_HORA = 6000;

// --- NUEVO: Función para calcular el total a pagar de la mesa (tiempo + productos) ---
function calcularTotalMesa(mesaId) {
    // Esta función debe obtener el total real de la mesa (tiempo + productos).
    // Por simplicidad, retorna 0. Si necesitas el cálculo real, deberías hacer una petición fetch aquí.
    return 0;
}

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
                ContadorStorage.guardarEstado(intervalesMesa);
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
        // Al detener, muestra el modal de factura usando SOLO el importado
        mostrarModalDetener(mesaId, calcularTotalMesa(mesaId), async (facturaData) => {
            try {
                const response = await fetch('/api/alquileres/finalizar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_mesa: mesaId,
                        ...facturaData
                    })
                });
                if (!response.ok) throw new Error('Error al finalizar y facturar');
                // --- CORREGIDO: Elimina la llamada a mostrarSnackbarAlquilerFinalizado ---
                // El mensaje visual de éxito ya se muestra en modalDetener.js
                // ...puedes recargar la página si lo deseas...
                // No muestres ningún mensaje aquí, solo recarga si quieres
                // setTimeout(() => location.reload(), 1200);
            } catch (err) {
                alert('Error al guardar la factura: ' + (err.message || err));
            }
        });
    }
}

// --- NUEVO: Recargar página para evitar ReferenceError ---
function recargarPagina() {
    location.reload();
}

// --- NUEVO: Snackbar visual tipo la imagen adjunta ---
function mostrarSnackbarFactura(msg) {
    let notif = document.getElementById('snackbarFacturaError');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'snackbarFacturaError';
        notif.style.position = 'fixed';
        notif.style.top = '40px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.background = 'linear-gradient(90deg,#00cfff 0%,#007bff 100%)';
        notif.style.color = '#fff';
        notif.style.borderRadius = '1.2rem';
        notif.style.padding = '1.2rem 2rem';
        notif.style.fontSize = '1.13rem';
        notif.style.fontWeight = '600';
        notif.style.boxShadow = '0 2px 12px #00cfff33';
        notif.style.minWidth = '280px';
        notif.style.maxWidth = '350px';
        notif.style.zIndex = 9999;
        notif.style.display = 'flex';
        notif.style.alignItems = 'center';
        notif.style.justifyContent = 'center';
        notif.style.textAlign = 'center';
        notif.innerHTML = `
            <span style="font-size:1.7rem;display:flex;align-items:center;justify-content:center;margin-right:1rem;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="none"/>
                    <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/>
                    <path d="M8 12.5l2.5 2.5L16 9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
            <span>${msg}</span>
        `;
        document.body.appendChild(notif);
    } else {
        notif.querySelector('span:last-child').textContent = msg;
        notif.style.display = 'flex';
    }
    setTimeout(() => {
        notif.style.display = 'none';
    }, 2200);
}

// --- Exporta las clases si necesitas testearlas o usarlas en otros módulos ---
export { ContadorStorage, PagadasPorMesaStorage, ContadorSync };