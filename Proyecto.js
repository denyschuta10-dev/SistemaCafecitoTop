const API = "/productos";

let ingresos = 0;
let saldo = 0;

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
    document.getElementById("btn-crear-vendedor")
.addEventListener("click", abrirModalVendedor);
    document.getElementById("btn-ver-usuarios")
    .addEventListener("click", verUsuarios);
    document.getElementById("close-modal-usuarios")
    .addEventListener("click", cerrarModalUsuarios);

});


// ================= LOGIN =================
function login() {

    const u = document.getElementById("login-usuario").value;
    const c = document.getElementById("login-clave").value;

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario: u,
            clave: c
        })
    })
    .then(r => r.json())
    .then(data => {

        if (data.error) {

            document.getElementById("login-error").style.display = "block";

            return;
        }

        sessionStorage.setItem("sesion", "true");

        sessionStorage.setItem("usuario", data.usuario);

        sessionStorage.setItem("rol", data.rol);

        document.getElementById("login-section").style.display = "none";

        document.querySelector("main").style.display = "block";

        document.querySelector("aside").style.display = "flex";

        aplicarPermisos();

        cargarDatos();
    });
}


// ================= SESION =================
function verificarSesion() {

    if (sessionStorage.getItem("sesion") === "true") {

        document.getElementById("login-section").style.display = "none";

        document.querySelector("main").style.display = "block";

        document.querySelector("aside").style.display = "flex";

        // 🔥 APLICAR PERMISOS
        aplicarPermisos();

        cargarDatos();

    } else {

        document.getElementById("login-section").style.display = "flex";
    }
}

function aplicarPermisos() {

    const rol = sessionStorage.getItem("rol");

    const btnAgregar = document.getElementById("btn-agregar");

    const btnEliminar = document.getElementById("btn-eliminar");

    const btnEditar = document.getElementById("btn-editar");

    const btnCrearVendedor = document.getElementById("btn-crear-vendedor");

    const btnVerUsuarios = document.getElementById("btn-ver-usuarios");

    if (rol === "vendedor") {

        btnAgregar.style.display = "none";

        btnEliminar.style.display = "none";

        btnEditar.style.display = "none";

        btnCrearVendedor.style.display = "none";

        btnVerUsuarios.style.display = "none";
    }
}


// ================= CARGAR TODO =================
function cargarDatos() {
    // 1. Traer el balance
    fetch("/balance")
        .then(r => r.json())
        .then(data => {

    ingresos = parseFloat(data.ingresos || 0);

    egresos = parseFloat(data.egresos || 0);

    saldo = parseFloat(data.saldo || 0);

    document.getElementById("ingresos").textContent =
        "Ingresos: Q" + ingresos.toFixed(2);

    document.getElementById("saldo").textContent =
        "Saldo: Q" + saldo.toFixed(2);
});

    // 2. Traer los productos
    verInventario();

    // 3. Traer las actividades
    cargarRegistros(); 
}


// ================= SALIR =================
function salir() {

    abrirFormulario("Cerrar Sesión", `

        <div class="formulario-moderno">

            <p style="text-align:center;">
                ¿Deseas cerrar sesión?
            </p>

            <button class="btn-danger" onclick="confirmarSalir()">
                Salir
            </button>

        </div>
    `);
}

function confirmarSalir() {

    sessionStorage.clear();

    document.getElementById("login-section").style.display = "flex";

    document.querySelector("main").style.display = "none";

    document.querySelector("aside").style.display = "none";

    cerrarFormulario();
}

function crearVendedor() {

    const nombre = prompt("Nombre completo del vendedor:");

    if (!nombre) return;

    const usuario = prompt("Usuario que tendrá:");

    if (!usuario) return;

    const clave = prompt("Contraseña:");

    if (!clave) return;

    fetch("/usuarios", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            nombre,
            usuario,
            clave,
            rol: "vendedor"
        })
    })
    .then(r => r.json())
    .then(data => {

        if (data.error) {

            alert(data.error);

            return;
        }

        alert("✅ Vendedor creado correctamente");
    });
}


