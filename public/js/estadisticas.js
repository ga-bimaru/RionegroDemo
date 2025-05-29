// Simulación de datos de ventas y costos para el negocio de mesas de pool

// Utilidad para formatear moneda COP
function formatoCOP(valor) {
    return '$' + (valor ? valor.toLocaleString('es-CO') : '0');
}

// Utilidad para obtener la fecha seleccionada o la de hoy
function getFechaSeleccionada() {
    const input = document.getElementById('fechaEstadistica');
    if (input && input.value) return input.value;
    // Si no hay input o valor, retorna la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// 1. Ventas del día (desde backend)
async function mostrarVentasDelDia() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/ventas-dia?fecha=' + fecha);
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error HTTP en /api/estadisticas/ventas-dia:', res.status, errorText);
            document.getElementById('ventas-dia').textContent = 'Error (' + res.status + ')';
            return;
        }
        const data = await res.json();
        console.log('Respuesta de /api/estadisticas/ventas-dia:', data);
        if (!data || typeof data.ventas === 'undefined') {
            console.error('Respuesta inesperada en /api/estadisticas/ventas-dia:', data);
            document.getElementById('ventas-dia').textContent = 'Error (sin datos)';
            return;
        }
        document.getElementById('ventas-dia').textContent = formatoCOP(data.ventas || 0);
    } catch (err) {
        console.error('Error JS en mostrarVentasDelDia:', err);
        document.getElementById('ventas-dia').textContent = 'Error (JS)';
    }
}

// 2. Ganancia neta diaria/semanal/mensual (desde backend)
async function mostrarGananciaNeta(periodo) {
    try {
        const res = await fetch(`/api/estadisticas/ganancia-neta?periodo=${periodo}`);
        if (!res.ok) throw new Error('Error al obtener ganancia neta');
        const data = await res.json();
        document.getElementById('ganancia-neta').textContent = formatoCOP(data.ganancia || 0);
    } catch (err) {
        document.getElementById('ganancia-neta').textContent = 'Error';
    }
}

// 3. Comparativa de ventas por mes (gráfica de barras, desde backend)
async function mostrarGraficaVentasMes() {
    try {
        const res = await fetch('/api/estadisticas/ventas-mes');
        if (!res.ok) throw new Error('Error al obtener ventas por mes');
        const data = await res.json(); // [{ mes: 'Enero', ventas: 4200000 }, ...]
        const ctx = document.getElementById('ventasMesChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(v => v.mes),
                datasets: [{
                    label: 'Ventas',
                    data: data.map(v => v.ventas),
                    backgroundColor: 'rgba(0,207,255,0.7)',
                    borderColor: 'rgba(0,123,255,1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    maxBarThickness: 48,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#fff',
                            callback: function(value) { return formatoCOP(value); }
                        },
                        grid: { color: 'rgba(0,207,255,0.08)' }
                    },
                    x: {
                        ticks: { color: '#fff' },
                        grid: { color: 'rgba(0,207,255,0.08)' }
                    }
                }
            }
        });
    } catch (err) {
        document.getElementById('ventasMesChart').parentNode.innerHTML = '<p>Error al cargar la gráfica de ventas por mes.</p>';
    }
}

// 4. Tendencias de consumo por hora y día (gráfica de líneas, desde backend)
async function mostrarGraficaTendencias() {
    try {
        const res = await fetch('/api/estadisticas/tendencias-hora-dia');
        if (!res.ok) throw new Error('Error al obtener tendencias');
        const data = await res.json();
        // data: { horas: ['08:00',...], dias: ['Dom',...], tendencias: [[2,3,...],[...],...] }
        const ctx = document.getElementById('tendenciasChart').getContext('2d');
        const dias = data.dias;
        const horas = data.horas;
        const tendencias = data.tendencias; // tendencias[hora][dia]
        const datasets = dias.map((dia, idx) => ({
            label: dia,
            data: tendencias.map(h => h[idx]),
            fill: false,
            borderColor: `hsl(${idx * 50}, 80%, 60%)`,
            backgroundColor: `hsl(${idx * 50}, 80%, 60%)`,
            tension: 0.3
        }));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: horas,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, labels: { color: '#fff' } },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#fff' },
                        grid: { color: 'rgba(0,207,255,0.08)' }
                    },
                    x: {
                        ticks: { color: '#fff' },
                        grid: { color: 'rgba(0,207,255,0.08)' }
                    }
                }
            }
        });
    } catch (err) {
        document.getElementById('tendenciasChart').parentNode.innerHTML = '<p>Error al cargar la gráfica de tendencias.</p>';
    }
}

