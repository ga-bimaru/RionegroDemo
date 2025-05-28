function formatoCOP(valor) {
    return '$' + (valor ? valor.toLocaleString('es-CO') : '0');
}

function getFechaSeleccionada() {
    const input = document.getElementById('fechaFinanzas');
    if (input && input.value) return input.value;
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function mostrarVentasDelDia() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/ventas-dia?fecha=' + fecha);
        const data = await res.json();
        document.getElementById('ventasDia').textContent = formatoCOP(data.ventas || 0);
    } catch {
        document.getElementById('ventasDia').textContent = 'Error';
    }
}

async function mostrarGananciaNeta(periodo) {
    try {
        const res = await fetch(`/api/estadisticas/ganancia-neta?periodo=${periodo}`);
        const data = await res.json();
        document.getElementById('gananciaNeta').textContent = formatoCOP(data.ganancia || 0);
    } catch {
        document.getElementById('gananciaNeta').textContent = 'Error';
    }
}

async function mostrarGraficaVentasMes() {
    try {
        const res = await fetch('/api/estadisticas/ventas-mes');
        const data = await res.json();
        const ctx = document.getElementById('graficaVentasMes').getContext('2d');
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
    } catch {
        document.getElementById('graficaVentasMes').parentNode.innerHTML = '<p>Error al cargar la gráfica de ventas por mes.</p>';
    }
}

async function mostrarGraficaTendencias() {
    try {
        const res = await fetch('/api/estadisticas/tendencias-hora-dia');
        const data = await res.json();
        const ctx = document.getElementById('graficaTendencias').getContext('2d');
        const dias = data.dias;
        const horas = data.horas;
        const tendencias = data.tendencias;

        // Calcular suma total por hora para detectar horas pico
        const sumaPorHora = tendencias.map(arr => arr.reduce((a, b) => a + b, 0));
        // Buscar las 2 horas con mayor suma
        const horasPicoIdx = [...sumaPorHora]
            .map((val, idx) => ({ val, idx }))
            .sort((a, b) => b.val - a.val)
            .slice(0, 2)
            .map(obj => obj.idx);

        // Gráfica: barras apiladas por día, una barra por hora
        const colores = [
            '#00cfff', '#007bff', '#43e97b', '#ffc107', '#ff9800', '#e74c3c', '#9b59b6'
        ];
        const datasets = dias.map((dia, idx) => ({
            label: dia,
            data: tendencias.map(h => h[idx]),
            backgroundColor: colores[idx % colores.length],
            stack: 'consumo'
        }));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: horas,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, labels: { color: '#232946', font: { weight: 'bold' } } },
                    title: {
                        display: true,
                        text: 'Consumo por Hora y Día de la Semana',
                        color: '#00cfff',
                        font: { size: 18, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} consumos/ventas`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Hora del Día',
                            color: '#232946',
                            font: { weight: 'bold' }
                        },
                        ticks: { color: '#232946' },
                        grid: { color: 'rgba(0,207,255,0.08)' }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de Consumos/Ventas',
                            color: '#232946',
                            font: { weight: 'bold' }
                        },
                        ticks: { color: '#232946' },
                        grid: { color: 'rgba(0,207,255,0.08)' }
                    }
                }
            }
        });

        // Recomendar horas pico
        let textoRecomendacion = '';
        if (horasPicoIdx.length > 0) {
            const horasPico = horasPicoIdx.map(idx => horas[idx]);
            textoRecomendacion = `<strong>Recomendación:</strong> Las horas pico de mayor consumo y ventas suelen ser <span style="color:#007bff;font-weight:bold;">${horasPico.join(' y ')}</span>. 
            Se recomienda reforzar la atención y el stock en estas franjas horarias para maximizar las ventas y el servicio.`;
        } else {
            textoRecomendacion = 'No se detectaron horas pico claras en el periodo analizado.';
        }
        document.getElementById('recomendacionTendencias').innerHTML = textoRecomendacion;

    } catch {
        document.getElementById('graficaTendencias').parentNode.innerHTML = '<p>Error al cargar la gráfica de tendencias.</p>';
    }
}

async function mostrarVentasPorMesa() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/ventas-dia-por-mesa?fecha=' + fecha);
        const data = await res.json();
        const cont = document.getElementById('ventasPorMesa');
        if (!data.length) {
            cont.innerHTML = '<em>No hay ventas registradas para esta fecha.</em>';
            return;
        }
        cont.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Mesa</th>
                        <th>Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(m =>
                        `<tr>
                            <td>Mesa ${m.numero_mesa}</td>
                            <td style="text-align:right;">${formatoCOP(m.total_ventas)}</td>
                        </tr>`
                    ).join('')}
                </tbody>
            </table>
        `;
    } catch {
        document.getElementById('ventasPorMesa').innerHTML = '<em>Error al cargar ventas por mesa.</em>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Fecha por defecto: hoy
    const fechaInput = document.getElementById('fechaFinanzas');
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.value = `${yyyy}-${mm}-${dd}`;

    mostrarVentasDelDia();
    mostrarGananciaNeta('dia');
    mostrarGraficaVentasMes();
    mostrarGraficaTendencias();
    mostrarVentasPorMesa();

    fechaInput.addEventListener('change', () => {
        mostrarVentasDelDia();
        mostrarVentasPorMesa();
    });

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            mostrarGananciaNeta(this.dataset.period);
        });
    });
});
