// Sidebar toggle
const menuBtn = document.getElementById('menuBtn');
const sidebarNav = document.getElementById('sidebarNav');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (menuBtn && sidebarNav && sidebarOverlay) {
    menuBtn.addEventListener('click', () => {
        sidebarNav.classList.add('open');
        sidebarOverlay.style.display = 'block';
    });
    
    sidebarOverlay.addEventListener('click', () => {
        sidebarNav.classList.remove('open');
        sidebarOverlay.style.display = 'none';
    });
    
    sidebarNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            sidebarNav.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
    });
}

// Variables globales
let facturasData = [];
let filteredFacturas = [];

// Elementos del DOM
const facturasContainer = document.getElementById('facturasContainer');
const totalFacturasEl = document.getElementById('totalFacturas');
const totalVentasEl = document.getElementById('totalVentas');

// Filtros
const filtroFecha = document.getElementById('filtroFecha');
const filtroMetodoPago = document.getElementById('filtroMetodoPago');
const filtroMesa = document.getElementById('filtroMesa');
const btnFiltrar = document.getElementById('btnFiltrar');
const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

// Modales
const modalEditarFactura = document.getElementById('modalEditarFactura');
const modalDetalleFactura = document.getElementById('modalDetalleFactura');
const formEditarFactura = document.getElementById('formEditarFactura');

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    cargarFacturas();
    configurarEventListeners();
});

function configurarEventListeners() {
    // Filtros
    btnFiltrar.addEventListener('click', aplicarFiltros);
    btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    
    // Modal editar
    document.getElementById('cerrarModalEditar').addEventListener('click', cerrarModalEditar);
    document.getElementById('btnCancelarEdicion').addEventListener('click', cerrarModalEditar);
    formEditarFactura.addEventListener('submit', guardarCambiosFactura);
    // Métodos de pago dinámicos
    document.getElementById('btnAgregarMetodoPago').addEventListener('click', agregarMetodoPagoEdit);
    
    // Modal detalle
    document.getElementById('cerrarModalDetalle').addEventListener('click', cerrarModalDetalle);
    
    // Calcular vuelto automáticamente
    document.getElementById('editTotalRecibido').addEventListener('input', calcularVuelto);
    document.getElementById('editTotal').addEventListener('input', calcularVuelto);
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalEditarFactura) cerrarModalEditar();
        if (e.target === modalDetalleFactura) cerrarModalDetalle();
    });
}

// Cargar facturas desde el servidor
async function cargarFacturas() {
    try {
        const response = await fetch('/api/facturas');
        if (!response.ok) throw new Error('Error al cargar facturas');
        
        facturasData = await response.json();
        filteredFacturas = [...facturasData];
        
        renderizarFacturas();
        actualizarResumen();
    } catch (error) {
        console.error('Error:', error);
        if (facturasContainer) {
            facturasContainer.innerHTML = '<div class="no-facturas">❌ Error al cargar las facturas</div>';
        } else {
            console.error('Error: elemento facturasContainer no encontrado en el DOM');
        }
    }
}