// Mostrar ventas del día por mesa
async function mostrarVentasPorMesaDia() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/ventas-dia-por-mesa?fecha=' + fecha);
        if (!res.ok) throw new Error('Error al obtener ventas por mesa');
        const data = await res.json(); // [{id_mesa, numero_mesa, total_ventas}]
        const cont = document.getElementById('ventasPorMesaDia');
        if (!cont) return;
        if (!data.length) {
            cont.innerHTML = '<em>No hay ventas registradas hoy.</em>';
            return;
        }
        cont.innerHTML = `
            <table style="width:100%;max-width:500px;margin:auto;border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="text-align:left;padding:8px;">Mesa</th>
                        <th style="text-align:right;padding:8px;">Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(m =>
                        `<tr>
                            <td style="padding:8px;">Mesa ${m.numero_mesa}</td>
                            <td style="padding:8px;text-align:right;">${formatoCOP(m.total_ventas)}</td>
                        </tr>`
                    ).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        const cont = document.getElementById('ventasPorMesaDia');
        if (cont) cont.innerHTML = '<em>Error al cargar ventas por mesa.</em>';
    }
}

// Mostrar total de ganancias del día (con logs)
async function mostrarTotalGananciasDia() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/ventas-dia?fecha=' + fecha);
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error HTTP en /api/estadisticas/ventas-dia:', res.status, errorText);
            const cont = document.getElementById('totalGananciasDia');
            if (cont) cont.textContent = 'Error (' + res.status + ')';
            return;
        }
        const data = await res.json();
        if (!data || typeof data.ventas === 'undefined') {
            console.error('Respuesta inesperada en /api/estadisticas/ventas-dia:', data);
            const cont = document.getElementById('totalGananciasDia');
            if (cont) cont.textContent = 'Error (sin datos)';
            return;
        }
        const cont = document.getElementById('totalGananciasDia');
        if (cont) cont.textContent = formatoCOP(data.ventas || 0);
    } catch (err) {
        console.error('Error JS en mostrarTotalGananciasDia:', err);
        const cont = document.getElementById('totalGananciasDia');
        if (cont) cont.textContent = 'Error (JS)';
    }
}

// Función de depuración: mostrar todos los pedidos del día
async function mostrarDebugPedidosDia() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/debug-pedidos-dia?fecha=' + fecha);
        if (!res.ok) throw new Error('Error al obtener debug de pedidos');
        const data = await res.json();
        console.log('Pedidos del día (debug):', data);
        // Muestra en pantalla para depuración
        let html = `<h3 style="color:#ff9800;">Pedidos del día (debug)</h3>`;
        if (!data.length) {
            html += '<em>No hay pedidos registrados hoy.</em>';
        } else {
            html += `<table style="width:100%;max-width:900px;margin:auto;border-collapse:collapse;background:#fff;color:#222;">
                <thead>
                    <tr>
                        <th>ID Pedido</th>
                        <th>Mesa</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                        <th>Hora Pedido</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr>
                            <td>${p.id_pedido}</td>
                            <td>${p.numero_mesa}</td>
                            <td>${p.nombre_producto}</td>
                            <td>${p.cantidad}</td>
                            <td>$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                            <td>${p.hora_pedido}</td>
                            <td>${p.estado}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
        }
        let debugDiv = document.getElementById('debugPedidosDia');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'debugPedidosDia';
            debugDiv.style.background = '#fffbe7';
            debugDiv.style.color = '#222';
            debugDiv.style.padding = '1.2rem';
            debugDiv.style.margin = '2rem auto';
            debugDiv.style.borderRadius = '1.2rem';
            debugDiv.style.maxWidth = '950px';
            debugDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
            document.body.insertBefore(debugDiv, document.body.firstChild);
        }
        debugDiv.innerHTML = html;
    } catch (err) {
        console.error('Error en mostrarDebugPedidosDia:', err);
    }
}

// --- Interactividad para cambiar periodo de ganancia neta ---
document.addEventListener('DOMContentLoaded', () => {
    mostrarVentasDelDia();
    mostrarGananciaNeta('dia');
    mostrarGraficaVentasMes();
    mostrarGraficaTendencias();
    mostrarVentasPorMesaDia();
    mostrarTotalGananciasDia(); // <-- Agrega esta línea
    mostrarDebugPedidosDia(); // <-- Llama a la función de depuración al cargar la página

    // Refresca la tabla de ventas por mesa cada 10 segundos automáticamente
    setInterval(mostrarVentasPorMesaDia, 10000);

    // Cambiar periodo de ganancia neta
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            mostrarGananciaNeta(this.dataset.period);
        });
    });

    // Agrega un input de fecha arriba de las estadísticas
    let fechaInput = document.createElement('input');
    fechaInput.type = 'date';
    fechaInput.id = 'fechaEstadistica';
    fechaInput.style.margin = '1.2rem 0 1.5rem 0';
    fechaInput.style.fontSize = '1.1rem';
    fechaInput.style.padding = '0.4rem 1.2rem';
    fechaInput.style.borderRadius = '0.7rem';
    fechaInput.style.border = '1.5px solid #00cfff';
    fechaInput.style.background = '#232946';
    fechaInput.style.color = '#fff';
    fechaInput.style.outline = 'none';
    // Valor por defecto: hoy
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.value = `${yyyy}-${mm}-${dd}`;
    // Inserta el input antes del primer .estadisticas-cards
    const main = document.querySelector('.main-estadisticas-content main');
    if (main) main.insertBefore(fechaInput, main.firstChild);

    // Al cambiar la fecha, recarga todas las estadísticas
    fechaInput.addEventListener('change', () => {
        mostrarVentasDelDia();
        mostrarVentasPorMesaDia();
        mostrarTotalGananciasDia();
        mostrarDebugPedidosDia();
    });
});

// Permite llamar manualmente desde otros scripts si lo necesitas
window.mostrarVentasPorMesaDia = mostrarVentasPorMesaDia;

// --- Fin del archivo estadisticas.js ---
