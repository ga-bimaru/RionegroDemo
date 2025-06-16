const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./conexion'); // Importar el pool de conexión a la base de datos
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

// Configuración de conexión (ajusta según tu entorno)
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'andres123', // tu contraseña
    database: 'negocio_pool'
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: 'clave-secreta', // Cambia esto por una clave segura
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Usa `true` si estás usando HTTPS
}));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para agregar productos
app.post('/api/productos', async (req, res) => {
    const { nombre, precio, categoria, imagen } = req.body;

    // Log para depuración
    console.log('[API][POST /api/productos] Recibido:', req.body);

    if (!nombre || !precio || !categoria || !imagen) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    try {
        // Fuerza los campos en el insert
        const [results] = await pool.query(
            'INSERT INTO producto (nombre, precio, categoria, imagen) VALUES (?, ?, ?, ?)',
            [nombre, precio, categoria, imagen]
        );
        res.json({ success: true, message: 'Producto agregado exitosamente.' });
    } catch (err) {
        console.error('Error al agregar el producto:', err);
        res.status(500).json({ success: false, message: 'Error al agregar el producto.', detalle: err.sqlMessage });
    }
});

// Ruta para obtener productos
app.get('/api/productos', async (req, res) => {
    try {
        // stock eliminado del SELECT
        const [rows] = await pool.query('SELECT id_producto, nombre, precio, categoria, imagen FROM producto');
        const productos = rows.map(producto => ({
            ...producto,
            precio: parseFloat(producto.precio) || 0,
        }));
        res.json(productos);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error al obtener los productos:`, err);
        res.status(500).json({ success: false, message: 'Error al obtener los productos.' });
    }
});

// Ruta para agregar una nueva mesa
app.post('/api/mesas', async (req, res) => {
    const { estado = 'Disponible', precio_hora = 6000 } = req.body;

    try {
        // Insertar la nueva mesa en la base de datos
        const [result] = await pool.query(
            'INSERT INTO mesa (numero_mesa, estado, precio_hora) VALUES (?, ?, ?)',
            [null, estado, precio_hora]
        );

        // Actualizar el número de la mesa con el id autoincrementable
        await pool.query('UPDATE mesa SET numero_mesa = ? WHERE id_mesa = ?', [result.insertId, result.insertId]);

        res.json({ success: true, message: 'Mesa agregada correctamente.', id_mesa: result.insertId });
    } catch (err) {
        console.error('Error al agregar la mesa:', err);
        res.status(500).json({ success: false, message: 'Error al agregar la mesa.' });
    }
});

// Mejora el manejo de errores y logs de debugging
const debug = {
    mesa: (mesaId, accion, info) => {
        const timestamp = new Date().toISOString();
        console.log(`[MESA-${mesaId}][${timestamp}] ${accion.toUpperCase()} - ${JSON.stringify(info)}`);
    },
    error: (contexto, error) => {
        const timestamp = new Date().toISOString();
        console.error(`[ERROR][${timestamp}][${contexto}] ${error.message}`);
        console.error(error.stack);
    },
    info: (mensaje) => {
        const timestamp = new Date().toISOString();
        console.log(`[INFO][${timestamp}] ${mensaje}`);
    }
};

// Ruta para obtener todas las mesas
app.get('/api/mesas', async (req, res) => {
    const includeHoraInicio = req.query.includeHoraInicio === 'true';
    
    debug.info(`GET /api/mesas - Solicitando mesas (includeHoraInicio=${includeHoraInicio})`);
    
    try {
        // Primero obtenemos todas las mesas
        let query = 'SELECT id_mesa, numero_mesa, estado, precio_hora FROM mesa';
        let mesas = [];
        
        const [rows] = await pool.query(query);
        debug.info(`GET /api/mesas - Se encontraron ${rows.length} mesas en la base de datos`);
        
        if (rows.length === 0) {
            debug.info('GET /api/mesas - No hay mesas registradas en la base de datos.');
            return res.json([]);
        }
        
        mesas = [...rows];
        
        // Siempre obtener los alquileres activos para todas las mesas
        debug.info('GET /api/mesas - Consultando alquileres activos...');
        const [alquileresActivos] = await pool.query(
            'SELECT id_mesa, id_alquiler, hora_inicio, estado FROM alquiler WHERE estado = "Activo"'
        );
        debug.info(`GET /api/mesas - Se encontraron ${alquileresActivos.length} alquileres activos`);
        
        // --- NUEVO: Corregir múltiples alquileres activos por mesa ---
        // Agrupar alquileres activos por mesa
        const alquileresPorMesa = {};
        alquileresActivos.forEach(alquiler => {
            if (!alquileresPorMesa[alquiler.id_mesa]) alquileresPorMesa[alquiler.id_mesa] = [];
            alquileresPorMesa[alquiler.id_mesa].push(alquiler);
        });
        // Para cada mesa, si hay más de un alquiler activo, finalizar todos menos el más reciente
        for (const id_mesa in alquileresPorMesa) {
            const lista = alquileresPorMesa[id_mesa];
            if (lista.length > 1) {
                // Ordenar por hora_inicio descendente (más reciente primero)
                lista.sort((a, b) => new Date(b.hora_inicio) - new Date(a.hora_inicio));
                // Mantener solo el más reciente como activo
                const activosAEliminar = lista.slice(1);
                for (const alquiler of activosAEliminar) {
                    debug.mesa(id_mesa, 'corrigiendo múltiples alquileres activos', { id_alquiler: alquiler.id_alquiler });
                    await pool.query(
                        'UPDATE alquiler SET estado = "Finalizado", hora_fin = NOW() WHERE id_alquiler = ?',
                        [alquiler.id_alquiler]
                    );
                }
            }
        }
        // Volver a consultar alquileres activos después de la corrección
        const [alquileresActivosUnicos] = await pool.query(
            'SELECT id_mesa, id_alquiler, hora_inicio, estado FROM alquiler WHERE estado = "Activo"'
        );
        // Crear un mapa de alquileres activos por id_mesa para facilitar la búsqueda
        const mesasConAlquilerActivo = {};
        alquileresActivosUnicos.forEach(alquiler => {
            mesasConAlquilerActivo[alquiler.id_mesa] = {
                id_alquiler: alquiler.id_alquiler,
                hora_inicio: alquiler.hora_inicio
            };
            debug.mesa(alquiler.id_mesa, 'alquiler activo', { 
                id_alquiler: alquiler.id_alquiler, 
                hora_inicio: alquiler.hora_inicio 
            });
        });
        
        // Actualizar el estado de cada mesa según si tiene un alquiler activo
        for (const mesa of mesas) {
            const alquilerActivo = mesasConAlquilerActivo[mesa.id_mesa];
            
            if (alquilerActivo) {
                // Si tiene alquiler activo, asegurarse de que su estado sea "Ocupada"
                if (mesa.estado !== 'Ocupada') {
                    debug.mesa(mesa.id_mesa, 'corrigiendo estado', { 
                        estado_anterior: mesa.estado, 
                        nuevo_estado: 'Ocupada' 
                    });
                    await pool.query(
                        'UPDATE mesa SET estado = "Ocupada" WHERE id_mesa = ?',
                        [mesa.id_mesa]
                    );
                    mesa.estado = 'Ocupada';
                }
                
                // SIEMPRE incluir hora_inicio si hay un alquiler activo, sin importar el parámetro
                try {
                    // Mantener la hora_inicio exactamente como está en la base de datos
                    mesa.hora_inicio = alquilerActivo.hora_inicio;
                    debug.mesa(mesa.id_mesa, 'asignando hora_inicio', { 
                        hora_inicio: mesa.hora_inicio
                    });
                } catch (errFecha) {
                    debug.error(`Mesa ${mesa.id_mesa} - Error procesando hora_inicio`, errFecha);
                    mesa.hora_inicio = alquilerActivo.hora_inicio; // Usar el valor original en caso de error
                }
            } else {
                // Si no tiene alquiler activo pero está marcada como ocupada, corregir
                if (mesa.estado === 'Ocupada') {
                    debug.mesa(mesa.id_mesa, 'corrigiendo estado', { 
                        estado_anterior: mesa.estado, 
                        nuevo_estado: 'Disponible',
                        motivo: 'No tiene alquiler activo'
                    });
                    await pool.query(
                        'UPDATE mesa SET estado = "Disponible" WHERE id_mesa = ?',
                        [mesa.id_mesa]
                    );
                    mesa.estado = 'Disponible';
                }
            }
        }
        
        debug.info(`GET /api/mesas - Enviando respuesta con ${mesas.length} mesas`);
        res.json(mesas);
    } catch (err) {
        debug.error('GET /api/mesas', err);
        res.status(500).json({ success: false, message: 'Error al obtener las mesas.' });
    }
});

// Ruta para obtener alquileres activos
app.get('/api/alquileres/activos', async (req, res) => {
    debug.info(`GET /api/alquileres/activos - Consultando alquileres activos`);
    try {
        // Incluir hora_inicio en la respuesta
        const [rows] = await pool.query('SELECT id_mesa, id_alquiler, hora_inicio FROM alquiler WHERE estado = "Activo"');
        debug.info(`GET /api/alquileres/activos - Se encontraron ${rows.length} alquileres activos`);
        rows.forEach(alquiler => {
            debug.mesa(alquiler.id_mesa, 'alquiler activo encontrado', { 
                id_alquiler: alquiler.id_alquiler,
                hora_inicio: alquiler.hora_inicio
            });
        });
        res.json(rows);
    } catch (error) {
        debug.error('GET /api/alquileres/activos', error);
        res.status(500).json({ error: 'Error al obtener alquileres activos' });
    }
});

// Ruta para detalle de mesa (tiempo, pedidos, total)
app.get('/api/mesas/:id_mesa/detalle', async (req, res) => {
    const id_mesa = req.params.id_mesa;
    debug.info(`GET /api/mesas/${id_mesa}/detalle - Solicitando detalle de mesa`);
    
    try {
        // Info de la mesa
        debug.info(`GET /api/mesas/${id_mesa}/detalle - Consultando información básica de la mesa`);
        const [[mesa]] = await pool.query('SELECT numero_mesa, estado, precio_hora FROM mesa WHERE id_mesa = ?', [id_mesa]);
        if (!mesa) {
            debug.info(`GET /api/mesas/${id_mesa}/detalle - Mesa no encontrada`);
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }
        debug.mesa(id_mesa, 'encontrada', { 
            numero_mesa: mesa.numero_mesa, 
            estado: mesa.estado, 
            precio_hora: mesa.precio_hora 
        });

        // Primero verificar si hay un alquiler activo para esta mesa
        debug.info(`GET /api/mesas/${id_mesa}/detalle - Consultando alquileres activos para esta mesa`);
        const [alquilerActivoRows] = await pool.query(
            'SELECT id_alquiler, hora_inicio, estado FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa]
        );
        
        const tieneAlquilerActivo = alquilerActivoRows.length > 0;
        if (tieneAlquilerActivo) {
            debug.mesa(id_mesa, 'tiene alquiler activo', { 
                id_alquiler: alquilerActivoRows[0].id_alquiler,
                hora_inicio: alquilerActivoRows[0].hora_inicio
            });
        } else {
            debug.mesa(id_mesa, 'sin alquiler activo', {});
        }

        // Si hay alquiler activo pero la mesa no está marcada como ocupada, corregir
        if (tieneAlquilerActivo && mesa.estado !== 'Ocupada') {
            debug.mesa(id_mesa, 'corrigiendo estado', { 
                estado_anterior: mesa.estado, 
                nuevo_estado: 'Ocupada',
                motivo: 'Tiene alquiler activo'
            });
            await pool.query('UPDATE mesa SET estado = "Ocupada" WHERE id_mesa = ?', [id_mesa]);
            mesa.estado = 'Ocupada';
        }
        // Si NO hay alquiler activo pero la mesa está marcada como ocupada, corregir
        else if (!tieneAlquilerActivo && mesa.estado === 'Ocupada') {
            debug.mesa(id_mesa, 'corrigiendo estado', { 
                estado_anterior: mesa.estado, 
                nuevo_estado: 'Disponible',
                motivo: 'No tiene alquiler activo'
            });
            await pool.query('UPDATE mesa SET estado = "Disponible" WHERE id_mesa = ?', [id_mesa]);
            mesa.estado = 'Disponible';
        }

        // Obtener el alquiler activo (si existe)
        const alquiler = tieneAlquilerActivo ? alquilerActivoRows[0] : null;

        let tiempo = '00:00:00';
        let total_tiempo = 0;
        let id_alquiler = null;
        let hora_inicio = null;
        let hora_inicio_formateada = null;

        if (alquiler) {
            id_alquiler = alquiler.id_alquiler;
            hora_inicio = alquiler.hora_inicio;
            
            debug.mesa(id_mesa, 'calculando tiempo con hora guardada', { 
                hora_inicio: hora_inicio 
            });
            
            try {
                let inicio;
                // Convertir la hora_inicio a objeto Date para cálculos de tiempo
                if (typeof hora_inicio === 'string') {
                    // --- CORRECCIÓN DE ZONA HORARIA ---
                    // Si la hora_inicio termina en 'Z' o tiene formato ISO, úsala tal cual
                    // Si no, asume que es UTC y ajusta a la zona local de Colombia (-5)
                    if (hora_inicio.endsWith('Z')) {
                        inicio = new Date(hora_inicio);
                    } else if (hora_inicio.includes('T')) {
                        inicio = new Date(hora_inicio);
                    } else {
                        // MySQL DATETIME sin zona, asígnale GMT-5 (Colombia)
                        inicio = new Date(hora_inicio.replace(' ', 'T') + '-05:00');
                    }
                    debug.mesa(id_mesa, 'hora inicio string convertida', {
                        original: hora_inicio,
                        convertida: inicio.toISOString()
                    });
                } else {
                    inicio = new Date(hora_inicio);
                    debug.mesa(id_mesa, 'hora inicio objeto date', {
                        timestamp: inicio.getTime()
                    });
                }
                
                if (!isNaN(inicio.getTime())) {
                    hora_inicio_formateada = inicio.toLocaleTimeString('es-CO', { hour12: false });
                    const ahora = new Date();
                    let diffMs = ahora.getTime() - inicio.getTime();
                    
                    debug.mesa(id_mesa, 'cálculo de tiempo', {
                        hora_inicio_timestamp: inicio.getTime(),
                        hora_actual_timestamp: ahora.getTime(),
                        diferencia_ms: diffMs
                    });
                    
                    if (diffMs < 0) {
                        diffMs = 0;
                        debug.mesa(id_mesa, 'diferencia de tiempo negativa, ajustando a 0', {});
                    }
                    
                    // Calcular tiempo transcurrido
                    const diffSeg = Math.floor(diffMs / 1000);
                    const horas = Math.floor(diffSeg / 3600);
                    const minutos = Math.floor((diffSeg % 3600) / 60);
                    const segundos = diffSeg % 60;
                    tiempo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
                    total_tiempo = (diffSeg / 3600) * parseFloat(mesa.precio_hora);
                    
                    debug.mesa(id_mesa, 'tiempo calculado correctamente', { 
                        tiempo,
                        total_tiempo,
                        segundos_transcurridos: diffSeg
                    });
                } else {
                    debug.mesa(id_mesa, 'fecha inválida', { 
                        hora_inicio: hora_inicio
                    });
                }
            } catch (errTiempo) {
                debug.error(`Mesa ${id_mesa} - Error calculando tiempo`, errTiempo);
                tiempo = '00:00:00';
                total_tiempo = 0;
            }
        }

        // Pedidos de ese alquiler
        let pedidos = [];
        if (id_alquiler) {
            debug.info(`GET /api/mesas/${id_mesa}/detalle - Consultando pedidos para alquiler ${id_alquiler}`);
            const [pedidosRows] = await pool.query(
                `SELECT p.id_alquiler, p.cantidad, p.subtotal, p.hora_pedido, p.estado, 
                        pr.nombre AS nombre_producto, pr.categoria, pr.precio, pr.id_producto
                 FROM pedido p
                 JOIN producto pr ON p.id_producto = pr.id_producto
                 WHERE p.id_alquiler = ?
                 ORDER BY p.hora_pedido ASC`,
                [id_alquiler]
            );
            debug.info(`GET /api/mesas/${id_mesa}/detalle - Se encontraron ${pedidosRows.length} pedidos`);
            pedidos = pedidosRows.map(row => ({
                ...row,
                hora_pedido: (row.hora_pedido instanceof Date)
                    ? row.hora_pedido.toISOString()
                    : (typeof row.hora_pedido === 'string' ? row.hora_pedido : '')
            }));
        }

        // Asegurarse de que el estado refleje si hay alquiler activo
        const estado_real = tieneAlquilerActivo ? 'Ocupada' : mesa.estado;
        if (estado_real !== mesa.estado) {
            debug.mesa(id_mesa, 'estado inconsistente', { 
                estado_bd: mesa.estado,
                estado_real: estado_real,
                tiene_alquiler_activo: tieneAlquilerActivo
            });
        }

        debug.info(`GET /api/mesas/${id_mesa}/detalle - Enviando respuesta: hora_inicio=${hora_inicio}, tiempo=${tiempo}`);
        res.json({
            numero_mesa: mesa.numero_mesa,
            estado: estado_real,
            precio_hora: mesa.precio_hora,
            tiempo,
            total_tiempo,
            pedidos,
            hora_inicio,
            hora_inicio_formateada
        });
    } catch (err) {
        debug.error(`GET /api/mesas/${id_mesa}/detalle`, err);
        res.status(500).json({ error: 'Error al obtener detalle de la mesa' });
    }
});

// Ruta para iniciar un alquiler
app.post('/api/alquileres', async (req, res) => {
    const { id_mesa, id_usuario } = req.body;
    
    // Obtener la hora actual en Colombia/Bogotá usando Intl.DateTimeFormat
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    // El formato será: dd/MM/yyyy, HH:mm:ss
    const parts = formatter.formatToParts(now);
    const get = type => parts.find(p => p.type === type)?.value || '';
    // Formato MySQL DATETIME: YYYY-MM-DD HH:mm:ss
    const hora_inicio = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;

    debug.info(`POST /api/alquileres - Iniciando alquiler: mesa=${id_mesa}, usuario=${id_usuario}, hora=${hora_inicio}`);
    
    if (!id_mesa || !id_usuario) {
        debug.info(`POST /api/alquileres - Datos incompletos: mesa=${id_mesa}, usuario=${id_usuario}`);
        return res.status(400).json({ error: 'Datos incompletos para iniciar el alquiler' });
    }
    try {
        // Verificar si ya existe un alquiler activo para esta mesa
        const [alquileresActivos] = await pool.query(
            'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? AND estado = "Activo"',
            [id_mesa]
        );
        
        if (alquileresActivos.length > 0) {
            debug.mesa(id_mesa, 'error iniciar alquiler', { 
                error: 'Ya existe un alquiler activo',
                id_alquiler_existente: alquileresActivos[0].id_alquiler
            });
            return res.status(400).json({ error: 'Ya existe un alquiler activo para esta mesa' });
        }
        
        // Verificar si la mesa existe
        const [[mesaExiste]] = await pool.query('SELECT id_mesa FROM mesa WHERE id_mesa = ?', [id_mesa]);
        if (!mesaExiste) {
            debug.mesa(id_mesa, 'error iniciar alquiler', { error: 'La mesa no existe' });
            return res.status(400).json({ error: 'La mesa especificada no existe' });
        }
        
        // Crear el alquiler con la hora generada en el servidor
        debug.mesa(id_mesa, 'iniciando alquiler', { 
            id_usuario,
            hora_inicio
        });
        
        const [result] = await pool.query(
            'INSERT INTO alquiler (id_mesa, id_usuario, hora_inicio, estado) VALUES (?, ?, ?, "Activo")',
            [id_mesa, id_usuario, hora_inicio]
        );
        
        const id_alquiler = result.insertId;
        debug.mesa(id_mesa, 'alquiler creado', { 
            id_alquiler, 
            hora_inicio 
        });
        
        // Cambiar el estado de la mesa a "Ocupada"
        await pool.query(
            'UPDATE mesa SET estado = "Ocupada" WHERE id_mesa = ?',
            [id_mesa]
        );
        debug.mesa(id_mesa, 'estado actualizado', { nuevo_estado: 'Ocupada' });
        
        debug.mesa(id_mesa, 'alquiler iniciado', { 
            id_alquiler,
            hora_inicio,
            id_usuario
        });
        
        // Devolver la hora de inicio para que el cliente la conozca
        res.status(200).json({ 
            message: 'Alquiler iniciado y mesa ocupada', 
            id_alquiler,
            hora_inicio
        });
    } catch (error) {
        debug.error(`POST /api/alquileres - Mesa ${id_mesa}`, error);
        res.status(500).json({ error: 'Error al iniciar el alquiler', detalle: error.message });
    }
});

// Ruta para finalizar un alquiler activo de una mesa (FACTURACIÓN)
app.post('/api/alquileres/finalizar', async (req, res) => {
    const { id_mesa, metodo_pago, total_recibido, total_vuelto, id_usuario_cierre, recibidos } = req.body;
    if (!id_mesa) {
        return res.status(400).json({ success: false, message: 'Falta id_mesa' });
    }
    try {
        // 1. Busca el alquiler activo de la mesa
        const [alquilerRows] = await db.query(
            'SELECT * FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY id_alquiler DESC LIMIT 1',
            [id_mesa]
        );
        if (!alquilerRows.length) {
            return res.status(404).json({ success: false, message: 'No hay alquiler activo para esta mesa.' });
        }
        const alquiler = alquilerRows[0];

        // 2. Calcula total_tiempo (en dinero) y total_a_pagar
        const horaInicio = new Date(alquiler.hora_inicio);
        const horaFin = new Date();
        const diffMs = horaFin - horaInicio;
        const totalHoras = diffMs / (1000 * 60 * 60);
        let precioHora = alquiler.precio_hora;
        if (!precioHora) {
            const [mesaRows] = await db.query('SELECT precio_hora FROM mesa WHERE id_mesa = ?', [id_mesa]);
            precioHora = mesaRows[0]?.precio_hora || 6000;
        }
        const totalTiempo = +(totalHoras * precioHora).toFixed(2);

        // 3. Suma productos por pagar (pedidos de este alquiler con estado 'Por Pagar')
        const [pedidosRows] = await db.query(
            'SELECT subtotal FROM pedido WHERE id_alquiler = ? AND estado = "Por Pagar"',
            [alquiler.id_alquiler]
        );
        const totalProductos = pedidosRows.reduce((acc, p) => acc + parseFloat(p.subtotal), 0);

        const totalAPagar = totalTiempo + totalProductos;

        // 4. Finaliza el alquiler (actualiza estado y hora_fin)
        await db.query(
            `UPDATE alquiler SET 
                estado = "Finalizado", 
                hora_fin = NOW(),
                total_tiempo = ?, 
                total_a_pagar = ?,
                id_usuario_cierre = ?,
                fecha_cierre = NOW(),
                metodo_pago = ?,
                total_recibido = ?,
                total_vuelto = ?
            WHERE id_alquiler = ?`,
            [
                totalTiempo,
                totalAPagar,
                id_usuario_cierre || null,
                metodo_pago || '',
                total_recibido || 0,
                total_vuelto || 0,
                alquiler.id_alquiler
            ]
        );

        // 5. Cambia el estado de la mesa a Disponible
        await db.query(
            'UPDATE mesa SET estado = "Disponible" WHERE id_mesa = ?',
            [id_mesa]
        );

        // 6. Inserta la factura y los métodos de pago
        const { id_factura } = await crearFacturaYMetodosPago(db, {
            id_alquiler: alquiler.id_alquiler,
            id_usuario_cierre,
            metodo_pago,
            totalAPagar,
            total_recibido,
            total_vuelto,
            numero_mesa: alquiler.id_mesa,
            recibidos
        });

        res.json({ 
            success: true, 
            message: 'Alquiler finalizado y facturado correctamente.', 
            total_tiempo: totalTiempo, 
            total_a_pagar: totalAPagar,
            id_factura
        });
    } catch (err) {
        console.error('[API][POST /api/alquileres/finalizar] Error:', err);
        res.status(500).json({ success: false, message: 'Error interno al finalizar y facturar.', error: err.message });
    }
});

// --- UTILIDAD: Facturación y métodos de pago ---
async function crearFacturaYMetodosPago(db, {
    id_alquiler,
    id_usuario_cierre,
    metodo_pago,
    totalAPagar,
    total_recibido,
    total_vuelto,
    numero_mesa,
    recibidos // { metodo: valor, ... }
}) {
    // Inicia transacción
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insertar factura
        const [facturaResult] = await conn.query(
            `INSERT INTO factura 
                (id_alquiler, id_usuario, fecha, metodo_pago, total, total_recibido, total_vuelto, numero_mesa)
            VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
            [
                id_alquiler,
                id_usuario_cierre || null,
                metodo_pago || '',
                totalAPagar,
                total_recibido || 0,
                total_vuelto || 0,
                numero_mesa
            ]
        );
        const id_factura = facturaResult.insertId;

        // 2. Insertar métodos de pago
        if (recibidos && typeof recibidos === 'object') {
            for (const [metodo, valor] of Object.entries(recibidos)) {
                await conn.query(
                    'INSERT INTO factura_metodo_pago (id_factura, metodo_pago, valor) VALUES (?, ?, ?)',
                    [id_factura, metodo, valor]
                );
            }
        }

        await conn.commit();
        return { id_factura };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// Ruta para registrar un pedido
app.post('/api/pedidos', async (req, res) => {
    const { id_mesa, hora_pedido, productos } = req.body;
    if (!id_mesa || !hora_pedido || !Array.isArray(productos) || productos.length === 0) {
        console.error('[API][POST /api/pedidos] Datos incompletos:', { id_mesa, hora_pedido, productos });
        return res.status(400).json({ success: false, message: 'Datos incompletos para registrar el pedido.' });
    }
    try {
        // Buscar el alquiler activo de la mesa
        const [alquilerRows] = await pool.query(
            'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa]
        );
        if (alquilerRows.length === 0) {
            console.error(`[API][POST /api/pedidos] No hay alquiler activo para la mesa ${id_mesa}`);
            return res.status(400).json({ success: false, message: 'No hay un alquiler activo para esta mesa.' });
        }
        const id_alquiler = alquilerRows[0].id_alquiler;

        // Asegura el formato de hora_pedido: YYYY-MM-DD HH:mm:ss
        let horaPedidoSQL = hora_pedido;
        if (horaPedidoSQL.includes('T')) {
            horaPedidoSQL = horaPedidoSQL.replace('T', ' ').substring(0, 19);
        }

        // Insertar cada producto como pedido
        for (const prod of productos) {
            if (!prod.id_producto || !prod.cantidad || !prod.subtotal) {
                console.error('[API][POST /api/pedidos] Producto inválido:', prod);
                continue;
            }
            // --- Asegúrate de que subtotal y hora_pedido se guardan correctamente ---
            await pool.query(
                'INSERT INTO pedido (id_alquiler, id_producto, hora_pedido, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)',
                [id_alquiler, prod.id_producto, horaPedidoSQL, prod.cantidad, prod.subtotal]
            );
            console.log(`[API][POST /api/pedidos] Pedido insertado: mesa ${id_mesa}, alquiler ${id_alquiler}, producto ${prod.id_producto}, cantidad ${prod.cantidad}, subtotal ${prod.subtotal}, hora_pedido ${horaPedidoSQL}`);
        }
        res.json({ success: true, message: 'Pedido registrado exitosamente.' });
    } catch (err) {
        console.error('[API][POST /api/pedidos] Error al registrar el pedido:', err);
        res.status(500).json({ success: false, message: 'Error al registrar el pedido.', detalle: err.message });
    }
});

// Eliminar un producto de una pedida (pedido)
app.delete('/api/pedidos/:id_pedido', async (req, res) => {
    const { id_pedido } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM pedido WHERE id_pedido = ?', [id_pedido]);
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Producto eliminado de la pedida.' });
        } else {
            res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al eliminar el producto de la pedida.' });
    }
});

// API para agregar producto a una pedida existente (por hora_pedido y alquiler activo)
app.post('/api/pedidas/agregar-producto', async (req, res) => {
    try {
        const { id_mesa, key_pedida, id_producto, cantidad, subtotal } = req.body;
        if (!id_mesa || !key_pedida || !id_producto || !cantidad || !subtotal) {
            return res.status(400).json({ error: 'Datos incompletos para agregar producto a la pedida.' });
        }

        // 1. Buscar el alquiler activo para la mesa
        const [alquilerRows] = await pool.query(
            'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa]
        );
        if (alquilerRows.length === 0) {
            console.error(`[API][agregar-producto] No hay alquiler activo para la mesa ${id_mesa}`);
            return res.status(400).json({ error: 'No hay alquiler activo para esta mesa' });
        }
        const id_alquiler = alquilerRows[0].id_alquiler;

        // 2. Verifica si ya existe ese producto en esa pedida (hora_pedido redondeada a minutos)
        let whereHora = '';
        let params = [id_alquiler, id_producto];
        if (key_pedida.length === 16) { // 'YYYY-MM-DD HH:mm'
            whereHora = 'LEFT(hora_pedido, 16) = ?';
            params.push(key_pedida);
        } else if (key_pedida.length === 19) { // 'YYYY-MM-DD HH:mm:ss'
            whereHora = 'LEFT(hora_pedido, 19) = ?';
            params.push(key_pedida);
        } else {
            whereHora = 'DATE(hora_pedido) = DATE(?)';
            params.push(key_pedida);
        }

        const [pedidoRows] = await pool.query(
            `SELECT id_pedido, cantidad, subtotal FROM pedido 
             WHERE id_alquiler = ? AND id_producto = ? AND ${whereHora}
             ORDER BY hora_pedido ASC LIMIT 1`,
            params
        );

        if (pedidoRows.length > 0) {
            // Si ya existe, suma la cantidad y el subtotal
            const pedido = pedidoRows[0];
            await pool.query(
                'UPDATE pedido SET cantidad = cantidad + ?, subtotal = subtotal + ? WHERE id_pedido = ?',
                [cantidad, subtotal, pedido.id_pedido]
            );
        } else {
            // Si no existe, inserta el nuevo producto en la pedida
            // Usa la hora_pedido original (key_pedida + ":00" si solo tiene minutos)
            let hora_pedido = key_pedida;
            if (hora_pedido.length === 16) hora_pedido += ':00';
            await pool.query(
                'INSERT INTO pedido (id_alquiler, id_producto, hora_pedido, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)',
                [id_alquiler, id_producto, hora_pedido, cantidad, subtotal]
            );
        }

        res.json({ ok: true, message: 'Producto agregado a la pedida correctamente.' });
    } catch (err) {
        console.error('Error en /api/pedidas/agregar-producto:', err);
        res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

// API para eliminar producto de una pedida
app.post('/api/pedidas/eliminar-producto', async (req, res) => {
    try {
        const { id_mesa, key_pedida, id_producto, cantidad } = req.body;

        // 1. Buscar el alquiler activo para la mesa
        const [alquilerRows] = await pool.query(
            'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa]
        );
        if (alquilerRows.length === 0) {
            console.error(`[API][eliminar-producto] No hay alquiler activo para la mesa ${id_mesa}`);
            return res.status(400).json({ error: 'No hay alquiler activo para esta mesa' });
        }
        const id_alquiler = alquilerRows[0].id_alquiler;

        // 2. Buscar el pedido correspondiente a la pedida (key_pedida = hora_pedido redondeada a minutos) y producto
        // Mejorar la comparación de hora_pedido: si key_pedida no tiene segundos, compara solo hasta minutos
        // Si key_pedida tiene segundos, compara hasta segundos
        let whereHora = '';
        let params = [id_alquiler, id_producto];
        if (key_pedida.length === 16) { // 'YYYY-MM-DD HH:mm'
            whereHora = 'LEFT(hora_pedido, 16) = ?';
            params.push(key_pedida);
        } else if (key_pedida.length === 19) { // 'YYYY-MM-DD HH:mm:ss'
            whereHora = 'LEFT(hora_pedido, 19) = ?';
            params.push(key_pedida);
        } else {
            // fallback: compara solo fecha
            whereHora = 'DATE(hora_pedido) = DATE(?)';
            params.push(key_pedida);
        }

        const [pedidoRows] = await pool.query(
            `SELECT id_pedido, cantidad, hora_pedido FROM pedido 
             WHERE id_alquiler = ? AND id_producto = ? AND ${whereHora}
             ORDER BY hora_pedido ASC LIMIT 1`,
            params
        );
        if (pedidoRows.length === 0) {
            console.error(`[API][eliminar-producto] Producto no encontrado en la pedida. 
                Parámetros: id_mesa=${id_mesa}, id_alquiler=${id_alquiler}, id_producto=${id_producto}, key_pedida=${key_pedida}`);
            // Log de todos los pedidos de ese alquiler para depuración
            const [debugPedidos] = await pool.query(
                'SELECT id_pedido, id_producto, cantidad, hora_pedido FROM pedido WHERE id_alquiler = ?',
                [id_alquiler]
            );
            console.error(`[API][eliminar-producto] Pedidos actuales para alquiler ${id_alquiler}:`, debugPedidos);
            return res.status(404).json({ error: 'Producto no encontrado en la pedida' });
        }
        const pedido = pedidoRows[0];

        // 3. Si la cantidad a eliminar es menor que la cantidad actual, solo resta
        if (pedido.cantidad > cantidad) {
            await pool.query(
                'UPDATE pedido SET cantidad = cantidad - ?, subtotal = subtotal * (cantidad - ?) / cantidad WHERE id_pedido = ?',
                [cantidad, cantidad, pedido.id_pedido]
            );
        } else {
            // Si la cantidad es igual o mayor, elimina el pedido
            await pool.query('DELETE FROM pedido WHERE id_pedido = ?', [pedido.id_pedido]);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('Error en /api/pedidas/eliminar-producto:', err);
        res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
    }
});

// API para descontar producto de una pedida (restar cantidad y subtotal)
app.post('/api/pedidas/descontar-producto', async (req, res) => {
    try {
        const { id_mesa, key_pedida, id_producto, cantidad } = req.body;
        if (!id_mesa || !key_pedida || !id_producto || !cantidad) {
            return res.status(400).json({ error: 'Datos incompletos para descontar producto de la pedida.' });
        }

        // Buscar el alquiler activo para la mesa
        const [alquilerRows] = await pool.query(
            'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa]
        );
        if (alquilerRows.length === 0) {
            return res.status(400).json({ error: 'No hay alquiler activo para esta mesa' });
        }
        const id_alquiler = alquilerRows[0].id_alquiler;

        // Buscar el pedido correspondiente
        let whereHora = '';
        let params = [id_alquiler, id_producto];
        if (key_pedida.length === 16) { // 'YYYY-MM-DD HH:mm'
            whereHora = 'LEFT(hora_pedido, 16) = ?';
            params.push(key_pedida);
        } else if (key_pedida.length === 19) { // 'YYYY-MM-DD HH:mm:ss'
            whereHora = 'LEFT(hora_pedido, 19) = ?';
            params.push(key_pedida);
        } else {
            whereHora = 'DATE(hora_pedido) = DATE(?)';
            params.push(key_pedida);
        }

        const [pedidoRows] = await pool.query(
            `SELECT id_pedido, cantidad, subtotal FROM pedido 
             WHERE id_alquiler = ? AND id_producto = ? AND ${whereHora}
             ORDER BY hora_pedido ASC LIMIT 1`,
            params
        );
        if (pedidoRows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en la pedida' });
        }
        const pedido = pedidoRows[0];

        // Calcular el nuevo subtotal proporcional
        const cantidadDescontar = Math.min(Number(cantidad), pedido.cantidad);
        const precioUnitario = pedido.subtotal / pedido.cantidad;
        const subtotalDescontar = precioUnitario * cantidadDescontar;

        if (pedido.cantidad > cantidadDescontar) {
            // Resta cantidad y subtotal
            await pool.query(
                'UPDATE pedido SET cantidad = cantidad - ?, subtotal = subtotal - ? WHERE id_pedido = ?',
                [cantidadDescontar, subtotalDescontar, pedido.id_pedido]
            );
        } else {
            // Si la cantidad a descontar es igual o mayor, elimina el pedido
            await pool.query('DELETE FROM pedido WHERE id_pedido = ?', [pedido.id_pedido]);
        }

        res.json({ ok: true, message: 'Producto descontado correctamente.' });
    } catch (err) {
        console.error('Error en /api/pedidas/descontar-producto:', err);
        res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
    }
});

// Ejemplo de función (ajusta según tu base de datos)
async function eliminarProductoDePedida(id_mesa, key_pedida, id_producto, cantidad) {
    // Implementa aquí la lógica real con tu base de datos
    // Devuelve { success: true } o { success: false, error: '...' }
    // Esto es solo un ejemplo simulado:
    try {
        // ...tu lógica de eliminación...
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// API para marcar una pedida como pagada
app.post('/api/pedidos/marcar-pedida-pagada', async (req, res) => {
    const { id_alquiler, hora_pedido, estado } = req.body;
    if (!id_alquiler || !hora_pedido || !estado) {
        console.error('[API][marcar-pedida-pagada] Faltan datos:', req.body);
        return res.status(400).json({ error: 'Faltan datos' });
    }
    if (estado !== 'Ya Pagada' && estado !== 'Por Pagar') {
        console.error('[API][marcar-pedida-pagada] Estado inválido:', estado);
        return res.status(400).json({ error: 'Estado inválido' });
    }
    try {
        const idAlquilerNum = Number(id_alquiler);
        if (isNaN(idAlquilerNum)) {
            console.error('[API][marcar-pedida-pagada] id_alquiler no es un número:', id_alquiler);
            return res.status(400).json({ error: 'id_alquiler inválido' });
        }
        // Convertir hora_pedido a objeto Date y ajustar a zona horaria local (Bogotá)
        let horaJs = hora_pedido;
        if (horaJs.includes('T')) horaJs = horaJs.replace('Z', '');
        let fechaReferencia = new Date(horaJs);
        // Ajustar a hora local si viene en UTC
        if (hora_pedido.endsWith('Z')) {
            // Bogotá es UTC-5
            fechaReferencia = new Date(fechaReferencia.getTime() - (5 * 60 * 60 * 1000));
        }
        if (isNaN(fechaReferencia.getTime())) {
            console.error('[API][marcar-pedida-pagada] hora_pedido inválida:', hora_pedido);
            return res.status(400).json({ error: 'hora_pedido inválida' });
        }
        // Buscar todos los pedidos de ese alquiler y comparar minuto en hora local
        const [pedidos] = await pool.query(
            `SELECT id_pedido, hora_pedido FROM pedido WHERE id_alquiler=?`,
            [idAlquilerNum]
        );
        let idsActualizar = [];
        pedidos.forEach(p => {
            // Convertir la hora de la BD a objeto Date en local
            let fechaBd = new Date(p.hora_pedido);
            // Si la hora de la BD está en UTC, ajusta a local
            if (typeof p.hora_pedido === 'string' && p.hora_pedido.endsWith('Z')) {
                fechaBd = new Date(fechaBd.getTime() - (5 * 60 * 60 * 1000));
            }
            if (
                fechaBd.getFullYear() === fechaReferencia.getFullYear() &&
                fechaBd.getMonth() === fechaReferencia.getMonth() &&
                fechaBd.getDate() === fechaReferencia.getDate() &&
                fechaBd.getHours() === fechaReferencia.getHours() &&
                fechaBd.getMinutes() === fechaReferencia.getMinutes()
            ) {
                idsActualizar.push(p.id_pedido);
            }
        });
        if (idsActualizar.length === 0) {
            console.error('[API][marcar-pedida-pagada] No se encontró ninguna pedida para actualizar. id_alquiler:', idAlquilerNum, 'hora_pedido:', hora_pedido, 'hora_pedido_local:', fechaReferencia.toISOString());
            return res.status(404).json({ error: 'No se encontró la pedida para actualizar' });
        }
        // Actualizar todos los pedidos encontrados
        const [result] = await pool.query(
            `UPDATE pedido SET estado=? WHERE id_pedido IN (${idsActualizar.map(() => '?').join(',')})`,
            [estado, ...idsActualizar]
        );
        console.log(`[API][marcar-pedida-pagada] Estado actualizado correctamente a ${estado}. id_alquiler: ${idAlquilerNum}, pedidos afectados: ${idsActualizar.join(', ')}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[API][marcar-pedida-pagada] Error en la consulta:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS DE ESTADÍSTICAS PARA DASHBOARD ---

// Ventas del día
app.get('/api/estadisticas/ventas-dia', async (req, res) => {
    try {
        let fechaHoy = req.query.fecha;
        if (!fechaHoy) {
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            fechaHoy = `${yyyy}-${mm}-${dd}`;
        }
        // SIN CONVERT_TZ si ya está en hora local
        const [rows] = await pool.query(
            `SELECT SUM(subtotal) AS ventas FROM pedido WHERE DATE(hora_pedido) = ?`, [fechaHoy]
        );
        console.log(`[API][ventas-dia] Fecha consultada: ${fechaHoy}`);
        console.log(`[API][ventas-dia] Resultado SQL:`, rows);
        if (!rows || !rows.length) {
            console.error('[API][ventas-dia] No se obtuvo ningún resultado de la consulta SQL.');
            return res.json({ ventas: 0 });
        }
        res.json({ ventas: rows[0].ventas || 0 });
    } catch (err) {
        console.error('[API][ventas-dia] Error en la consulta SQL:', err);
        res.status(500).json({ ventas: 0, error: err.message });
    }
});

// Ganancia neta diaria/semanal/mensual
app.get('/api/estadisticas/ganancia-neta', async (req, res) => {
    try {
        const periodo = req.query.periodo || 'dia';
        let fechaInicio = null;
        const hoy = new Date();
        if (periodo === 'dia') {
            fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        } else if (periodo === 'semana') {
            const diaSemana = hoy.getDay();
            fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diaSemana);
        } else if (periodo === 'mes') {
            fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        } else {
            return res.status(400).json({ ganancia: 0, error: 'Periodo inválido' });
        }
        const yyyy = fechaInicio.getFullYear();
        const mm = String(fechaInicio.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaInicio.getDate()).padStart(2, '0');
        const fechaIniStr = `${yyyy}-${mm}-${dd}`;
        // Suma de ventas y costos desde la fecha de inicio
        // Suponiendo que tienes una columna "costos" en la tabla pedido (si no, pon 0)
        const [rows] = await pool.query(
            `SELECT SUM(subtotal) AS ventas, SUM(0) AS costos FROM pedido WHERE DATE(hora_pedido) >= ?`, [fechaIniStr]
        );
        const ventas = rows[0].ventas || 0;
        const costos = rows[0].costos || 0;
        res.json({ ganancia: ventas - costos });
    } catch (err) {
        res.status(500).json({ ganancia: 0, error: err.message });
    }
});

// Ventas por mes (últimos 6 meses)
app.get('/api/estadisticas/ventas-mes', async (req, res) => {
    try {
        // Suma de ventas agrupadas por mes (últimos 6 meses)
        const [rows] = await pool.query(`
            SELECT DATE_FORMAT(hora_pedido, '%Y-%m') AS mes, SUM(subtotal) AS ventas
            FROM pedido
            WHERE hora_pedido >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY mes
            ORDER BY mes ASC
        `);
        // Formatea el mes a nombre legible
        const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const datos = rows.map(r => {
            const [anio, mes] = r.mes.split('-');
            return {
                mes: `${mesesNombres[parseInt(mes,10)-1]} ${anio}`,
                ventas: r.ventas || 0
            };
        });
        res.json(datos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tendencias de consumo por hora y día de la semana
app.get('/api/estadisticas/tendencias-hora-dia', async (req, res) => {
    try {
        // Crea una matriz de 16 horas (8am a 23pm) x 7 días (domingo a sábado)
        const horas = Array.from({length: 16}, (_, i) => (8 + i).toString().padStart(2, '0') + ':00');
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        // Inicializa la matriz
        const tendencias = Array.from({length: 16}, () => Array(7).fill(0));
        // Consulta todos los pedidos del último mes
        const [rows] = await pool.query(`
            SELECT hora_pedido FROM pedido
            WHERE hora_pedido >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        `);
        rows.forEach(row => {
            const fecha = new Date(row.hora_pedido);
            const hora = fecha.getHours();
            const dia = fecha.getDay();
            if (hora >= 8 && hora <= 23) {
                tendencias[hora - 8][dia]++;
            }
        });
        res.json({ horas, dias, tendencias });
    } catch (err) {
        res.status(500).json({ horas: [], dias: [], tendencias: [], error: err.message });
    }
});

// --- NUEVA RUTA: Ventas del día por mesa ---
app.get('/api/estadisticas/ventas-dia-por-mesa', async (req, res) => {
    try {
        let fechaHoy = req.query.fecha;
        if (!fechaHoy) {
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            fechaHoy = `${yyyy}-${mm}-${dd}`;
        }
        // Consulta: suma de ventas por mesa en el día
        const [rows] = await pool.query(`
            SELECT m.numero_mesa, m.id_mesa, SUM(p.subtotal) AS total_ventas
            FROM pedido p
            JOIN alquiler a ON p.id_alquiler = a.id_alquiler
            JOIN mesa m ON a.id_mesa = m.id_mesa
            WHERE DATE(p.hora_pedido) = ?
            GROUP BY m.id_mesa, m.numero_mesa
            ORDER BY m.numero_mesa ASC
        `, [fechaHoy]);

        // Devuelve un array: [{ id_mesa, numero_mesa, total_ventas }]
        res.json(rows.map(r => ({
            id_mesa: r.id_mesa,
            numero_mesa: r.numero_mesa,
            total_ventas: Number(r.total_ventas) || 0
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NUEVO: Ventas por semana por mesa ---
app.get('/api/estadisticas/ventas-semana-por-mesa', async (req, res) => {
    try {
        // Calcular el inicio de la semana actual (domingo)
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diaSemana);
        const yyyy = fechaInicio.getFullYear();
        const mm = String(fechaInicio.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaInicio.getDate()).padStart(2, '0');
        const fechaIniStr = `${yyyy}-${mm}-${dd}`;
        // Consulta: suma de ventas por mesa en la semana
        const [rows] = await pool.query(`
            SELECT m.numero_mesa, m.id_mesa, SUM(p.subtotal) AS total_ventas
            FROM pedido p
            JOIN alquiler a ON p.id_alquiler = a.id_alquiler
            JOIN mesa m ON a.id_mesa = m.id_mesa
            WHERE DATE(p.hora_pedido) >= ?
            GROUP BY m.id_mesa, m.numero_mesa
            ORDER BY m.numero_mesa ASC
        `, [fechaIniStr]);
        res.json(rows.map(r => ({
            id_mesa: r.id_mesa,
            numero_mesa: r.numero_mesa,
            total_ventas: Number(r.total_ventas) || 0
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NUEVO: Ventas por mes por mesa ---
app.get('/api/estadisticas/ventas-mes-por-mesa', async (req, res) => {
    try {
        // Calcular el inicio del mes actual
        const hoy = new Date();
        const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const yyyy = fechaInicio.getFullYear();
        const mm = String(fechaInicio.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaInicio.getDate()).padStart(2, '0');
        const fechaIniStr = `${yyyy}-${mm}-${dd}`;
        // Consulta: suma de ventas por mesa en el mes
        const [rows] = await pool.query(`
            SELECT m.numero_mesa, m.id_mesa, SUM(p.subtotal) AS total_ventas
            FROM pedido p
            JOIN alquiler a ON p.id_alquiler = a.id_alquiler
            JOIN mesa m ON a.id_mesa = m.id_mesa
            WHERE DATE(p.hora_pedido) >= ?
            GROUP BY m.id_mesa, m.numero_mesa
            ORDER BY m.numero_mesa ASC
        `, [fechaIniStr]);
        res.json(rows.map(r => ({
            id_mesa: r.id_mesa,
            numero_mesa: r.numero_mesa,
            total_ventas: Number(r.total_ventas) || 0
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ENDPOINT DE DEPURACIÓN: Ver todos los pedidos del día con detalle ---
app.get('/api/estadisticas/debug-pedidos-dia', async (req, res) => {
    try {
        let fechaHoy = req.query.fecha;
        if (!fechaHoy) {
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            fechaHoy = `${yyyy}-${mm}-${dd}`;
        }
        const [rows] = await pool.query(`
            SELECT p.*, a.id_mesa, m.numero_mesa, pr.nombre AS nombre_producto
            FROM pedido p
            JOIN alquiler a ON p.id_alquiler = a.id_alquiler
            JOIN mesa m ON a.id_mesa = m.id_mesa
            JOIN producto pr ON p.id_producto = pr.id_producto
            WHERE DATE(p.hora_pedido) = ?
            ORDER BY p.hora_pedido ASC
        `, [fechaHoy]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para registrar un gasto
app.post('/api/gastos', async (req, res) => {
    const { fecha, descripcion, monto, categoria } = req.body;
    if (!fecha || !monto) {
        return res.status(400).json({ success: false, message: 'Fecha y monto son obligatorios.' });
    }
    try {
        await pool.query(
            'INSERT INTO gasto (fecha, descripcion, monto, categoria) VALUES (?, ?, ?, ?)',
            [fecha, descripcion, monto, categoria]
        );
        res.json({ success: true, message: 'Gasto registrado correctamente.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al registrar el gasto.', detalle: err.message });
    }
});

// Depuración: Ver todos los pedidos (sin filtro de fecha)
app.get('/api/estadisticas/debug-todos-pedidos', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id_pedido, hora_pedido, subtotal FROM pedido ORDER BY hora_pedido DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NUEVO: Variación de ventas de hoy vs ayer
app.get('/api/estadisticas/variacion-ventas-dia', async (req, res) => {
    try {
        // Fecha de hoy y ayer
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        const fechaHoy = `${yyyy}-${mm}-${dd}`;
        const ayerDate = new Date(hoy);
        ayerDate.setDate(hoy.getDate() - 1);
        const yyyyA = ayerDate.getFullYear();
        const mmA = String(ayerDate.getMonth() + 1).padStart(2, '0');
        const ddA = String(ayerDate.getDate()).padStart(2, '0');
        const fechaAyer = `${yyyyA}-${mmA}-${ddA}`;

        // Consulta ventas de hoy y ayer
        const [[{ ventasHoy }]] = await pool.query(
            `SELECT SUM(subtotal) AS ventasHoy FROM pedido WHERE DATE(hora_pedido) = ?`, [fechaHoy]
        );
        const [[{ ventasAyer }]] = await pool.query(
            `SELECT SUM(subtotal) AS ventasAyer FROM pedido WHERE DATE(hora_pedido) = ?`, [fechaAyer]
        );

        let variacion = 0;
        if (ventasAyer > 0) {
            variacion = ((ventasHoy - ventasAyer) / ventasAyer) * 100;
        }
        res.json({
            ventasHoy: ventasHoy || 0,
            ventasAyer: ventasAyer || 0,
            variacion: variacion
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NUEVO: Variación de ventas por periodo (día, semana, mes)
app.get('/api/estadisticas/variacion-ventas', async (req, res) => {
    try {
        const periodo = req.query.periodo || 'dia';
        const hoy = new Date();
        let fechaActualIni, fechaAnteriorIni, fechaAnteriorFin;

        if (periodo === 'dia') {
            // Hoy y ayer
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            fechaActualIni = `${yyyy}-${mm}-${dd}`;
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            const yyyyA = ayer.getFullYear();
            const mmA = String(ayer.getMonth() + 1).padStart(2, '0');
            const ddA = String(ayer.getDate()).padStart(2, '0');
            fechaAnteriorIni = `${yyyyA}-${mmA}-${ddA}`;
            fechaAnteriorFin = fechaAnteriorIni;
        } else if (periodo === 'semana') {
            // Semana actual (desde domingo) y semana anterior
            const diaSemana = hoy.getDay();
            const actualIni = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diaSemana);
            const anteriorIni = new Date(actualIni);
            anteriorIni.setDate(actualIni.getDate() - 7);
            const anteriorFin = new Date(actualIni);
            anteriorFin.setDate(anteriorIni.getDate() + 6);

            const yyyy = actualIni.getFullYear();
            const mm = String(actualIni.getMonth() + 1).padStart(2, '0');
            const dd = String(actualIni.getDate()).padStart(2, '0');
            fechaActualIni = `${yyyy}-${mm}-${dd}`;

            const yyyyA = anteriorIni.getFullYear();
            const mmA = String(anteriorIni.getMonth() + 1).padStart(2, '0');
            const ddA = String(anteriorIni.getDate()).padStart(2, '0');
            fechaAnteriorIni = `${yyyyA}-${mmA}-${ddA}`;

            const yyyyAF = anteriorFin.getFullYear();
            const mmAF = String(anteriorFin.getMonth() + 1).padStart(2, '0');
            const ddAF = String(anteriorFin.getDate()).padStart(2, '0');
            fechaAnteriorFin = `${yyyyAF}-${mmAF}-${ddAF}`;
        } else if (periodo === 'mes') {
            // Mes actual y mes anterior
            const actualIni = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const anteriorIni = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            const anteriorFin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

            const yyyy = actualIni.getFullYear();
            const mm = String(actualIni.getMonth() + 1).padStart(2, '0');
            const dd = String(actualIni.getDate()).padStart(2, '0');
            fechaActualIni = `${yyyy}-${mm}-${dd}`;

            const yyyyA = anteriorIni.getFullYear();
            const mmA = String(anteriorIni.getMonth() + 1).padStart(2, '0');
            const ddA = String(anteriorIni.getDate()).padStart(2, '0');
            fechaAnteriorIni = `${yyyyA}-${mmA}-${ddA}`;

            const yyyyAF = anteriorFin.getFullYear();
            const mmAF = String(anteriorFin.getMonth() + 1).padStart(2, '0');
            const ddAF = String(anteriorFin.getDate()).padStart(2, '0');
            fechaAnteriorFin = `${yyyyAF}-${mmAF}-${ddAF}`;
        } else {
            return res.status(400).json({ error: 'Periodo inválido' });
        }

        let ventasActual = 0, ventasAnterior = 0;
        if (periodo === 'dia') {
            const [[{ ventasHoy }]] = await pool.query(
                `SELECT SUM(subtotal) AS ventasHoy FROM pedido WHERE DATE(hora_pedido) = ?`, [fechaActualIni]
            );
            const [[{ ventasAyer }]] = await pool.query(
                `SELECT SUM(subtotal) AS ventasAyer FROM pedido WHERE DATE(hora_pedido) = ?`, [fechaAnteriorIni]
            );
            ventasActual = ventasHoy || 0;
            ventasAnterior = ventasAyer || 0;
        } else {
            // Para semana y mes: BETWEEN fechaIni AND fechaFin
            const [[{ ventasActualSum }]] = await pool.query(
                `SELECT SUM(subtotal) AS ventasActualSum FROM pedido WHERE DATE(hora_pedido) >= ?`, [fechaActualIni]
            );
            const [[{ ventasAnteriorSum }]] = await pool.query(
                `SELECT SUM(subtotal) AS ventasAnteriorSum FROM pedido WHERE DATE(hora_pedido) BETWEEN ? AND ?`, [fechaAnteriorIni, fechaAnteriorFin]
            );
            ventasActual = ventasActualSum || 0;
            ventasAnterior = ventasAnteriorSum || 0;
        }

        let variacion = 0;
        if (ventasAnterior > 0) {
            variacion = ((ventasActual - ventasAnterior) / ventasAnterior) * 100;
        }
        res.json({
            ventasActual,
            ventasAnterior,
            variacion
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Productos/bebidas más vendidos por periodo y consejos financieros
app.get('/api/estadisticas/top-productos', async (req, res) => {
    try {
        const periodo = req.query.periodo || 'mes';
        const hoy = new Date();
        let fechaIni, fechaFin;

        if (periodo === 'dia') {
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            fechaIni = `${yyyy}-${mm}-${dd}`;
            fechaFin = fechaIni;
        } else if (periodo === 'semana') {
            const diaSemana = hoy.getDay();
            const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diaSemana);
            const yyyy = inicio.getFullYear();
            const mm = String(inicio.getMonth() + 1).padStart(2, '0');
            const dd = String(inicio.getDate()).padStart(2, '0');
            fechaIni = `${yyyy}-${mm}-${dd}`;
            fechaFin = null;
        } else { // mes
            const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const yyyy = inicio.getFullYear();
            const mm = String(inicio.getMonth() + 1).padStart(2, '0');
            const dd = String(inicio.getDate()).padStart(2, '0');
            fechaIni = `${yyyy}-${mm}-${dd}`;
            fechaFin = null;
        }

        let where = '';
        let params = [];
        // CORRECCIÓN: la tabla es pedido, no p.hora_pedido
        if (periodo === 'dia') {
            where = 'DATE(pedido.hora_pedido) = ?';
            params = [fechaIni];
        } else if (periodo === 'semana' || periodo === 'mes') {
            where = 'DATE(pedido.hora_pedido) >= ?';
            params = [fechaIni];
        }

        // Top 5 productos/bebidas más vendidos por cantidad
        const [rows] = await pool.query(`
            SELECT pr.nombre, pr.categoria, SUM(pedido.cantidad) AS total_cantidad, SUM(pedido.subtotal) AS total_ventas
            FROM pedido
            JOIN producto pr ON pedido.id_producto = pr.id_producto
            WHERE ${where}
            GROUP BY pr.id_producto
            HAVING total_cantidad > 0
            ORDER BY total_cantidad DESC, total_ventas DESC
            LIMIT 5
        `, params);

        if (!rows || rows.length === 0) {
            return res.json({ top: [] });
        }

        function consejoFinanciero(producto) {
            if (!producto) return '';
            if (producto.categoria && producto.categoria.toLowerCase().includes('cerveza')) {
                return '💡 Si la cerveza es tu producto estrella, considera combos o promociones en horas valle.';
            }
            if (producto.categoria && producto.categoria.toLowerCase().includes('gaseosa')) {
                return '💡 Las gaseosas suelen tener buen margen. ¿Puedes negociar mejor precio con el proveedor?';
            }
            if (producto.categoria && producto.categoria.toLowerCase().includes('cigarrillo')) {
                return '💡 Los cigarrillos atraen clientes, pero revisa el margen y la rotación de inventario.';
            }
            if (producto.categoria && producto.categoria.toLowerCase().includes('paqueteria')) {
                return '💡 Los snacks pueden ser impulso. Ubícalos cerca de la barra o caja para aumentar ventas.';
            }
            return '💡 Analiza si puedes aumentar el margen o rotación de este producto.';
        }

        const top = rows.map(p => ({
            nombre: p.nombre,
            categoria: p.categoria,
            total_cantidad: Number(p.total_cantidad) || 0,
            total_ventas: Number(p.total_ventas) || 0,
            consejo: consejoFinanciero(p)
        }));

        res.json({ top });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nueva API: Días con más ventas del mes
app.get('/api/dias-mas-ventas', async (req, res) => {
    try {
        // Obtener ventas por día del mes actual
        const [rows] = await pool.query(`
            SELECT 
                DAY(hora_pedido) AS dia,
                SUM(subtotal - descuento) AS total
            FROM pedido
            WHERE MONTH(hora_pedido) = MONTH(CURDATE())
              AND YEAR(hora_pedido) = YEAR(CURDATE())
            GROUP BY dia
        `);

        // Armar array de días del mes
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();
        const diasMes = new Date(anio, mes + 1, 0).getDate();
        let resumen = Array.from({ length: diasMes }, (_, i) => ({
            dia: i + 1,
            total: 0
        }));

        rows.forEach(r => {
            resumen[r.dia - 1].total = Number(r.total);
        });

        // Calcular promedio y niveles
        const totales = resumen.map(r => r.total).filter(t => t > 0);
        const avg = totales.length ? totales.reduce((a, b) => a + b, 0) / totales.length : 0;
        const max = Math.max(...totales, 0);

        resumen = resumen.map(r => {
            let nivel = 'normal';
            if (r.total >= avg * 1.3) nivel = 'alta';
            else if (r.total <= avg * 0.7 && r.total > 0) nivel = 'baja';
            else if (r.total === 0) nivel = 'sin';
            return { ...r, nivel };
        });

        // Asesoramiento simple
        let consejo = '';
        if (max > avg * 1.5) {
            consejo = '¡Tienes días con altísima demanda! Aprovecha para hacer promociones esos días y fidelizar clientes. Los días bajos pueden ser ideales para ofertas especiales o eventos que atraigan público.';
        } else {
            consejo = 'Tus ventas son bastante regulares. Analiza qué puedes hacer para potenciar los días bajos y mantener la constancia.';
        }

        res.json({ resumen, consejo });
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar los días con más ventas.' });
    }
});

// API de registro
app.post('/api/registro', async (req, res) => {
    const { nombre, correo, telefono, password } = req.body;
    if (!nombre || !correo || !telefono || !password) {
        return res.json({ ok: false, error: 'Todos los campos son obligatorios.' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuario (nombre, correo, telefono, password, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, correo, telefono, hash, 'Empleado']
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('[REGISTRO][ERROR]', err); // <-- Agrega este log para ver el error real
        if (err.code === 'ER_DUP_ENTRY') {
            res.json({ ok: false, error: 'El correo ya está registrado.' });
        } else {
            res.json({ ok: false, error: 'Error en el servidor.' });
        }
    }
});

// API de login
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;
    if (!correo || !password) {
        return res.json({ ok: false, error: 'Correo y contraseña requeridos.' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM usuario WHERE correo = ?', [correo]);
        if (!rows.length) return res.json({ ok: false, error: 'Usuario no encontrado.' });
        const usuario = rows[0];
        const match = await bcrypt.compare(password, usuario.password) || password === usuario.password;
        if (!match) return res.json({ ok: false, error: 'Contraseña incorrecta.' });
        // Permitir login para cualquier rol
        res.json({ ok: true, usuario: { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol } });
    } catch (err) {
        res.json({ ok: false, error: 'Error en el servidor.' });
    }
});

// Ruta para login rápido de administrador por clave (solo clave, sin usuario)
app.post('/api/admin-login', async (req, res) => {
    const { clave } = req.body;
    if (!clave) {
        return res.json({ ok: false, error: 'Clave requerida.' });
    }
    try {
        // Busca un usuario con rol Administrador y compara la clave
        const [rows] = await pool.query('SELECT * FROM usuario WHERE rol = "Administrador"');
        if (!rows.length) {
            return res.json({ ok: false, error: 'No hay usuario administrador registrado.' });
        }
        for (const usuario of rows) {
            const bcrypt = require('bcryptjs');
            // Permite tanto bcrypt como texto plano para pruebas
            const match = await bcrypt.compare(clave, usuario.password) || clave === usuario.password;
            if (match) {
                return res.json({ ok: true });
            }
        }
        return res.json({ ok: false, error: 'Clave incorrecta.' });
    } catch (err) {
        res.json({ ok: false, error: 'Error en el servidor.' });
    }
});

// --- API para validar documento de supervisor (consulta en
app.post('/api/validar-supervisor', async (req, res) => {
    const { documento } = req.body;
    if (!documento) {
        return res.json({ autorizado: false });
    }
    try {
        // Permitir acceso si el usuario es Administrador o Empleado
        const [rows] = await pool.query(
            'SELECT * FROM usuario WHERE documento = ? AND (rol = "Administrador" OR rol = "Empleado") LIMIT 1',
            [documento]
        );
        const autorizado = rows.length > 0;
        res.json({ autorizado });
    } catch (err) {
        res.json({ autorizado: false });
    }
});

// --- NUEVO: API para obtener la última pedida de una mesa (para botón "Repetir última pedida") ---
app.get('/api/pedidas/ultima', async (req, res) => {
    const mesaId = req.query.mesaId;
    if (!mesaId) {
        return res.status(400).json({ error: 'Falta el parámetro mesaId' });
    }
    try {
        // 1. Buscar el alquiler activo de la mesa (si no hay, buscar el último alquiler finalizado)
        let [alquilerRows] = await pool.query(
            'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [mesaId]
        );
        if (!alquilerRows.length) {
            // Si no hay alquiler activo, busca el último finalizado
            [alquilerRows] = await pool.query(
                'SELECT id_alquiler FROM alquiler WHERE id_mesa = ? ORDER BY hora_inicio DESC LIMIT 1',
                [mesaId]
            );
        }
        if (!alquilerRows.length) {
            return res.status(404).json({ error: 'No hay alquiler registrado para esta mesa.' });
        }
        const id_alquiler = alquilerRows[0].id_alquiler;
        // 2. Buscar todas las pedidas (agrupadas por hora_pedido redondeada a minutos)
        // Soluciona el error de ambigüedad usando alias en los campos
        const [pedidos] = await pool.query(
            `SELECT pedido.id_producto, pedido.cantidad, pedido.subtotal, pedido.hora_pedido, 
                    pr.nombre AS nombre, pr.precio
             FROM pedido 
             JOIN producto pr ON pedido.id_producto = pr.id_producto
             WHERE pedido.id_alquiler = ?
             ORDER BY pedido.hora_pedido DESC`,
            [id_alquiler]
        );
        if (!pedidos.length) {
            return res.status(404).json({ error: 'No hay pedidas para esta mesa.' });
        }

        // Agrupar por hora_pedido redondeada a minutos
        const agrupados = {};
        pedidos.forEach(p => {
            let key = '';
            if (p.hora_pedido) {
                const d = new Date(p.hora_pedido);
                key = d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0') + ' ' +
                    String(d.getHours()).padStart(2, '0') + ':' +
                    String(d.getMinutes()).padStart(2, '0');
            }
            if (!agrupados[key]) agrupados[key] = [];
            agrupados[key].push(p);
        });
        const horas = Object.keys(agrupados);
        if (!horas.length) {
            return res.status(404).json({ error: 'No hay pedidas para esta mesa.' });
        }
        // Tomar la última hora (más reciente)
        const ultimaHora = horas.sort().pop();
        const productosUltimaPedida = agrupados[ultimaHora];

        // Formato de respuesta: { productos: [ { id_producto, nombre, precio, cantidad } ] }
        const productos = productosUltimaPedida.map(p => ({
            id_producto: p.id_producto,
            nombre: p.nombre,
            precio: parseFloat(p.precio),
            cantidad: p.cantidad
        }));

        res.json({ productos });
    } catch (err) {
        console.error('[API][GET /api/pedidas/ultima] Error:', err);
        res.status(500).json({ error: 'Error al obtener la última pedida.' });
    }
});

// Cambiar estado de productos de una pedida
app.post('/api/pedidas/cambiar-estado-productos', async (req, res) => {
    const { id_mesa, key_pedida, estado } = req.body;
    if (!id_mesa || !key_pedida || !estado) {
        return res.status(400).json({ success: false, message: 'Faltan datos' });
    }
    try {        // Cambia el estado de todos los productos de la pedida (por mesa y hora agrupada)
        const [result] = await db.query(
            `UPDATE pedido p
             JOIN alquiler a ON p.id_alquiler = a.id_alquiler
             SET p.estado = ?
             WHERE a.id_mesa = ?
               AND DATE_FORMAT(p.hora_pedido, '%Y-%m-%d %H:%i') = ?`,
            [estado, id_mesa, key_pedida]
        );
        res.json({ success: true, affectedRows: result.affectedRows });
    } catch (err) {
        console.error('Error en la base de datos:', err);
        res.status(500).json({ success: false, message: 'Error en la base de datos', error: err.message });
    }
});

// --- NUEVO: Transferir alquiler entre mesas ---
app.post('/api/alquileres/transferir', async (req, res) => {
    const { id_mesa_origen, id_mesa_destino } = req.body;
    if (!id_mesa_origen || !id_mesa_destino) {
        return res.status(400).json({ success: false, message: 'Faltan datos para transferir' });
    }
    try {
        // 1. Buscar el alquiler activo de la mesa origen
        const [alquilerRows] = await pool.query(
            "SELECT * FROM alquiler WHERE id_mesa = ? AND estado = 'Activo' LIMIT 1",
            [id_mesa_origen]
        );
        if (!alquilerRows.length) {
            return res.status(404).json({ success: false, message: 'No hay alquiler activo en la mesa origen' });
        }
        const id_alquiler = alquilerRows[0].id_alquiler;

        // 2. Verificar que la mesa destino exista y esté disponible
        const [[mesaDestino]] = await pool.query(
            "SELECT * FROM mesa WHERE id_mesa = ?",
            [id_mesa_destino]
        );
        if (!mesaDestino) {
            return res.status(404).json({ success: false, message: 'La mesa destino no existe' });
        }
        if (mesaDestino.estado === 'Ocupada') {
            return res.status(400).json({ success: false, message: 'La mesa destino ya está ocupada' });
        }

        // 3. Actualizar el alquiler para que apunte a la mesa destino
        await pool.query(
            "UPDATE alquiler SET id_mesa = ? WHERE id_alquiler = ?",
            [id_mesa_destino, id_alquiler]
        );

        // 4. Cambiar estado de la mesa origen a 'Disponible'
        await pool.query("UPDATE mesa SET estado = 'Disponible' WHERE id_mesa = ?", [id_mesa_origen]);
        // 5. Cambiar estado de la mesa destino a 'Ocupada'
        await pool.query("UPDATE mesa SET estado = 'Ocupada' WHERE id_mesa = ?", [id_mesa_destino]);

        res.json({
            success: true,
            message: "Tiempo y pedidos transferidos correctamente."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "No se pudo transferir el tiempo y los pedidos. Intenta de nuevo.",
            error: err.message
        });
    }
});

module.exports = app;