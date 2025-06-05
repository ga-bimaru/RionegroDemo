// Obtener referencias a los elementos del DOM
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const addProductModal = document.getElementById('addProductModal');
const addProductForm = document.getElementById('addProductForm');

// Abrir el modal
openModalBtn.addEventListener('click', () => {
    addProductModal.style.display = 'flex';
});

// Cerrar el modal
closeModalBtn.addEventListener('click', () => {
    addProductModal.style.display = 'none';
});

// Función para capitalizar la primera letra de cada palabra
function capitalizarPalabras(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase()).replace(/\s+/g, ' ');
}

// Manejar el envío del formulario
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capitaliza el nombre antes de enviar
    let nombre = document.getElementById('productName').value.trim();
    nombre = capitalizarPalabras(nombre);

    const categoriaSelect = document.getElementById('productCategory');
    let categoria = categoriaSelect.options[categoriaSelect.selectedIndex].value;
    let precio = document.getElementById('productPrice').value.trim();
    let imagen = document.getElementById('productImage').value.trim();

    // Si la categoría es vacía, fuerza la primera opción válida
    if (!categoria || categoria === "") {
        for (let i = 0; i < categoriaSelect.options.length; i++) {
            if (categoriaSelect.options[i].value) {
                categoria = categoriaSelect.options[i].value;
                break;
            }
        }
    }
    // Si la imagen está vacía, pon una imagen por defecto
    if (!imagen) {
        imagen = 'images/default-product.jpg';
    }

    // Validación de precio mínimo
    const precioNum = parseFloat(precio);
    if (!nombre || !categoria || !imagen || isNaN(precioNum) || precioNum < 300) {
        showNotification('Por favor, completa todos los campos correctamente y asegúrate que el precio sea mayor o igual a 300.');
        return;
    }

    // Log para depuración
    console.log('[FRONT][addProductForm] Enviando:', { nombre, categoria, precio, imagen });

    const productData = {
        nombre,
        categoria,
        precio,
        imagen
    };

    try {
        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showNotification('Producto agregado exitosamente');
                addProductModal.style.display = 'none';
                addProductForm.reset();
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                showNotification(result.message || 'Error al agregar el producto');
            }
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Error al agregar el producto');
        }
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        showNotification('Error al conectar con el servidor');
    }
});

// Asegúrate de que showNotification esté disponible globalmente y dura 3 segundos
window.showNotification = function(message) {
    const successNotification = document.getElementById('successNotification');
    if (!successNotification) return;
    successNotification.querySelector('span').innerHTML = message;
    successNotification.classList.remove('hidden');
    successNotification.classList.add('show');

    setTimeout(() => {
        successNotification.classList.remove('show');
        successNotification.classList.add('hidden');
    }, 3000); // 3 segundos
};

// Cargar productos al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const productCardsContainer = document.getElementById('productCards');
    const searchBtn = document.getElementById('searchBtn');
    const searchRef = document.getElementById('searchRef'); // Select para categoría
    const searchName = document.getElementById('searchName'); // Input para nombre

    let productos = []; // Variable para almacenar los productos cargados

    // Función para renderizar productos
    const renderProductos = (productosFiltrados) => {
        productCardsContainer.innerHTML = ''; // Limpiar el contenedor antes de renderizar
        if (productosFiltrados.length === 0) {
            productCardsContainer.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }

        productosFiltrados.forEach(producto => {
            const productCard = document.createElement('div');
            productCard.className = 'info-card';
            productCard.dataset.id = producto.id_producto; // <-- Cambiado de producto.id a producto.id_producto
            productCard.dataset.categoria = producto.categoria;
            productCard.dataset.precio = producto.precio;
            productCard.dataset.imagen = producto.imagen;
            productCard.innerHTML = `
                <img src="${producto.imagen || 'images/default-product.jpg'}" alt="${producto.nombre}" class="product-image">
                <h3 class="product-name">${producto.nombre}</h3>
                <p>Categoría: ${producto.categoria}</p>
                <p>Precio: $${producto.precio.toLocaleString('es-CO')} COP</p>
                <button class="edit-product-btn">Editar</button> <!-- Botón de editar -->
            `;
            productCardsContainer.appendChild(productCard);
        });
    };

    // Obtener productos desde el servidor
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }
        productos = await response.json(); // Guardar los productos en la variable
        renderProductos(productos); // Renderizar todos los productos inicialmente
    } catch (err) {
        console.error('Error al cargar los productos:', err);
        productCardsContainer.innerHTML = '<p>Error al cargar los productos. Intente nuevamente más tarde.</p>';
    }

    // Función para filtrar productos
    const filtrarProductos = () => {
        const categoriaSeleccionada = searchRef.value.toLowerCase();
        const nombreBuscado = searchName.value.toLowerCase();

        const productosFiltrados = productos.filter(producto => {
            const categoria = (producto.categoria || '').toLowerCase();
            const nombre = (producto.nombre || '').toLowerCase();
            const coincideCategoria = categoriaSeleccionada === 'todos' || categoria === categoriaSeleccionada;
            const coincideNombre = nombre.includes(nombreBuscado);
            return coincideCategoria && coincideNombre;
        });

        renderProductos(productosFiltrados);
    };

    // Agregar evento al botón de búsqueda
    searchBtn.addEventListener('click', filtrarProductos);
});

