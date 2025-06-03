document.addEventListener('DOMContentLoaded', async () => {
    const calendario = document.getElementById('calendarioVentas');
    const asesoramiento = document.getElementById('asesoramientoComercial');
    try {
        const res = await fetch('/api/dias-mas-ventas', { cache: "no-store" });
        if (!res.ok) {
            // Mostrar el error HTTP en consola para depuración
            console.error('Error HTTP:', res.status, res.statusText);
            throw new Error('No se pudo obtener datos de la API');
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            // Mostrar el contenido recibido para depuración
            const text = await res.text();
            console.error('Respuesta no JSON:', text);
            throw new Error('La respuesta no es JSON');
        }
        const data = await res.json();
        const { resumen, consejo } = data;

        // Etiquetas de días
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        diasSemana.forEach(d => {
            const el = document.createElement('div');
            el.textContent = d;
            el.style.fontWeight = 'bold';
            calendario.appendChild(el);
        });

        // Primer día del mes
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();
        const primerDia = new Date(anio, mes, 1).getDay();

        // Espacios vacíos antes del primer día
        for (let i = 0; i < primerDia; i++) {
            const vacio = document.createElement('div');
            calendario.appendChild(vacio);
        }

        // Días del mes
        resumen.forEach(dia => {
            const el = document.createElement('div');
            el.className = `dia-calendario ${dia.nivel}`;
            el.textContent = dia.dia;
            el.title = `Ventas: $${dia.total} (${dia.nivel})`;
            calendario.appendChild(el);
        });

        asesoramiento.textContent = consejo;
    } catch (err) {
        asesoramiento.textContent = "No se pudo cargar el calendario de ventas. Verifica que la API esté funcionando correctamente.";
        calendario.innerHTML = '';
        // Mostrar el error en consola para depuración
        console.error('Error en dias.js:', err);
    }
});
