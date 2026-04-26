const API = "http://localhost:3000/productos";

let dineroActual = 0;

document.addEventListener("DOMContentLoaded", () => {

    const modalProducto = document.getElementById("modal-producto");
    const modalActividad = document.getElementById("modal-actividad");

    // cerrar con X (seguro)
    document.getElementById("close-modal-producto").onclick = cerrarModalProducto;
    document.getElementById("close-modal-actividad").onclick = cerrarModalActividad;

    // cerrar al hacer click SOLO en el fondo
    modalProducto.addEventListener("click", (e) => {
        if (e.target === modalProducto) {
            cerrarModalProducto();
        }
    });

    modalActividad.addEventListener("click", (e) => {
        if (e.target === modalActividad) {
            cerrarModalActividad();
        }
    });

    // ESC opcional (mejora UX)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalProducto();
            cerrarModalActividad();
        }
    });

    const buscador = document.createElement("input");
    buscador.classList.add("buscador-productos");

    const contSec = document.querySelector(".acciones-secundarias");
    if (contSec) {
        contSec.prepend(buscador);
    }

    buscador.addEventListener("input", () => {
        const valor = buscador.value.toLowerCase();
        document.querySelectorAll(".tarjeta").forEach(card => {
             const texto = card.innerText.toLowerCase();
             card.style.display = texto.includes(valor) ? "block" : "none";
            });
        });


    verificarSesion();

    // Asignar event listeners a todos los botones
    document.getElementById("btn-login").addEventListener("click", login);
    document.getElementById("btn-agregar").addEventListener("click", agregar);
    document.getElementById("btn-eliminar").addEventListener("click", eliminar);
    document.getElementById("btn-vender").addEventListener("click", vender);
    document.getElementById("btn-editar").addEventListener("click", editarPrecio);
    document.getElementById("btn-salir").addEventListener("click", salir);

});


// ================= LOGIN =================
function login() {
    const u = document.getElementById("login-usuario").value;
    const c = document.getElementById("login-clave").value;

    if (u === "Denys" && c === "123") {
        localStorage.setItem("sesion", "true");
        localStorage.setItem("usuario", u);

        document.getElementById("login-section").style.display = "none";
        document.querySelector("main").style.display = "block";
        document.querySelector("aside").style.display = "flex";

        cargarDatos();
    } else {
        document.getElementById("login-error").style.display = "block";
    }
}


// ================= SESION =================
function verificarSesion() {
    if (localStorage.getItem("sesion") === "true") {
        document.getElementById("login-section").style.display = "none";
        document.querySelector("main").style.display = "block";
        document.querySelector("aside").style.display = "flex";
        cargarDatos();
    } else {
        document.getElementById("login-section").style.display = "flex";
    }
}


// ================= CARGAR TODO =================
function cargarDatos() {
    const dinero = localStorage.getItem("dinero");
    if (dinero) dineroActual = parseFloat(dinero);

    actualizarDinero();
    verInventario();
    cargarRegistros();
}


// ================= SALIR =================
function salir() {

    const confirmar = confirm("¿Estás seguro que quieres salir?");

    if (!confirmar) return;

    localStorage.removeItem("sesion");
    localStorage.removeItem("usuario");

    document.getElementById("login-section").style.display = "flex";
    document.querySelector("main").style.display = "none";
    document.querySelector("aside").style.display = "none";
}

// ================= INVENTARIO =================
function verInventario() {
    fetch(API)
    .then(r => r.json())
    .then(data => {
        const cont = document.getElementById("inventario");
        cont.innerHTML = "";

        data.forEach(p => {
            const div = document.createElement("div");
            div.className = "tarjeta";

            div.innerHTML = `
                <h3>${p.nombre}</h3>
                <p>Código: ${p.codigo}</p>
                <p>Cantidad: ${p.cantidad}</p>
                <p>Precio: Q${p.precio}</p>
            `;

            div.addEventListener("click", () => abrirModalProducto(p));
            cont.appendChild(div);
        });
    });
}


