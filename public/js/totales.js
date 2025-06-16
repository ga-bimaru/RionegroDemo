// Este archivo contiene la lógica para mostrar los totales de pedidas de una mesa.

export async function mostrarTotalesMesa(mesaId) {
    // Elimina cualquier modal anterior
    let modal = document.getElementById('modalTotalesMesa');
    if (modal) modal.remove();

    // Crea el modal grande
    modal = document.createElement('div');
    modal.id = 'modalTotalesMesa';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(30,30,40,0.97)';
    modal.style.zIndex = '5000';

    // Obtiene los datos de la mesa y sus pedidas
    let data;
    try {
        const res = await fetch(`/api/mesas/${mesaId}/detalle`);
        if (!res.ok) throw new Error('Error al obtener detalles de la mesa');
        data = await res.json();
    } catch (err) {
        modal.innerHTML = `<div class="modal-content" style="max-width:900px;"><span class="close-btn" id="closeTotalesMesaModal">&times;</span><p style="color:red;">Error al cargar detalles: ${err.message}</p></div>`;
        document.body.appendChild(modal);
        document.getElementById('closeTotalesMesaModal').onclick = () => { modal.remove(); };
        return;
    }

    // Agrupa pedidas por hora_pedido (redondeando a minutos)
    let pedidosAgrupados = [];
    if (Array.isArray(data.pedidos) && data.pedidos.length > 0) {
        const agrupados = {};
        data.pedidos.forEach(p => {
            let key = '';
            if (p.hora_pedido) {
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

    // Modal HTML solo para mostrar pedidas y cambiar estado
    modal.innerHTML = `
        <div class="modal-content" style="max-width:1100px;min-width:320px;border-radius:1.5rem;background:linear-gradient(120deg,#232946 0%,#00cfff 100%);box-shadow:0 8px 32px rgba(0,207,255,0.18);position:relative;padding:2.5rem 2rem 2rem 2rem;">
            <button class="close-btn" id="closeTotalesMesaModal" style="position:absolute;top:18px;right:24px;font-size:2rem;color:#e74c3c;background:none;border:none;cursor:pointer;transition:color 0.2s;">&times;</button>
            <h2 style="color:#fff;font-size:2.2rem;font-family:'Orbitron',Arial,sans-serif;font-weight:900;letter-spacing:2px;margin-bottom:1.5rem;text-align:center;">Totales de Pedidas de Mesa ${data.numero_mesa}</h2>
            <div style="overflow-x:auto;width:100%;border:2px solid #00cfff;border-radius:1rem;">
                <table style="width:100%;min-width:650px;background:#fff;border-radius:1rem;box-shadow:0 2px 12px #00cfff22;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">N°</th>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">Hora</th>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">Productos</th>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">Cant.</th>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">Subtotal</th>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">Estado</th>
                            <th style="border:1.5px solid #00cfff;background:#fff;color:#232946;font-weight:600;font-size:1rem;padding:0.8rem 1.1rem;text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pedidosAgrupados.length === 0 ? `
                            <tr><td colspan="7" style="text-align:center;color:#888;border:1.5px solid #00cfff;">No hay pedidas registradas para esta mesa.</td></tr>
                        ` : pedidosAgrupados.map((grupo, idxGrupo) => {
                            let horaLegible = '-';
                            if (grupo.hora) {
                                const horaBD = grupo.productos[0]?.hora_pedido;
                                let fechaObj;
                                if (horaBD) {
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
                            const keyPedida = grupo.hora;
                            const esPagada = grupo.productos.every(p => p.estado === 'Ya Pagada');
                            let filas = '';
                            grupo.productos.forEach((p, idx) => {
                                filas += `
                                    <tr>
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;border:1.5px solid #00cfff;">${idxGrupo + 1}</td>` : ''}
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;border:1.5px solid #00cfff;">${horaLegible}</td>` : ''}
                                        <td style="border:1.5px solid #00cfff;">${p.nombre_producto}</td>
                                        <td style="border:1.5px solid #00cfff;">${p.cantidad}</td>
                                        <td style="border:1.5px solid #00cfff;">$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;border:1.5px solid #00cfff;">
                                            <span class="estado-pedida" data-key="${keyPedida}" style="font-weight:bold;color:${esPagada ? '#43e97b' : '#e74c3c'};">
                                                ${esPagada ? 'Ya Pagada' : 'Por Pagar'}
                                            </span>
                                        </td>` : ''}
                                        ${idx === 0 ? `<td rowspan="${grupo.productos.length}" style="vertical-align:middle;text-align:center;border:1.5px solid #00cfff;">
                                            <button class="toggle-pay" data-mesa="${mesaId}" data-key="${keyPedida}" style="background:${esPagada ? '#e0e7ef' : '#43e97b'};color:${esPagada ? '#232946' : '#fff'};border:none;border-radius:0.7rem;padding:0.5rem 1.2rem;font-size:1rem;font-weight:600;cursor:pointer;">
                                                ${esPagada ? 'Marcar Por Pagar' : 'Marcar Pagada'}
                                            </button>
                                        </td>` : ''}
                                    </tr>
                                `;
                            });
                            // Fila de total de la pedida (sin rowspan)
                            filas += `
                                <tr>
                                    <td colspan="7" style="text-align:center;font-weight:bold;border:1.5px solid #00cfff;background:#f5f7fa;">
                                        Total de la pedida N° ${idxGrupo + 1}: $${totalPedida.toLocaleString('es-CO')}
                                    </td>
                                </tr>
                            `;
                            return filas;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cerrar modal
    document.getElementById('closeTotalesMesaModal').onclick = () => { modal.remove(); };

    // Acción de cambiar estado de pedida
    modal.querySelectorAll('.toggle-pay').forEach(btn => {
        btn.onclick = async function () {
            const keyPedida = btn.getAttribute('data-key');
            // Busca el grupo correspondiente
            const grupo = pedidosAgrupados.find(g => g.hora === keyPedida);
            if (!grupo) return;
            const esPagada = grupo.productos.every(p => p.estado === 'Ya Pagada');
            // Cambia el estado de todos los productos de la pedida en la base de datos
            try {
                const res = await fetch('/api/pedidas/cambiar-estado-productos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_mesa: mesaId,
                        key_pedida: keyPedida,
                        estado: esPagada ? 'Por Pagar' : 'Ya Pagada'
                    })
                });
                const contentType = res.headers.get('content-type');
                let data = {};
                if (contentType && contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    throw new Error('Respuesta inesperada del servidor: ' + text.substring(0, 200));
                }
                if (!res.ok || !data.success) {
                    alert(data.message || 'Error al cambiar el estado en la base de datos');
                    return;
                }
            } catch (err) {
                alert('Error al cambiar el estado en la base de datos: ' + (err.message || err));
                return;
            }
            // Recargar el modal para reflejar el cambio real desde la BD
            modal.remove();
            mostrarTotalesMesa(mesaId);
        };
    });
}