// Renderizar tabla de facturas
function renderizarFacturas() {
    if (filteredFacturas.length === 0) {
        facturasContainer.innerHTML = '<div class="no-facturas">📭 No se encontraron facturas</div>';
        return;
    }
    
    const tabla = `
        <table class="facturas-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Mesa</th>
                    <th>Usuario</th>
                    <th>Método Pago</th>
                    <th>Total</th>
                    <th>Recibido</th>
                    <th>Vuelto</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${filteredFacturas.map(factura => `
                    <tr>
                        <td><strong>#${factura.id_factura}</strong></td>
                        <td>${formatearFecha(factura.fecha)}</td>
                        <td>Mesa ${factura.numero_mesa || 'N/A'}</td>
                        <td>${factura.nombre_usuario || 'N/A'}</td>
                        <td><span class="metodo-pago">${formatearMetodoPago(factura.metodo_pago)}</span></td>
                        <td><strong>$${formatearMoneda(factura.total)}</strong></td>
                        <td>$${formatearMoneda(factura.total_recibido)}</td>
                        <td>$${formatearMoneda(factura.total_vuelto)}</td>
                        <td><span class="${factura.estado === 'anulada' ? 'estado-anulada' : 'estado-activa'}">${factura.estado === 'anulada' ? '❌ Anulada' : '✅ Activa'}</span></td>
                        <td>
                            <div class="acciones-factura">
                                <button class="btn-accion btn-ver" onclick="verDetalleFactura(${factura.id_factura})">
                                    👁️ Ver
                                </button>
                                ${factura.estado !== 'anulada' ? `
                                    <!-- Botón de editar oculto por solicitud del usuario -->
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    facturasContainer.innerHTML = tabla;
}

// Actualizar resumen
function actualizarResumen() {
    const facturasActivas = filteredFacturas.filter(f => f.estado !== 'anulada');
    const totalFacturas = facturasActivas.length;
    const totalVentas = facturasActivas.reduce((sum, f) => sum + parseFloat(f.total), 0);
    
    totalFacturasEl.textContent = totalFacturas;
    totalVentasEl.textContent = `$${formatearMoneda(totalVentas)}`;
}

// Aplicar filtros
function aplicarFiltros() {
    filteredFacturas = facturasData.filter(factura => {
        let cumpleFiltros = true;
        
        // Filtro por fecha
        if (filtroFecha.value) {
            const fechaFactura = new Date(factura.fecha).toISOString().split('T')[0];
            if (fechaFactura !== filtroFecha.value) {
                cumpleFiltros = false;
            }
        }
        
        // Filtro por método de pago
        if (filtroMetodoPago.value) {
            if (factura.metodo_pago.toLowerCase() !== filtroMetodoPago.value.toLowerCase()) {
                cumpleFiltros = false;
            }
        }
        
        // Filtro por mesa
        if (filtroMesa.value) {
            if (factura.numero_mesa != filtroMesa.value) {
                cumpleFiltros = false;
            }
        }
        
        return cumpleFiltros;
    });
    
    renderizarFacturas();
    actualizarResumen();
}

// Limpiar filtros
function limpiarFiltros() {
    filtroFecha.value = '';
    filtroMetodoPago.value = '';
    filtroMesa.value = '';
    filteredFacturas = [...facturasData];
    renderizarFacturas();
    actualizarResumen();
}

// Ver detalle de factura
async function verDetalleFactura(id) {
    try {
        const response = await fetch(`/api/facturas/${id}/detalle`);
        if (!response.ok) throw new Error('Error al cargar detalle');
        
        const detalle = await response.json();
        mostrarDetalleFactura(detalle);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el detalle de la factura');
    }
}

// Mostrar modal de detalle
function mostrarDetalleFactura(detalle) {
    // Métodos de pago desglosados
    let metodosPagoHtml = '';
    if (Array.isArray(detalle.metodos_pago) && detalle.metodos_pago.length > 0) {
        metodosPagoHtml = `<div style="margin-top:1.1rem;">
            <strong style="color:#00cfff;">Desglose de métodos de pago:</strong>
            <ul style="margin:0.7rem 0 0 0;padding:0;list-style:none;display:flex;gap:1.2rem;flex-wrap:wrap;">
                ${detalle.metodos_pago.map(m => `
                    <li style="background:#232946;padding:0.6rem 1.1rem;border-radius:0.7rem;display:flex;align-items:center;gap:0.7rem;box-shadow:0 2px 8px #00cfff22;">
                        <span style="font-size:1.2rem;">${formatearMetodoPago(m.metodo_pago)}</span>
                        <span style="font-weight:700;color:#43e97b;">$${formatearMoneda(m.valor)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>`;
    } else if (detalle.metodo_pago) {
        // Si solo hay uno, mostrarlo igual
        metodosPagoHtml = `<div style="margin-top:1.1rem;">
            <strong style="color:#00cfff;">Método de pago:</strong>
            <span style="font-size:1.1rem;font-weight:700;color:#43e97b;margin-left:0.7rem;">${formatearMetodoPago(detalle.metodo_pago)}</span>
        </div>`;
    }

    // Sección de pedidas ya pagadas
    let pedidasPagadasHtml = '';
    if (Array.isArray(detalle.pedidas_ya_pagadas) && detalle.pedidas_ya_pagadas.length > 0) {
        pedidasPagadasHtml = `
        <div style="background: #181c2f; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="color: #00cfff; margin-bottom: 1rem;">🧾 Pedidas Ya Pagadas</h4>
            <div style="max-height: 320px; overflow-y: auto;">
                ${detalle.pedidas_ya_pagadas.map(pedida => `
                    <div style="background: #232946; border-radius: 0.7rem; margin-bottom: 1.2rem; padding: 1rem 1.2rem; box-shadow: 0 2px 8px #00cfff11;">
                        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: 0.7rem;">
                            <div><span style="color:#00cfff;font-weight:700;">🕒</span> <strong>Hora:</strong> <span style="color:#43e97b;">${pedida.hora_pedida}</span></div>
                            <div><strong>Productos:</strong> <span style="color:#43e97b;">${pedida.cantidad_productos}</span></div>
                            <div><strong>Total:</strong> <span style="color:#43e97b;">$${formatearMoneda(pedida.total_pedida)}</span></div>
                        </div>
                        <table style="width:100%; border-collapse:collapse; background:#181c2f; border-radius:0.5rem;">
                            <thead>
                                <tr style="background:#181c2f;">
                                    <th style="padding:0.3rem 0.5rem; text-align:left; color:#00cfff;">Producto</th>
                                    <th style="padding:0.3rem 0.5rem; text-align:center; color:#00cfff;">Cantidad</th>
                                    <th style="padding:0.3rem 0.5rem; text-align:right; color:#00cfff;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(Array.isArray(pedida.productos) ? pedida.productos : []).map(prod => `
                                    <tr>
                                        <td style="padding:0.3rem 0.5rem;">${prod.nombre}</td>
                                        <td style="padding:0.3rem 0.5rem; text-align:center;">${prod.cantidad}</td>
                                        <td style="padding:0.3rem 0.5rem; text-align:right;">$${formatearMoneda(prod.subtotal)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }

    // Sección de valor del tiempo
    let tiempoHtml = '';
    if (typeof detalle.total_tiempo === 'number' && detalle.total_tiempo > 0) {
        tiempoHtml = `
        <div style="background: #181c2f; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="color: #00cfff; margin-bottom: 1rem;">⏳ Valor del Tiempo de Mesa</h4>
            <div><strong>Total tiempo cobrado:</strong> <span style="color:#00cfff;">$${formatearMoneda(detalle.total_tiempo)}</span> ${detalle.tiempo_legible ? `(<span style='color:#43e97b;'>${detalle.tiempo_legible}</span>)` : detalle.tiempo_horas ? `(<span style='color:#43e97b;'>${detalle.tiempo_horas} horas</span>)` : ''}</div>
        </div>
        `;
    }

    const contenido = `
        <div style="background: #181c2f; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="color: #00cfff; margin-bottom: 1rem;">📋 Información General</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div><strong>ID Factura:</strong> #${detalle.id_factura}</div>
                <div><strong>Fecha:</strong> ${formatearFecha(detalle.fecha)}</div>
                <div><strong>Mesa:</strong> ${detalle.numero_mesa || 'N/A'}</div>
                <div><strong>Usuario:</strong> ${detalle.nombre_usuario || 'N/A'}</div>
            </div>
        </div>
        <div style="background: #181c2f; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="color: #00cfff; margin-bottom: 1rem;">💰 Información de Pago</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <div><strong>Total:</strong> <span style="color: #00cfff;">$${formatearMoneda(detalle.total)}</span></div>
                <div><strong>Recibido:</strong> <span style="color: #28a745;">$${formatearMoneda(detalle.total_recibido)}</span></div>
                <div><strong>Vuelto:</strong> <span style="color: #ffc107;">$${formatearMoneda(detalle.total_vuelto)}</span></div>
            </div>
            ${metodosPagoHtml}
        </div>
        ${tiempoHtml}
        ${pedidasPagadasHtml}
        ${detalle.productos && detalle.productos.length > 0 ? `
            <div style="background: #181c2f; border-radius: 1rem; padding: 1.5rem;">
                <h4 style="color: #00cfff; margin-bottom: 1rem;">🛒 Productos</h4>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #232946;">
                                <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #00cfff33;">Producto</th>
                                <th style="padding: 0.5rem; text-align: center; border-bottom: 1px solid #00cfff33;">Cantidad</th>
                                <th style="padding: 0.5rem; text-align: right; border-bottom: 1px solid #00cfff33;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalle.productos.map(producto => `
                                <tr>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid #00cfff11;">${producto.nombre}</td>
                                    <td style="padding: 0.5rem; text-align: center; border-bottom: 1px solid #00cfff11;">${producto.cantidad}</td>
                                    <td style="padding: 0.5rem; text-align: right; border-bottom: 1px solid #00cfff11;">$${formatearMoneda(producto.subtotal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}
        <div id="snackbar-navegacion"></div>
    `;
    document.getElementById('detalleFacturaContent').innerHTML = contenido;
    modalDetalleFactura.style.display = 'block';
    // Mostrar snackbar de navegación
    setTimeout(() => {
        if (window.showSnackbar) {
            showSnackbar('Desliza o usa scroll para navegar el detalle. Pulsa ESC para cerrar.', {
                actionText: 'Cerrar',
                onAction: () => { modalDetalleFactura.style.display = 'none'; }
            });
        }
    }, 400);
}


// --- Variables globales para edición de productos (deben estar antes de cualquier uso) ---
let productosEditados = [];
let catalogoProductos = [];

// Editar factura
async function editarFactura(id) {
    try {
        // Obtener el detalle completo de la factura (incluye metodos_pago y productos)
        const response = await fetch(`/api/facturas/${id}/detalle`);
        if (!response.ok) throw new Error('Error al cargar detalle de factura');
        const detalle = await response.json();

        document.getElementById('editFacturaId').value = detalle.id_factura;
        document.getElementById('editTotal').value = detalle.total;
        document.getElementById('editTotalRecibido').value = detalle.total_recibido;
        document.getElementById('editTotalVuelto').value = detalle.total_vuelto;

        // --- Renderizar productos en tabla editable ---
        await renderizarProductosEdit(detalle.productos);

        // Métodos de pago: soporta múltiples
        let metodos = [];
        if (detalle.metodos_pago && Array.isArray(detalle.metodos_pago) && detalle.metodos_pago.length > 0) {
            metodos = detalle.metodos_pago;
        } else if (detalle.metodo_pago) {
            metodos = detalle.metodo_pago.split(',').map(m => ({ metodo_pago: m.trim(), valor: detalle.total_recibido }));
        }
        renderizarMetodosPagoEdit(metodos);

        modalEditarFactura.style.display = 'block';
    } catch (err) {
        alert('Error al cargar la factura para editar.');
        console.error(err);
    }

async function cargarCatalogoProductos() {
    if (catalogoProductos.length > 0) return catalogoProductos;
    try {
        const res = await fetch('/api/productos');
        if (!res.ok) throw new Error('No se pudo cargar el catálogo de productos');
        catalogoProductos = await res.json();
        return catalogoProductos;
    } catch (e) {
        catalogoProductos = [];
        return [];
    }
}

async function renderizarProductosEdit(productos) {
    productosEditados = productos.map(p => ({ ...p }));
    const container = document.getElementById('editProductosContainer');
    const catalogo = await cargarCatalogoProductos();
    // --- NUEVA METODOLOGÍA: barra de búsqueda y tabla tipo carrito ---
    let html = `
    <div style="background: #181c2f; border-radius: 1.1rem; padding: 1.2rem 2.5rem 2.5rem 2.5rem; margin-bottom: 1.2rem; box-shadow: 0 2px 12px #00cfff22; width: 100%; box-sizing: border-box;">
        <div style="display:flex;align-items:center;gap:1.2rem;margin-bottom:1.2rem;flex-wrap:wrap;">
            <input id="inputBuscarProductoEdit" type="text" placeholder="Buscar producto por nombre o código..." autocomplete="off" style="flex:1 1 220px;min-width:180px;max-width:340px;padding:0.6rem 1rem;border-radius:0.7rem;border:2px solid #00cfff;font-size:1.08rem;background:#232946;color:#00cfff;font-weight:600;outline:none;" />
            <input id="inputCantidadProductoEdit" type="number" min="1" value="1" style="width:70px;padding:0.6rem 0.7rem;border-radius:0.7rem;border:2px solid #43e97b;font-size:1.08rem;background:#232946;color:#43e97b;font-weight:700;text-align:center;" />
            <button type="button" id="btnAgregarProductoEdit" style="background:linear-gradient(90deg,#00cfff 0%,#43e97b 100%);color:#fff;font-weight:700;border:none;border-radius:0.7rem;padding:0.6rem 1.3rem;cursor:pointer;box-shadow:0 2px 8px #00cfff33;transition:background 0.2s;font-size:1.08rem;">+ Agregar</button>
        </div>
        <div id="sugerenciasProductoEdit" style="position:relative;z-index:10;"></div>
        <div style="width:100%;overflow-x:visible;">
        <table id="tablaProductosEdit" style="width:100%;table-layout:auto;border-collapse:separate;border-spacing:0 0.5rem;background:none;font-family:'DM Sans','Segoe UI',Arial,sans-serif;">
            <thead>
                <tr style="background:#232946;">
                    <th style="padding:0.7rem 0.5rem;color:#00cfff;font-weight:700;border-radius:0.6rem 0 0 0.6rem;min-width:120px;max-width:260px;">Producto</th>
                    <th style="padding:0.7rem 0.5rem;color:#00cfff;font-weight:700;min-width:70px;max-width:110px;">Cantidad</th>
                    <th style="padding:0.7rem 0.5rem;color:#00cfff;font-weight:700;min-width:100px;max-width:150px;">Precio unitario</th>
                    <th style="padding:0.7rem 0.5rem;color:#00cfff;font-weight:700;min-width:100px;max-width:150px;">Subtotal</th>
                    <th style="padding:0.7rem 0.5rem;color:#00cfff;font-weight:700;border-radius:0 0.6rem 0.6rem 0;min-width:90px;max-width:130px;">Acción</th>
                </tr>
            </thead>
            <tbody>
                ${productosEditados.map((prod, idx) => {
                    const prodCat = catalogo.find(p => p.id_producto == prod.id_producto) || {};
                    return `
                    <tr data-idx="${idx}" style="background:#232946;box-shadow:0 2px 8px #00cfff11;border-radius:0.6rem;">
                        <td style="padding:0.7rem 0.5rem;color:#fff;border-radius:0.6rem 0 0 0.6rem;min-width:120px;max-width:260px;">${prodCat.nombre || prod.nombre || ''}</td>
                        <td style="padding:0.7rem 0.5rem;color:#fff;min-width:70px;max-width:110px;">
                            <input type="number" class="input-cantidad-edit" data-idx="${idx}" min="1" value="${prod.cantidad}" style="width:70px;max-width:100%;padding:0.4rem 0.7rem;border-radius:0.6rem;border:1.5px solid #43e97b;font-size:1.08rem;background:#181c2f;color:#43e97b;font-weight:700;text-align:center;" />
                        </td>
                        <td style="padding:0.7rem 0.5rem;color:#43e97b;font-weight:700;min-width:100px;max-width:150px;">
                            <span class="precio-unit-edit">$${formatearMoneda(prodCat.precio || 0)}</span>
                        </td>
                        <td style="padding:0.7rem 0.5rem;color:#43e97b;font-weight:700;min-width:100px;max-width:150px;">
                            <span class="subtotal-edit">$${formatearMoneda(prod.subtotal)}</span>
                        </td>
                        <td class="edit-table-actions" style="min-width:90px;max-width:130px;text-align:center;vertical-align:middle;padding:0.7rem 0.5rem;">
                            <button type="button" class="btn-quitar-producto-edit" data-idx="${idx}" style="background:linear-gradient(90deg,#ff4d4f 0%,#ffb199 100%);color:#fff;border:none;border-radius:0.6rem;padding:0.3rem 0.9rem;cursor:pointer;font-weight:700;box-shadow:0 2px 8px #ff4d4f22;transition:background 0.2s;">🗑️ Quitar</button>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        </div>
        <div style="margin-top:1.2rem;display:flex;justify-content:flex-end;align-items:center;gap:1.2rem;flex-wrap:wrap;">
            <span style="color:#00cfff;font-weight:700;font-size:1.13rem;">Total productos:</span>
            <span id="totalProductosEdit" style="color:#43e97b;font-weight:800;font-size:1.25rem;">$${formatearMoneda(productosEditados.reduce((sum,p)=>sum+(parseFloat(p.subtotal)||0),0))}</span>
        </div>
    </div>
    `;
    container.innerHTML = html;

    // --- Autocompletado y lógica de carrito ---
    const inputBuscar = container.querySelector('#inputBuscarProductoEdit');
    const inputCantidad = container.querySelector('#inputCantidadProductoEdit');
    const sugerenciasDiv = container.querySelector('#sugerenciasProductoEdit');
    inputBuscar.addEventListener('input', function() {
        const val = inputBuscar.value.trim().toLowerCase();
        sugerenciasDiv.innerHTML = '';
        if (val.length < 2) return;
        const sugerencias = catalogo.filter(p => p.nombre.toLowerCase().includes(val) || String(p.id_producto).includes(val)).slice(0, 8);
        if (sugerencias.length === 0) return;
        const ul = document.createElement('ul');
        ul.style.cssText = 'position:absolute;left:0;top:0.1rem;width:100%;background:#232946;border-radius:0.7rem;box-shadow:0 2px 12px #00cfff22;list-style:none;padding:0.3rem 0;margin:0;z-index:20;';
        sugerencias.forEach(prod => {
            const li = document.createElement('li');
            li.textContent = prod.nombre + ' ($' + formatearMoneda(prod.precio) + ')';
            li.style.cssText = 'padding:0.5rem 1rem;color:#00cfff;cursor:pointer;font-weight:600;border-radius:0.5rem;';
            li.addEventListener('mousedown', function(e) {
                e.preventDefault();
                inputBuscar.value = prod.nombre;
                inputBuscar.setAttribute('data-id', prod.id_producto);
                sugerenciasDiv.innerHTML = '';
                inputCantidad.focus();
            });
            ul.appendChild(li);
        });
        sugerenciasDiv.appendChild(ul);
    });
    inputBuscar.addEventListener('blur', function() { setTimeout(()=>{ sugerenciasDiv.innerHTML = ''; }, 150); });

    // Agregar producto al carrito
    container.querySelector('#btnAgregarProductoEdit').onclick = function() {
        let idProd = inputBuscar.getAttribute('data-id');
        if (!idProd) {
            // Si no seleccionó de sugerencia, buscar por nombre exacto
            const val = inputBuscar.value.trim().toLowerCase();
            const prod = catalogo.find(p => p.nombre.toLowerCase() === val);
            if (prod) idProd = prod.id_producto;
        }
        const cantidad = parseInt(inputCantidad.value) || 1;
        if (!idProd || cantidad < 1) {
            showNotification('Selecciona un producto válido y cantidad mayor a 0');
            return;
        }
        const prodCat = catalogo.find(p => String(p.id_producto) === String(idProd));
        if (!prodCat) {
            showNotification('Producto no encontrado.');
            return;
        }
        // Si ya existe, suma cantidad
        const idxExistente = productosEditados.findIndex(p => String(p.id_producto) === String(idProd));
        if (idxExistente !== -1) {
            productosEditados[idxExistente].cantidad += cantidad;
            productosEditados[idxExistente].subtotal = prodCat.precio * productosEditados[idxExistente].cantidad;
        } else {
            productosEditados.push({
                id_producto: prodCat.id_producto,
                nombre: prodCat.nombre,
                cantidad: cantidad,
                subtotal: prodCat.precio * cantidad
            });
        }
        renderizarProductosEdit(productosEditados);
        actualizarTotalFacturaEdit();
        inputBuscar.value = '';
        inputBuscar.removeAttribute('data-id');
        inputCantidad.value = 1;
    };

    // Edición de cantidad en línea
    const tabla = container.querySelector('#tablaProductosEdit');
    tabla.querySelectorAll('.input-cantidad-edit').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            let val = parseInt(e.target.value) || 1;
            if (val < 1) val = 1;
            productosEditados[idx].cantidad = val;
            // Validación visual
            if (val < 1) {
                e.target.style.borderColor = '#ff4d4f';
            } else {
                e.target.style.borderColor = '#43e97b';
            }
            // Actualizar subtotal y total solo de la fila
            const prodCat = catalogo.find(p => p.id_producto == productosEditados[idx].id_producto);
            productosEditados[idx].subtotal = (prodCat?.precio || 0) * val;
            const fila = tabla.querySelector(`tr[data-idx="${idx}"]`);
            if (fila) {
                fila.querySelector('.subtotal-edit').textContent = `$${formatearMoneda(productosEditados[idx].subtotal)}`;
            }
            actualizarTotalFacturaEdit();
        });
    });
    // Eliminar producto
    tabla.querySelectorAll('.btn-quitar-producto-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            if (confirm('¿Seguro que deseas quitar este producto de la factura?')) {
                productosEditados.splice(idx, 1);
                renderizarProductosEdit(productosEditados);
                actualizarTotalFacturaEdit();
            }
        });
    });
}

