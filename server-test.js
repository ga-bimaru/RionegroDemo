const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Ruta de prueba simple
app.get('/', (req, res) => {
    res.send(`
        <h1>🎉 ¡App funcionando!</h1>
        <p>Variables de entorno disponibles:</p>
        <ul>
            <li>MYSQLHOST: ${process.env.MYSQLHOST ? '✅' : '❌'}</li>
            <li>MYSQLUSER: ${process.env.MYSQLUSER ? '✅' : '❌'}</li>
            <li>MYSQLDATABASE: ${process.env.MYSQLDATABASE ? '✅' : '❌'}</li>
            <li>PORT: ${process.env.PORT || 'default 3000'}</li>
        </ul>
    `);
});

// Ruta de health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
