const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./conexion'); // Importar el pool de conexión a la base de datos
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(session({
    secret: 'clave-secreta', // Cambia esto por una clave segura
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Usa `true` si estás usando HTTPS
}));

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para agregar productos
app.post('/api/productos', async (req, res) => {
    const { nombre, precio, categoria, imagen } = req.body; // stock eliminado

    if (!nombre || !precio) {
        return res.status(400).json({ success: false, message: 'Nombre y precio son obligatorios.' });
    }

    try {
        // Ajusta los campos según tu tabla producto
        // stock eliminado del INSERT
        const [results] = await pool.query(
            'INSERT INTO producto (nombre, precio) VALUES (?, ?)',
            [nombre, precio]
        );
        res.json({ success: true, message: 'Producto agregado exitosamente.' });
    } catch (err) {
        console.error('Error al agregar el producto:', err);
        res.status(500).json({ success: false, message: 'Error al agregar el producto.' });
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
                `SELECT p.cantidad, p.subtotal, p.hora_pedido, pr.nombre AS nombre_producto
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

// Ruta para finalizar un alquiler activo de una mesa
app.post('/api/alquileres/finalizar', async (req, res) => {
    const { id_mesa } = req.body;
    
    debug.info(`POST /api/alquileres/finalizar - Finalizando alquiler para mesa ${id_mesa}`);
    
    if (!id_mesa) {
        debug.info(`POST /api/alquileres/finalizar - Error: id_mesa es requerido`);
        return res.status(400).json({ error: 'id_mesa es requerido' });
    }
    
    try {
        // Busca el alquiler activo
        debug.info(`POST /api/alquileres/finalizar - Consultando alquiler activo para mesa ${id_mesa}`);
        const [rows] = await pool.query(
            'SELECT id_alquiler, hora_inicio FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa]
        );
        
        if (rows.length === 0) {
            debug.mesa(id_mesa, 'error finalizar alquiler', { error: 'No hay un alquiler activo' });
            // No devolver error en este caso, solo informar que no hay alquiler activo
            return res.status(200).json({ 
                message: 'No hay un alquiler activo para esta mesa',
                success: true,
                yaFinalizado: true
            });
        }
        
        const id_alquiler = rows[0].id_alquiler;
        const hora_inicio = rows[0].hora_inicio;
        
        debug.mesa(id_mesa, 'finalizando alquiler', { 
            id_alquiler,
            hora_inicio 
        });
        
        // Obtener el tiempo transcurrido y calcular total a pagar
        try {
            const [[mesaInfo]] = await pool.query(
                'SELECT precio_hora FROM mesa WHERE id_mesa = ?', 
                [id_mesa]
            );
            
            const precio_hora = mesaInfo ? parseFloat(mesaInfo.precio_hora) : 0;
            const ahora = new Date();
            // --- CORRECCIÓN DE ZONA HORARIA ---
            let inicio;
            if (typeof hora_inicio === 'string') {
                if (hora_inicio.endsWith('Z')) {
                    inicio = new Date(hora_inicio);
                } else if (hora_inicio.includes('T')) {
                    inicio = new Date(hora_inicio);
                } else {
                    inicio = new Date(hora_inicio.replace(' ', 'T') + '-05:00');
                }
            } else {
                inicio = new Date(hora_inicio);
            }
            const diffMs = ahora.getTime() - inicio.getTime();
            const diffHoras = diffMs / (1000 * 60 * 60);
            const total_tiempo = diffHoras;
            const total_a_pagar = diffHoras * precio_hora;
            
            debug.mesa(id_mesa, 'cálculo finalización', { 
                total_tiempo,
                total_a_pagar,
                precio_hora
            });
            
            // Finaliza el alquiler con los totales calculados
            const [resultAlquiler] = await pool.query(
                'UPDATE alquiler SET estado = "Finalizado", hora_fin = NOW(), total_tiempo = ?, total_a_pagar = ? WHERE id_alquiler = ?',
                [total_tiempo, total_a_pagar, id_alquiler]
            );
            
            debug.mesa(id_mesa, 'alquiler finalizado', { 
                id_alquiler,
                filas_afectadas: resultAlquiler.affectedRows 
            });
            
            if (resultAlquiler.affectedRows === 0) {
                throw new Error('No se pudo actualizar el alquiler');
            }
        } catch (err) {
            debug.error(`POST /api/alquileres/finalizar - Error al actualizar alquiler - Mesa ${id_mesa}`, err);
            return res.status(500).json({ error: 'Error al actualizar alquiler', detalle: err.message });
        }
        
        // Cambia el estado de la mesa a "Disponible"
        try {
            const [resultMesa] = await pool.query(
                'UPDATE mesa SET estado = "Disponible" WHERE id_mesa = ?',
                [id_mesa]
            );
            
            debug.mesa(id_mesa, 'estado actualizado', { 
                nuevo_estado: 'Disponible',
                filas_afectadas: resultMesa.affectedRows 
            });
            
            if (resultMesa.affectedRows === 0) {
                debug.mesa(id_mesa, 'advertencia', { mensaje: 'No se actualizó el estado de la mesa' });
            }
        } catch (err) {
            debug.error(`POST /api/alquileres/finalizar - Error al actualizar mesa - Mesa ${id_mesa}`, err);
            // No devolver error si solo falló la actualización de la mesa
            debug.mesa(id_mesa, 'advertencia', { 
                mensaje: 'Alquiler finalizado pero no se pudo actualizar el estado de la mesa'
            });
        }
        debug.info(`POST /api/alquileres/finalizar - Alquiler finalizado con éxito para mesa ${id_mesa}`);
        res.json({ 
            success: true, 
            message: 'Alquiler finalizado correctamente',
            id_alquiler
        });
    } catch (error) {
        debug.error(`POST /api/alquileres/finalizar - Mesa ${id_mesa} - Error general`, error);
        res.status(500).json({ error: 'Error al finalizar el alquiler', detalle: error.message });
    }
});

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

        // Insertar cada producto como pedido
        for (const prod of productos) {
            if (!prod.id_producto || !prod.cantidad || !prod.subtotal) {
                console.error('[API][POST /api/pedidos] Producto inválido:', prod);
                continue;
            }
            await pool.query(
                'INSERT INTO pedido (id_alquiler, id_producto, hora_pedido, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)',
                [id_alquiler, prod.id_producto, hora_pedido, prod.cantidad, prod.subtotal]
            );
        }
        console.log(`[API][POST /api/pedidos] Pedido registrado correctamente para mesa ${id_mesa}, alquiler ${id_alquiler}`);
        res.json({ success: true, message: 'Pedido registrado exitosamente.' });
    } catch (err) {
        console.error('[API][POST /api/pedidos] Error al registrar el pedido:', err);
        res.status(500).json({ success: false, message: 'Error al registrar el pedido.', detalle: err.message });
    }
});

const transferenciaController = require('./js/transferenciaController');
app.post('/api/alquileres/transferir', transferenciaController.transferirTiempoYPedidos);

// API para editar un producto
app.put('/api/productos/:id_producto', async (req, res) => {
    const { id_producto } = req.params;
    const { nombre, precio, categoria, imagen } = req.body;

    // Log de entrada
    console.log(`[EDITAR PRODUCTO] id_producto: ${id_producto}, nombre: ${nombre}, precio: ${precio}, categoria: ${categoria}, imagen: ${imagen}`);

    if (!nombre || !precio || !categoria) {
        console.log('[EDITAR PRODUCTO] Faltan campos obligatorios');
        return res.status(400).json({ success: false, message: 'Nombre, precio y categoría son obligatorios.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE producto SET nombre = ?, precio = ?, categoria = ?, imagen = ? WHERE id_producto = ?',
            [nombre, precio, categoria, imagen, id_producto]
        );
        // Log de resultado de la consulta
        console.log(`[EDITAR PRODUCTO] Resultado de UPDATE:`, result);

        if (result.affectedRows === 0) {
            console.log('[EDITAR PRODUCTO] Producto no encontrado');
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }
        res.json({ success: true, message: 'Producto actualizado correctamente.' });
    } catch (err) {
        console.error('[EDITAR PRODUCTO] Error al actualizar el producto:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar el producto.', detalle: err.message });
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
