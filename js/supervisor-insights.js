const insights = {
    ganancia: {
        icon: "💸",
        msg: "Este mes ganaste 12% menos que el anterior.",
        tip: "💡 ¿Hubo menos horas de juego? ¿Cambió el consumo promedio?",
        title: "Resumen de Ganancia",
        desc: "Comparativo de ingresos respecto al mes anterior."
    },
    tiempo: {
        icon: "⏱",
        msg: "El tiempo promedio por mesa bajó de 1h 12min a 47min.",
        tip: "💡 Considera ofrecer combos por hora para retener a los clientes más tiempo.",
        title: "Tiempo Promedio por Mesa",
        desc: "Tendencia de uso de las mesas y recomendaciones."
    },
    bebidas: {
        icon: "🍺",
        msg: "Las ventas de bebidas bajaron 18% respecto al mes pasado.",
        tip: "💡 ¿Falta stock, cambió el proveedor o el precio? Evalúa promociones.",
        title: "Ventas de Bebidas",
        desc: "Desempeño de las bebidas y oportunidades de mejora."
    },
    rentable: {
        icon: "📊",
        msg: "Tu producto más rentable no se vendió en los últimos 5 días.",
        tip: "💡 ¿Está fuera del menú, mal ubicado o el mesero no lo está recomendando?",
        title: "Producto Más Rentable",
        desc: "Revisa la visibilidad y promoción de tu producto estrella."
    },
    miercoles: {
        icon: "💸",
        msg: "Los miércoles son los días con menor ingreso: 23% por debajo del promedio semanal.",
        tip: "💡 Prueba promociones específicas como ‘Miércoles de Pool y Cerveza’.",
        title: "Miércoles: Día Bajo",
        desc: "Identifica oportunidades para aumentar ingresos los miércoles."
    },
    clientes: {
        icon: "👥",
        msg: "El gasto promedio por cliente bajó de $8.50 a $6.70.",
        tip: "💡 ¿Menos consumo en barra? ¿Menos mesas activas?",
        title: "Gasto Promedio por Cliente",
        desc: "Analiza el comportamiento de consumo de tus clientes."
    },
    hora: {
        icon: "🕙",
        msg: "Tu hora más rentable es entre 8 pm y 9 pm.",
        tip: "💡 Promociona la hora anterior (7 pm) para extender el pico de consumo.",
        title: "Hora Pico de Consumo",
        desc: "Aprovecha y extiende el pico de ventas con promociones."
    },
    apertura: {
        icon: "📆",
        msg: "Este mes abriste 3 días menos que el mes anterior.",
        tip: "💡 Eso puede explicar la caída del 14% en ingresos generales.",
        title: "Días de Apertura",
        desc: "Revisa la frecuencia de apertura y su impacto en ingresos."
    },
    mesa1: {
        icon: "🪑",
        msg: "La Mesa 1 estuvo inactiva el 80% del tiempo.",
        tip: "💡 ¿Está dañada, mal ubicada o poco visible? Revísala o cámbiala de sitio.",
        title: "Mesa 1 Inactiva",
        desc: "Analiza el uso de la Mesa 1 y toma acciones correctivas."
    },
    stock: {
        icon: "📦",
        msg: "Productos con ventas muy bajas este mes: Doritos, Red Bull.",
        tip: "💡 Considera rotarlos del inventario o incluirlos en combos promocionales.",
        title: "Stock Bajo Movimiento",
        desc: "Detecta productos con baja rotación y actúa."
    }
};

function setSnackbar(page) {
    const data = insights[page] || insights['ganancia'];
    const snackbar = document.getElementById('supervisorSnackbar');
    snackbar.innerHTML = `
        <span class="snackbar-icon">${data.icon}</span>
        <span class="snackbar-message">${data.msg}</span>
        <span class="snackbar-tip">${data.tip}</span>
    `;
}

function setContent(page) {
    const data = insights[page] || insights['ganancia'];
    const content = document.getElementById('supervisorContent');
    content.innerHTML = `
        <h2>${data.title}</h2>
        <p>${data.desc}</p>
        <!-- Aquí puedes agregar gráficos o KPIs dinámicos para ${data.title} -->
    `;
}

function activarSidebar(page) {
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        li.classList.toggle('active', li.dataset.page === page);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        li.addEventListener('click', () => {
            const page = li.dataset.page;
            setSnackbar(page);
            setContent(page);
            activarSidebar(page);
        });
    });
    // Inicial
    setSnackbar('ganancia');
    setContent('ganancia');
    activarSidebar('ganancia');
});
