const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const archiver = require('archiver');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// --- Protección con API Key ---
const REQUIRED_API_KEY = process.env.API_KEY || '';
function requireApiKey(req, res, next) {
    const key = (req.headers['x-api-key'] || req.query.api_key || '').toString();
    if (!REQUIRED_API_KEY) {
        // Si no está configurada la API_KEY en el entorno, permitir (modo compatibilidad)
        return next();
    }
    if (!key || key !== REQUIRED_API_KEY) {
        return res.status(401).json({ error: 'No autorizado: API key inválida' });
    }
    next();
}


// 🔌 configuración MySQL (compatible con Aiven)
const dbConfig = {
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || process.env.DB_USER || "root",
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.DB_NAME || "inventario_db",
    port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306
};

// Si Aiven provee el certificado CA en base64 en la variable AIVEN_CA, úsalo.
if (process.env.AIVEN_CA) {
    try {
        dbConfig.ssl = { ca: Buffer.from(process.env.AIVEN_CA, 'base64') };
    } catch (e) {
        console.error("❌ Error procesando AIVEN_CA:", e.message);
    }
} else if (process.env.DB_SSL_ALLOW_INSECURE === 'true') {
    // Modo inseguro (solo para pruebas): permitir conexión sin verificar el certificado
    dbConfig.ssl = { rejectUnauthorized: false };
}

// Usar pool para conexiones más fiables en entornos cloud
const conexion = mysql.createPool(dbConfig);

// Probar conexión inicial
conexion.getConnection((err, conn) => {
    if (err) {
        console.error("❌ Error MySQL:", err.message || err);
    } else {
        console.log("✅ Conectado a MySQL");
        conn.release();
    }
});


// ================= API =================

// GET
app.get("/productos", (req, res) => {
    conexion.query("SELECT * FROM productos", (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});


// POST
app.post('/productos', requireApiKey, (req, res) => {

    const { codigo, nombre, cantidad, precio, imagen_url } = req.body;

    // Verificar si el código ya fue usado antes
    conexion.query(
        "SELECT * FROM codigos_usados WHERE codigo = ?",
        [codigo],
        (err, usados) => {

            if (err) {
                console.error("Error comprobando codigos_usados:", err);
                return res.status(500).json({ mensaje: err.message || err });
            }

            // Si ya existe el código
            if (usados.length > 0) {
                return res.status(400).json({
                    mensaje: "❌ Este código ya fue utilizado anteriormente"
                });
            }

            // Insertar producto
            const query = `
                INSERT INTO productos
                (codigo, nombre, cantidad, precio, imagen_url)
                VALUES (?, ?, ?, ?, ?)
            `;

            conexion.query(
                query,
                [codigo, nombre, cantidad, precio, imagen_url],
                (err) => {

                    if (err) {
                        console.error("Error insertando producto:", err);
                        return res.status(500).json({ mensaje: err.message || err });
                    }

                    // Guardar el código como usado (loguear si falla)
                    conexion.query(
                        "INSERT INTO codigos_usados (codigo) VALUES (?)",
                        [codigo],
                        (err) => {
                            if (err) console.error("Error guardando codigo usado:", err);
                        }
                    );

                    res.json({ mensaje: "✅ Producto agregado" });
                }
            );
        }
    );
});


// PUT (CORREGIDO)
app.put("/productos/:id", requireApiKey, (req, res) => {
    // Control de permisos por rol: solo admin puede cambiar campos sensibles
    const { codigo, nombre, cantidad, precio, imagen_url } = req.body;
    const { id } = req.params;

    const role = (req.headers['x-role'] || req.headers['role'] || '').toString();

    // Obtener producto actual para comparar qué campos cambian
    conexion.query('SELECT * FROM productos WHERE id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (!rows || rows.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        const actual = rows[0];

        const cambiosSensibles = [];
        if (codigo !== actual.codigo) cambiosSensibles.push('codigo');
        if (nombre !== actual.nombre) cambiosSensibles.push('nombre');
        if (precio !== actual.precio) cambiosSensibles.push('precio');
        if ((imagen_url || '') !== (actual.imagen_url || '')) cambiosSensibles.push('imagen_url');

        if (cambiosSensibles.length > 0 && role !== 'admin') {
            return res.status(403).json({ mensaje: 'No autorizado: solo admin puede modificar nombre/código/precio/imagen' });
        }

        const sql = `
            UPDATE productos 
            SET codigo = ?, nombre = ?, cantidad = ?, precio = ?, imagen_url = ?
            WHERE id = ?
        `;

        conexion.query(sql, [codigo, nombre, cantidad, precio, imagen_url, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ mensaje: "Actualizado" });
        });
    });
});