// Delegación para el botón editar (debe existir en cada tarjeta de producto)
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('productCards').addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-product-btn')) {
            const card = e.target.closest('.info-card');
            const id = card.dataset.id;
            const nombre = card.querySelector('.product-name').textContent;
            const categoria = card.dataset.categoria;
            const precio = card.dataset.precio;
            const imagen = card.dataset.imagen;

            document.getElementById('editProductId').value = id;
            document.getElementById('editProductName').value = nombre;
            document.getElementById('editProductCategory').value = categoria;
            document.getElementById('editProductPrice').value = precio;
            document.getElementById('editProductImage').value = imagen;

            // Mostrar el modal de edición
            document.getElementById('editProductModal').classList.remove('hidden');
            document.getElementById('editProductModal').style.display = 'flex';
        }
    });

    // Cerrar modal de edición
    document.getElementById('closeEditModalBtn').onclick = function() {
        document.getElementById('editProductModal').classList.add('hidden');
        document.getElementById('editProductModal').style.display = 'none';
    };
    // También cerrar con el botón de pie de modal
    const closeEditModalBtnFooter = document.getElementById('closeEditModalBtnFooter');
    if (closeEditModalBtnFooter) {
        closeEditModalBtnFooter.onclick = function() {
            document.getElementById('editProductModal').classList.add('hidden');
            document.getElementById('editProductModal').style.display = 'none';
        };
    }

    // Enviar formulario de edición (AJAX)
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.onsubmit = async function(e) {
            e.preventDefault();
            const id = document.getElementById('editProductId').value;
            // Capitaliza el nombre antes de enviar
            let nombre = document.getElementById('editProductName').value.trim();
            nombre = capitalizarPalabras(nombre);

            const categoria = document.getElementById('editProductCategory').value.trim();
            const precioStr = document.getElementById('editProductPrice').value.trim();
            const imagen = document.getElementById('editProductImage').value.trim();
            const precio = parseFloat(precioStr);

            // Validación de precio mínimo
            if (!nombre || !categoria || isNaN(precio) || precio < 300) {
                alert('Por favor, completa todos los campos correctamente y asegúrate que el precio sea mayor o igual a 300.');
                return;
            }

            try {
                const res = await fetch(`/api/productos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, categoria, precio, imagen })
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    showNotification('Producto actualizado correctamente');
                    document.getElementById('editProductModal').classList.add('hidden');
                    document.getElementById('editProductModal').style.display = 'none';
                    setTimeout(() => location.reload(), 1500);
                } else {
                    alert(result.message || 'Error al actualizar el producto');
                }
            } catch (err) {
                alert('Error al actualizar el producto');
            }
        };
    }
});

// Modal de confirmación para agregar mesa
function crearModalAgregarMesa() {
    if (document.getElementById('confirmAddMesaModal')) return; // Evitar duplicados

    const modal = document.createElement('div');
    modal.id = 'confirmAddMesaModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:340px;text-align:center;position:relative;">
            <span class="close-btn" id="closeConfirmAddMesaModalBtn" title="Cerrar">&times;</span>
            <h2 style="margin-bottom:1.2rem;">¿Quieres agregar una mesa nueva?</h2>
            <div style="display:flex;gap:1.2rem;justify-content:center;">
                <button id="confirmAddMesaBtn" style="background:var(--btn-gradient);color:#fff;">Sí</button>
                <button id="cancelAddMesaBtn" style="background:#e0e7ef;color:#232946;">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Cerrar modal con la X o el botón No
    document.getElementById('closeConfirmAddMesaModalBtn').onclick = cerrarModalAgregarMesa;
    document.getElementById('cancelAddMesaBtn').onclick = cerrarModalAgregarMesa;

    // Acción al confirmar
    document.getElementById('confirmAddMesaBtn').onclick = async function() {
        try {
            const response = await fetch('/api/mesas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'Disponible',
                    precio_hora: 6000 // Precio por hora predeterminado
                })
            });

            const result = await response.json();

            if (result.success) {
                showNotification(`Mesa ${result.id_mesa} agregada correctamente con un precio por hora de 6000 COP.`);
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (err) {
            console.error('Error al agregar la mesa:', err);
            alert('Ocurrió un error al agregar la mesa.');
        }
        cerrarModalAgregarMesa();
        setTimeout(() => location.reload(), 1500);
    };
}

function mostrarModalAgregarMesa() {
    crearModalAgregarMesa();
    const modal = document.getElementById('confirmAddMesaModal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(20, 20, 30, 0.92)';
    modal.style.zIndex = '3000';
}

function cerrarModalAgregarMesa() {
    const modal = document.getElementById('confirmAddMesaModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Reemplazar el evento del botón de agregar mesa
document.getElementById('addMesaBtn').addEventListener('click', mostrarModalAgregarMesa);

// Función para mostrar el modal de confirmación de pago
function mostrarModalConfirmarPago(callback) {
    // Evitar duplicados
    if (document.getElementById('modalConfirmarPago')) return;

    const modal = document.createElement('div');
    modal.id = 'modalConfirmarPago';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(20, 20, 30, 0.92)';
    modal.style.zIndex = '4000';

    modal.innerHTML = `
        <div class="modal-content" style="max-width:340px;text-align:center;position:relative;">
            <span class="close-btn" id="closeModalConfirmarPagoBtn" title="Cerrar">&times;</span>
            <h2 style="margin-bottom:1.2rem;">¿Estás seguro de que esta pedida ya está paga?</h2>
            <div style="display:flex;gap:1.2rem;justify-content:center;">
                <button id="confirmarPagoBtn" style="background:var(--btn-gradient);color:#fff;">Sí</button>
                <button id="cancelarPagoBtn" style="background:#e0e7ef;color:#232946;">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Cerrar modal con la X o el botón No
    document.getElementById('closeModalConfirmarPagoBtn').onclick = cerrarModalConfirmarPago;
    document.getElementById('cancelarPagoBtn').onclick = cerrarModalConfirmarPago;

    // Acción al confirmar
    document.getElementById('confirmarPagoBtn').onclick = function() {
        cerrarModalConfirmarPago();
        if (typeof callback === 'function') callback();
    };
}

function cerrarModalConfirmarPago() {
    const modal = document.getElementById('modalConfirmarPago');
    if (modal) {
        modal.remove();
    }
}

// Función para mostrar el modal de confirmación de pago de pedida
function mostrarModalConfirmarPagoPedida(callback) {
    if (document.getElementById('modalConfirmarPagoPedida')) return;

    const modal = document.createElement('div');
    modal.id = 'modalConfirmarPagoPedida';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(20, 20, 30, 0.92)';
    modal.style.zIndex = '4000';

    modal.innerHTML = `
        <div class="modal-content" style="max-width:340px;text-align:center;position:relative;">
            <span class="close-btn" id="closeModalConfirmarPagoPedidaBtn" title="Cerrar">&times;</span>
            <h2 style="margin-bottom:1.2rem;">¿Estás seguro de que esta pedida ya está paga?</h2>
            <div style="display:flex;gap:1.2rem;justify-content:center;">
                <button id="confirmarPagoPedidaBtn" style="background:var(--btn-gradient);color:#fff;">Sí</button>
                <button id="cancelarPagoPedidaBtn" style="background:#e0e7ef;color:#232946;">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('closeModalConfirmarPagoPedidaBtn').onclick = cerrarModalConfirmarPagoPedida;
    document.getElementById('cancelarPagoPedidaBtn').onclick = cerrarModalConfirmarPagoPedida;

    document.getElementById('confirmarPagoPedidaBtn').onclick = function() {
        cerrarModalConfirmarPagoPedida();
        if (typeof callback === 'function') callback();
    };
}

function cerrarModalConfirmarPagoPedida() {
    const modal = document.getElementById('modalConfirmarPagoPedida');
    if (modal) modal.remove();
}

// Delegación para el botón "Pagar ahora"
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...

    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('pagar-ahora-btn')) {
            e.preventDefault();
            mostrarModalConfirmarPago(() => {
                // Aquí va la lógica real de pago después de confirmar
                // Por ejemplo, puedes llamar a tu función de pago:
                // pagarPedido(pedidoId);
                // O lanzar el evento correspondiente
                // showNotification('Pago realizado correctamente');
            });
        }
    });

    // Delegación para el botón "Pagado" de pedida
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-pagar-pedida')) {
            e.preventDefault();
            const btn = e.target;
            // Puedes obtener data-mesa y data-key si lo necesitas:
            // const mesa = btn.getAttribute('data-mesa');
            // const key = btn.getAttribute('data-key');
            mostrarModalConfirmarPagoPedida(() => {
                // Aquí va la lógica real de pago después de confirmar
                // Por ejemplo, puedes llamar a tu función de pago:
                // pagarPedida(mesa, key);
                // O lanzar el evento correspondiente
                // showNotification('Pedida marcada como pagada');
            });
        }
    });

    // ...existing code...
});