// --- MODALES DE AGREGAR Y DESCONTAR PRODUCTO (idénticos a supervisor) ---

// Modal Agregar Producto
function mostrarModalAgregarProductoFactura() {
    let modal = document.getElementById('modalAgregarProductoFactura');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalAgregarProductoFactura';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 420px; background: #fff; border-radius: 1.2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.13); padding: 2.2rem 2.5rem 2.5rem 2.5rem; position: relative; display: flex; flex-direction: column; align-items: center; animation: modalFadeIn 0.25s; color: #111 !important;">
                <button class="close-btn" id="closeAgregarProductoFacturaModal" title="Cerrar">&times;</button>
                <h2 style="color:#007bff;font-size:1.45rem;margin-bottom:1.5rem;font-weight:700;letter-spacing:0.01em;display:flex;align-items:center;gap:0.7rem;">Agregar Producto</h2>
                <form id="formAgregarProductoFactura" style="width:100%;">
                    <div class="form-group">
                        <label for="categoriaAgregarFactura">Categoría</label>
                        <select id="categoriaAgregarFactura"></select>
                    </div>
                    <div class="form-group">
                        <label for="productoAgregarFactura">Producto</label>
                        <select id="productoAgregarFactura"></select>
                    </div>
                    <div class="form-group">
                        <label for="cantidadAgregarFactura">Cantidad</label>
                        <input type="number" id="cantidadAgregarFactura" min="1" value="1" required>
                    </div>
                    <div class="form-buttons-row" style="display:flex;gap:1.2rem;justify-content:flex-end;margin-top:1.5rem;width:100%;">
                        <button type="button" id="cancelarAgregarProductoFacturaBtn" class="cancel-btn">Cancelar</button>
                        <button type="submit" class="confirm-btn">Agregar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    // Lógica de llenado de selects y eventos
    cargarCatalogoProductos().then(catalogo => {
        const categorias = [...new Set(catalogo.map(p => p.categoria || 'Sin categoría'))];
        const categoriaSel = document.getElementById('categoriaAgregarFactura');
        const productoSel = document.getElementById('productoAgregarFactura');
        const cantidadInput = document.getElementById('cantidadAgregarFactura');
        categoriaSel.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        function actualizarProductosSelect() {
            const cat = categoriaSel.value;
            const productosCat = catalogo.filter(p => (p.categoria || 'Sin categoría') === cat);
            productoSel.innerHTML = productosCat.map(p => `<option value="${p.id_producto}">${p.nombre}</option>`).join('');
        }
        categoriaSel.onchange = actualizarProductosSelect;
        categoriaSel.value = categorias[0];
        actualizarProductosSelect();
        cantidadInput.value = 1;
    });
    // Mostrar modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    // Cerrar modal
    document.getElementById('closeAgregarProductoFacturaModal').onclick =
    document.getElementById('cancelarAgregarProductoFacturaBtn').onclick = function() {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };
    // Enviar formulario
    document.getElementById('formAgregarProductoFactura').onsubmit = function(e) {
        e.preventDefault();
        const id_producto = document.getElementById('productoAgregarFactura').value;
        const cantidad = parseInt(document.getElementById('cantidadAgregarFactura').value, 10);
        if (!id_producto || isNaN(cantidad) || cantidad < 1) {
            showNotification('Selecciona un producto y cantidad válida.');
            return;
        }
        const prodCat = catalogoProductos.find(p => String(p.id_producto) === String(id_producto));
        if (!prodCat) {
            showNotification('Producto no encontrado.');
            return;
        }
        productosEditados.push({
            id_producto: prodCat.id_producto,
            nombre: prodCat.nombre,
            cantidad: cantidad,
            subtotal: prodCat.precio * cantidad
        });
        renderizarProductosEdit(productosEditados);
        actualizarTotalFacturaEdit();
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };
}

