const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());

// 🔌 conexión MySQL
const conexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "inventario_db"
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
app.post("/productos", (req, res) => {
    const { codigo, nombre, cantidad, precio } = req.body;

    const sql = "INSERT INTO productos (codigo, nombre, cantidad, precio) VALUES (?, ?, ?, ?)";

    conexion.query(sql, [codigo, nombre, cantidad, precio], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Producto agregado" });
    });
});


// PUT (CORREGIDO)
app.put("/productos/:id", (req, res) => {
    const { codigo, nombre, cantidad, precio } = req.body;
    const { id } = req.params;

    const sql = `
        UPDATE productos 
        SET codigo = ?, nombre = ?, cantidad = ?, precio = ?
        WHERE id = ?
    `;

    conexion.query(sql, [codigo, nombre, cantidad, precio, id], (err) => {
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


// ================= SERVER =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor en puerto " + PORT);
});