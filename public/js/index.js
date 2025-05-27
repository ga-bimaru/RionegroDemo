document.addEventListener('DOMContentLoaded', async () => {
    const mesasContainer = document.getElementById('mesasContainer');
    const pedidoModal = document.getElementById('pedidoModal');
    const closePedidoModal = document.getElementById('closePedidoModal');
    const pedidoForm = document.getElementById('pedidoForm');
    const categoriaSelect = document.getElementById('categoria');
    const productosContainer = document.getElementById('productosContainer');
    const totalPedido = document.getElementById('totalPedido');
    // Nuevo: contenedor para el resumen de productos seleccionados
    let resumenPedidoContainer = document.getElementById('resumenPedidoContainer');
    if (!resumenPedidoContainer) {
        resumenPedidoContainer = document.createElement('div');
        resumenPedidoContainer.id = 'resumenPedidoContainer';
        resumenPedidoContainer.style.marginBottom = '1rem';
        totalPedido.parentNode.parentNode.insertBefore(resumenPedidoContainer, totalPedido.parentNode);
    }

    let productos = [];
    // Cambia a un array de productos seleccionados
    let productosSeleccionados = [];

    // Intervalo para actualizar la hora del pedido
    let horaPedidoInterval = null;

    // Función para abrir el modal y cargar categorías/productos
    const openPedidoModal = (mesaId) => {
        pedidoModal.dataset.mesaId = mesaId;
        pedidoModal.classList.remove('hidden');
        pedidoModal.style.display = 'flex';
        cargarCategoriasYProductos();
        // Mostrar siempre el combobox de categoría
        categoriaSelect.style.display = '';
        categoriaSelect.parentElement.style.display = '';
        // Poner la fecha y hora actual automáticamente
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const hora = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const horaPedidoInput = document.getElementById('horaPedido');
        function setHoraPedidoNow() {
            const now = new Date();
            const pad = n => n.toString().padStart(2, '0');
            const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const hora = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            horaPedidoInput.value = `${fecha}T${hora}`;
        }
        setHoraPedidoNow();
        horaPedidoInput.readOnly = true;
        // Actualiza cada segundo mientras el modal esté abierto
        if (horaPedidoInterval) clearInterval(horaPedidoInterval);
        horaPedidoInterval = setInterval(() => {
            if (pedidoModal.classList.contains('hidden') || pedidoModal.style.display === 'none') {
                clearInterval(horaPedidoInterval);
                horaPedidoInterval = null;
            } else {
                setHoraPedidoNow();
            }
        }, 1000);

        productosSeleccionados = [];
        actualizarResumenYTotal();
        if (productosContainer) {
            productosContainer.innerHTML = '';
            productosContainer.style.display = 'none';
        }
    };

    // Función para cerrar el modal
    closePedidoModal.addEventListener('click', () => {
        pedidoModal.classList.add('hidden');
        pedidoModal.style.display = 'none'; // Ocultar el modal correctamente
        if (horaPedidoInterval) {
            clearInterval(horaPedidoInterval);
            horaPedidoInterval = null;
        }
    });

    // Cerrar el modal al hacer clic fuera del contenido (solo si el click es directamente sobre el fondo)
    pedidoModal.addEventListener('mousedown', function (e) {
        if (e.target === pedidoModal) {
            pedidoModal.classList.add('hidden');
            pedidoModal.style.display = 'none';
            if (horaPedidoInterval) {
                clearInterval(horaPedidoInterval);
                horaPedidoInterval = null;
            }
        }
    });

    // Cargar categorías y productos desde la base de datos
    async function cargarCategoriasYProductos() {
        try {
            const response = await fetch('/api/productos');
            if (!response.ok) throw new Error('Error al cargar los productos');
            productos = await response.json();

            // Filtra productos con categoría válida
            const categorias = [...new Set(productos.map(p => p.categoria || 'Sin categoría'))];
            if (!categoriaSelect) {
                console.error('No se encontró el combobox de categoría en el DOM');
            } else {
                categoriaSelect.innerHTML = `<option value="" disabled selected>Seleccione una categoría</option>` +
                    categorias.map(c => `<option value="${c}">${c}</option>`).join('');
                categoriaSelect.style.display = '';
                console.log('ComboBox de categoría llenado:', categorias);
            }

            // No mostrar productos hasta que el usuario seleccione una categoría
            if (productosContainer) {
                productosContainer.innerHTML = '';
                productosContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error en cargarCategoriasYProductos:', error);
        }
    }

    // Mostrar productos como tarjetas filtrados por categoría
    function cargarProductosPorCategoria(categoria) {
        try {
            if (!categoria) {
                if (productosContainer) {
                    productosContainer.innerHTML = '';
                    productosContainer.style.display = 'none';
                }
                return;
            }
            // Filtra por categoría, considerando productos sin categoría
            const productosFiltrados = productos.filter(p => (p.categoria || 'Sin categoría') === categoria);
            if (!productosContainer) {
                console.error('No se encontró el contenedor de productos');
                return;
            }
            if (productosFiltrados.length === 0) {
                productosContainer.innerHTML = '<p>No hay productos para esta categoría.</p>';
            } else {
                productosContainer.innerHTML = productosFiltrados.map(p => {
                    // Busca si ya está seleccionado y su cantidad
                    const seleccionado = productosSeleccionados.find(sel => sel.id_producto === p.id_producto);
                    const cantidad = seleccionado ? seleccionado.cantidad : 0;
                    return `
                    <div class="producto-card${cantidad > 0 ? ' seleccionado' : ''}" 
                        data-id="${p.id_producto}" data-precio="${p.precio}" data-nombre="${p.nombre}" data-img="${p.imagen || '/images/default-product.png'}">
                        <img src="${p.imagen || '/images/default-product.png'}" alt="${p.nombre}" class="producto-img">
                        <div class="producto-info">
                            <span class="producto-nombre">${p.nombre}</span>
                            <span class="producto-precio">$${parseFloat(p.precio).toFixed(2)}</span>
                        </div>
                        <div class="cantidad-container" style="margin-top:0.7rem; width:100%; display:flex; justify-content:center; align-items:center;">
                            <button type="button" class="cantidad-btn menos" style="font-size:1.3rem; width:32px;">-</button>
                            <input type="number" class="cantidad-input" min="0" value="${cantidad}" style="width:70px; text-align:center; margin:0 0.5rem;">
                            <button type="button" class="cantidad-btn mas" style="font-size:1.3rem; width:32px;">+</button>
                        </div>
                    </div>
                    `;
                }).join('');
            }
            productosContainer.style.display = 'flex';

            // Lógica de cantidad para cada producto
            productosContainer.querySelectorAll('.producto-card').forEach(card => {
                const input = card.querySelector('.cantidad-input');
                const btnMenos = card.querySelector('.cantidad-btn.menos');
                const btnMas = card.querySelector('.cantidad-btn.mas');
                const id = card.dataset.id;
                const nombre = card.dataset.nombre;
                const precio = parseFloat(card.dataset.precio);

                // Botón menos
                btnMenos.onclick = (e) => {
                    e.stopPropagation();
                    let val = parseInt(input.value) || 0;
                    if (val > 0) {
                        input.value = val - 1;
                        actualizarProductoSeleccionado(id, nombre, precio, val - 1);
                    }
                };
                // Botón más
                btnMas.onclick = (e) => {
                    e.stopPropagation();
                    let val = parseInt(input.value) || 0;
                    input.value = val + 1;
                    actualizarProductoSeleccionado(id, nombre, precio, val + 1);
                };
                // Cambio manual en input
                input.oninput = (e) => {
                    e.stopPropagation();
                    let val = parseInt(input.value) || 0;
                    if (val < 0) val = 0;
                    input.value = val;
                    actualizarProductoSeleccionado(id, nombre, precio, val);
                };
            });
            actualizarResumenYTotal();
        } catch (error) {
            console.error('Error al cargar productos por categoría:', error);
        }
    }

    // Actualiza productosSeleccionados y el resumen
    function actualizarProductoSeleccionado(id, nombre, precio, cantidad) {
        const idx = productosSeleccionados.findIndex(p => p.id_producto === id);
        if (cantidad > 0) {
            if (idx === -1) {
                productosSeleccionados.push({ id_producto: id, nombre, precio, cantidad });
            } else {
                productosSeleccionados[idx].cantidad = cantidad;
            }
        } else {
            if (idx !== -1) productosSeleccionados.splice(idx, 1);
        }
        // Actualiza el estilo de la tarjeta
        const card = productosContainer.querySelector(`.producto-card[data-id="${id}"]`);
        if (card) {
            if (cantidad > 0) card.classList.add('seleccionado');
            else card.classList.remove('seleccionado');
        }
        actualizarResumenYTotal();
    }

    // Muestra el resumen de productos y el total
    function actualizarResumenYTotal() {
        // Resumen arriba del total
        if (resumenPedidoContainer) {
            if (productosSeleccionados.length === 0) {
                resumenPedidoContainer.innerHTML = '<em>No hay productos agregados.</em>';
            } else {
                resumenPedidoContainer.innerHTML = productosSeleccionados.map(p =>
                    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                        <span>${p.nombre}</span>
                        <span>x${p.cantidad}</span>
                        <span>$${(p.precio * p.cantidad).toLocaleString('es-CO')}</span>
                    </div>`
                ).join('');
            }
        }
        // Total
        const total = productosSeleccionados.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
        totalPedido.textContent = total.toLocaleString('es-CO');
    }

    // Mostrar productos solo cuando el usuario selecciona una categoría válida
    categoriaSelect.addEventListener('change', (e) => {
        const categoria = e.target.value;
        if (!categoria) {
            if (productosContainer) {
                productosContainer.innerHTML = '';
                productosContainer.style.display = 'none';
            }
            return;
        }
        cargarProductosPorCategoria(categoria);
    });

    // Enviar el pedido con todos los productos seleccionados
    pedidoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mesaId = pedidoModal.dataset.mesaId;
        if (!productosSeleccionados.length) {
            showNotification('Por favor agrega al menos un producto con cantidad mayor a 0');
            return;
        }
        const horaPedido = document.getElementById('horaPedido').value;
        const productosEnviar = productosSeleccionados.map(p => ({
            id_producto: p.id_producto,
            cantidad: p.cantidad,
            subtotal: p.precio * p.cantidad
        }));

        // DEBUG: Muestra el objeto que se enviará al backend
        console.log('Objeto enviado al backend:', {
            id_mesa: mesaId,
            hora_pedido: horaPedido,
            productos: productosEnviar
        });

        try {
            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_mesa: mesaId,
                    hora_pedido: horaPedido,
                    productos: productosEnviar
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Respuesta del backend:', errorText);
                showNotification('Error al registrar el pedido');
                return;
            }

            showNotification('Pedido registrado exitosamente');
            pedidoModal.classList.add('hidden');
            pedidoModal.style.display = 'none';
        } catch (error) {
            console.error('Error al registrar el pedido:', error);
            showNotification('Error al registrar el pedido');
        }
    });

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

    function cargarEstadoContadores() {
        try {
            const estado = JSON.parse(localStorage.getItem('estadoContadoresMesas')) || {};
            return estado;
        } catch {
            return {};
        }
    }

    // Sincroniza los contadores locales con los alquileres activos en el backend
    async function sincronizarContadoresConAlquileres(mesas) {
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

    // Crea el modal de visualización si no existe
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
    let visualizarInterval = null;

    closeVisualizarModal.onclick = () => {
        visualizarModal.classList.add('hidden');
        visualizarModal.style.display = 'none';
        if (visualizarInterval) {
            clearInterval(visualizarInterval);
            visualizarInterval = null;
        }
    };

    // Evento para botón "Visualizar"
    function addVisualizarEvent() {
        document.querySelectorAll('.visualizar-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const mesaId = e.target.dataset.mesa;
                await mostrarDetalleMesa(mesaId);
            });
        });
    }

    // Mostrar el modal con los detalles de la mesa
    async function mostrarDetalleMesa(mesaId) {
        try {
            // Pide los detalles al backend
            const res = await fetch(`/api/mesas/${mesaId}/detalle`);
            if (!res.ok) throw new Error('Error al obtener detalles de la mesa');
            const data = await res.json();

            // --- CORRECCIÓN: Usa la hora de inicio EXACTA y actualiza correctamente el tiempo transcurrido ---
            let horaInicioDate = null;
            let horaInicioFormateada = '-';
            if (data.hora_inicio) {
                // Forzar a local: parsea como 'YYYY-MM-DDTHH:mm:ss' y ajusta desfase si es necesario
                let str = data.hora_inicio.replace(' ', 'T');
                horaInicioDate = new Date(str);
                // Si la hora es inválida o está en el futuro, usa la hora actual
                if (isNaN(horaInicioDate.getTime()) || horaInicioDate > new Date()) {
                    horaInicioDate = new Date();
                }
                horaInicioFormateada = horaInicioDate.toLocaleTimeString('es-CO', { hour12: true });
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

            // Agrupar pedidos por hora_pedido (redondeando a minutos)
            let pedidosAgrupados = [];
            if (Array.isArray(data.pedidos) && data.pedidos.length > 0) {
                const agrupados = {};
                data.pedidos.forEach(p => {
                    let key = '';
                    if (p.hora_pedido) {
                        // Agrupa por fecha y hora:minuto (YYYY-MM-DD HH:mm)
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
                        <th>Tiempo transcurrido</th>
                        <td id="tiempo-transcurrido-vz">00:00:00</td>
                    </tr>
                    <tr>
                        <th>Precio por hora</th>
                        <td>$${parseFloat(data.precio_hora).toLocaleString('es-CO')}</td>
                    </tr>
                    <tr>
                        <th>Total a pagar (tiempo)</th>
                        <td id="total-tiempo-vz">$${parseFloat(data.total_tiempo).toLocaleString('es-CO')}</td>
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
                    <table>
                        <thead>
                            <tr>
                                <th>Hora de la Pedida</th>
                                <th>Productos</th>
                                <th>Cant.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pedidosAgrupados.map(grupo => {
                                let horaLegible = '-';
                                if (grupo.hora) {
                                    // Tomar la hora de la pedida del primer producto del grupo
                                    const horaBD = grupo.productos[0]?.hora_pedido;
                                    let fechaObj;
                                    if (horaBD) {
                                        // Si viene en formato ISO, úsalo tal cual
                                        // Si viene como 'YYYY-MM-DD HH:mm:ss', reemplaza el espacio por 'T'
                                        let str = horaBD.includes('T') ? horaBD : horaBD.replace(' ', 'T');
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
                                return grupo.productos.map((p, idx) => `
                                    <tr>
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${horaLegible}</td>` : ''}
                                        <td>${p.nombre_producto}</td>
                                        <td>${p.cantidad}</td>
                                        <td>$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                                    </tr>
                                `).join('');
                            }).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                html += `<em>No hay pedidos registrados para esta mesa.</em>`;
            }

            visualizarDetalle.innerHTML = html;
            visualizarModal.classList.remove('hidden');
            visualizarModal.style.display = 'flex';

            // --- Actualizar el tiempo transcurrido y el total a pagar en tiempo real si la mesa está activa ---
            if (visualizarInterval) {
                clearInterval(visualizarInterval);
                visualizarInterval = null;
            }
            const tiempoTd = document.getElementById('tiempo-transcurrido-vz');
            const totalTiempoTd = document.getElementById('total-tiempo-vz');
            if (horaInicioDate && data.estado === 'Ocupada') {
                function actualizarTiempoYTotal() {
                    const ahora = new Date();
                    let diff = Math.floor((ahora - horaInicioDate) / 1000);
                    if (diff < 0) diff = 0;
                    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
                    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                    const s = (diff % 60).toString().padStart(2, '0');
                    tiempoTd.textContent = `${h}:${m}:${s}`;
                    // Calcular el total a pagar en tiempo real
                    const precioHora = parseFloat(data.precio_hora) || 0;
                    const horasDecimal = diff / 3600;
                    const total = horasDecimal * precioHora;
                    totalTiempoTd.textContent = `$${total.toLocaleString('es-CO', {maximumFractionDigits: 0})}`;
                }
                actualizarTiempoYTotal();
                visualizarInterval = setInterval(actualizarTiempoYTotal, 1000);
            } else {
                tiempoTd.textContent = '00:00:00';
            }
        } catch (err) {
            visualizarDetalle.innerHTML = `<p style="color:red;">Error al cargar detalles: ${err.message}</p>`;
            visualizarModal.classList.remove('hidden');
            visualizarModal.style.display = 'flex';
        }
    }

    // Crear el modal de transferencia si no existe
    let transferirModal = document.getElementById('transferirTiempoModal');
    if (!transferirModal) {
        transferirModal = document.createElement('div');
        transferirModal.id = 'transferirTiempoModal';
        transferirModal.className = 'modal hidden';
        transferirModal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span class="close-btn" id="closeTransferirModal" style="cursor:pointer;font-size:1.5rem;position:absolute;top:10px;right:18px;">&times;</span>
                <h3 style="margin-top:0.5rem;">Transferir tiempo a otra mesa</h3>
                <form id="formTransferirTiempo">
                    <label for="selectMesaDestino">Selecciona la mesa destino:</label>
                    <select id="selectMesaDestino" required style="width:100%;padding:0.5rem;margin:1rem 0;"></select>
                    <div style="display:flex;gap:1rem;justify-content:flex-end;">
                        <button type="button" id="cancelarTransferirBtn" style="background:#e74c3c;color:#fff;padding:0.5rem 1.5rem;border-radius:0.7rem;">Cancelar</button>
                        <button type="submit" style="background:#007bff;color:#fff;padding:0.5rem 1.5rem;border-radius:0.7rem;">Transferir</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(transferirModal);
    }
    const closeTransferirModal = document.getElementById('closeTransferirModal');
    const cancelarTransferirBtn = document.getElementById('cancelarTransferirBtn');
    const formTransferirTiempo = document.getElementById('formTransferirTiempo');
    const selectMesaDestino = document.getElementById('selectMesaDestino');

    function abrirTransferirModal(mesaIdActual, mesas) {
        // Solo mostrar mesas que NO sean la actual y que estén disponibles
        selectMesaDestino.innerHTML = mesas
            .filter(m => m.id_mesa != mesaIdActual && m.estado === 'Disponible')
            .map(m => `<option value="${m.id_mesa}">Mesa ${m.numero_mesa}</option>`)
            .join('');
        transferirModal.classList.remove('hidden');
        transferirModal.style.display = 'flex';
        formTransferirTiempo.dataset.mesaActual = mesaIdActual;
    }

    closeTransferirModal.onclick = cancelarTransferirBtn.onclick = function() {
        transferirModal.classList.add('hidden');
        transferirModal.style.display = 'none';
    };

    formTransferirTiempo.onsubmit = async function(e) {
        e.preventDefault();
        const idMesaOrigen = formTransferirTiempo.dataset.mesaActual;
        const idMesaDestino = selectMesaDestino.value;
        if (!idMesaDestino) {
            showNotification('Selecciona una mesa destino');
            return;
        }
        try {
            const res = await fetch('/api/alquileres/transferir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_mesa_origen: idMesaOrigen, id_mesa_destino: idMesaDestino })
            });
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                showNotification('Error inesperado del servidor');
                return;
            }
            const data = await res.json();
            if (data.success) {
                // --- NUEVO: Transferir visibilidad del botón "Ver Totales" ---
                let verTotalesVisible = {};
                try {
                    verTotalesVisible = JSON.parse(localStorage.getItem('verTotalesVisible') || '{}');
                } catch { verTotalesVisible = {}; }
                // Si el botón estaba visible en la mesa origen, pásalo a la mesa destino
                if (verTotalesVisible[idMesaOrigen]) {
                    verTotalesVisible[idMesaDestino] = true;
                    verTotalesVisible[idMesaOrigen] = false;
                    localStorage.setItem('verTotalesVisible', JSON.stringify(verTotalesVisible));
                }
                // --- FIN NUEVO ---

                showNotification('Tiempo y pedidos transferidos correctamente.');
                transferirModal.classList.add('hidden');
                transferirModal.style.display = 'none';
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification(data.message || 'No se pudo transferir el tiempo.');
            }
        } catch (err) {
            showNotification('Error al transferir el tiempo');
        }
    };

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

    // Modifica renderMesas para que el botón "Ver Totales" se muestre si ya se había iniciado en esa mesa
    function renderMesas(mesas) {
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
            // El botón solo debe mostrarse si el usuario ya oprimió "Iniciar" en esta sesión (no por recarga ni por estado "Ocupada")
            // Solo mostrar si verTotalesVisible[mesa.id_mesa] === true Y la mesa está en estado "Ocupada"
            const mostrarVerTotales = verTotalesVisible[mesa.id_mesa] === true && mesa.estado === 'Ocupada';

            const mesaCard = document.createElement('div');
            mesaCard.className = 'info-card';
            mesaCard.innerHTML = `
                <div class="mesa-image-container">
                    <img src="/images/mesapoll.jpeg" alt="Mesa ${mesa.numero_mesa}" class="mesa-image">
                </div>
                <div class="mesa-details">
                    <h3>Mesa ${mesa.numero_mesa}</h3>
                    <div class="contador">
                        <button class="start-btn${mesa.estado === 'Ocupada' ? ' hidden' : ''}" data-mesa="${mesa.id_mesa}">Iniciar</button>
                        <button class="detener-btn${mesa.estado === 'Ocupada' ? '' : ' hidden'}" data-mesa="${mesa.id_mesa}">Detener</button>
                        <button class="pedida-btn${mesa.estado === 'Ocupada' ? '' : ' hidden'}" data-mesa="${mesa.id_mesa}">Pedida</button>
                        <button class="visualizar-btn${mesa.estado === 'Ocupada' ? '' : ' hidden'}" data-mesa="${mesa.id_mesa}">Visualizar</button>
                        <button class="pasar-tiempo-btn${mesa.estado === 'Ocupada' ? '' : ' hidden'}" data-mesa="${mesa.id_mesa}" style="background:linear-gradient(90deg,#ff9800 60%,#ffd54f 100%);color:#fff;">Pasar tiempo a otra mesa</button>
                        <button class="ver-totales-btn" data-mesa="${mesa.id_mesa}" style="background:linear-gradient(90deg,#43e97b 60%,#38f9d7 100%);color:#232946;${mostrarVerTotales ? 'display:inline-block;' : 'display:none;'}">Ver Totales</button>
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

    // Contador de tiempo por mesa
    function toggleContador(mesaId, button) {
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
                    // Si ya hay un alquiler activo, actualiza la UI para reflejar el estado real
                    if (data.error.includes('Ya existe un alquiler activo')) {
                        // Opcional: recarga las mesas para actualizar los botones
                        location.reload();
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
                // ...existing code...
            })
            .catch(err => {
                alert('Error al iniciar el alquiler');
                console.error(err);
            });
        } else {
          // --- FINALIZAR ALQUILER CON FACTURA DETALLADA ---
            (async () => {
                // 1. Consulta el total antes de finalizar
                let totalTiempo = null;
                try {
                    const res = await fetch(`/api/mesas/${mesaId}/detalle`);
                    if (res.ok) {
                        const data = await res.json();
                        totalTiempo = data.total_tiempo;
                    }
                } catch (err) {
                    totalTiempo = null;
                }

                // 2. Mostrar factura antes de finalizar el alquiler (detallada)
                mostrarFacturaAlDetener(mesaId, totalTiempo, async () => {
                    // --- SOLO aquí ocultar el botón "Ver Totales" ---
                    if (verTotalesBtn) verTotalesBtn.style.display = 'none';
                    verTotalesVisible[mesaId] = false;
                    localStorage.setItem('verTotalesVisible', JSON.stringify(verTotalesVisible));
                    // 3. Finalizar el alquiler en el servidor
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

                        // 4. Detener el contador local y resetear la UI
                        if (intervalesMesa[mesaId] && intervalesMesa[mesaId].intervalId) {
                            clearInterval(intervalesMesa[mesaId].intervalId);
                            intervalesMesa[mesaId].intervalId = null;
                        }

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

                        // 5. (Opcional) Notificación de éxito
                        showNotification('Alquiler finalizado correctamente.');
                    } catch (error) {
                        console.error('Error al finalizar el alquiler:', error);
                        alert('Error al finalizar el alquiler: ' + (error.message || error));
                    }
                });
            })();
        }
    }

    // Reemplaza mostrarFacturaAlDetener para mostrar tiempo, productos, valores y total, y agrega botón cerrar
    function mostrarFacturaAlDetener(mesaId, totalTiempo, callback) {
        // Evita duplicados
        if (document.getElementById('modalFacturaDetener')) return;

        fetch(`/api/mesas/${mesaId}/detalle`)
            .then(res => res.json())
            .then(data => {
                // Agrupar pedidos por hora_pedido (redondeando a minutos)
                const agrupados = {};
                (data.pedidos || []).forEach(p => {
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
                // --- NUEVO: Mantener el mismo orden y numeración que en visualizar ---
                const pedidosAgrupados = Object.entries(agrupados)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([hora, productos], idx) => ({
                        hora,
                        productos,
                        numero: idx + 1 // número de pedida consistente
                    }));

                // Separa pedidas pagadas y por pagar
                const pedidasPagadas = pedidosAgrupados.filter(grupo =>
                    grupo.productos.every(p => p.estado === 'Ya Pagada')
                );
                const pedidasPorPagar = pedidosAgrupados.filter(grupo =>
                    grupo.productos.some(p => p.estado !== 'Ya Pagada')
                );

                // --- Tabla de pedidas ya pagadas (con número consistente) ---
                let htmlPagadas = `<div style="margin-bottom:1.2rem;">`;
                if (pedidasPagadas.length === 0) {
                    htmlPagadas += `<div style="background:#f5f7fa;padding:1rem;border-radius:0.7rem;color:#888;text-align:center;font-weight:500;">
                        No hay ninguna pedida ya pagada
                    </div>`;
                } else {
                    htmlPagadas += `<div style="background:#eaffea;padding:1rem;border-radius:0.7rem;margin-bottom:0.7rem;">
                        <strong style="color:#232323;">Pedidas ya pagadas:</strong>
                        <table style="width:100%;margin-top:0.7rem;">
                            <thead>
                                <tr>
                                    <th style="text-align:center;">N° Pedida</th>
                                    <th style="text-align:center;">Hora</th>
                                    <th style="text-align:left;">Producto</th>
                                    <th style="text-align:center;">Cant.</th>
                                    <th style="text-align:right;">Precio</th>
                                    <th style="text-align:right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>`;
                    let idxPedida = 0;
                    pedidasPagadas.forEach((grupo) => {
                        idxPedida++;
                        let horaLegible = '-';
                        if (grupo.hora) {
                            const horaBD = grupo.productos[0]?.hora_pedido;
                            let fechaObj;
                            if (horaBD) {
                                let str = horaBD.includes('T') ? horaBD : horaBD.replace(' ', 'T');
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
                        grupo.productos.forEach((p, idx) => {
                            htmlPagadas += `
                                <tr>
                                    ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${grupo.numero}</td>` : ''}
                                    ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${horaLegible}</td>` : ''}
                                    <td>${p.nombre_producto}</td>
                                    <td style="text-align:center;">${p.cantidad}</td>
                                    <td style="text-align:right;">$${parseFloat(p.subtotal/p.cantidad).toLocaleString('es-CO')}</td>
                                    <td style="text-align:right;">$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                                </tr>
                            `;
                        });
                        htmlPagadas += `
                            <tr>
                                <td colspan="5" style="text-align:right;font-weight:bold;">Subtotal de la pedida N° ${grupo.numero}:</td>
                                <td style="font-weight:bold;">$${totalPedida.toLocaleString('es-CO')}</td>
                            </tr>
                        `;
                    });
                    htmlPagadas += `
                            </tbody>
                        </table>
                    </div>`;
                }
                htmlPagadas += `</div>`;

                // --- Tabla de productos de pedidas por pagar (con número consistente) ---
                let totalProductos = 0;
                let htmlTabla = '';
                pedidasPorPagar.forEach((grupo) => {
                    let horaLegible = '-';
                    if (grupo.hora) {
                        const horaBD = grupo.productos[0]?.hora_pedido;
                        let fechaObj;
                        if (horaBD) {
                            let str = horaBD.includes('T') ? horaBD : horaBD.replace(' ', 'T');
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
                    grupo.productos.forEach((p, idx) => {
                        htmlTabla += `
                            <tr>
                                ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${grupo.numero}</td>` : ''}
                                ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${horaLegible}</td>` : ''}
                                <td>${p.nombre_producto}</td>
                                <td style="text-align:center;">${p.cantidad}</td>
                                <td style="text-align:right;">$${parseFloat(p.subtotal/p.cantidad).toLocaleString('es-CO')}</td>
                                <td style="text-align:right;">$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                            </tr>
                        `;
                    });
                    htmlTabla += `
                        <tr>
                            <td colspan="5" style="text-align:right;font-weight:bold;">Subtotal de la pedida N° ${grupo.numero}:</td>
                            <td style="font-weight:bold;">$${totalPedida.toLocaleString('es-CO')}</td>
                        </tr>
                    `;
                    totalProductos += totalPedida;
                });

                // Tiempo y totales
                const tiempo = data.tiempo || '00:00:00';
                const valorTiempo = parseFloat(data.total_tiempo) || 0;
                const totalFactura = valorTiempo + totalProductos;

                // --- Modal HTML ---
                const modal = document.createElement('div');
                modal.id = 'modalFacturaDetener';
                modal.style.position = 'fixed';
                modal.style.top = 0;
                modal.style.left = 0;
                modal.style.width = '100vw';
                modal.style.height = '100vh';
                modal.style.background = 'rgba(30,30,40,0.92)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = 4000;

                modal.innerHTML = `
                    <div style="
                        background: #fff;
                        border-radius: 1.2rem;
                        padding: 2.2rem 2.5rem 2.5rem 2.5rem;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-width: 340px;
                        max-width: 98vw;
                        position: relative;
                    ">
                        <button id="btnCerrarFactura" style="position:absolute;top:18px;right:24px;font-size:2rem;color:#e74c3c;background:none;border:none;cursor:pointer;">&times;</button>
                        <h2 style="margin-bottom:1.2rem; color:#007bff;">Factura de Mesa</h2>
                        ${htmlPagadas}
                        <div style="font-size:1.13rem;margin-bottom:1.2rem;width:100%;">
                            <table style="width:100%;margin-bottom:1.2rem;">
                                <tbody>
                                    <tr>
                                        <td><strong>Tiempo jugado:</strong></td>
                                        <td style="text-align:right;">${tiempo}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Valor tiempo:</strong></td>
                                        <td style="text-align:right;">$${valorTiempo.toLocaleString('es-CO')}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <strong style="color:#232323;">Productos consumidos (sin pedidas ya pagadas):</strong>
                            <table style="width:100%;margin-bottom:1.2rem;">
                                <thead>
                                    <tr>
                                        <th style="text-align:center;">N° Pedida</th>
                                        <th style="text-align:center;">Hora</th>
                                        <th style="text-align:left;">Producto</th>
                                        <th style="text-align:center;">Cant.</th>
                                        <th style="text-align:right;">Precio</th>
                                        <th style="text-align:right;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${htmlTabla || `<tr><td colspan="6" style="text-align:center;">No hay productos por pagar.</td></tr>`}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="5" style="text-align:right;font-weight:bold;">Total productos:</td>
                                        <td style="text-align:right;font-weight:bold;">$${totalProductos.toLocaleString('es-CO')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div style="font-size:1.25rem;font-weight:700;margin-top:1.2rem;text-align:right;">
                                <span style="color:#232946;">Total a pagar:</span>
                                <span style="color:#28a745;font-size:1.7rem;">$${totalFactura.toLocaleString('es-CO')}</span>
                            </div>
                        </div>
                        <div style="display:flex;gap:2rem;margin-top:1.5rem;">
                            <button id="btnConfirmarFactura" style="padding:0.7rem 2.2rem;background:#28a745;color:#fff;border:none;border-radius:0.7rem;font-size:1.15rem;font-weight:600;cursor:pointer;">Confirmar y finalizar</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                document.getElementById('btnConfirmarFactura').onclick = () => {
                    document.body.removeChild(modal);
                    if (typeof callback === 'function') callback();
                };
                document.getElementById('btnCerrarFactura').onclick = () => {
                    document.body.removeChild(modal);
                };
            });
    }

    // --- NUEVO: Mostrar totales de pedidas ---
    async function mostrarTotalesMesa(mesaId) {
        try {
            const res = await fetch(`/api/mesas/${mesaId}/detalle`);
            if (!res.ok) throw new Error('Error al obtener detalles de la mesa');
            const data = await res.json();

            // Agrupar pedidos por hora_pedido (redondeando a minutos)
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
                // --- CORREGIDO: Asignar número de pedida aquí ---
                pedidosAgrupados = Object.entries(agrupados)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([hora, productos], idx) => ({
                        hora,
                        productos,
                        numero: idx + 1 // número de pedida consistente
                    }));
            }

            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>N° Pedida</th>
                            <th>Hora de la Pedida</th>
                            <th>Productos</th>
                            <th>Cant.</th>
                            <th>Subtotal</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            let totalAcumulado = 0;
            pedidosAgrupados.forEach((grupo) => {
                let horaLegible = '-';
                if (grupo.hora) {
                    const horaBD = grupo.productos[0]?.hora_pedido;
                    let fechaObj;
                    if (horaBD) {
                        let str = horaBD.includes('T') ? horaBD : horaBD.replace(' ', 'T');
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
                const id_alquiler = grupo.productos[0]?.id_alquiler;
                const esPagada = grupo.productos.every(p => p.estado === 'Ya Pagada');
                const estadoBoton = esPagada ? 'Ya Pagada' : 'Por Pagar';

                if (!esPagada) totalAcumulado += totalPedida;

                grupo.productos.forEach((p, idx) => {
                    html += `
                        <tr>
                            ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${grupo.numero}</td>` : ''}
                            ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${horaLegible}</td>` : ''}
                            <td>${p.nombre_producto}</td>
                            <td>${p.cantidad}</td>
                            <td>$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                            ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">
                                <button class="btn-pagar-pedida" 
                                    data-mesa="${mesaId}" 
                                    data-idalquiler="${id_alquiler}" 
                                    data-horapedido="${p.hora_pedido}" 
                                    data-estado="${estadoBoton}"
                                    style="background:${esPagada ? '#43e97b' : '#007bff'};color:${esPagada ? '#232946' : '#fff'};border:none;border-radius:0.7rem;padding:0.5rem 1.2rem;cursor:pointer;">
                                    ${estadoBoton}
                                </button>
                            </td>` : ''}
                        </tr>
                    `;
                });
                html += `
                    <tr>
                        <td colspan="4" style="text-align:right;font-weight:bold;">Total de la pedida N° ${grupo.numero}:</td>
                        <td style="font-weight:bold;">$${totalPedida.toLocaleString('es-CO')}</td>
                        <td></td>
                    </tr>
                `;
            });
            html += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align:right;font-weight:bold;">Total acumulado (sin "Ya Pagada"):</td>
                            <td style="font-weight:bold;">$${totalAcumulado.toLocaleString('es-CO')}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                <div style="text-align:right;margin-top:1.5rem;">
                    <button id="btnSalirTotalesMesa" style="background:#e74c3c;color:#fff;padding:0.7rem 2.2rem;border-radius:0.7rem;font-size:1.13rem;border:none;cursor:pointer;">Salir</button>
                </div>
            `;

            if (pedidosAgrupados.length === 0) {
                html += `<em>No hay pedidos registrados para esta mesa.</em>`;
            }

            const modal = crearModalTotalesMesa();
            const detalle = document.getElementById('totalesMesaDetalle');
            detalle.innerHTML = html;
            modal.classList.remove('hidden');
            modal.style.display = 'flex';

            // Botón salir
            const btnSalir = document.getElementById('btnSalirTotalesMesa');
            if (btnSalir) {
                btnSalir.onclick = function() {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                };
            }

            // Cerrar al hacer clic fuera del contenido
            modal.addEventListener('mousedown', function(e) {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            });

            // Evento para alternar estado de la pedida
            detalle.querySelectorAll('.btn-pagar-pedida').forEach(btn => {
                btn.onclick = async function() {
                    const id_alquiler = btn.getAttribute('data-idalquiler');
                    const hora_pedido = btn.getAttribute('data-horapedido');
                    const estadoActual = btn.getAttribute('data-estado');
                    const nuevoEstado = estadoActual === 'Ya Pagada' ? 'Por Pagar' : 'Ya Pagada';
                    try {
                        const res = await fetch('/api/pedidos/marcar-pedida-pagada', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id_alquiler, hora_pedido, estado: nuevoEstado })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showNotification('Estado de la pedida actualizado');
                            await mostrarTotalesMesa(mesaId); // Refresca la vista
                        } else {
                            showNotification('Error al actualizar el estado');
                            console.error(data.error);
                        }
                    } catch (err) {
                        showNotification('Error al actualizar el estado');
                        console.error(err);
                    }
                };
            });

        } catch (err) {
            showNotification('Error al cargar los totales de la mesa');
        }
    }

    // Cargar mesas al iniciar
    try {
        const response = await fetch('/api/mesas');
        if (!response.ok) throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        const mesas = await response.json();
        // --- Sincroniza antes de renderizar ---
        await sincronizarContadoresConAlquileres(mesas);
        renderMesas(mesas);
    } catch (err) {
        console.error('Error al cargar las mesas:', err);
        mesasContainer.innerHTML = '<p>Error al cargar las mesas. Intente nuevamente más tarde.</p>';
    }
});

// Agrega esta función al inicio del archivo (o antes de usarla)
window.showNotification = function(message) {
    let notif = document.getElementById('successNotification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'successNotification';
        notif.className = 'notification hidden';
        notif.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z"/>
                <path d="M10.97 6.97a.75.75 0 0 1 1.07 1.05l-3 3a.75.75 0 0 1-1.08 0l-1.5-1.5a.75.75 0 1 1 1.08-1.06l.97.97 2.47-2.47z"/>
            </svg>
            <span></span>
        `;
        document.body.appendChild(notif);
    }
    notif.querySelector('span').innerHTML = message;
    notif.classList.remove('hidden');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
        notif.classList.add('hidden');
    }, 2000);
};

