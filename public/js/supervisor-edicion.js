// Página de edición de pedidas/productos para supervisor

document.addEventListener('DOMContentLoaded', async () => {
    const selectMesa = document.getElementById('selectMesaEdit');
    const container = document.getElementById('editPedidosContainer');

    // Cargar mesas con pedidas
    let mesas = [];
    try {
        // Obtiene todas las mesas
        const res = await fetch('/api/mesas');
        mesas = await res.json();

        // Filtra solo las mesas que tienen una o más pedidas
        const mesasConPedidos = [];
        for (const m of mesas) {
            const resDetalle = await fetch(`/api/mesas/${m.id_mesa}/detalle`);
            const dataDetalle = await resDetalle.json();
            if (Array.isArray(dataDetalle.pedidos) && dataDetalle.pedidos.length > 0) {
                mesasConPedidos.push(m);
            }
        }

        selectMesa.innerHTML = '<option value="">Seleccione una mesa</option>' +
            mesasConPedidos.map(m => `<option value="${m.id_mesa}">Mesa ${m.numero_mesa}</option>`).join('');
    } catch {
        selectMesa.innerHTML = '<option value="">Error al cargar mesas</option>';
    }

    selectMesa.addEventListener('change', async function() {
        const mesaId = this.value;
        if (!mesaId) {
            container.innerHTML = '';
            return;
        }
        await cargarPedidosMesa(mesaId);
    });

    // Variables globales para el modal de agregar producto
    let productosDisponibles = [];
    let mesaIdActual = null;
    let keyPedidaActual = null;

    // Cargar productos disponibles al inicio
    async function cargarProductosDisponibles() {
        try {
            const res = await fetch('/api/productos');
            productosDisponibles = await res.json();
        } catch {
            productosDisponibles = [];
        }
    }

    // Lógica para agregar producto a una pedida existente
    function mostrarModalAgregarProducto(mesaId, keyPedida) {
        mesaIdActual = mesaId;
        keyPedidaActual = keyPedida;
        const modal = document.getElementById('modalAgregarProducto');
        const form = document.getElementById('formAgregarProducto');
        const categoriaSel = document.getElementById('categoriaAgregar');
        const productoSel = document.getElementById('productoAgregar');
        const cantidadInput = document.getElementById('cantidadAgregar');

        // Llenar categorías
        const categorias = [...new Set(productosDisponibles.map(p => p.categoria || 'Sin categoría'))];
        categoriaSel.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        // Llenar productos de la primera categoría
        function actualizarProductosSelect() {
            const cat = categoriaSel.value;
            const productosCat = productosDisponibles.filter(p => (p.categoria || 'Sin categoría') === cat);
            productoSel.innerHTML = productosCat.map(p => `<option value="${p.id_producto}">${p.nombre}</option>`).join('');
        }
        categoriaSel.onchange = actualizarProductosSelect;
        categoriaSel.value = categorias[0];
        actualizarProductosSelect();

        cantidadInput.value = 1;

        // Mostrar el modal centrado
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Cerrar modal al pulsar cancelar o la X
        document.getElementById('closeAgregarProductoModal').onclick =
        document.getElementById('cancelarAgregarProductoBtn').onclick = function() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        };

        // Enviar formulario (simulación)
        form.onsubmit = async function(e) {
            e.preventDefault();
            const id_producto = document.getElementById('productoAgregar').value;
            const cantidad = parseInt(document.getElementById('cantidadAgregar').value, 10);

            // Validación robusta para evitar value undefined o vacío
            if (!id_producto || id_producto === "undefined" || isNaN(cantidad) || cantidad < 1) {
                mostrarNotificacion('Selecciona un producto y cantidad válida.', 'error');
                return;
            }

            const subtotal = calcularSubtotalProducto(id_producto, cantidad); // Implementa esta función según tu lógica de precios

            if (isNaN(subtotal) || subtotal <= 0) {
                mostrarNotificacion('Subtotal inválido para el producto.', 'error');
                return;
            }

            try {
                const res = await fetch('/api/pedidas/agregar-producto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_mesa: mesaId,
                        key_pedida: keyPedida,
                        id_producto,
                        cantidad,
                        subtotal
                    })
                });
                if (res.ok) {
                    mostrarNotificacion('Producto agregado a la pedida correctamente', 'success');
                    document.getElementById('modalAgregarProducto').classList.add('hidden');
                    document.getElementById('modalAgregarProducto').style.display = 'none';
                    await cargarPedidosMesa(mesaId);
                } else {
                    let errorMsg = 'Error al agregar el producto';
                    try {
                        const error = await res.json();
                        if (error && (error.error || error.message)) {
                            errorMsg += ': ' + (error.error || error.message);
                        }
                        if (console && console.error) {
                            console.error('Error al agregar producto:', error);
                        }
                    } catch (parseErr) {}
                    mostrarNotificacion(errorMsg, 'error');
                }
            } catch (err) {
                mostrarNotificacion('Error al agregar el producto: ' + (err.message || err), 'error');
                if (console && console.error) {
                    console.error('Error al agregar producto:', err);
                }
            }
        };
    }

    // Variables globales para el modal de descontar producto
    let mesaIdDescontar = null;
    let keyPedidaDescontar = null;
    let productosPedidaDescontar = [];

    // Lógica para mostrar el modal de descontar producto
    function mostrarModalDescontarProducto(mesaId, keyPedida, productosPedida) {
        mesaIdDescontar = mesaId;
        keyPedidaDescontar = keyPedida;
        productosPedidaDescontar = productosPedida;
        let modal = document.getElementById('modalDescontarProducto');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalDescontarProducto';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <style>
                    #modalDescontarProducto .modal-content {
                        max-width: 480px;
                        background: #fff;
                        border-radius: 1.2rem;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.13);
                        padding: 2.2rem 2.5rem 2.5rem 2.5rem;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        animation: modalFadeIn 0.25s;
                        color: #111 !important;
                    }
                    #modalDescontarProducto .close-btn {
                        position: absolute;
                        top: 18px;
                        right: 24px;
                        font-size: 2rem;
                        color: #e74c3c;
                        background: none;
                        border: none;
                        cursor: pointer;
                        transition: color 0.2s;
                    }
                    #modalDescontarProducto .close-btn:hover {
                        color: #c0392b;
                    }
                    #modalDescontarProducto h2 {
                        color: #007bff;
                        font-size: 1.45rem;
                        margin-bottom: 1.5rem;
                        font-weight: 700;
                        letter-spacing: 0.01em;
                        display: flex;
                        align-items: center;
                        gap: 0.7rem;
                        color: #111 !important;
                    }
                    #modalDescontarProducto h2 svg {
                        vertical-align: middle;
                    }
                    #modalDescontarProducto .form-group {
                        margin-bottom: 1.2rem;
                        width: 100%;
                    }
                    #modalDescontarProducto label {
                        font-weight: 600;
                        color: #111 !important;
                        margin-bottom: 0.3rem;
                        display: block;
                    }
                    #modalDescontarProducto select, #modalDescontarProducto input[type="number"] {
                        width: 100%;
                        padding: 0.6rem 0.8rem;
                        border: 1px solid #e0e7ef;
                        border-radius: 0.7rem;
                        font-size: 1.1rem;
                        margin-top: 0.2rem;
                        background: #f5f7fa;
                        color: #111 !important;
                        transition: border 0.2s;
                    }
                    #modalDescontarProducto select:focus, #modalDescontarProducto input[type="number"]:focus {
                        border: 1.5px solid #007bff;
                        outline: none;
                    }
                    #modalDescontarProducto .form-buttons-row {
                        display: flex;
                        gap: 1.2rem;
                        justify-content: flex-end;
                        margin-top: 1.5rem;
                        width: 100%;
                    }
                    #modalDescontarProducto .cancel-btn {
                        background: #e0e7ef;
                        color: #111 !important;
                        border: none;
                        border-radius: 0.7rem;
                        padding: 0.7rem 2.2rem;
                        font-size: 1.13rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    #modalDescontarProducto .cancel-btn:hover {
                        background: #d1d8e6;
                    }
                    #modalDescontarProducto .confirm-btn {
                        background: linear-gradient(90deg,#43e97b 60%,#38f9d7 100%);
                        color: #111 !important;
                        border: none;
                        border-radius: 0.7rem;
                        padding: 0.7rem 2.2rem;
                        font-size: 1.13rem;
                        font-weight: 700;
                        cursor: pointer;
                        box-shadow: 0 2px 8px rgba(67,233,123,0.08);
                        transition: background 0.2s;
                    }
                    #modalDescontarProducto .confirm-btn:hover {
                        background: linear-gradient(90deg,#38f9d7 60%,#43e97b 100%);
                    }
                    #modalDescontarProducto .icon-select {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.7rem;
                        margin-bottom: 0.5rem;
                        width: 100%;
                    }
                    #modalDescontarProducto .icon-select img {
                        width: 110px;
                        height: 110px;
                        border-radius: 1.2rem;
                        object-fit: cover;
                        background: #f5f7fa;
                        border: 2.5px solid #e0e7ef;
                        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
                        display: block;
                        margin: 0 auto;
                    }
                    #modalDescontarProducto .producto-nombre {
                        font-size: 1.35rem;
                        font-weight: 700;
                        color: #111 !important;
                        margin-top: 0.7rem;
                        text-align: center;
                        width: 100%;
                        display: block;
                    }
                    #modalDescontarProducto .producto-cantidad {
                        font-size: 1.13rem;
                        color: #007bff;
                        margin-top: 0.2rem;
                        font-weight: 500;
                        text-align: center;
                        width: 100%;
                        display: block;
                    }
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: translateY(40px);}
                        to { opacity: 1; transform: translateY(0);}
                    }
                </style>
                <div class="modal-content">
                    <button class="close-btn" id="closeDescontarProductoModal" title="Cerrar">&times;</button>
                    <h2>
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                            <!-- Iconos eliminados -->
                        </svg>
                        Descontar Producto
                    </h2>
                    <form id="formDescontarProducto" style="width:100%;">
                        <div class="form-group">
                            <label for="productoDescontar">Producto</label>
                            <div class="icon-select" id="iconSelectDescontar"></div>
                            <select id="productoDescontar" required></select>
                        </div>
                        <div class="form-group" id="cantidadDescontarContainer">
                            <label for="cantidadDescontar">Cantidad a descontar</label>
                            <input type="number" id="cantidadDescontar" min="1" value="1" required>
                        </div>
                        <div class="form-buttons-row">
                            <button type="button" id="cancelarDescontarProductoBtn" class="cancel-btn">Cancelar</button>
                            <button type="submit" class="confirm-btn">Descontar</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const form = document.getElementById('formDescontarProducto');
        const productoSel = document.getElementById('productoDescontar');
        const cantidadInput = document.getElementById('cantidadDescontar');
        const cantidadContainer = document.getElementById('cantidadDescontarContainer');
        const iconSelect = document.getElementById('iconSelectDescontar');

        // Obtener productos del catálogo para mapear nombre -> id_producto y mostrar imagen
        fetch('/api/productos')
            .then(res => res.json())
            .then(productosCatalogo => {
                const mapaNombreId = {};
                const mapaIdImagen = {};
                productosCatalogo.forEach(prod => {
                    mapaNombreId[(prod.nombre || '').trim().toLowerCase()] = prod.id_producto;
                    mapaIdImagen[prod.id_producto] = prod.imagen || '/images/default-product.png';
                });

                // Agrupa productos únicos por nombre y suma cantidades
                const productosMap = {};
                for (const p of productosPedidaDescontar) {
                    const nombre = (p.nombre_producto || p.nombre || '').trim();
                    const nombreKey = nombre.toLowerCase();
                    const id = mapaNombreId[nombreKey];
                    const cantidad = Number(p.cantidad || 1);
                    if (id && nombre) {
                        if (!productosMap[id]) {
                            productosMap[id] = { id_producto: id, nombre_producto: nombre, cantidad: 0 };
                        }
                        productosMap[id].cantidad += cantidad;
                    }
                }
                const productosValidos = Object.values(productosMap);

                productoSel.innerHTML = productosValidos.length > 0
                    ? productosValidos.map(p =>
                        `<option value="${p.id_producto}" data-cantidad="${p.cantidad}">${p.nombre_producto} (x${p.cantidad})</option>`
                      ).join('')
                    : '<option value="">No hay productos para descontar</option>';

                // Mostrar imagen y nombre del producto seleccionado
                function actualizarIconoProducto() {
                    const selected = productoSel.options[productoSel.selectedIndex];
                    const id = selected ? selected.value : null;
                    iconSelect.innerHTML = '';
                    if (id && mapaIdImagen[id]) {
                        const nombre = selected ? selected.textContent.split(' (x')[0] : '';
                        const cantidad = selected ? selected.getAttribute('data-cantidad') : '';
                        iconSelect.innerHTML = `
                            <img src="${mapaIdImagen[id]}" alt="Producto" />
                            <span class="producto-nombre">${nombre}</span>
                            <span class="producto-cantidad">(x${cantidad})</span>
                        `;
                    }
                }
                productoSel.onchange = actualizarIconoProducto;
                setTimeout(actualizarIconoProducto, 100);

                if (productosValidos.length === 0) {
                    cantidadContainer.style.display = 'none';
                } else {
                    cantidadContainer.style.display = '';
                }
            })
            .catch(() => {
                productoSel.innerHTML = '<option value="">No hay productos para descontar</option>';
                cantidadContainer.style.display = 'none';
                iconSelect.innerHTML = '';
            });

        // Mostrar/ocultar input cantidad según la cantidad del producto seleccionado
        function actualizarCantidadInput() {
            const selected = productoSel.options[productoSel.selectedIndex];
            const max = parseInt(selected?.dataset.cantidad || "1", 10);
            if (max > 1) {
                cantidadContainer.style.display = '';
                cantidadInput.max = max;
                cantidadInput.value = 1;
            } else {
                cantidadContainer.style.display = 'none';
                cantidadInput.value = 1;
            }
        }
        productoSel.onchange = function() {
            actualizarCantidadInput();
            // Actualiza el icono también
            const selected = productoSel.options[productoSel.selectedIndex];
            const id = selected ? selected.value : null;
            const iconSelect = document.getElementById('iconSelectDescontar');
            if (iconSelect && id) {
                // Ya se actualiza en la función anterior
            }
        };
        setTimeout(actualizarCantidadInput, 100);

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        document.getElementById('closeDescontarProductoModal').onclick =
        document.getElementById('cancelarDescontarProductoBtn').onclick = function() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        };

        form.onsubmit = async function(e) {
            e.preventDefault();
            const idProducto = productoSel.value;
            const cantidad = parseInt(cantidadInput.value, 10);

            if (!idProducto || idProducto === "undefined" || isNaN(cantidad) || cantidad < 1) {
                mostrarNotificacion('Selecciona un producto y cantidad válida para descontar.', 'error');
                return;
            }

            try {
                const res = await fetch('/api/pedidas/descontar-producto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_mesa: mesaIdDescontar,
                        key_pedida: keyPedidaDescontar,
                        id_producto: idProducto,
                        cantidad: cantidad
                    })
                });
                if (res.ok) {
                    mostrarNotificacion('Producto descontado correctamente', 'success');
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                    await cargarPedidosMesa(mesaIdDescontar);
                } else {
                    let errorMsg = 'Error al descontar el producto';
                    try {
                        const error = await res.json();
                        if (error && (error.error || error.message)) {
                            errorMsg += ': ' + (error.error || error.message);
                        }
                    } catch {}
                    mostrarNotificacion(errorMsg, 'error');
                }
            } catch (err) {
                mostrarNotificacion('Error al descontar el producto: ' + (err.message || err), 'error');
            }
        };
    }

    async function cargarPedidosMesa(mesaId) {
        container.innerHTML = '<em>Cargando pedidas...</em>';
        await cargarProductosDisponibles();
        try {
            const res = await fetch(`/api/mesas/${mesaId}/detalle`);
            if (!res.ok) throw new Error('Error al obtener detalles');
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
                pedidosAgrupados = Object.entries(agrupados)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([hora, productos]) => ({ hora, productos }));
            }

            // Estado de pagadas
            const pagadas = JSON.parse(localStorage.getItem('pagadasPorMesa') || '{}')[mesaId] || [];

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
            pedidosAgrupados.forEach((grupo, idxGrupo) => {
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
                const keyPedida = grupo.hora;
                const esPagada = pagadas.includes(keyPedida);

                grupo.productos.forEach((p, idx) => {
                    html += `
                        <tr>
                            ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${idxGrupo + 1}</td>` : ''}
                            ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">${horaLegible}</td>` : ''}
                            <td>${p.nombre_producto}</td>
                            <td>${p.cantidad}</td>
                            <td>$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                            ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;">
                                <div class="edit-table-actions">
                                    <button class="add" data-mesa="${mesaId}" data-key="${keyPedida}">Agregar Producto</button>
                                    <button class="descontar" data-mesa="${mesaId}" data-key="${keyPedida}">Descontar Producto</button>
                                </div>
                            </td>` : ''}
                        </tr>
                    `;
                });
            });
            html += `
                    </tbody>
                </table>
            `;

            if (pedidosAgrupados.length === 0) {
                html += `<em>No hay pedidos registrados para esta mesa.</em>`;
            }

            container.innerHTML = html;

            // Acciones de edición
            container.querySelectorAll('.add').forEach(btn => {
                btn.onclick = function() {
                    const mesaId = btn.dataset.mesa;
                    const keyPedida = btn.dataset.key;
                    mostrarModalAgregarProducto(mesaId, keyPedida);
                };
            });
            container.querySelectorAll('.descontar').forEach(btn => {
                btn.onclick = function() {
                    const mesaId = btn.dataset.mesa;
                    const keyPedida = btn.dataset.key;
                    // Busca los productos de la pedida seleccionada
                    const grupo = pedidosAgrupados.find(g => g.hora === keyPedida);
                    if (!grupo) return;
                    mostrarModalDescontarProducto(mesaId, keyPedida, grupo.productos);
                };
            });
        } catch (err) {
            container.innerHTML = `<p style="color:red;">Error al cargar detalles: ${err.message}</p>`;
        }
    }

    // Modal de confirmación visual para eliminar producto
    function mostrarConfirmacionEliminar(msg, onConfirm) {
        // Si ya existe, elimínalo primero
        let modal = document.getElementById('modalConfirmarEliminar');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'modalConfirmarEliminar';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:370px;">
                <span class="close-btn" id="closeConfirmarEliminarModal">&times;</span>
                <h2 style="color:#e74c3c;text-align:center;font-size:1.25rem;margin-bottom:1.2rem;">Confirmar Eliminación</h2>
                <p style="text-align:center;font-size:1.13rem;margin-bottom:1.5rem;">${msg}</p>
                <div class="form-buttons-row" style="margin-top:1.2rem;">
                    <button type="button" id="cancelarConfirmarEliminarBtn" class="cancel-btn">Cancelar</button>
                    <button type="button" id="confirmarEliminarBtn" class="confirm-btn" style="background:#e74c3c;">Sí, eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        document.getElementById('closeConfirmarEliminarModal').onclick =
        document.getElementById('cancelarConfirmarEliminarBtn').onclick = function() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 250);
        };
        document.getElementById('confirmarEliminarBtn').onclick = function() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 250);
            if (typeof onConfirm === 'function') onConfirm();
        };
    }

    // --- NUEVA FUNCIÓN: Mostrar notificación elegante ---
    function mostrarNotificacion(texto, tipo = "success") {
        // Si ya existe, elimínala primero
        let notif = document.getElementById('notificacionSupervisor');
        if (notif) notif.remove();

        notif = document.createElement('div');
        notif.id = 'notificacionSupervisor';
        notif.className = 'notification show';
        notif.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                ${tipo === "success"
                    ? '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.07 0l3-3a.75.75 0 1 0-1.08-1.06L7.5 9.44 6.03 7.97a.75.75 0 1 0-1.06 1.06l2 2z"/>'
                    : '<path d="M8 16A8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-4.412-1-4.5A.5.5 0 0 0 7.5 6h-1a.5.5 0 0 0-.5.5v.5h1v-.5h.5l1 4.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-.5h-1v.5h-.5z"/>'}
            </svg>
            <span>${texto}</span>
        `;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.classList.remove('show');
            notif.classList.add('hidden');
            setTimeout(() => notif.remove(), 800);
        }, 2000);
    }

    // Implementa esta función para obtener el subtotal según el producto y cantidad
    function calcularSubtotalProducto(id_producto, cantidad) {
        // Busca el producto en tu catálogo global (deberías tenerlo cargado en memoria)
        // Si no está en memoria, haz fetch sincrónico (solo para este cálculo)
        let producto = null;
        if (window.productosDisponibles && Array.isArray(window.productosDisponibles)) {
            producto = window.productosDisponibles.find(p => String(p.id_producto) === String(id_producto));
        }
        if (!producto) {
            // Si no está en memoria, intenta obtenerlo del backend (sincrónico)
            // Nota: Esto es solo para asegurar el cálculo, pero lo ideal es tener el catálogo cargado
            const req = new XMLHttpRequest();
            req.open('GET', '/api/productos', false); // síncrono
            req.send(null);
            if (req.status === 200) {
                try {
                    const productos = JSON.parse(req.responseText);
                    producto = productos.find(p => String(p.id_producto) === String(id_producto));
                    // Guarda en memoria para siguientes usos
                    window.productosDisponibles = productos;
                } catch (e) {
                    producto = null;
                }
            }
        }
        if (!producto) return cantidad > 0 ? 1 * cantidad : NaN; // fallback: evita NaN si cantidad válida
        return Number(producto.precio) * cantidad;
    }

    // Lógica para cambiar el estado de pagado/por pagar de una pedida
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('toggle-pay')) {
            const btn = e.target;
            const mesaId = btn.getAttribute('data-mesa');
            const keyPedida = btn.getAttribute('data-key');
            const estadoActual = btn.textContent.trim().toLowerCase(); // "pagado" o "por pagar"
            const nuevoEstado = estadoActual === 'pagado' ? 'Por Pagar' : 'Pagado';

            mostrarConfirmacionEliminar(
                `¿Quieres cambiar el estado de esta pedida a "${nuevoEstado}"?`,
                async function() {
                    try {
                        // Guardar el estado en localStorage (por mesa y keyPedida)
                        const estados = JSON.parse(localStorage.getItem('estadosPedidas') || '{}');
                        estados[`${mesaId}_${keyPedida}`] = nuevoEstado;
                        localStorage.setItem('estadosPedidas', JSON.stringify(estados));

                        mostrarNotificacion(`Estado cambiado a "${nuevoEstado}" correctamente`, 'success');
                        // Recarga la tabla para reflejar el cambio
                        await cargarPedidosMesa(mesaId);
                    } catch (err) {
                        mostrarNotificacion('Error al cambiar el estado de la pedida', 'error');
                        if (console && console.error) {
                            console.error('Error al cambiar estado de pedida:', err);
                        }
                    }
                }
            );
        }
    });

    // Cuando generes la tabla de pedidas, asegúrate de leer el estado desde localStorage:
    function obtenerEstadoPedida(mesaId, keyPedida, estadoPorDefecto) {
        const estados = JSON.parse(localStorage.getItem('estadosPedidas') || '{}');
        return estados[`${mesaId}_${keyPedida}`] || estadoPorDefecto;
    }

    // --- Aquí termina el script principal ---
    // Puedes agregar más funciones o lógica según sea necesario
    // Asegúrate de probar cada parte para verificar que la integración sea correcta
    // ¡Buena suerte!
});