// Modal Descontar Producto
function mostrarModalDescontarProductoFactura(idx) {
    let modal = document.getElementById('modalDescontarProductoFactura');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDescontarProductoFactura';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 420px; background: #fff; border-radius: 1.2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.13); padding: 2.2rem 2.5rem 2.5rem 2.5rem; position: relative; display: flex; flex-direction: column; align-items: center; animation: modalFadeIn 0.25s; color: #111 !important;">
                <button class="close-btn" id="closeDescontarProductoFacturaModal" title="Cerrar">&times;</button>
                <h2 style="color:#007bff;font-size:1.45rem;margin-bottom:1.5rem;font-weight:700;letter-spacing:0.01em;display:flex;align-items:center;gap:0.7rem;">Descontar Producto</h2>
                <form id="formDescontarProductoFactura" style="width:100%;">
                    <div class="form-group">
                        <label for="cantidadDescontarFactura">Cantidad a descontar</label>
                        <input type="number" id="cantidadDescontarFactura" min="1" value="1" required>
                    </div>
                    <div class="form-buttons-row" style="display:flex;gap:1.2rem;justify-content:flex-end;margin-top:1.5rem;width:100%;">
                        <button type="button" id="cancelarDescontarProductoFacturaBtn" class="cancel-btn">Cancelar</button>
                        <button type="submit" class="confirm-btn">Descontar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    // Mostrar modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    // Cerrar modal
    document.getElementById('closeDescontarProductoFacturaModal').onclick =
    document.getElementById('cancelarDescontarProductoFacturaBtn').onclick = function() {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };
    // Enviar formulario
    document.getElementById('formDescontarProductoFactura').onsubmit = function(e) {
        e.preventDefault();
        const cantidad = parseInt(document.getElementById('cantidadDescontarFactura').value, 10);
        if (isNaN(cantidad) || cantidad < 1) {
            showNotification('Cantidad inválida.');
            return;
        }
        if (productosEditados[idx].cantidad > cantidad) {
            productosEditados[idx].cantidad -= cantidad;
            productosEditados[idx].subtotal = (catalogoProductos.find(p => p.id_producto == productosEditados[idx].id_producto)?.precio || 0) * productosEditados[idx].cantidad;
        } else {
            productosEditados.splice(idx, 1);
        }
        renderizarProductosEdit(productosEditados);
        actualizarTotalFacturaEdit();
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };
}

