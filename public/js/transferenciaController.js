const pool = require('../conexion');

exports.transferirTiempoYPedidos = async (req, res) => {
    const { id_mesa_origen, id_mesa_destino } = req.body;
    if (!id_mesa_origen || !id_mesa_destino) {
        return res.status(400).json({ success: false, message: 'Mesas origen y destino requeridas.' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Obtener alquiler activo de la mesa origen
        const [alquilerOrigenRows] = await conn.query(
            'SELECT * FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa_origen]
        );
        if (alquilerOrigenRows.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'No hay alquiler activo en la mesa origen.' });
        }
        const alquilerOrigen = alquilerOrigenRows[0];

        // 2. Finalizar el alquiler activo de la mesa origen
        await conn.query(
            'UPDATE alquiler SET estado = "Finalizado", hora_fin = NOW() WHERE id_alquiler = ?',
            [alquilerOrigen.id_alquiler]
        );

        // 3. Crear un nuevo alquiler en la mesa destino con la misma hora_inicio y usuario
        const [result] = await conn.query(
            'INSERT INTO alquiler (id_mesa, id_usuario, hora_inicio, estado) VALUES (?, ?, ?, "Activo")',
            [id_mesa_destino, alquilerOrigen.id_usuario, alquilerOrigen.hora_inicio]
        );
        const id_alquiler_destino = result.insertId;

        // 4. Mover los pedidos al nuevo alquiler
        await conn.query(
            'UPDATE pedido SET id_alquiler = ? WHERE id_alquiler = ?',
            [id_alquiler_destino, alquilerOrigen.id_alquiler]
        );

        // 5. Cambiar el estado de las mesas
        await conn.query('UPDATE mesa SET estado = "Disponible" WHERE id_mesa = ?', [id_mesa_origen]);
        await conn.query('UPDATE mesa SET estado = "Ocupada" WHERE id_mesa = ?', [id_mesa_destino]);

        await conn.commit();
        res.json({ success: true, message: 'Tiempo y pedidos transferidos correctamente.' });
    } catch (err) {
        await conn.rollback();
        console.error('[API][POST /api/alquileres/transferir] Error:', err);
        res.status(500).json({ success: false, message: 'Error al transferir el tiempo.', detalle: err.message });
    } finally {
        conn.release();
    }
};
