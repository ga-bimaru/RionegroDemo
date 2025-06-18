document.addEventListener('DOMContentLoaded', () => {
    const contenedorPrincipal = document.getElementById('contenedor-principal');
    const tablaFacturas = document.getElementById('tablaFacturas');
    const filtroFecha = document.getElementById('filtroFechaFacturas');
    const btnFiltrar = document.getElementById('btnFiltrarFacturas');
    const modalDetalle = document.getElementById('modalDetalleFactura');

    function formatoCOP(valor) {
        return '$' + (valor ? Math.round(valor).toLocaleString('es-CO') : '0');
    }

    async function cargarFacturas(fecha = null) {
        tablaFacturas.innerHTML = '<em>Cargando...</em>';
        let url = '/api/facturas';
        if (fecha) url += '?fecha=' + encodeURIComponent(fecha);
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!Array.isArray(data) || !data.length) {
                tablaFacturas.innerHTML = '<em>No hay facturas para este periodo.</em>';
                return;
            }
            tablaFacturas.innerHTML = `
                <div class="tabla-scroll-x">
                    <table>
                        <thead>
                            <tr>
                                <th>Hora</th>
                                <th>Factura N°</th>
                                <th>Mesa</th>
                                <th>Facturó</th>
                                <th>Total</th>
                                <th>Método(s) Pago</th>
                                <th>Recibido</th>
                                <th>Vuelto</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(f => `
                                <tr>
                                    <td>${f.fecha ? new Date(f.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '-'}</td>
                                    <td>${f.id_factura}</td>
                                    <td>${f.numero_mesa || '-'}</td>
                                    <td>${f.nombre_usuario || f.id_usuario || '-'}</td>
                                    <td>${formatoCOP(f.total)}</td>
                                    <td>${f.metodo_pago || '-'}</td>
                                    <td>${formatoCOP(f.total_recibido)}</td>
                                    <td>${formatoCOP(f.total_vuelto)}</td>
                                    <td><button class="btn-detalle-factura" data-id="${f.id_factura}">Ver</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            tablaFacturas.innerHTML = `<em>Error al cargar las facturas: ${err.message}</em>`;
        }
    }

    async function mostrarDetalleFactura(id_factura) {
        modalDetalle.innerHTML = '';
        modalDetalle.classList.remove('hidden');
        modalDetalle.style.display = 'flex';
        try {
            const res = await fetch(`/api/facturas/${id_factura}`);
            const data = await res.json();
            if (!data || !data.factura) throw new Error('No se encontró la factura');
            const f = data.factura;
            const productos = data.productos || [];
            const metodos = data.metodos_pago || [];
            modalDetalle.innerHTML = `
                <div class="factura-detalle-modal">
                    <h3>Detalle de Factura N° ${f.id_factura}</h3>
                    <p><b>Mesa:</b> ${f.numero_mesa || '-'}<br>
                    <b>Facturó:</b> ${f.nombre_usuario || f.id_usuario || '-'}<br>
                    <b>Fecha:</b> ${f.fecha ? new Date(f.fecha).toLocaleString('es-CO') : '-'}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cant.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productos.length ? productos.map(p => `
                                <tr>
                                    <td>${p.nombre_producto}</td>
                                    <td>${p.cantidad}</td>
                                    <td>${formatoCOP(p.subtotal)}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="3">No hay productos</td></tr>`}
                        </tbody>
                    </table>
                    <p><b>Método(s) de pago:</b> ${metodos.map(m => `${m.metodo_pago}: ${formatoCOP(m.valor)}`).join(', ') || f.metodo_pago || '-'}</p>
                    <p><b>Total recibido:</b> ${formatoCOP(f.total_recibido)}<br>
                    <b>Vuelto:</b> ${formatoCOP(f.total_vuelto)}</p>
                    <button id="cerrarDetalleFactura" style="margin-top:1.2rem;">Cerrar</button>
                </div>
            `;
        } catch (err) {
            modalDetalle.innerHTML = `<div class="factura-detalle-modal"><p>Error al cargar el detalle: ${err.message}</p><button id="cerrarDetalleFactura">Cerrar</button></div>`;
        }
        document.getElementById('cerrarDetalleFactura').onclick = () => {
            modalDetalle.classList.add('hidden');
            modalDetalle.style.display = 'none';
        };
    }

    tablaFacturas.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-detalle-factura')) {
            const id = e.target.getAttribute('data-id');
            mostrarDetalleFactura(id);
        }
    });

    btnFiltrar.addEventListener('click', () => {
        cargarFacturas(filtroFecha.value);
    });

    // Por defecto, carga facturas del día actual
    const hoy = new Date();
    filtroFecha.value = hoy.toISOString().slice(0, 10);
    cargarFacturas(filtroFecha.value);

    // Estructura HTML inicial
    contenedorPrincipal.innerHTML = `
        <div class="centrado-contenedor">
            <div class="selector-fecha">
                <input type="date" id="fecha-selector" />
            </div>
            <div class="tabla-scroll-x">
                <table class="tabla-facturas">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Factura N°</th>
                            <th>Mesa</th>
                            <th>Facturó</th>
                            <th>Total</th>
                            <th>Método(s) Pago</th>
                            <th>Recibido</th>
                            <th>Vuelto</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Las filas se llenarán con JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
});
