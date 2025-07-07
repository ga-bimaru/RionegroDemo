// Sidebar toggle
const menuBtn = document.getElementById('menuBtn');
const sidebarNav = document.getElementById('sidebarNav');
const sidebarOverlay = document.getElementById('sidebarOverlay');
if (menuBtn && sidebarNav && sidebarOverlay) {
    menuBtn.addEventListener('click', () => {
        sidebarNav.classList.add('open');
        sidebarOverlay.style.display = 'block';
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebarNav.classList.remove('open');
        sidebarOverlay.style.display = 'none';
    });
    sidebarNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            sidebarNav.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
    });
}


// --- NUEVO: Filtros de periodo y tabla top 10 empleados ---
let filtroActual = 'mes';
let chartTopEmpleados = null;

async function cargarTopEmpleados(filtro = 'mes') {
    try {
        const res = await fetch(`/api/estadisticas/empleado-top?periodo=${filtro}`);
        if (!res.ok) throw new Error('No se pudo obtener el top de empleados');
        const data = await res.json();
        // Top vendedor destacado
        const el = document.getElementById('empleadoTop');
        if (data && data.top && data.top.length > 0) {
            const primero = data.top[0];
            el.innerHTML = `
                <span style="font-size:2.5rem;">🏆</span>
                <div><b>${primero.nombre}</b></div>
                <div style="font-size:1.2rem;color:#fff;">Total vendido: <span style="color:#FFD600;">$${Math.round(primero.total).toLocaleString('es-CO')}</span></div>
            `;
        } else {
            el.innerHTML = '<span>No hay datos de ventas.</span>';
        }
        // Tabla top 10
        const tbody = document.getElementById('topEmpleadosTbody');
        if (data && data.top && data.top.length > 0) {
            tbody.innerHTML = data.top.map((e, i) => `
                <tr${i === 0 ? ' style="background:#232946;font-weight:bold;color:#FFD600;"' : ''}>
                    <td>${i + 1}</td>
                    <td>${e.nombre}</td>
                    <td>${e.documento || ''}</td>
                    <td>$${Math.round(e.total).toLocaleString('es-CO')}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4">No hay datos.</td></tr>';
        }
        // Gráfica
        const ctx = document.getElementById('graficaTopEmpleados').getContext('2d');
        if (chartTopEmpleados) chartTopEmpleados.destroy();
        chartTopEmpleados = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.top.map(e => e.nombre),
                datasets: [{
                    label: 'Total Vendido',
                    data: data.top.map(e => e.total),
                    backgroundColor: data.top.map((e, i) => i === 0 ? '#FFD600' : '#00cfff'),
                    borderColor: data.top.map((e, i) => i === 0 ? '#FFD600' : '#00cfff'),
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
                            callback: function(value) { return '$' + Math.round(value).toLocaleString('es-CO'); }
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
        document.getElementById('empleadoTop').innerHTML = '<span style="color:#FFD600;">Error al cargar el top vendedor.</span>';
        document.getElementById('topEmpleadosTbody').innerHTML = '<tr><td colspan="4">Error al cargar datos.</td></tr>';
    }
}

// Filtros
document.addEventListener('DOMContentLoaded', () => {
    cargarTopEmpleados(filtroActual);
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtroActual = this.dataset.filtro;
            cargarTopEmpleados(filtroActual);
        });
    });
});