// --- LÓGICA PARA MOSTRAR/OCULTAR EL BOTÓN "VER TOTALES" ---

// Guarda el estado de tiempo iniciado y pedidas por mesa
const estadoMesa = {}; // { [mesaId]: { tiempoIniciado: bool, tienePedidas: bool } }

// Llama a esta función cada vez que cambie el estado de la mesa
function actualizarBotonVerTotales(mesaId) {
    const btn = document.querySelector(`.ver-totales-btn[data-mesa="${mesaId}"]`);
    const estado = estadoMesa[mesaId] || {};
    if (btn) {
        btn.style.display = (estado.tiempoIniciado && estado.tienePedidas) ? 'inline-block' : 'none';
    }
}

// Llama a esto cuando inicies el tiempo en una mesa
function marcarTiempoIniciado(mesaId) {
    if (!estadoMesa[mesaId]) estadoMesa[mesaId] = {};
    estadoMesa[mesaId].tiempoIniciado = true;
    actualizarBotonVerTotales(mesaId);
}

// Llama a esto cuando detengas el tiempo en una mesa
function marcarTiempoDetenido(mesaId) {
    if (!estadoMesa[mesaId]) estadoMesa[mesaId] = {};
    estadoMesa[mesaId].tiempoIniciado = false;
    actualizarBotonVerTotales(mesaId);
}