// DELETE
app.delete("/productos/:id", requireApiKey, (req, res) => {
    const { id } = req.params;

    conexion.query("DELETE FROM productos WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Eliminado" });
    });
});

// ================= RUTAS PARA BALANCE Y ACTIVIDADES (NUEVO) =================
// Obtener dinero
app.get("/balance", (req, res) => {

    conexion.query(

        "SELECT * FROM balance WHERE id = 1",

        (err, data) => {

            if (err) return res.status(500).json(err);

            res.json(data[0]);
        }
    );
});

// Actualizar dinero
app.put("/balance", requireApiKey, (req, res) => {

    const { ingresos, saldo } = req.body;

    conexion.query(

        `UPDATE balance 
        SET ingresos = ?, saldo = ?
        WHERE id = 1`,

        [ingresos, saldo],

        (err) => {

            if (err) return res.status(500).json(err);

            res.json({
                mensaje: "Balance actualizado"
            });
        }
    );
});

// Obtener historial
app.get("/actividades", (req, res) => {
    conexion.query("SELECT * FROM actividades ORDER BY id DESC LIMIT 30", (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

// Guardar actividad
app.post("/actividades", requireApiKey, (req, res) => {
    const { texto } = req.body;
    conexion.query("INSERT INTO actividades (texto, fecha) VALUES (?, NOW())", [texto], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Actividad guardada" });
    });
});

// ================= SERVER =================

// RUTA: descargar el proyecto como ZIP
app.get('/download', requireApiKey, (req, res) => {

    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SistemaCafecitoTopProyecto2.zip"');

    archive.on('error', (err) => {
        console.error('Error creando ZIP:', err);
        res.status(500).send({ error: 'Error creando ZIP' });
    });

    archive.pipe(res);

    // Archivar los archivos principales del proyecto (excluir node_modules)
    const filesToInclude = ['db.js', 'estilos.css', 'index.html', 'package.json', 'Proyecto.js', 'server.js'];

    filesToInclude.forEach(f => {
        archive.file(f, { name: f });
    });

    archive.finalize();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor en puerto " + PORT);
});


// Verificar si un código ya fue usado
app.get("/verificar-codigo/:codigo", (req, res) => {

    const { codigo } = req.params;

    conexion.query(
        "SELECT * FROM codigos_usados WHERE codigo = ?",
        [codigo],
        (err, data) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                usado: data.length > 0
            });
        }
    );
});


// LOGIN
app.post("/login", (req, res) => {

    const { usuario, clave } = req.body;

    conexion.query(
        "SELECT * FROM usuarios WHERE usuario = ? AND clave = ?",
        [usuario, clave],
        (err, data) => {

            if (err) {
                return res.status(500).json(err);
            }

            if (data.length === 0) {
                return res.json({
                    error: "❌ Credenciales incorrectas"
                });
            }

            res.json({
                usuario: data[0].usuario,
                rol: data[0].rol
            });
        }
    );
});


// CREAR USUARIO
app.post("/usuarios", requireApiKey, (req, res) => {

    const { nombre, usuario, clave, rol } = req.body;

    conexion.query(

        "INSERT INTO usuarios (nombre, usuario, clave, rol) VALUES (?, ?, ?, ?)",

        [nombre, usuario, clave, rol],

        (err) => {

            if (err) {

                return res.json({
                    error: "❌ Usuario ya existe"
                });
            }

            res.json({
                mensaje: "Usuario creado"
            });
        }
    );
});


// VER USUARIOS
app.get("/usuarios", (req, res) => {

    conexion.query(
        "SELECT id, nombre, usuario, rol FROM usuarios",
        (err, data) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(data);
        }
    );
});

// ELIMINAR USUARIO
app.delete("/usuarios/:id", requireApiKey, (req, res) => {

    const { id } = req.params;

    conexion.query(
        "DELETE FROM usuarios WHERE id = ?",
        [id],
        (err) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensaje: "Usuario eliminado"
            });
        }
    );
});