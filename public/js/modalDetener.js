import { mostrarFacturaAlDetener } from './factura.js';

export async function mostrarModalDetener(mesaId, totalAPagar, onConfirm) {
    // Elimina cualquier modal anterior
    let modal = document.getElementById('modalDetenerAlquiler');
    if (modal) modal.remove();

    // Obtiene detalles de la mesa y sus pedidas
    let data;
    try {
        const res = await fetch(`/api/mesas/${mesaId}/detalle`);
        if (!res.ok) throw new Error('Error al obtener detalles de la mesa');
        data = await res.json();
    } catch (err) {
        alert('Error al cargar detalles de la mesa');
        return;
    }

    // Procesa hora de inicio y tiempo jugado
    let horaInicioDate = null;
    let horaInicioFormateada = '-';
    if (data.hora_inicio) {
        let str = data.hora_inicio.replace(' ', 'T');
        let fechaObj = new Date(str);
        if (!isNaN(fechaObj.getTime())) {
            horaInicioDate = fechaObj;
            horaInicioFormateada = fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }
    }
    let tiempoJugado = '00:00:00';
    let valorTiempo = 0;
    if (horaInicioDate && data.estado === 'Ocupada') {
        const ahora = new Date();
        let segundos = Math.floor((ahora - horaInicioDate) / 1000);
        if (segundos < 0) segundos = 0;
        const horas = Math.floor(segundos / 3600).toString().padStart(2, '0');
        const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
        const segs = (segundos % 60).toString().padStart(2, '0');
        tiempoJugado = `${horas}:${minutos}:${segs}`;
        valorTiempo = Math.round((segundos / 3600) * (parseFloat(data.precio_hora) || 6000));
    }

    // Agrupa pedidas por hora_pedido
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

    // Separa pedidas pagadas y por pagar
    const pedidasPagadas = pedidosAgrupados.filter(grupo =>
        grupo.productos.every(p => p.estado === 'Ya Pagada')
    );
    const pedidasPorPagar = pedidosAgrupados.filter(grupo =>
        grupo.productos.some(p => p.estado !== 'Ya Pagada')
    );

    // Calcula totales
    const totalPedidasPagadas = pedidasPagadas.reduce((acc, grupo) =>
        acc + grupo.productos.reduce((a, p) => a + parseFloat(p.subtotal), 0), 0);
    const totalPedidasPorPagar = pedidasPorPagar.reduce((acc, grupo) =>
        acc + grupo.productos.reduce((a, p) => a + parseFloat(p.subtotal), 0), 0);
    const totalFactura = valorTiempo + totalPedidasPorPagar;

    // Métodos de pago visuales
    const metodos = [
        { nombre: 'Efectivo', valor: 'Efectivo', img: 'images/efectivo.png' },
        { nombre: 'QR', valor: 'QR', img: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Qr-2.png' },
        { nombre: 'Nequi', valor: 'Nequi', img: 'images/nequi.png' }
    ];

    // Modal HTML: diseño grande pero compacto, sin necesidad de scroll horizontal ni vertical en la mayoría de pantallas
    modal = document.createElement('div');
    modal.id = 'modalDetenerAlquiler';
    modal.className = 'modal';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(20,24,38,0.98)';
    modal.style.zIndex = '5000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    modal.innerHTML = `
        <style>
            .facturacion-modal-grid {
                max-width: 600px;
                width: 98vw;
                border-radius: 1.5rem;
                background: linear-gradient(180deg,#00cfff 0%,#232946 100%);
                box-shadow: 0 8px 32px #00cfff44;
                position: relative;
                padding: 2.2rem 0.7rem 1.5rem 0.7rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: modalSlideUp 0.4s;
                overflow: hidden;
            }
            .facturacion-modal-grid h2 {
                color: #fff;
                font-size: 2rem;
                font-family: 'Orbitron', Arial, sans-serif;
                font-weight: 900;
                letter-spacing: 2px;
                margin-bottom: 1.5rem;
                text-align: center;
                width: 100%;
                text-shadow: 0 2px 12px #00cfff33;
            }
            .facturacion-grid-layout {
                display: flex;
                flex-direction: row;
                width: 100%;
                gap: 1.1rem;
                margin-bottom: 1.7rem;
                overflow: hidden;
            }
            .facturacion-card-horizontal,
            .facturacion-card-vertical {
                background: #fff;
                border-radius: 1.1rem;
                box-shadow: 0 2px 8px #00cfff22;
                padding: 1.2rem 1.2rem;
                border: 2px solid #00cfff;
                min-width: 0;
                min-height: 110px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                flex: 1 1 0;
                box-sizing: border-box;
                overflow: hidden;
            }
            .facturacion-card-horizontal {
                margin-bottom: 0;
                margin-right: 0.7rem;
                align-items: center;
                justify-content: center;
                text-align: center;
            }
            .facturacion-card-vertical {
                margin-bottom: 0;
                margin-left: 0.7rem;
                align-items: center;
                justify-content: center;
                text-align: center;
            }
            .facturacion-card-horizontal .info-block {
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
                min-width: 120px;
                align-items: center;
                justify-content: center;
            }
            .facturacion-card-horizontal .info-label,
            .facturacion-card-vertical .info-label {
                font-size: 1.05rem;
                font-weight: 700;
                color: #232946;
                margin-bottom: 0.05rem;
                text-align: center;
            }
            .facturacion-card-horizontal .info-value,
            .facturacion-card-vertical .valor {
                font-size: 1.13rem;
                font-weight: 700;
                color: #232946;
                margin-bottom: 0.2rem;
                text-align: center;
            }
            .facturacion-card-horizontal .info-value.paid { color: #43e97b; }
            .facturacion-card-horizontal .info-value.unpaid { color: #e74c3c; }
            .facturacion-card-horizontal .info-value.time { color: #007bff; }
            .facturacion-card-horizontal .info-value[style*="color:#43e97b"] { color: #43e97b !important; }
            .facturacion-card-horizontal .info-value[style*="color:#e74c3c"] { color: #e74c3c !important; }
            .facturacion-card-horizontal .info-value[style*="color:#007bff"] { color: #007bff !important; }
            .facturacion-card-horizontal .info-value[style*="color:#00cfff"] { color: #00cfff !important; }
            .facturacion-card-vertical .info-label {
                /* ...existing code... */
                display: block;
                width: 100%;
                text-align: center;
            }
            /* --- NUEVO: Asegura mismo tamaño y alineación para total y vuelto --- */
            .facturacion-card-vertical .valor,
            .facturacion-card-vertical .valor.vuelto {
                display: block;
                width: 100%;
                min-width: 0;
                text-align: center;
                font-size: 2rem;
                font-weight: 900;
                margin-bottom: 0.3rem;
                box-sizing: border-box;
                /* Para asegurar mismo tamaño visual */
                padding: 0.2rem 0;
                letter-spacing: 1px;
            }
            .facturacion-card-vertical .valor.vuelto {
                color: #43e97b;
                font-size: 2rem;
                margin-bottom: 0.3rem;
            }
            /* --- Opcional: igualar altura del bloque vertical --- */
            .facturacion-card-vertical {
                min-height: 180px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .facturacion-metodos {
                background: #fff;
                border-radius: 1.1rem;
                box-shadow: 0 2px 8px #00cfff22;
                padding: 1.2rem 1.2rem 1.5rem 1.2rem;
                margin: 0 auto 1.2rem auto;
                max-width: 600px;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.1rem;
                border: 2px solid #00cfff22;
                box-sizing: border-box;
            }
            .facturacion-metodos .metodos-pago {
                display: flex;
                gap: 1.1rem;
                flex-wrap: wrap;
                justify-content: center;
                margin-bottom: 1rem;
            }
            .facturacion-metodos .metodo-pago-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: #fff;
                border: 2px solid #e0e7ef;
                border-radius: 1rem;
                box-shadow: 0 2px 8px #00cfff22;
                cursor: pointer;
                transition: box-shadow 0.2s, border 0.2s;
                padding: 0.7rem 1.1rem;
                min-width: 90px;
                max-width: 120px;
                position: relative;
            }
            .facturacion-metodos .metodo-pago-card.selected {
                border: 2px solid #00cfff;
                box-shadow: 0 4px 16px #00cfff33;
            }
            .facturacion-metodos .metodo-pago-card img {
                width: 32px;
                height: 32px;
                border-radius: 0.7rem;
                border: 1.5px solid #e0e7ef;
                background: #f5f7fa;
                margin-bottom: 0.5rem;
            }
            .facturacion-metodos .metodo-pago-card .metodo-pago-check {
                display: none;
                position: absolute;
                top: 7px;
                right: 7px;
                font-size: 1.1rem;
                color: #43e97b;
            }
            .facturacion-metodos .metodo-pago-card.selected .metodo-pago-check {
                display: block;
            }
            .facturacion-metodos .confirmar-btn {
                background: linear-gradient(90deg,#43e97b 0%,#38f9d7 100%);
                color: #111;
                font-weight: 900;
                border: none;
                border-radius: 1rem;
                padding: 1rem 2.2rem;
                font-size: 1.13rem;
                cursor: pointer;
                box-shadow: 0 2px 8px #43e97b33;
                margin-top: 1.1rem;
                transition: background 0.2s;
            }
            .facturacion-metodos .confirmar-btn:hover {
                background: linear-gradient(90deg,#38f9d7 0%,#43e97b 100%);
            }
            .facturacion-modal-compacta .close-btn,
            .facturacion-modal-grid .close-btn {
                position:absolute;
                top:12px;
                right:18px;
                font-size:2rem;
                color:#e74c3c;
                background:none;
                border:none;
                cursor:pointer;
                transition:color 0.2s;
                z-index:2;
            }
            @media (max-width: 700px) {
                .facturacion-modal-grid {
                    max-width: 99vw;
                    min-width: 0;
                    padding: 0.5rem 0.1rem !important;
                }
                .facturacion-grid-layout {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .facturacion-card-horizontal,
                .facturacion-card-vertical {
                    padding: 0.7rem 0.3rem;
                    margin: 0 0 0.7rem 0;
                }
                .facturacion-card-horizontal {
                    margin-right: 0;
                }
                .facturacion-card-vertical {
                    margin-left: 0;
                }
                .facturacion-metodos {
                    max-width: 99vw;
                }
            }
            @keyframes modalSlideUp { from { transform:translateY(60px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        </style>
        <div class="facturacion-modal-grid">
            <button class="close-btn" id="closeDetenerAlquilerModal">&times;</button>
            <h2>Facturación de Mesa ${data.numero_mesa}</h2>
            <div class="facturacion-grid-layout">
                <div class="facturacion-card-horizontal">
                    <div class="info-block">
                        <span class="info-label">Hora de inicio</span>
                        <span class="info-value">${horaInicioFormateada}</span>
                        <span class="info-label">Tiempo jugado</span>
                        <span class="info-value">${tiempoJugado}</span>
                    </div>
                    <div class="info-block">
                        <span class="info-label" style="color:#43e97b;">Pedidas ya pagadas</span>
                        <span class="info-value paid">$${totalPedidasPagadas.toLocaleString('es-CO')}</span>
                        <span class="info-label" style="color:#e74c3c;">Pedidas por pagar</span>
                        <span class="info-value unpaid">$${totalPedidasPorPagar.toLocaleString('es-CO')}</span>
                        <span class="info-label" style="color:#007bff;">Valor tiempo jugado</span>
                        <span class="info-value time">$${valorTiempo.toLocaleString('es-CO')}</span>
                    </div>
                </div>
                <div class="facturacion-card-vertical">
                    <span class="info-label" style="color:#00cfff;">Total a pagar</span>
                    <span class="valor" style="color:#00cfff;">${totalFactura.toLocaleString('es-CO')}</span>
                    <span class="info-label" style="color:#43e97b;">Vuelto total</span>
                    <span class="valor vuelto" id="vueltoDetenerVisual">0 $</span>
                </div>
            </div>
            <div class="facturacion-metodos">
                <div style="width:100%;">
                    <strong style="color:#232946;display:block;margin-bottom:0.8rem;font-size:1.08rem;text-align:center;">Métodos de pago:</strong>
                    <div class="metodos-pago" id="metodosPagoContainer">
                        ${metodos.map(m => `
                            <label class="metodo-pago-card">
                                <input type="checkbox" class="metodo-pago-checkbox" value="${m.valor}" style="display:none;">
                                <img src="${m.img}" alt="${m.nombre}">
                                <span style="font-weight:700;color:#232946;font-size:1.01rem;">${m.nombre}</span>
                                <span class="metodo-pago-check">✔️</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="inputs-recibido" id="inputsRecibidoContainer"></div>
                <button class="confirmar-btn" id="confirmarMetodosPagoBtn">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // --- Lógica métodos de pago y vuelto con inputs ---
    const metodosPagoContainer = modal.querySelector('#metodosPagoContainer');
    const inputsRecibidoContainer = modal.querySelector('#inputsRecibidoContainer');
    const vueltoVisual = modal.querySelector('#vueltoDetenerVisual');
    let recibidosValores = {};

    function formatCOPInput(val) {
        val = (val + '').replace(/[^\d]/g, '');
        if (!val) return '';
        let num = parseInt(val, 10);
        if (isNaN(num)) return '';
        return num.toLocaleString('es-CO');
    }

    function renderInputsRecibido() {
        // Guarda los valores actuales antes de renderizar (en bruto, sin formato)
        inputsRecibidoContainer.querySelectorAll('.input-recibido-metodo').forEach(input => {
            const metodo = input.getAttribute('data-metodo');
            let raw = (input.value || '').replace(/[^\d]/g, '');
            recibidosValores[metodo] = raw;
        });

        const checkboxes = Array.from(metodosPagoContainer.querySelectorAll('.metodo-pago-checkbox'));
        let seleccionados = checkboxes.filter(cb => cb.checked).map(cb => cb.value);

        // --- AUTOCOMPLETAR el input con el total a pagar si es la PRIMERA selección ---
        if (seleccionados.length === 1 && Object.keys(recibidosValores).length === 0) {
            recibidosValores[seleccionados[0]] = String(totalFactura);
        }

        // Permitir máximo dos métodos de pago
        if (seleccionados.length >= 2) {
            checkboxes.forEach(cb => {
                if (!cb.checked) cb.disabled = true;
            });
        } else {
            checkboxes.forEach(cb => cb.disabled = false);
        }

        // --- CORREGIDO: NO deshabilites los otros métodos si el input cubre el total, solo si hay un método seleccionado y el input cubre el total Y no hay intención de agregar otro ---
        // El usuario puede cambiar el valor del input a menos del total y luego seleccionar otro método
        // Por eso, solo deshabilita si hay un método seleccionado y el input cubre el total Y no hay intención de agregar otro
        // (No bloquees la selección de un segundo método si el input es menor al total)

        // Si se selecciona un segundo método, autocompletar el input con el faltante
        if (seleccionados.length === 2) {
            let nuevos = seleccionados.filter(m => !(m in recibidosValores));
            let yaExistente = seleccionados.find(m => m in recibidosValores);
            let totalRecibido = 0;
            if (yaExistente) {
                let raw = recibidosValores[yaExistente] || '';
                totalRecibido = parseInt(raw.replace(/[^\d]/g, '') || '0', 10);
            }
            let faltante = totalFactura - totalRecibido;
            if (faltante < 0) faltante = 0;
            if (nuevos.length === 1) {
                recibidosValores[nuevos[0]] = faltante > 0 ? String(faltante) : '';
            }
        }

        Object.keys(recibidosValores).forEach(metodo => {
            if (!seleccionados.includes(metodo)) {
                delete recibidosValores[metodo];
            }
        });

        // Renderiza los inputs
        let html = '';
        seleccionados.forEach((metodo, idx) => {
            let img = metodos.find(m => m.valor === metodo)?.img || '';
            let raw = recibidosValores[metodo] || '';
            let valor = raw ? formatCOPInput(raw) + ' $' : '';
            html += `
<div style="display:flex;align-items:center;gap:1.2rem;margin-bottom:1.1rem;flex-wrap:wrap;justify-content:center;max-width:100%;">
    <img src="${img}" alt="${metodo}" style="width:44px;height:44px;border-radius:0.8rem;border:2px solid #e0e7ef;background:#fff;flex-shrink:0;">
    <label style="font-weight:800;color:#232946;min-width:110px;font-size:1.13rem;flex-shrink:0;">${metodo} recibido:</label>
    <input type="text" class="input-recibido-metodo" data-metodo="${metodo}" 
        style="width:130px;max-width:100%;padding:0.7rem 1rem;border-radius:0.9rem;font-size:1.13rem;font-weight:700;border:2px solid #00cfff;background:#fff;box-sizing:border-box;flex:1 1 80px;min-width:60px;" value="${valor}">
</div>
`;
        });
        inputsRecibidoContainer.innerHTML = html;

        actualizarVuelto();
        // Evento para recalcular vuelto al cambiar recibido y formatear
        inputsRecibidoContainer.querySelectorAll('.input-recibido-metodo').forEach(input => {
            input.addEventListener('input', function() {
                let metodo = input.getAttribute('data-metodo');
                let raw = (input.value || '').replace(/[^\d]/g, '');
                recibidosValores[metodo] = raw;
                actualizarVuelto();
            });
            input.addEventListener('blur', function() {
                let metodo = input.getAttribute('data-metodo');
                let raw = (input.value || '').replace(/[^\d]/g, '');
                input.value = raw ? formatCOPInput(raw) + ' $' : '';
                recibidosValores[metodo] = raw;
                actualizarVuelto();
            });
            input.addEventListener('focus', function() {
                setTimeout(() => input.select(), 10);
            });
            input.addEventListener('paste', function(e) {
                e.preventDefault();
                let pasted = (e.clipboardData || window.clipboardData).getData('text');
                pasted = pasted.replace(/[^\d]/g, '');
                if (pasted) {
                    input.value = pasted;
                    recibidosValores[input.getAttribute('data-metodo')] = pasted;
                    actualizarVuelto();
                }
            });
        });
    }

    function actualizarVuelto() {
        const inputs = inputsRecibidoContainer.querySelectorAll('.input-recibido-metodo');
        let totalRecibido = 0;
        inputs.forEach(input => {
            let raw = (input.value || '').replace(/[^\d]/g, '');
            totalRecibido += parseInt(raw || '0', 10);
        });
        const vuelto = totalRecibido - totalFactura;
        if (vueltoVisual) {
            vueltoVisual.textContent = vuelto > 0 ? formatCOPInput(vuelto) + ' $' : '0 $';
        }
    }

    // --- NUEVO: Mostrar mensaje tipo snackbar si intenta seleccionar otro método cuando ya está cubierto ---
    function showMetodoPagoSnackbar(msg) {
        let notif = document.getElementById('snackbarMetodoPago');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'snackbarMetodoPago';
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

    // --- NUEVO: Snackbar visual para errores de métodos de pago (igual a la imagen adjunta) ---
    function showMetodoPagoErrorSnackbar(msg) {
        let notif = document.getElementById('snackbarMetodoPagoError');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'snackbarMetodoPagoError';
            notif.style.position = 'fixed';
            notif.style.top = '40px';
            notif.style.left = '50%';
            notif.style.transform = 'translateX(-50%)';
            notif.style.background = 'linear-gradient(90deg,#00cfff 0%,#38aaff 100%)';
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

    metodosPagoContainer.querySelectorAll('.metodo-pago-checkbox').forEach(cb => {
        cb.addEventListener('change', function(e) {
            // Visual feedback
            metodosPagoContainer.querySelectorAll('.metodo-pago-card').forEach(card => card.classList.remove('selected'));
            Array.from(metodosPagoContainer.querySelectorAll('.metodo-pago-checkbox:checked')).forEach(sel => sel.closest('.metodo-pago-card').classList.add('selected'));

            // Permitir máximo dos métodos de pago
            const checkboxes = Array.from(metodosPagoContainer.querySelectorAll('.metodo-pago-checkbox'));
            let seleccionados = checkboxes.filter(cb => cb.checked).map(cb => cb.value);

            // Si ya hay dos seleccionados y se intenta seleccionar otro, no permitir
            if (seleccionados.length > 2) {
                cb.checked = false;
                cb.closest('.metodo-pago-card').classList.remove('selected');
                // --- CORRECCIÓN: Forzar el render antes de mostrar el mensaje para asegurar que el DOM esté actualizado ---
                renderInputsRecibido();
                // --- Mostrar el mensaje tipo snackbar después del render ---
                showMetodoPagoErrorSnackbar('Solo se puede tener dos métodos de pago como máximo.');
                return;
            }

            // Si hay un método seleccionado y su input cubre el total, no permitir seleccionar otro
            if (seleccionados.length === 2) {
                let primero = seleccionados[0];
                let raw = recibidosValores[primero] || '';
                let valor = parseInt(raw || '0', 10);
                if (valor >= totalFactura) {
                    cb.checked = false;
                    cb.closest('.metodo-pago-card').classList.remove('selected');
                    showMetodoPagoSnackbar('Ya el total está cubierto, no se necesita otro medio de pago.');
                    renderInputsRecibido();
                    return;
                }
            }
            renderInputsRecibido();
        });
    });

    renderInputsRecibido();

    // Cerrar modal
    document.getElementById('closeDetenerAlquilerModal').onclick = function() {
        modal.remove();
    };

    // Confirmar acción
    document.getElementById('confirmarMetodosPagoBtn').onclick = async () => {
        // Obtiene métodos de pago seleccionados y sus recibidos
        const metodosSeleccionados = Array.from(metodosPagoContainer.querySelectorAll('.metodo-pago-checkbox:checked')).map(cb => cb.value);
        if (!metodosSeleccionados.length) {
            // Mostrar snackbar flotante dentro del modal
            let snackbar = modal.querySelector('.snackbar-modal');
            if (!snackbar) {
                snackbar = document.createElement('div');
                snackbar.className = 'snackbar-modal';
                snackbar.style.position = 'absolute';
                snackbar.style.left = '50%';
                snackbar.style.bottom = '32px';
                snackbar.style.transform = 'translateX(-50%)';
                snackbar.style.background = '#e74c3c';
                snackbar.style.color = '#fff';
                snackbar.style.padding = '0.8rem 1.8rem';
                snackbar.style.borderRadius = '1rem';
                snackbar.style.fontWeight = 'bold';
                snackbar.style.fontSize = '1.05rem';
                snackbar.style.boxShadow = '0 2px 12px #0003';
                snackbar.style.zIndex = 10001;
                snackbar.style.opacity = '0';
                snackbar.style.transition = 'opacity 0.3s, bottom 0.3s';
                modal.appendChild(snackbar);
            }
            snackbar.textContent = 'Selecciona al menos un método de pago.';
            snackbar.style.opacity = '1';
            snackbar.style.bottom = '48px';
            setTimeout(() => {
                snackbar.style.opacity = '0';
                snackbar.style.bottom = '32px';
            }, 3000);
            return;
        }
        const recibidos = {};
        let totalRecibido = 0;
        let algunVacio = false;
        inputsRecibidoContainer.querySelectorAll('.input-recibido-metodo').forEach(input => {
            const metodo = input.getAttribute('data-metodo');
            const valor = parseFloat((input.value || '').replace(/[^\d]/g, '')) || 0;
            recibidos[metodo] = valor;
            totalRecibido += valor;
            if (!input.value || valor <= 0) algunVacio = true;
        });
        if (algunVacio) {
            showMetodoPagoErrorSnackbar('Debes ingresar un valor recibido válido para cada método de pago seleccionado.');
            return;
        }
        if (totalRecibido < totalFactura) {
            showMetodoPagoErrorSnackbar('El total recibido no puede ser menor al total a pagar.');
            return;
        }
        const metodo_pago = metodosSeleccionados.join(', ');
        const total_vuelto = totalRecibido - totalFactura;
        const id_usuario_cierre = window.usuarioActual?.id_usuario || 1; // Ajusta según tu lógica
        if (typeof onConfirm === 'function') {
            await onConfirm({ metodo_pago, total_recibido: totalRecibido, total_vuelto, id_usuario_cierre, recibidos });
        }
        // --- NUEVO: Mostrar mensaje tipo snackbar visual al finalizar correctamente ---
        mostrarSnackbarFacturaExito('Alquiler finalizado correctamente.');
        setTimeout(() => {
            modal.remove();
            // Opcional: recargar la página si lo deseas
            location.reload();
        }, 1200);
    };

    // --- NUEVO: Snackbar visual tipo la imagen adjunta ---
    function mostrarSnackbarFacturaExito(msg) {
        let notif = document.getElementById('snackbarFacturaExito');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'snackbarFacturaExito';
            notif.style.position = 'fixed';
            notif.style.top = '40px';
            notif.style.left = '50%';
            notif.style.transform = 'translateX(-50%)';
            notif.style.background = 'linear-gradient(90deg,#00cfff 0%,#38aaff 100%)';
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
}