// Llama a esto cuando se registre una pedida en una mesa
function marcarPedidaEnMesa(mesaId) {
    if (!estadoMesa[mesaId]) estadoMesa[mesaId] = {};
    estadoMesa[mesaId].tienePedidas = true;
    actualizarBotonVerTotales(mesaId);
}

// Si quieres resetear pedidas (opcional, según tu lógica)
function resetearPedidasMesa(mesaId) {
    if (!estadoMesa[mesaId]) estadoMesa[mesaId] = {};
    estadoMesa[mesaId].tienePedidas = false;
    actualizarBotonVerTotales(mesaId);
}

// --- INTEGRACIÓN CON EVENTOS ---

document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...

    // Cuando se inicia el tiempo en una mesa
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('start-btn')) {
            const mesaId = e.target.getAttribute('data-mesa');
            marcarTiempoIniciado(mesaId);
        }
    });

    // Cuando se realiza una pedida en una mesa (llama esto después de registrar la pedida)
    // Ejemplo: después de registrar el pedido exitosamente
    // marcarPedidaEnMesa(mesaId);

    // Cuando se detiene el tiempo en una mesa
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('detener-btn')) {
            const mesaId = e.target.getAttribute('data-mesa');
            // marcarTiempoDetenido(mesaId);
        }
    });

    // ...existing code...
});

// Al final del archivo o en el <head> de tu HTML, asegúrate de incluir:
/// <script src="js/estado-pedida.js"></script>
/// después de index.js
