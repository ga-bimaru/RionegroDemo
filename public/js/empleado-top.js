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

// Cargar el empleado top y la gráfica
async function cargarEmpleadoTop() {
    try {
        const res = await fetch('/api/estadisticas/empleado-top');
        if (!res.ok) throw new Error('No se pudo obtener el top vendedor');
        const data = await res.json();
        const el = document.getElementById('empleadoTop');
        if (data && data.nombre) {
            el.innerHTML = `
                <span style="font-size:2.5rem;">🏆</span>
                <div><b>${data.nombre}</b></div>
                <div style="font-size:1.2rem;color:#fff;">Total vendido: <span style="color:#FFD600;">$${Math.round(data.total).toLocaleString('es-CO')}</span></div>
            `;
        } else {
            el.innerHTML = '<span>No hay datos de ventas.</span>';
        }
        // Gráfica de los mejores vendedores (top 5)
        if (data.top && Array.isArray(data.top) && data.top.length > 0) {
            const ctx = document.getElementById('graficaTopEmpleados').getContext('2d');
            new Chart(ctx, {
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
        }
    } catch (e) {
        document.getElementById('empleadoTop').innerHTML = '<span style="color:#FFD600;">Error al cargar el top vendedor.</span>';
    }
}

document.addEventListener('DOMContentLoaded', cargarEmpleadoTop);
