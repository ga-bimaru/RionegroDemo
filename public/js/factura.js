// Lógica para mostrar el modal de factura detallada

export function mostrarFacturaAlDetener(mesaId, totalTiempo, callback) {
    // Elimina cualquier modal de factura anterior
    const modalExistente = document.getElementById('modalFacturaDetener');
    if (modalExistente) {
        modalExistente.remove();
    }

    fetch(`/api/mesas/${mesaId}/detalle`)
        .then(async res => {
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                throw new Error('Respuesta inesperada del servidor: ' + text.substring(0, 200));
            }
            return res.json();
        })
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
            const pedidosAgrupados = Object.entries(agrupados)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([hora, productos], idx) => ({
                    hora,
                    productos,
                    numero: idx + 1
                }));

            const pedidasPagadas = pedidosAgrupados.filter(grupo =>
                grupo.productos.every(p => p.estado === 'Ya Pagada')
            );
            const pedidasPorPagar = pedidosAgrupados.filter(grupo =>
                grupo.productos.some(p => p.estado !== 'Ya Pagada')
            );

            // Tabla de pedidas ya pagadas
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
                pedidasPagadas.forEach((grupo) => {
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

            // Tabla de productos de pedidas por pagar
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

            // Modal HTML
            const modal = document.createElement('div');
            modal.id = 'modalFacturaDetener';
            modal.className = 'modal';
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
                <div class="modal-content">
                    <div class="factura-logo"></div>
                    <div class="factura-header">
                        <h2>Factura de Mesa</h2>
                        <div class="factura-info">Mesa: ${data.numero_mesa || ''} &nbsp; | &nbsp; Fecha: ${new Date().toLocaleDateString('es-CO')}</div>
                    </div>
                    ${htmlPagadas}
                    <div class="factura-subtotal">
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
                        <table class="factura-table">
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
                    </div>
                    <div class="factura-totales">
                        <span class="total-label">Total a pagar:</span>
                        <span class="total-value">$${totalFactura.toLocaleString('es-CO')}</span>
                    </div>
                    <div class="factura-btns">
                        <button class="cerrar">Cerrar</button>
                        <button class="confirmar">Confirmar y finalizar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }, 10);

            modal.querySelector('.cerrar').onclick = () => {
                modal.remove();
            };
            modal.querySelector('.confirmar').onclick = () => {
                modal.remove();
                if (typeof callback === 'function') callback();
            };
            modal.addEventListener('mousedown', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        })
        .catch(err => {
            if (window.showNotification) window.showNotification('Error al mostrar la factura');
        });
}
