const mysql = require("mysql2");

const conexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "inventario_db"
});

conexion.connect(err => {
    if (err) {
        console.log("❌ Error de conexión:", err);
    } else {
        console.log("✅ Conectado a MySQL");
    }
});

module.exports = conexion;