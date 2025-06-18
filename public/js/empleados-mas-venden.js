document.addEventListener('DOMContentLoaded', () => {
    const tabla = document.getElementById('tablaEmpleadosVentas');

    function formatoCOP(valor) {
        return '$' + (valor ? Math.round(valor).toLocaleString('es-CO') : '0');
    }

    async function cargarRankingEmpleados() {
        tabla.innerHTML = '<em>Cargando...</em>';
        try {
            const res = await fetch('/api/estadisticas/empleados-mas-venden');
            const data = await res.json();
            if (!Array.isArray(data) || !data.length) {
                tabla.innerHTML = '<em>No hay ventas registradas este mes.</em>';
                return;
            }
            tabla.innerHTML = `
                <div style="overflow-x:auto;">
                <table class="ranking-empleados-table">
                    <thead>
                        <tr>
                            <th>Puesto</th>
                            <th>Empleado</th>
                            <th>Ventas Totales</th>
                            <th>Cantidad Facturas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((e, idx) => `
                            <tr>
                                <td style="font-weight:bold;color:#FFD600;">${idx + 1}</td>
                                <td>${e.nombre}</td>
                                <td>${formatoCOP(e.total_ventas)}</td>
                                <td>${e.cantidad_facturas}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            `;
        } catch (err) {
            tabla.innerHTML = `<em>Error al cargar el ranking: ${err.message}</em>`;
        }
    }

    cargarRankingEmpleados();
});