// ================= INVENTARIO (ACTUALIZADO) =================
function verInventario() {
    fetch(API)
    .then(r => r.json())
    .then(data => {
        const cont = document.getElementById("inventario");
        cont.innerHTML = "";

        data.forEach(p => {
            const div = document.createElement("div");
            div.className = "tarjeta";
            
            // Si tiene link usa la foto, si no, usa un icono por defecto. 
            // 'onerror' sirve por si el link está roto.
            const imagen = p.imagen_url 
            ? `<img src="${p.imagen_url}" class="img-producto-tarjeta" onerror="this.src='https://cdn-icons-png.flaticon.com/512/924/924514.png'">` 
            : `<i class="fas fa-coffee fa-3x" style="margin-bottom:10px; color:#006241;"></i>`;
            
            div.innerHTML = `
            ${imagen} 
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

    abrirFormulario("Agregar Producto", `

        <div class="formulario-moderno">

            <input type="text" id="f-codigo" placeholder="Código">

            <input type="text" id="f-nombre" placeholder="Nombre">

            <input type="number" id="f-cantidad" placeholder="Cantidad">

            <input type="number" id="f-precio" placeholder="Precio">

            <input type="text" id="f-imagen" placeholder="URL Imagen">

            <button onclick="guardarProducto()">
                Agregar Producto
            </button>

        </div>
    `);
}

function guardarProducto() {

    const codigo = document.getElementById("f-codigo").value;

    const nombre = document.getElementById("f-nombre").value;

    const cantidad = parseInt(document.getElementById("f-cantidad").value);

    const precio = parseFloat(document.getElementById("f-precio").value);

    const imagen_url = document.getElementById("f-imagen").value;

    agregarSeguro(codigo, nombre, cantidad, precio, imagen_url);

    cerrarFormulario();
}

// ================= ELIMINAR =================
function eliminar() {

    abrirFormulario("Eliminar Producto", `

        <div class="formulario-moderno">

            <input type="text" id="codigo-eliminar" placeholder="Código del producto">

            <button class="btn-danger" onclick="confirmarEliminar()">
                Eliminar
            </button>

        </div>
    `);
}

function confirmarEliminar() {

    const codigo = document.getElementById("codigo-eliminar").value;

    fetch(API)
    .then(r => r.json())
    .then(data => {

        const p = data.find(x => x.codigo == codigo);

        if (!p) {
            alert("Producto no encontrado");
            return;
        }

       abrirFormulario("Confirmar Eliminación", `

    <div class="formulario-moderno">

        <p style="text-align:center; font-size:1rem;">
            ¿Seguro que deseas eliminar:
            <strong>${p.nombre}</strong>?
        </p>

        <button class="btn-danger"
        onclick="eliminarDefinitivo(${p.id}, '${p.nombre}')">
            Sí, eliminar
        </button>

    </div>
`);
    });
}

function eliminarDefinitivo(id, nombre) {

    fetch(API + "/" + id, {
        method: "DELETE"
    })
    .then(() => {

        agregarRegistro("Eliminado: " + nombre);

        verInventario();

        cerrarFormulario();
    });
}


// ================= VENDER =================

function vender() {

    abrirFormulario("Vender Producto", `

        <div class="formulario-moderno">

            <input type="text" id="codigo-vender" placeholder="Código">

            <input type="number" id="cantidad-vender" placeholder="Cantidad">

            <button onclick="confirmarVenta()">
                Vender
            </button>

        </div>
    `);
}

function confirmarVenta() {

    const codigo =
    document.getElementById("codigo-vender").value;

    const cantidad =
    parseInt(document.getElementById("cantidad-vender").value);

    fetch(API)
    .then(r => r.json())
    .then(data => {

        const p = data.find(x => x.codigo == codigo);

        if (!p) return;

        if (cantidad > p.cantidad) return;

        p.cantidad -= cantidad;

        const totalVenta = p.precio * cantidad;

        ingresos += totalVenta;

        saldo = ingresos;

        fetch(API + "/" + p.id, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(p)

        }).then(() => {

            actualizarDinero();

            agregarRegistro("Venta: " + p.nombre);

            verInventario();

            cerrarFormulario();
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

    abrirFormulario("Editar Precio", `

        <div class="formulario-moderno">

            <input type="text" id="codigo-editar" placeholder="Código">

            <input type="number" id="nuevo-precio" placeholder="Nuevo precio">

            <button onclick="guardarNuevoPrecio()">
                Actualizar
            </button>

        </div>
    `);
}

function guardarNuevoPrecio() {

    const codigo = document.getElementById("codigo-editar").value;

    const nuevoPrecio =
    parseFloat(document.getElementById("nuevo-precio").value);

    fetch(API)
    .then(r => r.json())
    .then(data => {

        const p = data.find(x => x.codigo == codigo);

        if (!p) return;

        p.precio = nuevoPrecio;

        fetch(API + "/" + p.id, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(p)

        }).then(() => {

            agregarRegistro("Precio actualizado: " + p.nombre);

            verInventario();

            cerrarFormulario();
        });
    });
}

// ================= DINERO =================
function actualizarDinero() {

    document.getElementById("ingresos").textContent =
        "Ingresos: Q" + ingresos.toFixed(2);

    document.getElementById("saldo").textContent =
        "Saldo: Q" + saldo.toFixed(2);

    fetch("/balance", {

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            ingresos,
            saldo
        })
    });
}

// ================= REGISTROS (CON MODAL FUNCIONAL) =================
function agregarRegistro(texto) {

    const usuario = sessionStorage.getItem("usuario") || "Desconocido";

    fetch("/actividades", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            texto: usuario + ": " + texto
        })
    })
    .then(() => cargarRegistros());
}


function cargarRegistros() {
    fetch("/actividades")
    .then(r => r.json())
    .then(data => {
        const lista = document.getElementById("registro-lista");
        lista.innerHTML = "";
        data.forEach(act => {
            const li = document.createElement("li");
            const fecha = new Date(act.fecha).toLocaleString();
            li.textContent = `[${fecha}] ${act.texto}`;
            
            li.addEventListener("click", () => {
                abrirModalActividad({ texto: act.texto, fecha: fecha });
            });

            lista.appendChild(li);
        });
    });
}


// ================= MODALES =================
function abrirModalProducto(p) {
    const vistaPreviaImagen = p.imagen_url 
        ? `<img src="${p.imagen_url}" style="width:100%; max-height:200px; object-fit:contain; margin-bottom:15px; border-radius:8px;">` 
        : `<div style="text-align:center; margin-bottom:15px;"><i class="fas fa-coffee fa-4x" style="color:#006241;"></i></div>`;

    document.getElementById("modal-producto-detalles").innerHTML = `
        ${vistaPreviaImagen}
        <div style="border-top: 1px solid #eee; pt-3">
            <div><strong>ID:</strong> ${p.id}</div>
            <div><strong>Nombre:</strong> ${p.nombre}</div>
            <div><strong>Código:</strong> ${p.codigo}</div>
            <div><strong>Cantidad:</strong> ${p.cantidad}</div>
            <div><strong>Precio:</strong> Q${p.precio}</div>
        </div>
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
function agregarSeguro(codigo, nombre, cantidad, precio, imagen_url) { // <--- Agregamos imagen_url aquí

    validarProductoExistente(codigo, nombre).then(existe => {

        if (existe) {
            alert("⚠️ YA EXISTE ESTE PRODUCTO\n\nCódigo o nombre repetido: " + existe.nombre);
            return;
        }

        fetch(API, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({codigo, nombre, cantidad, precio, imagen_url})
})

.then(async (res) => {

    const data = await res.json().catch(() => ({}));

    // SI HAY ERROR
    if (!res.ok) {
        alert(data.mensaje || "❌ Error al agregar");
        return;
    }

    // SI TODO SALE BIEN
    alert("✅ PRODUCTO AGREGADO CON ÉXITO");

    agregarRegistro("Producto agregado: " + nombre);

    verInventario();
})


.catch(err => {
    console.error(err);
    alert("❌ Error del servidor");
});
    });
}

function verUsuarios() {

    fetch("/usuarios")
    .then(r => r.json())
    .then(data => {

        const tabla = document.getElementById("tabla-usuarios");

        tabla.innerHTML = "";

        data.forEach(u => {

         tabla.innerHTML += `
    <tr>
        <td>${u.id}</td>
        <td>${u.nombre || "Sin nombre"}</td>
        <td>${u.usuario}</td>
        <td>${u.rol}</td>
        <td>
            ${
                u.rol !== "admin"
                ? `<button onclick="eliminarUsuario(${u.id})">
                    Eliminar
                   </button>`
                : "Protegido"
            }
        </td>
    </tr>
`;
        });

        document.getElementById("modal-usuarios")
        .classList.add("activo");
    });
}


function cerrarModalUsuarios() {

    document.getElementById("modal-usuarios")
    .classList.remove("activo");
}

// =========================
// MODAL FORMULARIO
// =========================

function abrirFormulario(titulo, contenidoHTML) {

    document.getElementById("titulo-formulario").innerHTML = titulo;

    document.getElementById("contenido-formulario").innerHTML = contenidoHTML;

    document.getElementById("modal-formulario")
    .classList.add("activo");
}

function cerrarFormulario() {

    document.getElementById("modal-formulario")
    .classList.remove("activo");
}

document.getElementById("close-modal-formulario")
.addEventListener("click", cerrarFormulario);



function eliminarUsuario(id) {

    const confirmar = confirm("¿Eliminar este usuario?");

    if (!confirmar) return;

    fetch("/usuarios/" + id, {
        method: "DELETE"
    })
    .then(() => {

        alert("✅ Usuario eliminado");

        verUsuarios();
    });
}


function abrirModalVendedor() {

    document.getElementById("modal-vendedor")
    .classList.add("activo");
}

function cerrarModalVendedor() {

    document.getElementById("modal-vendedor")
    .classList.remove("activo");
}

function crearVendedorFormulario() {

    const nombre =
    document.getElementById("nuevo-nombre").value;

    const usuario =
    document.getElementById("nuevo-usuario").value;

    const clave =
    document.getElementById("nuevo-clave").value;

    if (!nombre || !usuario || !clave) {

        alert("⚠️ Completa todos los campos");

        return;
    }

    fetch("/usuarios", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            nombre,
            usuario,
            clave,
            rol: "vendedor"
        })
    })
    .then(r => r.json())
    .then(data => {

        if (data.error) {

            alert(data.error);

            return;
        }

        alert("✅ Vendedor creado correctamente");

        document.getElementById("nuevo-nombre").value = "";

        document.getElementById("nuevo-usuario").value = "";

        document.getElementById("nuevo-clave").value = "";

        cerrarModalVendedor();
    });
}