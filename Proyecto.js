const API = "/productos";

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
    document.getElementById("btn-crear-vendedor")
    .addEventListener("click", crearVendedor);

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

    if (rol === "vendedor") {

        btnAgregar.style.display = "none";

        btnEliminar.style.display = "none";

        btnEditar.style.display = "none";

        btnCrearVendedor.style.display = "none";
    }
}


// ================= CARGAR TODO =================
function cargarDatos() {
    // 1. Traer el balance
    fetch("/balance")
        .then(r => r.json())
        .then(data => {
            dineroActual = parseFloat(data.dinero_actual || 0);
            document.getElementById("dinero-actual").textContent = "Dinero actual: Q" + dineroActual.toFixed(2);
        });

    // 2. Traer los productos
    verInventario();

    // 3. Traer las actividades
    cargarRegistros(); 
}


// ================= SALIR =================
function salir() {

    const confirmar = confirm("¿Estás seguro que quieres salir?");

    if (!confirmar) return;

    sessionStorage.removeItem("sesion");

    sessionStorage.removeItem("usuario");

    sessionStorage.removeItem("rol");

    document.getElementById("login-section").style.display = "flex";

    document.querySelector("main").style.display = "none";

    document.querySelector("aside").style.display = "none";
}

function crearVendedor() {

    const usuario = prompt("Usuario del vendedor:");

    if (!usuario) return;

    const clave = prompt("Contraseña:");

    if (!clave) return;

    fetch("/usuarios", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
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

    const codigo = prompt("Código:");

    if (!codigo) return;

    // Verificar productos actuales
    fetch(API)
    .then(r => r.json())
    .then(async (data) => {

        // Producto existente actual
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

                alert("✅ STOCK ACTUALIZADO");
            });

            return;
        }

        // 🔥 NUEVA VALIDACIÓN
        // verificar si el código ya fue usado anteriormente

        const respuestaCodigo = await fetch("/verificar-codigo/" + codigo);

        const resultadoCodigo = await respuestaCodigo.json();

        if (resultadoCodigo.usado) {
            alert("❌ ESTE CÓDIGO YA FUE UTILIZADO");
            return;
        }

        // SI EL CÓDIGO ES NUEVO
        const nombre = prompt("Nombre:");
        const cantidad = parseInt(prompt("Cantidad:"));
        const precio = parseFloat(prompt("Precio:"));
        const imagen_url = prompt("Link de la imagen (URL):");

        agregarSeguro(codigo, nombre, cantidad, precio, imagen_url);
    });
}

// ================= ELIMINAR =================
function eliminar() {
    const codigo = prompt("Ingrese el código del producto que desea eliminar:");
    if (!codigo) return; // Si cancela el prompt, no hace nada

    fetch(API)
    .then(r => r.json())
    .then(data => {
        const p = data.find(x => x.codigo == codigo);
        if (!p) return alert("❌ Producto no encontrado");

        // --- AJUSTE DE SEGURIDAD: Confirmación antes de borrar ---
        const confirmar = confirm(`⚠️ ¿Estás seguro de que quieres eliminar el producto: "${p.nombre}"?\nEsta acción no se puede deshacer.`);

        if (confirmar) {
            fetch(API + "/" + p.id, { method: "DELETE" })
            .then(() => {
                agregarRegistro("Eliminado: " + p.nombre);
                verInventario();
                alert("✅ Producto eliminado correctamente");
            });
        }
    });
}

// ================= VENDER =================
function vender() {
    const codigo = prompt("Código del producto a vender:");
    const cantidad = parseInt(prompt("Cantidad:"));

    if (!codigo || isNaN(cantidad)) return;

    fetch(API)
    .then(r => r.json())
    .then(data => {
        const p = data.find(x => x.codigo == codigo);
        if (!p) return alert("❌ No encontrado");
        if (cantidad > p.cantidad) return alert("❌ Sin stock suficiente");

        p.cantidad -= cantidad;
        dineroActual += p.precio * cantidad;

        fetch(API + "/" + p.id, {
            method: "PUT",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(p)
        }).then(() => {
            agregarRegistro("Venta: " + p.nombre);
            actualizarDinero();
            verInventario();
            
            // --- AJUSTE DE ÉXITO: Mensaje de confirmación ---
            alert(" ¡VENTA REALIZADA EXITOSAMENTE! ✅  ");
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
    document.getElementById("dinero-actual").textContent = "Dinero actual: Q" + dineroActual.toFixed(2);
    
    // Guardar en la nube (MySQL)
    fetch("/balance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dinero: dineroActual })
    });
}

// ================= REGISTROS (CON MODAL FUNCIONAL) =================
function agregarRegistro(texto) {
    fetch("/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto })
    }).then(() => cargarRegistros());
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