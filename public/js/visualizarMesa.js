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
                // NO RESTAR 5 HORAS: la hora de inicio ya viene en hora local de Colombia desde el backend
                let fechaObj = new Date(str);
                if (!isNaN(fechaObj.getTime())) {
                    horaInicioDate = fechaObj;
                    horaInicioFormateada = fechaObj.toLocaleTimeString('es-CO', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true 
                    });
                    console.log("Hora de inicio formateada:", horaInicioFormateada);
                } else {
                    console.error("La fecha convertida no es válida:", fechaObj);
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
                    // Usa la hora tal como está en la BD (no restes 5 horas)
                    const d = new Date(p.hora_pedido.replace(' ', 'T'));
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
                    <td class="td-valor">${data.numero_mesa}</td>
                </tr>
                <tr>
                    <th>Estado</th>
                    <td class="td-valor">${data.estado}</td>
                </tr>
                <tr>
                    <th>Hora de inicio</th>
                    <td class="td-valor" id="hora-inicio-vz">${horaInicioFormateada}</td>
                </tr>
                <tr>
                    <th>Precio por hora</th>
                    <td class="td-valor">$${parseFloat(data.precio_hora).toLocaleString('es-CO')}</td>
                </tr>
                <tr>
                    <th>Tiempo jugado</th>
                    <td class="td-valor" id="td-tiempo-jugado">
                        <span id="contador-tiempo-vz">00:00:00</span>
                    </td>
                </tr>
                <tr>
                    <th>Valor del tiempo jugado</th>
                    <td class="td-valor" id="td-valor-tiempo-jugado">
                        <span id="contador-total-tiempo-vz">$0</span>
                    </td>
                </tr>
                <tr>
                    <th>Pedidos realizados</th>
                    <td class="td-valor">${pedidosAgrupados.length}</td>
                </tr>
            </table>
        `;

        if (pedidosAgrupados.length > 0) {
            html += `
                <h3>Detalle de Pedidas</h3>
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
                                    // Usa la hora tal como está en la BD (no restes 5 horas)
                                    let str = horaBD.replace(' ', 'T');
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
                                    <td colspan="5" style="text-align:center;font-weight:bold;">
                                        Total de la pedida N° ${idxGrupo + 1}: $${totalPedida.toLocaleString('es-CO')}
                                    </td>
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

        // --- Agrega el estilo para los td de valor para igualar el formato ---
        if (!document.getElementById('visualizarMesaTdValorStyle')) {
            const style = document.createElement('style');
            style.id = 'visualizarMesaTdValorStyle';
            style.innerHTML = `
                #visualizarDetalle .td-valor {
                    background: #fff !important;
                    color: #232946 !important;
                    font-weight: 600;
                    border-radius: 0.5rem;
                    box-shadow: 0 2px 8px #00cfff11;
                    font-size: 1.13rem;
                    padding: 0.7rem 1rem !important;
                    text-align: left;
                }
                #visualizarDetalle th {
                    color: #007bff !important;
                    background: #f5f7fa !important;
                }
            `;
            document.head.appendChild(style);
        }

        // --- NUEVO: Lógica de contador visual en base a la BD ---
        if (visualizarIntervalRef.current) {
            clearInterval(visualizarIntervalRef.current);
            visualizarIntervalRef.current = null;
        }
        if (data.estado === 'Ocupada' && horaInicioDate && !isNaN(horaInicioDate.getTime())) {
            const precioHora = parseFloat(data.precio_hora) || 6000;
            const contadorTiempo = document.getElementById('contador-tiempo-vz');
            const contadorTotal = document.getElementById('contador-total-tiempo-vz');
            function actualizarContador() {
                const ahora = new Date();
                let segundos = Math.floor((ahora - horaInicioDate) / 1000);
                if (segundos < 0) segundos = 0;
                const horas = Math.floor(segundos / 3600).toString().padStart(2, '0');
                const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
                const segs = (segundos % 60).toString().padStart(2, '0');
                if (contadorTiempo) contadorTiempo.textContent = `${horas}:${minutos}:${segs}`;
                // Calcular total a pagar por tiempo y mostrarlo con formato moneda
                const total = Math.round((segundos / 3600) * precioHora);
                if (contadorTotal) contadorTotal.textContent = `$${total.toLocaleString('es-CO')}`;
            }
            actualizarContador();
            visualizarIntervalRef.current = setInterval(actualizarContador, 1000);
        } else {
            // Si la mesa no está ocupada, muestra los valores por defecto
            const contadorTiempo = document.getElementById('contador-tiempo-vz');
            const contadorTotal = document.getElementById('contador-total-tiempo-vz');
            if (contadorTiempo) contadorTiempo.textContent = '00:00:00';
            if (contadorTotal) contadorTotal.textContent = '$0';
        }
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
