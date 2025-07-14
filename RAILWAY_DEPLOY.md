# 🚀 Guía de Despliegue en Railway

## 📋 Preparación Completada

Tu proyecto ya está completamente preparado para Railway con los siguientes archivos configurados:

- ✅ `package.json` - Scripts y dependencias configuradas
- ✅ `railway.json` - Configuración de Railway
- ✅ `init.sql` - Estructura completa de la base de datos
- ✅ `server.js` - Configurado para variables de entorno
- ✅ `conexion.js` - Configurado para variables de entorno
- ✅ `.gitignore` - Archivos excluidos del repositorio
- ✅ `.env.example` - Ejemplo de variables de entorno

## 🔄 Pasos para Desplegar en Railway

### 1. **Conectar tu Repositorio a Railway**

1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Busca y selecciona tu repositorio `RionegroDemo`

### 2. **Crear la Base de Datos MySQL**

1. En tu proyecto de Railway, haz clic en "New Service"
2. Selecciona "Database" → "MySQL"
3. Railway creará automáticamente la base de datos MySQL gratuita
4. **Importante**: Railway detectará automáticamente el archivo `init.sql` y ejecutará la estructura de la base de datos

### 3. **Configurar Variables de Entorno (Automático)**

Railway configurará automáticamente estas variables de entorno:

```
DATABASE_URL=mysql://usuario:password@host:puerto/database
DB_HOST=host-generado-por-railway
DB_USER=usuario-generado
DB_PASSWORD=password-generado  
DB_NAME=railway
DB_PORT=3306
PORT=puerto-asignado-por-railway
NODE_ENV=production
```

### 4. **Verificar el Despliegue**

1. Railway comenzará a construir y desplegar tu aplicación automáticamente
2. Una vez completado, obtendrás una URL pública como: `https://tu-app.railway.app`
3. Visita esa URL para acceder a tu sistema

## 🔐 Usuarios por Defecto

Una vez desplegado, puedes iniciar sesión con estos usuarios:

### Administrador:
- **Correo**: admin@demo.com
- **Contraseña**: admin123
- **Permisos**: Acceso completo al sistema

### Supervisor:
- **Correo**: supervisor@demo.com
- **Contraseña**: supervisor123
- **Permisos**: Gestión de empleados y reportes

### Empleado:
- **Correo**: empleado@demo.com
- **Contraseña**: empleado123
- **Permisos**: Operación básica del sistema

## 📊 Datos de Demostración

El sistema incluye datos de prueba:
- 16 usuarios (administradores, supervisores y empleados)
- 6 mesas de billar configuradas
- 10 alquileres de ejemplo con facturas
- 5 productos básicos
- 5 gastos de ejemplo
- Triggers y procedimientos almacenados configurados

## 🛠️ Funcionalidades Incluidas

✅ **Gestión de Mesas**: Control de estado y alquiler de mesas de billar
✅ **Sistema de Usuarios**: Roles diferenciados (Admin, Supervisor, Empleado)
✅ **Facturación**: Sistema completo de facturación con múltiples métodos de pago
✅ **Reportes Financieros**: Estadísticas y reportes de ventas
✅ **Control de Inventario**: Gestión de productos y stock
✅ **Seguimiento de Empleados**: Ranking y seguimiento de rendimiento

## 🔧 Configuración Avanzada (Opcional)

### Variables de Entorno Personalizadas

Si necesitas personalizar alguna configuración, puedes agregar estas variables en Railway:

```env
# Puerto personalizado (opcional, Railway lo asigna automáticamente)
PORT=3000

# Configuración de sesión
SESSION_SECRET=tu-secreto-personalizado

# Configuración de timezone
TZ=America/Bogota
```

### Configuración de Dominio Personalizado

1. En Railway, ve a tu proyecto
2. Haz clic en "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Configura los DNS según las instrucciones

## 📱 Acceso al Sistema

Una vez desplegado, el sistema estará disponible en:
- **URL Principal**: `https://tu-app.railway.app`
- **Panel de Administración**: `https://tu-app.railway.app/administrador.html`
- **Login de Empleados**: `https://tu-app.railway.app/login.html`

## 🔍 Solución de Problemas

### Si la aplicación no inicia:
1. Verifica los logs en Railway Dashboard
2. Asegúrate de que todas las variables de entorno estén configuradas
3. Verifica que el archivo `init.sql` se haya ejecutado correctamente

### Si hay errores de base de datos:
1. Verifica que la base de datos MySQL esté corriendo
2. Revisa las credenciales de conexión en las variables de entorno
3. Verifica que las tablas se hayan creado correctamente

### Para ver logs detallados:
1. Ve a Railway Dashboard
2. Selecciona tu servicio
3. Ve a la pestaña "Deployments"
4. Haz clic en el deployment actual para ver logs

## 🎯 Resultado Final

Una vez completado el despliegue tendrás:

🌐 **Sistema web completamente funcional y gratuito**
📱 **Accesible desde cualquier dispositivo con internet**
🔒 **Base de datos segura y automáticamente respaldada**
📊 **Panel administrativo completo**
⚡ **Alto rendimiento y disponibilidad 24/7**

## 🆘 Soporte

Si encuentras algún problema durante el despliegue:

1. Revisa los logs en Railway Dashboard
2. Verifica que todos los archivos estén subidos al repositorio de GitHub
3. Asegúrate de que la base de datos MySQL esté activa en Railway
4. Confirma que el archivo `init.sql` se ejecutó sin errores

¡Tu sistema de gestión de billar estará funcionando en la web de forma gratuita! 🎯
