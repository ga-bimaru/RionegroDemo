const mensajes = {
    dia: {
        icon: "💸",
        msg: "Hoy ganaste 12% menos que ayer.",
        tip: "💡 ¿Hubo menos horas de juego?"
    },
    semana: {
        icon: "💸",
        msg: "Esta semana ganaste 12% menos que la anterior.",
        tip: "💡 ¿Hubo menos horas de juego?"
    },
    mes: {
        icon: "💸",
        msg: "Este mes ganaste 12% menos que el anterior.",
        tip: "💡 ¿Cambió el consumo promedio?"
    }
};

// NUEVO: Cálculo real de variación de ventas por periodo (día, semana, mes)
async function actualizarMensajePeriodo(periodo) {
    const mensajeTexto = document.getElementById('mensajeTexto');
    const mensajeTip = document.getElementById('mensajeTip');
    const iconoPanel = document.getElementById('iconoPanel');

    try {
        const res = await fetch('/api/estadisticas/variacion-ventas?periodo=' + periodo);
        const data = await res.json();
        const ventasActual = data.ventasActual || 0;
        const ventasAnterior = data.ventasAnterior || 0;
        const variacion = data.variacion || 0;

        let mensaje = '';
        let tip = '💡 ¿Hubo menos horas de juego?';
        let icono = '💸';

        if (ventasAnterior === 0 && ventasActual === 0) {
            mensaje = 'No hay ventas registradas en este periodo ni en el anterior.';
        } else if (ventasAnterior === 0) {
            mensaje = 'Iniciaste ventas en este periodo. ¡Sigue así!';
        } else if (ventasActual === 0) {
            mensaje = 'No se registraron ventas en este periodo.';
        } else if (variacion < 0) {
            if (periodo === 'dia') {
                mensaje = `Hoy ganaste ${Math.abs(variacion).toFixed(1)}% menos que ayer.`;
            } else if (periodo === 'semana') {
                mensaje = `Esta semana ganaste ${Math.abs(variacion).toFixed(1)}% menos que la anterior.`;
            } else {
                mensaje = `Este mes ganaste ${Math.abs(variacion).toFixed(1)}% menos que el anterior.`;
            }
        } else if (variacion > 0) {
            if (periodo === 'dia') {
                mensaje = `Hoy ganaste ${Math.abs(variacion).toFixed(1)}% más que ayer.`;
            } else if (periodo === 'semana') {
                mensaje = `Esta semana ganaste ${Math.abs(variacion).toFixed(1)}% más que la anterior.`;
            } else {
                mensaje = `Este mes ganaste ${Math.abs(variacion).toFixed(1)}% más que el anterior.`;
            }
            tip = '💡 ¡Buen trabajo! ¿Qué funcionó mejor?';
            icono = '🚀';
        } else {
            mensaje = 'Ganaste lo mismo que en el periodo anterior.';
        }

        if (mensajeTexto) mensajeTexto.textContent = mensaje;
        if (mensajeTip) mensajeTip.textContent = tip;
        if (iconoPanel) iconoPanel.textContent = icono;
    } catch (e) {
        if (mensajeTexto) mensajeTexto.textContent = 'No se pudo calcular la variación de ventas.';
        if (mensajeTip) mensajeTip.textContent = '💡 Intenta más tarde.';
        if (iconoPanel) iconoPanel.textContent = '⚠️';
    }
}

// Sidebar toggle igual que en finanzas.html
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

document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const periodo = btn.getAttribute('data-period');
        actualizarMensajePeriodo(periodo);
    });
});

// Llama al cálculo real al cargar la página para el periodo día
document.addEventListener('DOMContentLoaded', () => {
    actualizarMensajePeriodo('dia');
});
