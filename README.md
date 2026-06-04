# SistemaCafecitoTopProyecto2

Pequeña API/servidor en Node.js + Express con endpoints para productos, balance, actividades y usuarios.
Incluye una ruta `GET /download` que genera un ZIP del proyecto.

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar servidor:

```bash
npm start
# o
node server.js
```

3. Endpoints principales:

- `GET /productos` — listar productos
- `POST /productos` — crear producto
- `PUT /productos/:id` — actualizar producto
- `DELETE /productos/:id` — eliminar producto
- `GET /balance`, `PUT /balance`
- `GET /actividades`, `POST /actividades`
- `POST /login`
- `GET /verificar-codigo/:codigo`
- `GET /download` — descargar ZIP del proyecto

Probar `GET /download`:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/download -OutFile proyecto.zip
# o con curl
curl -o proyecto.zip http://localhost:3000/download
```

## Despliegue en Render

Render funciona bien con este proyecto. Pasos resumidos:

1. Subir el repositorio a GitHub (si aún no está)
2. En Render, crear un nuevo **Web Service** y conectar el repo
3. Configurar:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: añadir variables necesarias (más abajo)
   - **Health Check Path**: puedes usar `/productos` o `/api` para comprobar estado

Variables de entorno recomendadas (ajusta según tu base de datos):

- `MYSQL_HOST` — host MySQL
- `MYSQL_USER` — usuario
- `MYSQL_PASSWORD` — contraseña
- `MYSQL_DATABASE` — nombre de la base de datos
- `MYSQL_PORT` — puerto (3306 por defecto)
- `PORT` — opcional, Render establece su propio puerto; el servidor usa `process.env.PORT`

Si usas Aiven o un proveedor que provea certificado CA en base64:

- `AIVEN_CA` — contenido del certificado CA en base64 (el servidor decodifica y lo aplica a `dbConfig.ssl`)

Si necesitas permitir conexión sin verificar certificado (solo para pruebas):

- `DB_SSL_ALLOW_INSECURE` = `true`

Notas:
- Este servidor está diseñado como API y devuelve JSON o archivos, no sirve la UI estática.
- Verás errores de conexión MySQL en los logs si no configuras las variables de entorno antes del despliegue; eso es normal.

## Seguridad y recomendaciones

- No subir credenciales al repo. Configura todas las variables en el panel de Render.
- Considera usar HTTPS y revistar `express.static('.')` para no exponer archivos sensibles.

### Protección con API Key

Para proteger endpoints sensibles (creación/actualización/eliminación), el servidor admite una `API_KEY` configurable a través de la variable de entorno `API_KEY`.

- Configura en Render: `API_KEY = <tu_clave_secreta>`
- En las peticiones, envía el header `x-api-key: <tu_clave_secreta>` o añade `?api_key=<tu_clave_secreta>` en la URL.

Nota: la ruta `GET /download` se mantiene pública por diseño para facilitar la descarga del ZIP del proyecto. Si prefieres protegerla, puedo cambiarlo para requerir `API_KEY`.

Ejemplo con `curl` para descargar el ZIP (público):

```bash
curl -o proyecto.zip https://sistemacafecitotop.onrender.com/download
```

Si `API_KEY` no está configurada, el servidor mantiene compatibilidad y permite las peticiones (modo sin protección). Se recomienda establecer la variable en producción para proteger endpoints sensibles.

¿Quieres que:
- suba estos cambios a un nuevo repo en GitHub y cree la página en Render (te pido permisos para tu cuenta o instrucciones), o
- sólo te guíe paso a paso para conectar el repo en Render?"}