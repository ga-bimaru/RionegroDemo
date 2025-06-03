function formatoCOP(valor) {
    return '$' + (valor ? Math.round(valor).toLocaleString('es-CO') : '0');
}

async function cargarTopProductos(periodo = 'mes') {
    const tablaDiv = document.getElementById('topProductosTabla');
    const consejosDiv = document.getElementById('consejosFinancieros');
    tablaDiv.innerHTML = '<em>Cargando...</em>';
    consejosDiv.innerHTML = '';
    try {
        const res = await fetch('/api/estadisticas/top-productos?periodo=' + periodo);
        if (!res.ok) {
            const errorText = await res.text();
            tablaDiv.innerHTML = `<em>Error al cargar los datos del servidor. Código: ${res.status} <br>${errorText}</em>`;
            return;
        }
        const data = await res.json();
        if (!data.top || !Array.isArray(data.top)) {
            tablaDiv.innerHTML = '<em>No hay ventas registradas para este periodo.</em>';
            return;
        }
        if (!data.top.length) {
            tablaDiv.innerHTML = '<em>No hay ventas registradas para este periodo.</em>';
            return;
        }
        tablaDiv.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="top-productos-table">
                <thead>
                    <tr>
                        <th>Producto/Bebida</th>
                        <th>Categoría</th>
                        <th>Cantidad Vendida</th>
                        <th>Total Ventas</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.top.map(p => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.categoria || '-'}</td>
                            <td>${p.total_cantidad}</td>
                            <td>${formatoCOP(p.total_ventas)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        `;
        consejosDiv.innerHTML = data.top.map(p =>
            `<div class="consejo"><b>${p.nombre}:</b> ${p.consejo}</div>`
        ).join('');
    } catch (err) {
        tablaDiv.innerHTML = `<em>Error al cargar los datos: ${err.message}</em>`;
        consejosDiv.innerHTML = '';
    }
}

// Sidebar toggle igual que en finanzas
const menuBtn = document.getElementById('menuBtn');
const sidebarNav = document.getElementById('sidebarNav');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarSnackbar = document.getElementById('sidebarSnackbar');
const sidebarSnackbarIcon = document.getElementById('sidebarSnackbarIcon');
const sidebarSnackbarMsg = document.getElementById('sidebarSnackbarMsg');
if (menuBtn && sidebarNav && sidebarOverlay) {
    menuBtn.addEventListener('click', () => {
        sidebarNav.classList.add('open');
        sidebarOverlay.style.display = 'block';
        if (sidebarSnackbar) {
            sidebarSnackbar.style.display = 'block';
            sidebarSnackbarIcon.textContent = '💡';
            sidebarSnackbarMsg.textContent = 'Selecciona una opción del menú lateral.';
            setTimeout(() => { sidebarSnackbar.style.display = 'none'; }, 2500);
        }
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebarNav.classList.remove('open');
        sidebarOverlay.style.display = 'none';
    });
    sidebarNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            sidebarNav.classList.remove('open');
            sidebarOverlay.style.display = 'none';
            if (sidebarSnackbar) {
                sidebarSnackbar.style.display = 'block';
                sidebarSnackbarIcon.textContent = '✅';
                sidebarSnackbarMsg.textContent = 'Navegando...';
                setTimeout(() => { sidebarSnackbar.style.display = 'none'; }, 1500);
            }
        });
    });
}

// Cambiar periodo
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const periodo = btn.getAttribute('data-period');
        cargarTopProductos(periodo);
    });
});

// Cargar por defecto el mes
document.addEventListener('DOMContentLoaded', () => {
    cargarTopProductos('mes');
});
