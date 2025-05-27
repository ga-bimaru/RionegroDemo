// Simulación de datos de ventas y costos para el negocio de mesas de pool

// Datos de ventas y costos por día (puedes reemplazar por datos reales)
const ventasPorDia = [
    // Formato: { fecha: 'YYYY-MM-DD', ventas: n, costos: n }
    { fecha: '2024-06-01', ventas: 350000, costos: 120000 },
    { fecha: '2024-06-02', ventas: 420000, costos: 140000 },
    { fecha: '2024-06-03', ventas: 390000, costos: 130000 },
    { fecha: '2024-06-04', ventas: 310000, costos: 110000 },
    { fecha: '2024-06-05', ventas: 470000, costos: 150000 },
    { fecha: '2024-06-06', ventas: 510000, costos: 170000 },
    { fecha: '2024-06-07', ventas: 480000, costos: 160000 },
    // ...agrega más días para simular semanas y meses
];

// Datos de ventas por mes para la gráfica comparativa
const ventasPorMes = [
    { mes: 'Enero', ventas: 4200000 },
    { mes: 'Febrero', ventas: 3900000 },
    { mes: 'Marzo', ventas: 4700000 },
    { mes: 'Abril', ventas: 5100000 },
    { mes: 'Mayo', ventas: 4800000 },
    { mes: 'Junio', ventas: 3500000 },
];

// Datos de tendencias de consumo por hora y día de la semana
// Formato: tendencias[hora][dia] = cantidad de ventas
const tendencias = [
    // 0 = 8am, 1 = 9am, ..., 15 = 23pm
    // Cada subarray representa un día de la semana (0=Domingo, 6=Sábado)
    [2, 3, 4, 5, 7, 8, 6], // 8am
    [3, 4, 5, 7, 8, 9, 7], // 9am
    [4, 5, 7, 8, 9, 10, 8], // 10am
    [5, 7, 8, 9, 10, 12, 9], // 11am
    [7, 8, 9, 10, 12, 13, 10], // 12pm
    [8, 9, 10, 12, 13, 15, 12], // 13pm
    [9, 10, 12, 13, 15, 17, 13], // 14pm
    [10, 12, 13, 15, 17, 18, 15], // 15pm
    [12, 13, 15, 17, 18, 20, 16], // 16pm
    [13, 15, 17, 18, 20, 22, 18], // 17pm
    [15, 17, 18, 20, 22, 23, 19], // 18pm
    [17, 18, 20, 22, 23, 25, 20], // 19pm
    [18, 20, 22, 23, 25, 27, 22], // 20pm
    [20, 22, 23, 25, 27, 28, 23], // 21pm
    [22, 23, 25, 27, 28, 30, 25], // 22pm
    [23, 25, 27, 28, 30, 32, 27], // 23pm
];

// Utilidad para formatear moneda COP
function formatoCOP(valor) {
    return '$' + (valor ? valor.toLocaleString('es-CO') : '0');
}

// 1. Ventas del día (desde backend)
async function mostrarVentasDelDia() {
    try {
        const res = await fetch('/api/estadisticas/ventas-dia');
        if (!res.ok) throw new Error('Error al obtener ventas del día');
        const data = await res.json();
        document.getElementById('ventas-dia').textContent = formatoCOP(data.ventas || 0);
    } catch (err) {
        document.getElementById('ventas-dia').textContent = 'Error';
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
        const res = await fetch('/api/estadisticas/ventas-dia-por-mesa');
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

// --- Interactividad para cambiar periodo de ganancia neta ---
document.addEventListener('DOMContentLoaded', () => {
    mostrarVentasDelDia();
    mostrarGananciaNeta('dia');
    mostrarGraficaVentasMes();
    mostrarGraficaTendencias();
    mostrarVentasPorMesaDia(); // <-- Agrega esta línea

    // Cambiar periodo de ganancia neta
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            mostrarGananciaNeta(this.dataset.period);
        });
    });
});

// --- Fin del archivo estadisticas.js ---
