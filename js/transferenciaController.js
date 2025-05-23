const pool = require('../conexion');

exports.transferirTiempoYPedidos = async (req, res) => {
    const { id_mesa_origen, id_mesa_destino } = req.body;
    if (!id_mesa_origen || !id_mesa_destino) {
        console.error('[TRANSFERENCIA][ERROR] Mesas origen o destino no especificadas:', { id_mesa_origen, id_mesa_destino });
        return res.status(400).json({ success: false, message: 'Mesas origen y destino requeridas.' });
    }
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Obtener alquiler activo de la mesa origen
        const [alquilerOrigenRows] = await conn.query(
            'SELECT * FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa_origen]
        );
        if (alquilerOrigenRows.length === 0) {
            console.error('[TRANSFERENCIA][ERROR] No hay alquiler activo en la mesa origen:', id_mesa_origen);
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'No hay alquiler activo en la mesa origen.' });
        }
        const alquilerOrigen = alquilerOrigenRows[0];

        // 2. Verificar que la mesa destino NO tenga alquiler activo
        const [alquilerDestinoRows] = await conn.query(
            'SELECT * FROM alquiler WHERE id_mesa = ? AND estado = "Activo" ORDER BY hora_inicio DESC LIMIT 1',
            [id_mesa_destino]
        );
        if (alquilerDestinoRows.length > 0) {
            console.error('[TRANSFERENCIA][ERROR] La mesa destino ya tiene un alquiler activo:', id_mesa_destino);
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'La mesa destino ya tiene un alquiler activo.' });
        }

        // 3. Finalizar el alquiler activo de la mesa origen
        const [finalizarResult] = await conn.query(
            'UPDATE alquiler SET estado = "Finalizado", hora_fin = NOW() WHERE id_alquiler = ?',
            [alquilerOrigen.id_alquiler]
        );
        if (finalizarResult.affectedRows === 0) {
            console.error('[TRANSFERENCIA][ERROR] No se pudo finalizar el alquiler de la mesa origen:', alquilerOrigen.id_alquiler);
            await conn.rollback();
            return res.status(500).json({ success: false, message: 'No se pudo finalizar el alquiler de la mesa origen.' });
        }

        // 4. Crear un nuevo alquiler en la mesa destino con la misma hora_inicio y usuario
        const [result] = await conn.query(
            'INSERT INTO alquiler (id_mesa, id_usuario, hora_inicio, estado) VALUES (?, ?, ?, "Activo")',
            [id_mesa_destino, alquilerOrigen.id_usuario, alquilerOrigen.hora_inicio]
        );
        const id_alquiler_destino = result.insertId;
        if (!id_alquiler_destino) {
            console.error('[TRANSFERENCIA][ERROR] No se pudo crear el nuevo alquiler en la mesa destino:', id_mesa_destino);
            await conn.rollback();
            return res.status(500).json({ success: false, message: 'No se pudo crear el nuevo alquiler en la mesa destino.' });
        }

        // 5. Mover los pedidos al nuevo alquiler
        const [updatePedidosResult] = await conn.query(
            'UPDATE pedido SET id_alquiler = ? WHERE id_alquiler = ?',
            [id_alquiler_destino, alquilerOrigen.id_alquiler]
        );
        console.log(`[TRANSFERENCIA] Pedidos movidos: ${updatePedidosResult.affectedRows} de alquiler ${alquilerOrigen.id_alquiler} a ${id_alquiler_destino}`);

        // 6. Cambiar el estado de las mesas
        const [mesaOrigenResult] = await conn.query('UPDATE mesa SET estado = "Disponible" WHERE id_mesa = ?', [id_mesa_origen]);
        const [mesaDestinoResult] = await conn.query('UPDATE mesa SET estado = "Ocupada" WHERE id_mesa = ?', [id_mesa_destino]);
        if (mesaOrigenResult.affectedRows === 0) {
            console.error('[TRANSFERENCIA][ERROR] No se pudo actualizar el estado de la mesa origen:', id_mesa_origen);
        }
        if (mesaDestinoResult.affectedRows === 0) {
            console.error('[TRANSFERENCIA][ERROR] No se pudo actualizar el estado de la mesa destino:', id_mesa_destino);
        }

        await conn.commit();
        console.log(`[TRANSFERENCIA][OK] Transferencia exitosa de mesa ${id_mesa_origen} a mesa ${id_mesa_destino}. Alquiler origen: ${alquilerOrigen.id_alquiler}, alquiler destino: ${id_alquiler_destino}`);
        res.json({ success: true, message: 'Tiempo y pedidos transferidos correctamente.' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('[TRANSFERENCIA][ERROR][EXCEPTION] Fallo al transferir tiempo y pedidos:', {
            error: err,
            id_mesa_origen,
            id_mesa_destino
        });
        res.status(500).json({ success: false, message: 'Error al transferir el tiempo.', detalle: err.message });
    } finally {
        if (conn) conn.release();
    }
};