// Botón agregar producto (abre modal)
document.getElementById('btnAgregarProductoEdit').addEventListener('click', mostrarModalAgregarProductoFactura);

function actualizarSubtotalProducto(idx) {
    const prod = productosEditados[idx];
    const prodCat = catalogoProductos.find(p => p.id_producto == prod.id_producto);
    if (prodCat) {
        prod.subtotal = prodCat.precio * prod.cantidad;
    }
    // Actualizar en DOM
    const container = document.getElementById('editProductosContainer');
    const filas = container.querySelectorAll('tbody tr');
    if (filas[idx]) {
        filas[idx].querySelector('.subtotal-edit').textContent = `$${formatearMoneda(prod.subtotal)}`;
        filas[idx].querySelector('.precio-unit-edit').textContent = `$${formatearMoneda(prodCat.precio)}`;
    }
}

function actualizarTotalFacturaEdit() {
    // Suma todos los subtotales y actualiza el input de total
    const total = productosEditados.reduce((sum, p) => sum + (parseFloat(p.subtotal) || 0), 0);
    document.getElementById('editTotal').value = total;
    // También recalcula vuelto
    calcularVuelto();
}
}

function renderizarMetodosPagoEdit(metodos) {
    // --- NUEVO DISEÑO: Tarjetas visuales de métodos de pago con inputs autollenables ---
    const container = document.getElementById('editMetodosPagoContainer');
    if (!container) return;
    // Métodos disponibles
    const metodosDisponibles = [
        { nombre: 'Efectivo', valor: 'efectivo', img: 'images/efectivo.png' },
        { nombre: 'QR', valor: 'qr', img: 'images/codigoqr.jpg' },
        { nombre: 'Nequi', valor: 'nequi', img: 'images/nequi.png' }
    ];
    // Estado de selección y valores
    let seleccionados = Array.isArray(metodos) ? metodos.filter(m => m.metodo_pago && m.valor > 0) : [];
    let total = parseFloat(document.getElementById('editTotal').value) || 0;
    // Si no hay ninguno seleccionado, autoselecciona efectivo con el total
    if (seleccionados.length === 0) {
        seleccionados = [{ metodo_pago: 'efectivo', valor: total }];
    }
    // Render tarjetas
    let html = `<div class="metodos-pago-edit-cards" style="display:flex;gap:1.1rem;flex-wrap:wrap;justify-content:center;margin-bottom:1.2rem;">`;
    metodosDisponibles.forEach(metodo => {
        const isSelected = seleccionados.some(sel => sel.metodo_pago === metodo.valor);
        html += `
        <label class="metodo-pago-card-edit${isSelected ? ' selected' : ''}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border:2px solid ${isSelected ? '#00cfff' : '#e0e7ef'};border-radius:1rem;box-shadow:0 2px 8px #00cfff22;cursor:pointer;transition:box-shadow 0.2s,border 0.2s;padding:0.7rem 1.1rem;min-width:90px;max-width:120px;position:relative;">
            <input type="checkbox" class="metodo-pago-checkbox-edit" value="${metodo.valor}" style="display:none;" ${isSelected ? 'checked' : ''}>
            <img src="${metodo.img}" alt="${metodo.nombre}" style="width:32px;height:32px;border-radius:0.7rem;border:1.5px solid #e0e7ef;background:#f5f7fa;margin-bottom:0.5rem;">
            <span style="font-weight:700;color:#232946;font-size:1.01rem;">${metodo.nombre}</span>
            <span class="metodo-pago-check-edit" style="display:${isSelected ? 'block' : 'none'};position:absolute;top:7px;right:7px;font-size:1.1rem;color:#43e97b;">✔️</span>
        </label>`;
    });
    html += `</div>`;
    // Inputs de valor para seleccionados
    html += `<div class="inputs-metodos-pago-edit" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:0.7rem;">`;
    seleccionados.forEach(sel => {
        const metodo = metodosDisponibles.find(m => m.valor === sel.metodo_pago);
        if (!metodo) return; // Evita error si el método no existe
        html += `
        <div style="display:flex;align-items:center;gap:1.2rem;margin-bottom:0.3rem;flex-wrap:wrap;justify-content:center;max-width:100%;">
            <img src="${metodo.img}" alt="${metodo.nombre}" style="width:44px;height:44px;border-radius:0.8rem;border:2px solid #e0e7ef;background:#fff;flex-shrink:0;">
            <label style="font-weight:800;color:#232946;min-width:110px;font-size:1.13rem;flex-shrink:0;">${metodo.nombre} recibido:</label>
            <input type="number" class="input-metodo-pago-edit" data-metodo="${sel.metodo_pago}" style="width:130px;max-width:100%;padding:0.7rem 1rem;border-radius:0.9rem;font-size:1.13rem;font-weight:700;border:2px solid #00cfff;background:#fff;box-sizing:border-box;flex:1 1 80px;min-width:60px;" value="${sel.valor || ''}" min="0" step="0.01">
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;

    // Lógica de selección y autollenado
    const cards = container.querySelectorAll('.metodo-pago-card-edit');
    let seleccionadosActual = [...seleccionados];
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Evita doble click en input
            if (e.target.tagName === 'INPUT') return;
            const checkbox = card.querySelector('.metodo-pago-checkbox-edit');
            const metodo = checkbox.value;
            const idx = seleccionadosActual.findIndex(m => m.metodo_pago === metodo);
            if (checkbox.checked) {
                // Deseleccionar
                if (seleccionadosActual.length > 1) {
                    seleccionadosActual.splice(idx, 1);
                }
            } else {
                // Seleccionar (máximo 2)
                if (seleccionadosActual.length < 2) {
                    // Si es el segundo, autollenar con el faltante
                    let valor = 0;
                    if (seleccionadosActual.length === 1) {
                        let ya = parseFloat(seleccionadosActual[0].valor) || 0;
                        valor = Math.max(0, total - ya);
                    } else {
                        valor = total;
                    }
                    seleccionadosActual.push({ metodo_pago: metodo, valor });
                }
            }
            renderizarMetodosPagoEdit(seleccionadosActual);
        });
    });
    // Inputs de valor
    const inputs = container.querySelectorAll('.input-metodo-pago-edit');
    function syncRecibidoVuelto() {
        let totalRecibido = seleccionadosActual.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);
        document.getElementById('editTotalRecibido').value = totalRecibido;
        let vuelto = totalRecibido - total;
        document.getElementById('editTotalVuelto').value = Math.max(0, vuelto).toFixed(2);
    }
    inputs.forEach(input => {
        // Bloquear puntos y comas
        input.addEventListener('keypress', function(e) {
            if (e.key === ',' || e.key === '.') {
                e.preventDefault();
            }
        });
        // Validación en tiempo real
        input.addEventListener('input', function() {
            // Eliminar caracteres no numéricos y ceros a la izquierda
            let val = input.value.replace(/[^0-9]/g, '');
            val = val.replace(/^0+(?!$)/, '');
            input.value = val;
            const metodo = input.getAttribute('data-metodo');
            const idx = seleccionadosActual.findIndex(m => m.metodo_pago === metodo);
            if (idx !== -1) {
                seleccionadosActual[idx].valor = parseFloat(input.value) || 0;
                // Si hay dos seleccionados, autollenar el otro con el faltante
                if (seleccionadosActual.length === 2) {
                    const otroIdx = idx === 0 ? 1 : 0;
                    const otroInput = container.querySelector(`.input-metodo-pago-edit[data-metodo="${seleccionadosActual[otroIdx].metodo_pago}"]`);
                    if (otroInput && document.activeElement !== otroInput) {
                        let suma = (parseFloat(input.value) || 0) + (parseFloat(otroInput.value) || 0);
                        let faltante = Math.max(0, total - (parseFloat(input.value) || 0));
                        if (faltante !== (parseFloat(otroInput.value) || 0)) {
                            otroInput.value = faltante;
                            seleccionadosActual[otroIdx].valor = faltante;
                        }
                    }
                }
            }
            syncRecibidoVuelto();
        });
    });
    // Sincronizar también al renderizar
    syncRecibidoVuelto();
}


function agregarMetodoPagoEdit() {
    const container = document.getElementById('editMetodosPagoContainer');
    let selects = container.querySelectorAll('.editMetodoPagoSelect');
    let valores = container.querySelectorAll('.editMetodoPagoValor');
    let metodos = [];
    for (let i = 0; i < selects.length; i++) {
        metodos.push({
            metodo_pago: selects[i].value,
            valor: valores[i].value
        });
    }
    metodos.push({ metodo_pago: '', valor: '' });
    renderizarMetodosPagoEdit(metodos);
}


// Calcular vuelto
function calcularVuelto() {
    const total = parseFloat(document.getElementById('editTotal').value) || 0;
    const recibido = parseFloat(document.getElementById('editTotalRecibido').value) || 0;
    const vuelto = recibido - total;
    document.getElementById('editTotalVuelto').value = Math.max(0, vuelto).toFixed(2);
}

// Guardar cambios en factura
async function guardarCambiosFactura(e) {
    e.preventDefault();
    
    const id = document.getElementById('editFacturaId').value;
    // Obtener métodos de pago seleccionados y sus valores
    const metodos = [];
    const container = document.getElementById('editMetodosPagoContainer');
    if (container) {
        const inputs = container.querySelectorAll('.input-metodo-pago-edit');
        inputs.forEach(input => {
            const metodo = input.getAttribute('data-metodo');
            const valor = parseFloat(input.value) || 0;
            if (metodo && valor > 0) {
                metodos.push({ metodo_pago: metodo, valor });
            }
        });
    }
    // Validar productos antes de enviar
    if (!productosEditados || productosEditados.length === 0) {
        showNotification('Debe haber al menos un producto en la factura');
        return;
    }
    // Validar cantidades y subtotales
    for (const p of productosEditados) {
        if (!p.id_producto || !p.cantidad || p.cantidad < 1 || !p.subtotal || p.subtotal < 0) {
            showNotification('Revisa los productos: cantidad y subtotal deben ser válidos');
            return;
        }
    }
    // Para compatibilidad backend, enviar el primer método como string y el array completo si se requiere
    const datosActualizados = {
        metodo_pago: metodos.length > 0 ? metodos.map(m => m.metodo_pago).join(', ') : '',
        metodos_pago: metodos.map(m => ({
            metodo_pago: m.metodo_pago,
            valor: parseFloat(m.valor)
        })),
        total: parseFloat(document.getElementById('editTotal').value),
        total_recibido: parseFloat(document.getElementById('editTotalRecibido').value),
        total_vuelto: parseFloat(document.getElementById('editTotalVuelto').value),
        productos: productosEditados.map(p => ({
            id_producto: parseInt(p.id_producto),
            cantidad: parseInt(p.cantidad),
            subtotal: parseFloat(p.subtotal)
        }))
    };
    try {
        const response = await fetch(`/api/facturas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizados)
        });
        
        if (!response.ok) {
            // Intentar obtener el mensaje de error del servidor
            try {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar factura');
            } catch (parseError) {
                throw new Error('Error al actualizar factura');
            }
        }
        
        showNotification('✅ Factura actualizada correctamente');
        cerrarModalEditar();
        cargarFacturas(); // Recargar datos
    } catch (error) {
        console.error('Error:', error);
        showNotification(`❌ ${error.message}`);
    }
}


// Cerrar modales
function cerrarModalEditar() {
    modalEditarFactura.style.display = 'none';
    formEditarFactura.reset();
}

function cerrarModalDetalle() {
    modalDetalleFactura.style.display = 'none';
}

// Funciones de utilidad
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatearMoneda(cantidad) {
    return parseFloat(cantidad).toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatearMetodoPago(metodo) {
    const metodos = {
        'efectivo': '💵 Efectivo',
        'nequi': '📱 Nequi',
        'transferencia': '🏦 Transferencia'
    };
    return metodos[metodo.toLowerCase()] || metodo;
}

// Sistema de notificaciones
function showNotification(message) {
    // Crear o reutilizar el contenedor de notificación
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(90deg, #00cfff 0%, #007bff 100%);
            color: #fff;
            padding: 1rem 1.5rem;
            border-radius: 0.7rem;
            box-shadow: 0 4px 16px rgba(0, 207, 255, 0.3);
            z-index: 4000;
            transform: translateX(400px);
            transition: all 0.3s ease;
            max-width: 300px;
            font-weight: 600;
        `;
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = message;
    notification.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
    }, 3000);
}