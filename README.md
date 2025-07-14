# 🎱 Sistema de Gestión para Billar/Pool - RionegroDemo

Sistema completo de gestión para negocio de billar/pool con control de mesas, pedidos, facturación y estadísticas.

## 🚀 Despliegue en Render

### Configuración Automática
Este proyecto está configurado para desplegarse automáticamente en Render usando el archivo `render.yaml`.

### Variables de Entorno Requeridas
- `DB_HOST`: Host de la base de datos
- `DB_USER`: Usuario de la base de datos  
- `DB_PASSWORD`: Contraseña de la base de datos
- `DB_NAME`: Nombre de la base de datos
- `DB_PORT`: Puerto de la base de datos (3306)
- `PORT`: Puerto del servidor (asignado automáticamente por Render)

### Credenciales por Defecto
- **Administrador**: admin@demo.com / admin123
- **Supervisor**: supervisor@demo.com / supervisor123  
- **Empleado**: empleado@demo.com / empleado123

## 🚀 Características

- ✅ Control de mesas y alquileres por tiempo
- 🛒 Sistema de pedidos en tiempo real
- 🧾 Facturación con múltiples métodos de pago
- 📊 Dashboard con estadísticas y reportes
- 👥 Control de usuarios (Empleado, Supervisor, Administrador)
- 💰 Gestión financiera y seguimiento de ventas

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Autenticación**: bcryptjs + express-session

## 📦 Instalación

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno (ver sección Variables de Entorno)
4. Ejecutar: `npm start`

## 🌍 Variables de Entorno

Para producción en Railway, configurar:

```
DB_HOST=tu-host-mysql
DB_USER=tu-usuario
DB_PASSWORD=tu-contraseña
DB_NAME=negocio_pool
DB_PORT=3306
NODE_ENV=production
PORT=3000
```

## 📱 Uso

1. Acceder a la aplicación
2. Iniciar sesión
3. Gestionar mesas y pedidos
4. Generar facturas
5. Ver estadísticas y reportes

## 🎯 Demo

Sistema desarrollado para demostrar capacidades de desarrollo full-stack con gestión completa de negocio.

## 🌐 Despliegue en Render

### Opción 1: Usando GitHub (Recomendado)

1. **Subir a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <tu-repositorio-github>
   git push -u origin main
   ```

2. **Conectar con Render**
   - Ve a [render.com](https://render.com)
   - Conecta tu cuenta de GitHub
   - Selecciona "New" → "Blueprint"
   - Conecta tu repositorio
   - Render detectará automáticamente el `render.yaml`

### Opción 2: Manual

1. **Crear Web Service**
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Crear Base de Datos MySQL**
   - Tipo: MySQL
   - Plan: Free
   - Ejecutar el script `init.sql`

3. **Configurar Variables de Entorno**
   - Conectar la aplicación con la base de datos

---
Desarrollado con ❤️ para el sector de entretenimiento
