// Espera a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    // Selecciona todos los botones de pedida
    const pedidaBtns = document.querySelectorAll('.pedida-btn');
    // Selecciona el modal y el botón de cerrar
    const modal = document.querySelector('.modal');
    const closeBtn = document.querySelector('.close-btn');

    // Mostrar el modal al hacer clic en cualquier botón de pedida
    pedidaBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            modal.classList.remove('hidden');
        });
    });

    // Ocultar el modal al hacer clic en el botón de cerrar
    closeBtn.addEventListener('click', function () {
        modal.classList.add('hidden');
    });

    // Opcional: cerrar el modal al hacer clic fuera del contenido
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});