// ================= AGREGAR (SIN REPETIDOS) =================
function agregar() {
    const codigo = prompt("Código:");
    if (!codigo) return;

    fetch(API)
    .then(r => r.json())
    .then(data => {

        const existe = data.find(p => p.codigo == codigo);

        if (existe) {

            const respuesta = confirm(
                "⚠️ Este código ya existe.\n\n" +
                "Producto: " + existe.nombre + "\n" +
                "Cantidad actual: " + existe.cantidad + "\n\n" +
                "¿Deseas agregar más cantidad?"
            );

            if (!respuesta) return;

            const extra = parseInt(prompt("Cantidad a agregar:"));

            if (isNaN(extra) || extra <= 0) {
                alert("Cantidad inválida");
                return;
            }

            existe.cantidad += extra;

            fetch(API + "/" + existe.id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(existe)
            }).then(() => {
                agregarRegistro("Stock actualizado: " + existe.nombre);
                verInventario();
                alert("STOCK ACTUALIZADO");
            });

            return;
        }

        const nombre = prompt("Nombre:");
        const cantidad = parseInt(prompt("Cantidad:"));
        const precio = parseFloat(prompt("Precio:"));

        fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codigo, nombre, cantidad, precio })
        }).then(() => {
            alert("PRODUCTO AGREGADO");
            agregarRegistro("Producto agregado: " + nombre);
            verInventario();
        });

    });
}


// ================= ELIMINAR =================
function eliminar() {
    const codigo = prompt("Código:");

    fetch(API)
    .then(r => r.json())
    .then(data => {
        const p = data.find(x => x.codigo == codigo);
        if (!p) return alert("No encontrado");

        fetch(API + "/" + p.id, { method: "DELETE" })
        .then(() => {
            agregarRegistro("Eliminado: " + p.nombre);
            verInventario();
        });
    });
}


// ================= VENDER =================
function vender() {
    const codigo = prompt("Código:");
    const cantidad = parseInt(prompt("Cantidad:"));

    fetch(API)
    .then(r => r.json())
    .then(data => {
        const p = data.find(x => x.codigo == codigo);
        if (!p) return alert("No encontrado");

        if (cantidad > p.cantidad) return alert("Sin stock");

        p.cantidad -= cantidad;

        dineroActual += p.precio * cantidad;
        localStorage.setItem("dinero", dineroActual);

        fetch(API + "/" + p.id, {
            method: "PUT",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(p)
        }).then(() => {
            agregarRegistro("Venta: " + p.nombre);
            actualizarDinero();
            verInventario();
        });
    });
}


// ================= BUSCAR =================
function buscar() {
    const codigo = prompt("Código:");

    fetch(API)
    .then(r => r.json())
    .then(data => {
        const p = data.find(x => x.codigo == codigo);
        if (!p) return alert("No encontrado");

        alert(`${p.nombre}\nCódigo: ${p.codigo}\nCantidad: ${p.cantidad}\nPrecio: Q${p.precio}`);
    });
}


// ================= EDITAR =================
function editarPrecio() {
    const codigo = prompt("Código del producto:");
    if (!codigo) return;

    fetch(API)
    .then(r => r.json())
    .then(data => {

        const p = data.find(x => String(x.codigo) === String(codigo));

        if (!p) {
            alert("❌ Producto no encontrado");
            return;
        }

        const nuevo = prompt("Nuevo precio:");
        const nuevoPrecio = parseFloat(nuevo);

        if (isNaN(nuevoPrecio)) {
            alert("❌ Precio inválido");
            return;
        }

        p.precio = nuevoPrecio;

        fetch(API + "/" + p.id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p)
        })
        .then(() => {
            alert("✅ Precio actualizado");
            agregarRegistro("Precio actualizado: " + p.nombre);
            verInventario();
        })
        .catch(err => {
            console.error(err);
            alert("❌ Error al actualizar");
        });
    });
}

// ================= DINERO =================
function actualizarDinero() {
    document.getElementById("dinero-actual").textContent =
    "Dinero actual: Q" + dineroActual.toFixed(2);
    
    localStorage.setItem("dinero", dineroActual);
}


