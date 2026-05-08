const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 🔌 conexión MySQL
const conexion = mysql.createConnection({
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || process.env.DB_USER || "root",
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.DB_NAME || "inventario_db",
    port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306
});

conexion.connect(err => {
    if (err) {
        console.error("❌ Error MySQL:", err.message);
        return;
    }
    console.log("✅ Conectado a MySQL");
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
app.post('/productos', (req, res) => {

    const { codigo, nombre, cantidad, precio, imagen_url } = req.body;

    // Verificar si el código ya fue usado antes
    conexion.query(
        "SELECT * FROM codigos_usados WHERE codigo = ?",
        [codigo],
        (err, usados) => {

            if (err) return res.status(500).send(err);

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

                    if (err) return res.status(500).send(err);

                    // Guardar el código como usado
                    conexion.query(
                        "INSERT INTO codigos_usados (codigo) VALUES (?)",
                        [codigo]
                    );

                    res.send("✅ Producto agregado");
                }
            );
        }
    );
});


// PUT (CORREGIDO)
app.put("/productos/:id", (req, res) => {
    // Agregamos imagen_url aquí también
    const { codigo, nombre, cantidad, precio, imagen_url } = req.body;
    const { id } = req.params;

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


// DELETE
app.delete("/productos/:id", (req, res) => {
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
app.put("/balance", (req, res) => {

    const { ingresos, egresos, saldo } = req.body;

    conexion.query(

        `UPDATE balance 
        SET ingresos = ?, egresos = ?, saldo = ?
        WHERE id = 1`,

        [ingresos, egresos, saldo],

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
app.post("/actividades", (req, res) => {
    const { texto } = req.body;
    conexion.query("INSERT INTO actividades (texto, fecha) VALUES (?, NOW())", [texto], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Actividad guardada" });
    });
});

// ================= SERVER =================
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
app.post("/usuarios", (req, res) => {

    const { usuario, clave, rol } = req.body;

    conexion.query(

        "INSERT INTO usuarios (usuario, clave, rol) VALUES (?, ?, ?)",

        [usuario, clave, rol],

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