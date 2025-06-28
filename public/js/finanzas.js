function formatoCOP(valor) {
    // Muestra sin decimales, solo miles
    return '$' + (valor ? Math.round(valor).toLocaleString('es-CO') : '0');
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

// --- NUEVO: Animación de conteo para valores numéricos tipo dinero ---
function animarConteoValor(element, valorFinal, duracion = 1200) {
    if (!element) return;
    let startTimestamp = null;
    // Extrae el valor numérico actual del texto (quita símbolos)
    const valorInicial = parseFloat(
        (element.textContent || "0").replace(/[^0-9.-]+/g, "")
    ) || 0;
    const diferencia = valorFinal - valorInicial;
    function step(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        const progreso = Math.min((timestamp - startTimestamp) / duracion, 1);
        const valorActual = valorInicial + diferencia * progreso;
        // --- NUEVO: solo miles, sin decimales ---
        element.textContent = '$' + Math.round(valorActual).toLocaleString('es-CO');
        if (progreso < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = '$' + Math.round(valorFinal).toLocaleString('es-CO');
        }
    }
    requestAnimationFrame(step);
}

async function mostrarVentasDelDia() {
    try {
        const fecha = getFechaSeleccionada();
        const res = await fetch('/api/estadisticas/ventas-dia?fecha=' + fecha);
        const data = await res.json();
        const el = document.getElementById('ventasDia');
        // --- animación ---
        animarConteoValor(el, data.ventas || 0);
    } catch {
        document.getElementById('ventasDia').textContent = 'Error';
    }
}

async function mostrarGananciaNeta(periodo) {
    try {
        const res = await fetch(`/api/estadisticas/ganancia-neta?periodo=${periodo}`);
        const data = await res.json();
        const el = document.getElementById('gananciaNeta');
        // --- animación ---
        animarConteoValor(el, data.ganancia || 0);
    } catch {
        document.getElementById('gananciaNeta').textContent = 'Error';
    }
}

async function mostrarGraficaVentasMes() {
    try {
        const res = await fetch('/api/estadisticas/ventas-mes');
        if (!res.ok) {
            throw new Error('Respuesta no OK');
        }
        const data = await res.json();
        const canvas = document.getElementById('graficaVentasMes');
        if (!canvas) {
            throw new Error('No se encontró el canvas para la gráfica');
        }
        const ctx = canvas.getContext('2d');
        // Destruye la gráfica anterior si existe
        if (window._graficaVentasMesInstance) {
            window._graficaVentasMesInstance.destroy();
        }
        window._graficaVentasMesInstance = new Chart(ctx, {
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
    } catch (e) {
        const canvas = document.getElementById('graficaVentasMes');
        if (canvas && canvas.parentNode) {
            canvas.parentNode.innerHTML = '<p style="color:#FFD600;font-size:1.2rem;text-align:center;">⚠️ Error al cargar la gráfica de ventas por mes.</p>';
        }
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

        // Etiquetas de horas en formato 12h AM/PM
        function hora12(h) {
            let hour = parseInt(h, 10);
            let ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12;
            if (hour === 0) hour = 12;
            return `${hour}:00 ${ampm}`;
        }
        const horasEtiquetas = horas.map(hora12);

        // Paleta de colores para cada día
        const colores = [
            '#00fff7', '#43e97b', '#ffc107', '#ff9800', '#e74c3c', '#9b59b6', '#007bff'
        ];
        const colorHoraPico = '#FFD600';

        // datasets por día, barras de horas pico resaltadas
        const datasets = dias.map((dia, idxDia) => ({
            label: dia,
            data: tendencias.map((h, idxHora) => h[idxDia]),
            backgroundColor: tendencias.map((h, idxHora) =>
                horasPicoIdx.includes(idxHora)
                    ? colorHoraPico
                    : colores[idxDia % colores.length]
            ),
            borderColor: tendencias.map((h, idxHora) =>
                horasPicoIdx.includes(idxHora)
                    ? '#FFD600'
                    : colores[idxDia % colores.length]
            ),
            borderWidth: tendencias.map((h, idxHora) =>
                horasPicoIdx.includes(idxHora) ? 4 : 2
            ),
            stack: 'consumo'
        }));

        // Destruye la gráfica anterior si existe
        if (window._graficaTendenciasInstance) {
            window._graficaTendenciasInstance.destroy();
        }

        // --- NUEVO: Explicación arriba de la gráfica ---
        const explicacion = `
            <div style="background:#181c2f;border-radius:1.2rem;padding:1.2rem 1.5rem;margin-bottom:1.2rem;box-shadow:0 0 12px #00fff7;">
                <h4 style="color:#FFD600;font-size:1.3rem;margin:0 0 0.7rem 0;text-align:center;font-family:'Orbitron',sans-serif;">
                    ¿Qué muestra esta gráfica?
                </h4>
                <div style="color:#fff;font-size:1.08rem;text-align:center;">
                    <b>Esta gráfica te ayuda a ver en qué horas y días de la semana hay más consumo o ventas.</b><br>
                    <span style="color:#00fff7;">Cada barra representa la cantidad de ventas o consumos en una hora específica.</span><br>
                    <span style="color:#FFD600;">Las barras amarillas resaltan las <b>horas pico</b> donde hubo más movimiento.</span><br>
                    <span style="color:#43e97b;">Cada color representa un día diferente.</span>
                </div>
            </div>
        `;
        // Inserta la explicación antes del canvas si no existe
        let explicacionDiv = document.getElementById('explicacionTendencias');
        if (!explicacionDiv) {
            explicacionDiv = document.createElement('div');
            explicacionDiv.id = 'explicacionTendencias';
            ctx.canvas.parentNode.insertBefore(explicacionDiv, ctx.canvas);
        }
        explicacionDiv.innerHTML = explicacion;

        // --- NUEVO: Ajusta el tamaño del canvas para que la gráfica se vea completa ---
        ctx.canvas.height = 480;
        ctx.canvas.width = 900;

        window._graficaTendenciasInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: horasEtiquetas,
                datasets: datasets
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#00fff7',
                            font: { weight: 'bold', size: 18, family: 'Orbitron, monospace' },
                            boxWidth: 28,
                            boxHeight: 18,
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tendencias de Consumo por Hora y Día',
                        color: '#00fff7',
                        font: { size: 28, weight: 'bold', family: 'Orbitron, monospace' },
                        padding: { top: 10, bottom: 10 }
                    },
                    tooltip: {
                        backgroundColor: '#181c2f',
                        titleColor: '#FFD600',
                        bodyColor: '#fff',
                        borderColor: '#FFD600',
                        borderWidth: 2,
                        titleFont: { size: 20, weight: 'bold', family: 'Orbitron, monospace' },
                        bodyFont: { size: 16, family: 'DM Sans, Arial, sans-serif' },
                        padding: 14,
                        caretSize: 10,
                        cornerRadius: 10,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const esPico = context.dataset.backgroundColor[context.dataIndex] === colorHoraPico;
                                return `${context.dataset.label}: ${context.parsed.y} ${esPico ? '🚀 ¡Hora Pico!' : 'consumos'}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1800,
                    easing: 'easeInOutQuart'
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Hora del Día (formato 12h)',
                            color: '#00fff7',
                            font: { weight: 'bold', size: 20, family: 'Orbitron, monospace' }
                        },
                        ticks: { color: '#fff', font: { size: 16, weight: 'bold', family: 'Orbitron, monospace' } },
                        grid: { color: 'rgba(0,255,255,0.13)' }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de Consumos/Ventas',
                            color: '#00fff7',
                            font: { weight: 'bold', size: 20, family: 'Orbitron, monospace' }
                        },
                        ticks: {
                            color: '#fff',
                            font: { size: 16, weight: 'bold', family: 'Orbitron, monospace' },
                            callback: function(value) { return value; }
                        },
                        grid: { color: 'rgba(0,255,255,0.13)' }
                    }
                }
            }
        });

        // Mensaje de recomendación con explicación
        let textoRecomendacion = '';
        if (horasPicoIdx.length > 0) {
            const horasPico = horasPicoIdx.map(idx => horasEtiquetas[idx]);
            textoRecomendacion = `
                <div style="font-size:1.3rem;display:flex;align-items:center;gap:1.2rem;justify-content:center;">
                    <span style="font-size:2.2rem;filter:drop-shadow(0 0 16px #FFD600);">🚀</span>
                    <span>
                        <b style="color:#FFD600;text-shadow:0 0 12px #FFD600;">¿Por qué es útil?</b><br>
                        <span style="color:#fff;">Las <b>horas más activas</b> suelen ser <span style="color:#FFD600;font-weight:bold;">${horasPico.join(' y ')}</span>.<br>
                        Refuerza el equipo y la atención en estos momentos para aprovechar la demanda.</span>
                    </span>
                </div>
            `;
        } else {
            textoRecomendacion = `
                <div style="font-size:1.2rem;text-align:center;">
                    <span style="font-size:2rem;filter:drop-shadow(0 0 12px #00fff7);">🤖</span>
                    <span style="color:#fff;text-shadow:0 0 12px #00fff7;">No hay horas pico claras hoy.<br>¡Sigue atento a los clientes!</span>
                </div>
            `;
        }
        document.getElementById('recomendacionTendencias').innerHTML = textoRecomendacion;

    } catch {
        document.getElementById('graficaTendencias').parentNode.innerHTML = '<p style="color:#00fff7;font-size:1.3rem;text-align:center;">⚠️ Error tecnológico: no se pudo mostrar la gráfica.</p>';
    }
}

async function mostrarVentasPorMesa(periodo = 'dia', fecha = null) {
    try {
        let url = '';
        if (periodo === 'dia') {
            const fechaDia = fecha || getFechaSeleccionada();
            url = '/api/estadisticas/ventas-dia-por-mesa?fecha=' + fechaDia;
        } else if (periodo === 'semana') {
            url = '/api/estadisticas/ventas-semana-por-mesa';
        } else if (periodo === 'mes') {
            url = '/api/estadisticas/ventas-mes-por-mesa';
        }
        const res = await fetch(url);
        const cont = document.getElementById('ventasPorMesa');
        // --- CAMBIO: Selecciona el h3 por id para evitar afectar otros títulos ---
        const titulo = document.getElementById('tituloVentasPorMesa');
        if (titulo) {
            if (periodo === 'dia') {
                titulo.textContent = 'Ventas por Mesa (Día)';
            } else if (periodo === 'semana') {
                titulo.textContent = 'Ventas por Mesa (Semana)';
            } else if (periodo === 'mes') {
                titulo.textContent = 'Ventas por Mesa (Mes)';
            }
        }
        if (!res.ok) {
            let msg = '';
            try {
                const err = await res.json();
                msg = err && err.error ? ` (${err.error})` : '';
            } catch { /* ignore */ }
            cont.innerHTML = `<em style="color:#FFD600;">Error al cargar ventas por mesa. Respuesta no OK${msg}</em>`;
            return;
        }
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) {
            cont.innerHTML = '<em>No hay ventas registradas para este periodo.</em>';
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
    } catch (e) {
        const cont = document.getElementById('ventasPorMesa');
        cont.innerHTML = `<em style="color:#FFD600;">Error al cargar ventas por mesa. ${e && e.message ? e.message : ''}</em>`;
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

    let periodoActual = 'dia';

    mostrarVentasDelDia();
    mostrarGananciaNeta('dia');
    mostrarGraficaVentasMes();
    mostrarGraficaTendencias();
    mostrarVentasPorMesa('dia');

    fechaInput.addEventListener('change', () => {
        if (periodoActual === 'dia') {
            mostrarVentasDelDia();
            mostrarVentasPorMesa('dia', fechaInput.value);
        }
    });

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const periodo = this.dataset.period;
            periodoActual = periodo;
            mostrarGananciaNeta(periodo);
            // --- NUEVO: Cambia la tabla de ventas por mesa según el periodo ---
            if (periodo === 'dia') {
                mostrarVentasPorMesa('dia', fechaInput.value);
            } else if (periodo === 'semana') {
                mostrarVentasPorMesa('semana');
            } else if (periodo === 'mes') {
                mostrarVentasPorMesa('mes');
            }
        });
    });
});