// ================= REGISTROS (CON MODAL FUNCIONAL) =================
function agregarRegistro(texto) {

    const li = document.createElement("li");
    const fecha = new Date().toLocaleString();

    const obj = { texto, fecha };

    li.textContent = `[${fecha}] ${texto}`;

    li.addEventListener("click", () => abrirModalActividad(obj));

    document.getElementById("registro-lista").prepend(li);

    guardarRegistros();
}

function guardarRegistros() {
    const lista = document.querySelectorAll("#registro-lista li");
    const arr = [];

    lista.forEach(li => arr.push(li.textContent));

    localStorage.setItem("registros", JSON.stringify(arr));
}

function cargarRegistros() {
    const data = JSON.parse(localStorage.getItem("registros") || "[]");

    const lista = document.getElementById("registro-lista");
    lista.innerHTML = "";

    data.forEach(t => {
        const li = document.createElement("li");
        li.textContent = t;

        li.addEventListener("click", () => {
            const texto = t.replace(/\[.*?\]\s/, "");
            const fecha = t.match(/\[(.*?)\]/)?.[1];

            abrirModalActividad({ texto, fecha });
        });

        lista.appendChild(li);
    });
}


// ================= MODALES =================
function abrirModalProducto(p) {
    document.getElementById("modal-producto-detalles").innerHTML = `
        <div>ID: ${p.id}</div>
        <div>Nombre: ${p.nombre}</div>
        <div>Código: ${p.codigo}</div>
        <div>Cantidad: ${p.cantidad}</div>
        <div>Precio: Q${p.precio}</div>
    `;
    document.getElementById("modal-producto").classList.add("activo");
}

function cerrarModalProducto() {
    document.getElementById("modal-producto").classList.remove("activo");
}

function abrirModalActividad(r) {
    document.getElementById("modal-actividad-detalles").innerHTML = `
        <div>Fecha: ${r.fecha}</div>
        <div>Actividad: ${r.texto}</div>
    `;
    document.getElementById("modal-actividad").classList.add("activo");
}

function cerrarModalActividad() {
    document.getElementById("modal-actividad").classList.remove("activo");
}



// =========================
// 🔥 EDITAR DESDE MODAL (CLICK)
// =========================
document.addEventListener("click", (e) => {
    if (e.target.closest(".modal-item")) {
        const modal = e.target.closest(".modal");
        if (modal.id === "modal-producto") {
            editarDesdeModal();
        }
    }
});

function editarDesdeModal() {
    const codigo = prompt("Código del producto a editar:");
    const nuevoPrecio = parseFloat(prompt("Nuevo precio:"));

    fetch(API)
    .then(r => r.json())
    .then(data => {
        const p = data.find(x => x.codigo == codigo);

        if (!p) return alert("No encontrado");

        p.precio = nuevoPrecio;

        fetch(API + "/" + p.id, {
            method: "PUT",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(p)
        }).then(() => {
            alert("Actualizado desde modal");
            verInventario();
        });
    });
}


// =========================
// 🔥 VALIDACIÓN EN TIEMPO REAL (AGREGAR)
// =========================
function validarProductoExistente(codigo, nombre) {
    return fetch(API)
    .then(r => r.json())
    .then(data => {
        return data.find(p =>
            p.codigo == codigo || p.nombre.toLowerCase() == nombre.toLowerCase()
        );
    });
}


// =========================
// 🔥 MEJORA: AGREGAR CON ALERTA INSTANTÁNEA
// =========================
function agregarSeguro(codigo, nombre, cantidad, precio) {

    validarProductoExistente(codigo, nombre).then(existe => {

        if (existe) {
            alert("⚠️ YA EXISTE ESTE PRODUCTO\n\nCódigo o nombre repetido: " + existe.nombre);
            return;
        }

        fetch(API, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({codigo, nombre, cantidad, precio})
        }).then(() => {
            agregarRegistro("Producto agregado seguro: " + nombre);
            verInventario();
        });
    });
}