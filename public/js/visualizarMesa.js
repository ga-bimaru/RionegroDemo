export async function mostrarDetalleMesa(mesaId, visualizarDetalle, visualizarModal, visualizarIntervalRef) {
    try {
        const res = await fetch(`/api/mesas/${mesaId}/detalle`);
        if (!res.ok) throw new Error('Error al obtener detalles de la mesa');
        const data = await res.json();

        console.log("Detalles de mesa recibidos:", data);

        let horaInicioDate = null;
        let horaInicioFormateada = '-';
        
        if (data.hora_inicio) {
            console.log("Procesando hora_inicio:", data.hora_inicio);
            try {
                // Convertir la fecha de MySQL a objeto Date de JavaScript
                let str = data.hora_inicio.replace(' ', 'T');
                horaInicioDate = new Date(str);
                
                if (!isNaN(horaInicioDate.getTime())) {
                    // Formato personalizado para mostrar la hora (HH:MM:SS)
                    horaInicioFormateada = horaInicioDate.toLocaleTimeString('es-CO', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true 
                    });
                    console.log("Hora de inicio formateada:", horaInicioFormateada);
                } else {
                    console.error("La fecha convertida no es válida:", horaInicioDate);
                }
            } catch (error) {
                console.error("Error al procesar la hora de inicio:", error);
            }
        }

        const tableStyle = `
            <style>
                #visualizarDetalle table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1rem;
                    background: #fff;
                    border-radius: 0.7rem;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
                }
                #visualizarDetalle th, #visualizarDetalle td {
                    padding: 0.7rem 1rem;
                    border-bottom: 1px solid #e0e0e0;
                    text-align: left;
                }
                #visualizarDetalle th {
                    background: #f5f7fa;
                    color: #007bff;
                    font-weight: 600;
                }
                #visualizarDetalle tr:last-child td {
                    border-bottom: none;
                }
                #visualizarDetalle h3 {
                    margin-top: 1.2rem;
                    color: #007bff;
                }
            </style>
        `;

        let pedidosAgrupados = [];
        if (Array.isArray(data.pedidos) && data.pedidos.length > 0) {
            const agrupados = {};
            data.pedidos.forEach(p => {
                let key = '';
                if (p.hora_pedido) {
                    const d = new Date(p.hora_pedido);
                    key = d.getFullYear() + '-' +
                        String(d.getMonth() + 1).padStart(2, '0') + '-' +
                        String(d.getDate()).padStart(2, '0') + ' ' +
                        String(d.getHours()).padStart(2, '0') + ':' +
                        String(d.getMinutes()).padStart(2, '0');
                }
                if (!agrupados[key]) agrupados[key] = [];
                agrupados[key].push(p);
            });
            pedidosAgrupados = Object.entries(agrupados)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([hora, productos]) => ({ hora, productos }));
        }

        let html = tableStyle + `
            <table>
                <tr>
                    <th>Mesa</th>
                    <td>${data.numero_mesa}</td>
                </tr>
                <tr>
                    <th>Estado</th>
                    <td>${data.estado}</td>
                </tr>
                <tr>
                    <th>Hora de inicio</th>
                    <td id="hora-inicio-vz">${horaInicioFormateada}</td>
                </tr>
                <tr>
                    <th>Precio por hora</th>
                    <td>$${parseFloat(data.precio_hora).toLocaleString('es-CO')}</td>
                </tr>
                <tr>
                    <th>Total a pagar (tiempo)</th>
                    <td id="total-tiempo-vz">$${parseFloat(data.total_tiempo || 0).toLocaleString('es-CO')}</td>
                </tr>
                <tr>
                    <th>Pedidos realizados</th>
                    <td>${pedidosAgrupados.length}</td>
                </tr>
            </table>
        `;

        if (pedidosAgrupados.length > 0) {
            html += `
                <h3>Detalle de Pedidas</h3>
                <div id="snackbar-scroll" class="snackbar-scroll">
                    Desliza horizontalmente para ver el total de cada pedida &rarr;
                </div>
                <div style="overflow-x:auto; width:100%;">
                <table style="min-width:700px; max-width:1200px;">
                    <thead>
                        <tr>
                            <th style="min-width:100px;">N° Pedida</th>
                            <th style="min-width:160px;">Hora de la Pedida</th>
                            <th style="min-width:200px;">Productos</th>
                            <th style="min-width:80px;">Cant.</th>
                            <th style="min-width:120px;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pedidosAgrupados.map((grupo, idxGrupo) => {
                            let horaLegible = '-';
                            if (grupo.hora) {
                                const horaBD = grupo.productos[0]?.hora_pedido;
                                let fechaObj;
                                if (horaBD) {
                                    let str = horaBD.replace(' ', 'T');
                                    if (str.endsWith('Z')) {
                                        str = str.replace('Z', '-05:00');
                                    } else if (!/[\+\-]\d{2}:\d{2}$/.test(str)) {
                                        str += '-05:00';
                                    }
                                    fechaObj = new Date(str);
                                }
                                if (fechaObj && !isNaN(fechaObj.getTime())) {
                                    horaLegible = fechaObj.toLocaleTimeString('es-CO', { 
                                        hour: '2-digit', 
                                        minute: '2-digit', 
                                        second: '2-digit',
                                        hour12: true 
                                    });
                                }
                            }
                            const totalPedida = grupo.productos.reduce((acc, p) => acc + parseFloat(p.subtotal), 0);
                            let filas = '';
                            grupo.productos.forEach((p, idx) => {
                                filas += `
                                    <tr>
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length + 1}" style="vertical-align:middle;text-align:center;">${idxGrupo + 1}</td>` : ''}
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length + 1}" style="vertical-align:middle;text-align:center;">${horaLegible}</td>` : ''}
                                        <td>${p.nombre_producto}</td>
                                        <td>${p.cantidad}</td>
                                        <td>$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                                    </tr>
                                `;
                            });
                            filas += `
                                <tr>
                                    <td colspan="4" style="text-align:right;font-weight:bold;">Total de la pedida N° ${idxGrupo + 1}:</td>
                                    <td style="font-weight:bold;">$${totalPedida.toLocaleString('es-CO')}</td>
                                </tr>
                            `;
                            return filas;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            `;
        } else {
            html += `<em>No hay pedidos registrados para esta mesa.</em>`;
        }

        visualizarDetalle.innerHTML = html;
        visualizarModal.classList.remove('hidden');
        visualizarModal.style.display = 'flex';

        // Eliminar lógica del contador de tiempo
        if (visualizarIntervalRef.current) {
            clearInterval(visualizarIntervalRef.current);
            visualizarIntervalRef.current = null;
        }
        // No iniciar ningún intervalo para tiempo transcurrido
    } catch (err) {
        console.error("Error al mostrar detalles de mesa:", err);
        // showNotification para errores visuales
        if (typeof showNotification === 'function') {
            showNotification('Error al cargar detalles de la mesa');
        }
        visualizarDetalle.innerHTML = `<p style="color:red;">Error al cargar detalles: ${err.message}</p>`;
        visualizarModal.classList.remove('hidden');
        visualizarModal.style.display = 'flex';
    }
}

// Eliminar función mostrarDetalleMesa(detalle) relacionada con el contador
// ...existing code (restante sin cambios)...

export function inicializarVisualizarMesa() {
    // Crear el modal de visualización si no existe
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

    // Evento para botón "Visualizar"
    function addVisualizarEvent() {
        document.querySelectorAll('.visualizar-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const mesaId = e.target.dataset.mesa;
                await mostrarDetalleMesa(mesaId, visualizarDetalle, visualizarModal, visualizarIntervalRef);
            });
        });
    }

    // Exponer para que el index.js pueda llamarlo después de renderizar mesas
    window.addVisualizarEvent = addVisualizarEvent;
}

// Agrega este CSS al final del archivo o en tu CSS global:
/*
.snackbar-scroll {
    background: #222;
    color: #fff;
    padding: 8px 22px;
    border-radius: 1.2rem;
    display: block;
    font-size: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    opacity: 0.92;
    margin-bottom: 10px;
    margin-top: 2px;
    text-align: center;
    width: fit-content;
    max-width: 100%;
    white-space: nowrap;
}
*/
