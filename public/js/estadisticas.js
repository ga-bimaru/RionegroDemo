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
    return '$' + valor.toLocaleString('es-CO');
}

// 1. Ventas del día (última fecha)
function mostrarVentasDelDia() {
    const hoy = ventasPorDia[ventasPorDia.length - 1];
    document.getElementById('ventas-dia').textContent = formatoCOP(hoy.ventas);
}

// 2. Ganancia neta diaria/semanal/mensual
function calcularGanancia(periodo) {
    let ventas = 0, costos = 0;
    if (periodo === 'dia') {
        const hoy = ventasPorDia[ventasPorDia.length - 1];
        ventas = hoy.ventas;
        costos = hoy.costos;
    } else if (periodo === 'semana') {
        const ultimos7 = ventasPorDia.slice(-7);
        ventas = ultimos7.reduce((acc, d) => acc + d.ventas, 0);
        costos = ultimos7.reduce((acc, d) => acc + d.costos, 0);
    } else if (periodo === 'mes') {
        ventas = ventasPorDia.reduce((acc, d) => acc + d.ventas, 0);
        costos = ventasPorDia.reduce((acc, d) => acc + d.costos, 0);
    }
    return ventas - costos;
}

function mostrarGananciaNeta(periodo) {
    const ganancia = calcularGanancia(periodo);
    document.getElementById('ganancia-neta').textContent = formatoCOP(ganancia);
}

// 3. Comparativa de ventas por mes (gráfica de barras)
function mostrarGraficaVentasMes() {
    const ctx = document.getElementById('ventasMesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ventasPorMes.map(v => v.mes),
            datasets: [{
                label: 'Ventas',
                data: ventasPorMes.map(v => v.ventas),
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
}

// 4. Tendencias de consumo por hora y día (gráfica de calor)
function mostrarGraficaTendencias() {
    const ctx = document.getElementById('tendenciasChart').getContext('2d');
    // Para simplificar, usamos una gráfica de líneas por día de la semana
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const horas = Array.from({length: 16}, (_, i) => (8 + i) + ':00');
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
}

// --- Interactividad para cambiar periodo de ganancia neta ---
document.addEventListener('DOMContentLoaded', () => {
    mostrarVentasDelDia();
    mostrarGananciaNeta('dia');
    mostrarGraficaVentasMes();
    mostrarGraficaTendencias();

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
