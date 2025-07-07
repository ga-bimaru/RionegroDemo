// Snackbar reutilizable para el modal de factura
window.showSnackbar = function showSnackbar(message, options = {}) {
    let snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = 'snackbar';
        document.body.appendChild(snackbar);
    }
    snackbar.innerHTML = `<span>${message}</span>`;
    if (options.actionText && typeof options.onAction === 'function') {
        const btn = document.createElement('button');
        btn.textContent = options.actionText;
        btn.onclick = () => {
            options.onAction();
            hideSnackbar();
        };
        snackbar.appendChild(btn);
    }
    snackbar.className = 'show';
    snackbar.style.visibility = 'visible';
    // Ocultar automáticamente después de 4s si no hay acción
    if (!options.actionText) {
        setTimeout(hideSnackbar, 4000);
    }
}

function hideSnackbar() {
    const snackbar = document.getElementById('snackbar');
    if (snackbar) {
        snackbar.className = snackbar.className.replace('show', '');
        setTimeout(() => {
            snackbar.style.visibility = 'hidden';
        }, 300);
    }
}

// Permite cerrar con Escape
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideSnackbar();
});
