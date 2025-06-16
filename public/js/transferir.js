// Este archivo contiene la lógica para transferir tiempo y pedidos entre mesas.

// Notificación visual tipo snackbar para éxito (estilo igual a la imagen)
function showTransferirNotification(msg) {
    let notif = document.getElementById('snackbarTransferirExito');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'snackbarTransferirExito';
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
        notif.style.justifyContent = 'center'; // <-- Centrado horizontal
        notif.style.textAlign = 'center';      // <-- Centrado texto
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
        notif.style.justifyContent = 'center'; // <-- Centrado horizontal
        notif.style.textAlign = 'center';      // <-- Centrado texto
    }
    setTimeout(() => {
        notif.style.display = 'none';
    }, 2200);
}

export function abrirTransferirModal(mesaIdActual, mesas) {
    // Filtra solo las mesas disponibles (no la actual)
    const mesasDisponibles = mesas.filter(m => m.estado === 'Disponible' && m.id_mesa !== mesaIdActual);

    // Si no hay mesas disponibles, muestra mensaje visual tipo snackbar elegante
    if (!mesasDisponibles.length) {
        let notif = document.getElementById('snackbarTransferirNoMesas');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'snackbarTransferirNoMesas';
            notif.style.position = 'fixed';
            notif.style.top = '40px';
            notif.style.left = '50%';
            notif.style.transform = 'translateX(-50%)';
            notif.style.background = 'linear-gradient(90deg,#FF0000FF 0%,#FF0000FF 100%)';
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
            notif.innerHTML = `
                <span style="font-size:1.7rem;display:flex;align-items:center;justify-content:center;margin-right:1rem;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="12" fill="none"/>
                        <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/>
                        <path d="M8 12.5l2.5 2.5L16 9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
                <span>No hay mesas disponibles para transferir.</span>
            `;
            document.body.appendChild(notif);
        } else {
            notif.style.display = 'flex';
        }
        setTimeout(() => {
            notif.style.display = 'none';
        }, 2200);
        return;
    }

    // Si ya existe el modal, elimínalo
    let modal = document.getElementById('modalTransferirMesa');
    if (modal) modal.remove();

    // MODAL con estilos mejorados y estructura limpia
    modal = document.createElement('div');
    modal.id = 'modalTransferirMesa';
    modal.className = 'modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(30,30,40,0.97)';
    modal.style.zIndex = '4000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    modal.innerHTML = `
        <div class="modal-content" style="
            max-width:420px;
            min-width:320px;
            border-radius:1.2rem;
            background:linear-gradient(120deg,#00cfff 0%,#007bff 100%);
            box-shadow:0 8px 32px rgba(0,207,255,0.18);
            position:relative;
            padding:2.2rem 1.2rem 2rem 1.2rem;
            border:2.5px solid #fff;
            display:flex;
            flex-direction:column;
            align-items:center;
        ">
            <button class="close-btn" id="closeTransferirModalBtn" style="
                position:absolute;
                top:14px;
                right:18px;
                font-size:1.3rem;
                color:#e74c3c;
                background:none;
                border:none;
                cursor:pointer;
                font-weight:bold;
                z-index:2;
            ">&times;</button>
            <div style="display:flex;align-items:center;justify-content:center;width:100%;margin-bottom:1.2rem;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;background:linear-gradient(135deg,#fff 40%,#00cfff 100%);border-radius:50%;box-shadow:0 2px 12px rgba(0,207,255,0.18);">
                    <!-- Nuevo icono de transferencia mejorado -->
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                        <circle cx="19" cy="19" r="18" fill="#fff" stroke="#00cfff" stroke-width="2"/>
                        <g>
                            <path d="M11 19h16" stroke="#00cfff" stroke-width="2.5" stroke-linecap="round"/>
                            <path d="M23 14l4 5-4 5" stroke="#232946" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M15 24l-4-5 4-5" stroke="#232946" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </g>
                    </svg>
                </span>
            </div>
            <!-- Eliminado el texto de instrucción aquí -->
            <div style="width:100%;margin-bottom:1.2rem;">
                <label for="selectMesaDestino" style="font-weight:700;color:#fff;display:block;text-align:center;font-size:1.13rem;margin-bottom:0.5rem;">Selecciona la mesa destino:</label>
                <select id="selectMesaDestino" style="width:100%;margin:0 auto;padding:0.7rem 1.2rem;border-radius:0.7rem;font-size:1.13rem;display:block;border:none;box-shadow:0 2px 8px #00cfff22;text-align:center;text-align-last:center;">
                    <option value="">-- Selecciona una mesa --</option>
                    ${mesasDisponibles.map(m => `<option value="${m.id_mesa}">Mesa ${m.numero_mesa}</option>`).join('')}
                </select>
            </div>
            <div style="display:flex;gap:1.2rem;justify-content:center;width:100%;margin-top:0.7rem;">
                <button id="confirmTransferirBtn" style="background:#43e97b;color:#111;font-weight:700;border:none;border-radius:0.7rem;padding:0.7rem 2.2rem;font-size:1.13rem;cursor:pointer;box-shadow:0 2px 8px #43e97b33;">Transferir</button>
                <button id="cancelTransferirBtn" style="background:#e74c3c;color:#fff;font-weight:600;border:none;border-radius:0.7rem;padding:0.7rem 2.2rem;font-size:1.13rem;cursor:pointer;">Cancelar</button>
            </div>
            <div id="transferirErrorMsg" style="color:#e74c3c;margin-top:1.2rem;font-size:1.08rem;display:none;text-align:center;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Cerrar modal
    document.getElementById('closeTransferirModalBtn').onclick =
    document.getElementById('cancelTransferirBtn').onclick = function() {
        modal.remove();
    };

    // Confirmar transferencia
    document.getElementById('confirmTransferirBtn').onclick = async function() {
        const select = document.getElementById('selectMesaDestino');
        const id_mesa_destino = select.value;
        const errorMsg = document.getElementById('transferirErrorMsg');
        errorMsg.style.display = 'none';
        if (!id_mesa_destino) {
            errorMsg.textContent = 'Selecciona una mesa destino.';
            errorMsg.style.display = 'block';
            return;
        }
        try {
            const res = await fetch('/api/alquileres/transferir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_mesa_origen: mesaIdActual,
                    id_mesa_destino: id_mesa_destino
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
            if (res.ok && data.success) {
                showTransferirNotification('Tiempo y pedidos transferidos correctamente.');
                modal.remove();
                setTimeout(() => window.location.reload(), 1200);
            } else {
                errorMsg.textContent = data.message || 'Error al transferir.';
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.textContent = 'Error al transferir: ' + (err.message || err);
            errorMsg.style.display = 'block';
        }
    };
}
