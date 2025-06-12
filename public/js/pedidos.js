// Este archivo contiene la lógica para abrir el modal de pedidos y gestionar productos.
// Principios SOLID aplicados: cada función tiene una responsabilidad clara y el código es extensible y desacoplado.

export function openPedidoModal(mesaId) {
    let modal = document.getElementById('pedidoModalCustom');
    if (!modal) {
        modal = crearModalPedido();
        document.body.appendChild(modal);
    }
    mostrarModal(modal);

    let productosDisponibles = [];
    let productosPedidaActual = [];

    fetchProductos().then(productos => {
        productosDisponibles = productos;
        inicializarCategorias(productosDisponibles);

        // --- NUEVO: Mostrar el botón "Repetir última pedida" solo si ya hay una pedida ---
        fetch(`/api/mesas/${encodeURIComponent(mesaId)}/detalle`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                const tienePedidas = data && Array.isArray(data.pedidos) && data.pedidos.length > 0;
                let btn = document.getElementById('btnRepetirUltimaPedida');
                if (tienePedidas) {
                    if (!btn) crearBotonRepetirPedida();
                    else btn.style.display = '';
                } else if (btn) {
                    btn.style.display = 'none';
                }
            })
            .catch(() => {
                // Si hay error, oculta el botón por seguridad
                let btn = document.getElementById('btnRepetirUltimaPedida');
                if (btn) btn.style.display = 'none';
            });
    });

    let productosCardsCont = document.getElementById('productosCardsPedido');
    if (!productosCardsCont) {
        productosCardsCont = document.createElement('div');
        productosCardsCont.id = 'productosCardsPedido';
        productosCardsCont.style.display = 'flex';
        productosCardsCont.style.flexWrap = 'wrap';
        productosCardsCont.style.justifyContent = 'center';
        productosCardsCont.style.gap = '1.5rem';
        productosCardsCont.style.marginBottom = '1.2rem';
        const productoSelect = document.getElementById('productoPedido');
        productoSelect.parentNode.insertBefore(productosCardsCont, productoSelect);
        productoSelect.style.display = 'none';
    }

    function crearModalPedido() {
        const modal = document.createElement('div');
        modal.id = 'pedidoModalCustom';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:98vw;min-width:90vw;width:98vw;height:96vh;min-height:90vh;border-radius:2.2rem;background:#fff;box-shadow:0 8px 32px rgba(0,207,255,0.18);position:relative;padding:2.5rem 2rem 2rem 2rem;overflow:auto;">
                <button class="close-btn" id="closePedidoModalCustom" style="position:absolute;top:14px;right:18px;font-size:1.5rem;color:#e74c3c;background:none;border:none;cursor:pointer;">×</button>
                <h2 style="color:#007bff;text-align:center;font-family:'Orbitron',Arial,sans-serif;font-weight:900;letter-spacing:2px;margin-bottom:1.5rem;">Realizar Pedido</h2>
                <form id="pedidoFormCustom" autocomplete="off">
                    <label for="categoriaPedido" style="font-weight:600;">Categoría:</label>
                    <select id="categoriaPedido" style="width:100%;margin-bottom:1.2rem;padding:0.7rem 1.2rem;border-radius:0.7rem;font-size:1.1rem;">
                        <option value="">Seleccione una categoría</option>
                    </select>
                    <div id="productosCardsPedido" style="display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem;margin-bottom:1.2rem;"></div>
                    <button type="button" id="agregarProductoPedido" style="display:none;"></button>
                    <div id="productosAgregadosPedido" style="margin-bottom:1.2rem;text-align:center;color:#888;">No hay productos agregados.</div>
                    <div style="display:flex;justify-content:flex-end;align-items:center;margin-bottom:1.2rem;">
                        <span style="font-weight:bold;font-size:1.13rem;">Total: </span>
                        <span id="totalPedidoCustom" style="font-weight:bold;font-size:1.13rem;margin-left:0.5rem;">$0</span>
                    </div>
                    <div id="pedidoBotonesContainer" style="display:flex;gap:1.2rem;justify-content:center;align-items:center;">
                        <!-- Aquí se insertarán los botones de acción -->
                        <button type="button" id="cancelarPedidoBtnCustom" style="background:#e74c3c;color:#fff;border:none;border-radius:0.7rem;padding:0.7rem 2.2rem;font-size:1.13rem;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button type="submit" style="background:linear-gradient(90deg,#00cfff 0%,#007bff 100%);color:#fff;border:none;border-radius:0.7rem;padding:0.7rem 2.2rem;font-size:1.13rem;font-weight:600;cursor:pointer;">Confirmar Pedido</button>
                    </div>
                </form>
            </div>
        `;
        return modal;
    }

    function mostrarModal(modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.getElementById('closePedidoModalCustom').onclick =
        document.getElementById('cancelarPedidoBtnCustom').onclick = function() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        };
    }

    function fetchProductos() {
        return fetch('/api/productos').then(res => res.json());
    }

    function inicializarCategorias(productos) {
        const categorias = [...new Set(productos.map(p => p.categoria || 'Sin categoría'))];
        const categoriaSelect = document.getElementById('categoriaPedido');
        categoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>' +
            categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        categoriaSelect.onchange = function() {
            renderProductosCards(categoriaSelect.value);
        };
        categoriaSelect.value = '';
        renderProductosCards('');
    }

    function renderProductosCards(categoria) {
        productosCardsCont.innerHTML = '';
        const productosCat = categoria
            ? productosDisponibles.filter(p => (p.categoria || 'Sin categoría') === categoria)
            : [];
        if (!productosCat.length) {
            productosCardsCont.innerHTML = '<em style="color:#888;">Seleccione una categoría para ver productos.</em>';
            return;
        }
        productosCat.forEach(producto => {
            const existente = productosPedidaActual.find(p => p.id_producto === producto.id_producto);
            const cantidadActual = existente ? existente.cantidad : '';
            const card = crearCardProducto(producto, cantidadActual);
            productosCardsCont.appendChild(card);
        });
    }

    function crearCardProducto(producto, cantidadActual) {
        const card = document.createElement('div');
        card.style.background = '#fff';
        card.style.border = '2.5px solid #00cfff';
        card.style.borderRadius = '1.2rem';
        card.style.boxShadow = '0 2px 12px #00cfff22';
        card.style.padding = '1.2rem 1.2rem 1.2rem 1.2rem';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
        card.style.width = '210px';
        card.style.minHeight = '230px';
        card.style.margin = '0.5rem';
        card.style.textAlign = 'center';
        card.style.transition = 'box-shadow 0.2s, border 0.2s';
        card.style.cursor = 'pointer';

        card.innerHTML = `
            <div style="width:80px;height:80px;background:#f5f7fa;border-radius:0.7rem;display:flex;align-items:center;justify-content:center;margin-bottom:0.7rem;">
                <img src="${producto.imagen || '/images/default-product.jpg'}" alt="${producto.nombre}" style="max-width:70px;max-height:70px;border-radius:0.5rem;">
            </div>
            <div style="font-weight:700;font-size:1.13rem;margin-bottom:0.3rem;">${producto.nombre}</div>
            <div style="color:#00cfff;font-weight:600;font-size:1.08rem;margin-bottom:0.7rem;">$${parseFloat(producto.precio).toLocaleString('es-CO', {minimumFractionDigits:2})}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;">
                <button type="button" class="btn-restar" style="background:linear-gradient(90deg,#00cfff 0%,#007bff 100%);color:#fff;border:none;border-radius:50%;width:38px;height:38px;font-size:1.3rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">-</button>
                <input type="number" min="1" class="input-cantidad" style="width:44px;text-align:center;font-size:1.13rem;border-radius:0.7rem;border:1.5px solid #00cfff;padding:0.2rem 0.5rem;" value="${cantidadActual}" autocomplete="off" inputmode="numeric" pattern="[0-9]*">
                <button type="button" class="btn-sumar" style="background:linear-gradient(90deg,#00cfff 0%,#007bff 100%);color:#fff;border:none;border-radius:50%;width:38px;height:38px;font-size:1.3rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">+</button>
            </div>
        `;

        const inputCantidad = card.querySelector('.input-cantidad');
        // Permitir solo números, no letras ni símbolos, y vaciar si menor a 1
        inputCantidad.addEventListener('input', (e) => {
            let val = inputCantidad.value.replace(/[^0-9]/g, '');
            if (val === '' || parseInt(val, 10) < 1) {
                inputCantidad.value = '';
                productosPedidaActual = productosPedidaActual.filter(p => p.id_producto !== producto.id_producto);
            } else {
                inputCantidad.value = val;
                actualizarProductoEnPedida(producto, parseInt(val, 10));
            }
            renderProductosAgregados();
        });

        inputCantidad.addEventListener('keydown', (e) => {
            // Permitir solo números y teclas de control
            if (
                !(
                    (e.key >= '0' && e.key <= '9') ||
                    ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
                )
            ) {
                e.preventDefault();
            }
        });

        inputCantidad.onpaste = e => e.preventDefault();
        inputCantidad.oncut = e => e.preventDefault();
        inputCantidad.oncopy = e => e.preventDefault();
        inputCantidad.ondrop = e => e.preventDefault();

        card.querySelector('.btn-sumar').onclick = (e) => {
            e.stopPropagation();
            let val = parseInt(inputCantidad.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            else val++;
            inputCantidad.value = val;
            actualizarProductoEnPedida(producto, val);
        };

        card.querySelector('.btn-restar').onclick = (e) => {
            e.stopPropagation();
            let val = parseInt(inputCantidad.value, 10);
            if (isNaN(val) || val <= 1) {
                inputCantidad.value = '';
                productosPedidaActual = productosPedidaActual.filter(p => p.id_producto !== producto.id_producto);
                renderProductosAgregados();
                return;
            }
            val--;
            inputCantidad.value = val;
            actualizarProductoEnPedida(producto, val);
        };

        card.onclick = (e) => {
            if (e.target.classList.contains('btn-restar') || e.target.classList.contains('btn-sumar') || e.target.classList.contains('input-cantidad')) return;
            let prod = productosPedidaActual.find(p => p.id_producto === producto.id_producto);
            if (prod) {
                prod.cantidad += 1;
                inputCantidad.value = prod.cantidad;
            } else {
                productosPedidaActual.push({
                    id_producto: producto.id_producto,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    cantidad: 1
                });
                inputCantidad.value = 1;
            }
            renderProductosAgregados();
        };

        return card;
    }

    function actualizarProductoEnPedida(producto, cantidad) {
        let prod = productosPedidaActual.find(p => p.id_producto === producto.id_producto);
        if (prod) {
            prod.cantidad = cantidad;
        } else {
            productosPedidaActual.push({
                id_producto: producto.id_producto,
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad: cantidad
            });
        }
        renderProductosAgregados();
    }

    function renderProductosAgregados() {
        const cont = document.getElementById('productosAgregadosPedido');
        if (!productosPedidaActual.length) {
            cont.innerHTML = '<em>No hay productos agregados.</em>';
        } else {
            cont.innerHTML = `
                <div style="background:#fff;border-radius:1.2rem;box-shadow:0 2px 8px #00cfff22;padding:1.2rem 1.5rem;display:inline-block;margin:0 auto;">
                    <table style="border:none;background:none;">
                        <tbody>
                            ${productosPedidaActual.map((p, idx) => `
                                <tr>
                                    <td style="font-size:1.08rem;color:#232946;padding:0.2rem 0.7rem 0.2rem 0;">${p.nombre}</td>
                                    <td style="font-size:1.08rem;color:#888;padding:0.2rem 0.7rem;">x${p.cantidad}</td>
                                    <td style="font-size:1.08rem;color:#00cfff;padding:0.2rem 0.7rem;text-align:right;">$${(p.precio * p.cantidad).toLocaleString('es-CO')}</td>
                                    <td>
                                        <button type="button" data-idx="${idx}" style="background:none;border:none;color:#e74c3c;font-size:1.2rem;cursor:pointer;padding:0 0.5rem;">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            cont.querySelectorAll('button[data-idx]').forEach(btn => {
                btn.onclick = function() {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    productosPedidaActual.splice(idx, 1);
                    renderProductosAgregados();
                    renderProductosCards(document.getElementById('categoriaPedido').value);
                };
            });
        }
        const total = productosPedidaActual.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
        document.getElementById('totalPedidoCustom').textContent = `$${total.toLocaleString('es-CO')}`;
        renderProductosCards(document.getElementById('categoriaPedido').value);
    }
    // NUEVO: Botón para repetir última pedida (desde backend)
    function crearBotonRepetirPedida() {
        let btn = document.getElementById('btnRepetirUltimaPedida');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btnRepetirUltimaPedida';
            btn.type = 'button';
            btn.textContent = 'Repetir última pedida';
            btn.style = 'background:linear-gradient(90deg,#00cfff 0%,#007bff 100%);color:#fff;border:none;border-radius:0.7rem;padding:0.7rem 2.2rem;font-size:1.13rem;font-weight:600;cursor:pointer;';
            const botonesContainer = document.getElementById('pedidoBotonesContainer');
            if (botonesContainer) {
                botonesContainer.insertBefore(btn, botonesContainer.firstChild);
            }
        }
        btn.onclick = async function() {
            try {
                // Llama a la API dedicada a la última pedida de la mesa
                const res = await fetch(`/api/pedidas/ultima?mesaId=${encodeURIComponent(mesaId)}`);
                if (!res.ok) {
                    if (typeof showNotification === 'function') showNotification('No hay una pedida previa para repetir.');
                    console.error('[Repetir última pedida] Error HTTP:', res.status, res.statusText);
                    return;
                }
                const ultimaPedida = await res.json();
                // Una pedida son los productos que se pidieron a una misma hora (agrupados por hora_pedido redondeada a minutos)
                if (!ultimaPedida || !Array.isArray(ultimaPedida.productos) || !ultimaPedida.productos.length) {
                    if (typeof showNotification === 'function') showNotification('No hay una pedida previa para repetir.');
                    console.error('[Repetir última pedida] Respuesta inválida o sin productos:', ultimaPedida);
                    return;
                }
                // Selecciona automáticamente todos los productos de la última pedida y los muestra en el detalle
                productosPedidaActual = ultimaPedida.productos.map(p => {
                    const prodActual = productosDisponibles.find(prod => prod.id_producto === p.id_producto);
                    return {
                        id_producto: p.id_producto,
                        nombre: prodActual ? prodActual.nombre : (p.nombre_producto || p.nombre),
                        precio: prodActual ? prodActual.precio : p.precio,
                        cantidad: p.cantidad
                    };
                });
                // Mostrar los productos en el detalle de la pedida (no envía la pedida, solo la muestra)
                renderProductosAgregados();
                if (typeof showNotification === 'function') {
                    showNotification(`
                        <div style="display:flex;align-items:center;gap:1rem;">
                            <span style="font-size:1.7rem;">🔄</span>
                            <span style="font-size:1.08rem;">Última pedida cargada. Ahora puedes confirmar la pedida.</span>
                        </div>
                    `);
                }
            } catch (err) {
                if (typeof showNotification === 'function') showNotification('Error al traer la última pedida.');
                console.error('[Repetir última pedida] Error en fetch o procesamiento:', err);
            }
        };
    }

    document.getElementById('pedidoFormCustom').onsubmit = async function(e) {
        e.preventDefault();
        if (!productosPedidaActual.length) return;

        // Obtener la hora local de Bucaramanga, Colombia (GMT-5) usando Date y offset manual
        function getHoraColombia() {
            const ahoraUTC = new Date(Date.now() + (new Date().getTimezoneOffset() * 60000));
            // Colombia es UTC-5, así que restamos 5 horas
            const fechaColombia = new Date(ahoraUTC.getTime() - (5 * 60 * 60 * 1000));
            const yyyy = fechaColombia.getFullYear();
            const mm = String(fechaColombia.getMonth() + 1).padStart(2, '0');
            const dd = String(fechaColombia.getDate()).padStart(2, '0');
            const hh = String(fechaColombia.getHours()).padStart(2, '0');
            const min = String(fechaColombia.getMinutes()).padStart(2, '0');
            const ss = String(fechaColombia.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        }

        const horaPedido = getHoraColombia();

        const productos = productosPedidaActual.map(p => ({
            id_producto: p.id_producto,
            cantidad: p.cantidad,
            subtotal: Number(p.precio) * Number(p.cantidad)
        }));

        const pedido = {
            id_mesa: Number(mesaId),
            hora_pedido: horaPedido,
            productos
        };

        try {
            const res = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedido)
            });
            const data = await res.json();
            if (res.ok && (data.success || data.ok)) {
                // Notificación visual tipo snackbar, no alert ni confirm
                if (typeof showNotification === 'function') {
                    showNotification(`
                        <div style="
                            display:flex;
                            align-items:center;
                            gap:1rem;
                            background:linear-gradient(90deg,#00cfff 0%,#007bff 100%);
                            color:#fff;
                            border-radius:1.2rem;
                            padding:1.2rem 2rem;
                            font-size:1.18rem;
                            font-weight:600;
                            box-shadow:0 2px 12px #00cfff33;
                            min-width:280px;
                            max-width:350px;
                            margin:0 auto;
                        ">
                            <span style="font-size:2rem;display:flex;align-items:center;justify-content:center;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="12" fill="none"/>
                                    <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/>
                                    <path d="M8 12.5l2.5 2.5L16 9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            <span style="font-size:1.13rem;font-weight:600;letter-spacing:0.5px;">
                                Pedido registrado exitosamente
                            </span>
                        </div>
                    `);
                    // --- Recargar la página después de mostrar el mensaje ---
                    setTimeout(() => {
                        window.location.reload();
                    }, 2200);
                } else {
                    // Si no existe showNotification, crea un snackbar visual
                    let notif = document.getElementById('snackbarPedidoExito');
                    if (!notif) {
                        notif = document.createElement('div');
                        notif.id = 'snackbarPedidoExito';
                        notif.style.position = 'fixed';
                        notif.style.top = '40px';
                        notif.style.left = '50%';
                        notif.style.transform = 'translateX(-50%)';
                        notif.style.background = 'linear-gradient(90deg,#00cfff 0%,#007bff 100%)';
                        notif.style.color = '#fff';
                        notif.style.borderRadius = '1.2rem';
                        notif.style.padding = '1.2rem 2rem';
                        notif.style.fontSize = '1.18rem';
                        notif.style.fontWeight = '600';
                        notif.style.boxShadow = '0 2px 12px #00cfff33';
                        notif.style.minWidth = '280px';
                        notif.style.maxWidth = '350px';
                        notif.style.zIndex = 9999;
                        notif.innerHTML = `
                            <span style="font-size:2rem;vertical-align:middle;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="12" fill="none"/>
                                    <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/>
                                    <path d="M8 12.5l2.5 2.5L16 9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            <span style="margin-left:1rem;font-size:1.13rem;font-weight:600;letter-spacing:0.5px;">
                                Pedido registrado exitosamente
                            </span>
                        `;
                        document.body.appendChild(notif);
                    } else {
                        notif.style.display = 'flex';
                    }
                    setTimeout(() => {
                        notif.style.display = 'none';
                        // --- Recargar la página después de mostrar el mensaje ---
                        window.location.reload();
                    }, 2200);
                }
            } else {
                let msg = (data && data.message) ? data.message : 'No se pudo guardar la pedida';
                if (typeof showNotification === 'function') showNotification('Error: ' + msg);
                else alert('Error: ' + msg);
            }
        } catch (err) {
            if (typeof showNotification === 'function') showNotification('Error al guardar la pedida: ' + (err.message || err));
            else alert('Error al guardar la pedida: ' + (err.message || err));
        }

        modal.classList.add('hidden');
        modal.style.display = 'none';
    };

    document.getElementById('agregarProductoPedido').style.display = 'none';
}
