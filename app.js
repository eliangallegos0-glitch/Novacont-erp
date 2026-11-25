import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://uvfthbmeyeekpuzsokvy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nDVJYmv8hY_0slYyV2ghWg_CBSb_91m";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarDatos() {
  const empresaEl = document.getElementById("empresa-info");
  const tbodyEl = document.getElementById("tabla-cuentas");

  const { data: empresas, error: errEmp } = await supabase
    .from("empresas")
    .select("razon_social, ruc, iva_porcentaje")
    .limit(1);

  if (errEmp) {
    empresaEl.textContent = `Error al conectar: ${errEmp.message}`;
    return;
  }

  if (empresas?.length) {
    const emp = empresas[0];
    empresaEl.textContent = `${emp.razon_social} · RUC: ${emp.ruc} · IVA: ${emp.iva_porcentaje}%`;
  }

  const { data: cuentas, error: errCue } = await supabase
    .from("plan_cuentas")
    .select("codigo, nombre, tipo, es_detalle")
    .order("codigo", { ascending: true });

  if (errCue) {
    tbodyEl.innerHTML = `<tr><td colspan="4" class="py-4 text-red-400">${errCue.message}</td></tr>`;
    return;
  }

  tbodyEl.innerHTML = cuentas
    .map(
      (c) => `
      <tr class="${c.es_detalle ? "text-slate-100" : "text-emerald-400 font-semibold bg-slate-800/30"}">
        <td class="py-2 pr-4">${c.codigo}</td>
        <td class="py-2 pr-4">${c.nombre}</td>
        <td class="py-2 pr-4">${c.tipo}</td>
        <td class="py-2">${c.es_detalle ? "Sí" : "Grupo"}</td>
      </tr>`
    )
    .join("");
}

cargarDatos();
cargarDatos();
  const formCuenta = document.getElementById("form-cuenta");

formCuenta.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { data: empresa, error: errEmpresa } = await supabase
      .from("empresas")
      .select("id")
      .limit(1)
      .single();

    if (errEmpresa || !empresa) {
      alert("No se encontró una empresa registrada: " + (errEmpresa?.message || ""));
      return;
    }

    const tipoCuenta = document.getElementById("tipo").value;
    const naturalezaCuenta = ["ACTIVO", "COSTO", "GASTO"].includes(tipoCuenta)
      ? "DEUDORA"
      : "ACREEDORA";

    const nuevaCuenta = {
      empresa_id: empresa.id,
      codigo: document.getElementById("codigo").value.trim(),
      nombre: document.getElementById("nombre").value.trim(),
      tipo: tipoCuenta,
      naturaleza: naturalezaCuenta,
      es_detalle: document.getElementById("es_detalle").value === "true"
    };

    const { error } = await supabase.from("plan_cuentas").insert([nuevaCuenta]);

    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }

    formCuenta.reset();
    cargarDatos();
  });
let cuentasDisponibles = [];
let lineasBorrador = [];

const fechaInput = document.getElementById("asiento-fecha");
if (fechaInput && !fechaInput.value) {
  fechaInput.value = new Date().toISOString().split("T")[0];
}

async function cargarCuentasParaAsiento() {
  const { data, error } = await supabase
    .from("plan_cuentas")
    .select("id, codigo, nombre, tipo, naturaleza, es_detalle")
    .order("codigo", { ascending: true });

  if (error || !data) return;
  cuentasDisponibles = data;

  const selectCuenta = document.getElementById("linea-cuenta");
  if (!selectCuenta) return;

  const cuentasDetalle = data.filter((c) => c.es_detalle !== false);
  const lista = cuentasDetalle.length > 0 ? cuentasDetalle : data;

  selectCuenta.innerHTML = lista
    .map((c) => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`)
    .join("");
}

function renderBorradorAsiento() {
  const tbody = document.getElementById("tabla-borrador-asiento");
  const totalDebeEl = document.getElementById("total-debe");
  const totalHaberEl = document.getElementById("total-haber");
  const estadoCuadreEl = document.getElementById("estado-cuadre");

  if (!tbody) return;

  if (lineasBorrador.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-3 text-slate-500 text-center">Agrega al menos 2 líneas con Debe = Haber</td></tr>`;
  } else {
    tbody.innerHTML = lineasBorrador
      .map(
        (l, idx) => `
      <tr>
        <td class="py-2 pr-3">${l.textoCuenta}</td>
        <td class="py-2 px-3 text-right text-emerald-400">$${l.debe.toFixed(2)}</td>
        <td class="py-2 px-3 text-right text-sky-400">$${l.haber.toFixed(2)}</td>
        <td class="py-2 pl-3 text-right">
          <button type="button" onclick="eliminarLinea(${idx})" class="text-rose-400 hover:text-rose-300 text-xs">Quitar</button>
        </td>
      </tr>`
      )
      .join("");
  }

  const totalDebe = lineasBorrador.reduce((acc, l) => acc + l.debe, 0);
  const totalHaber = lineasBorrador.reduce((acc, l) => acc + l.haber, 0);
  const cuadra = lineasBorrador.length >= 2 && Math.abs(totalDebe - totalHaber) < 0.005 && totalDebe > 0;

  if (totalDebeEl) totalDebeEl.textContent = `$${totalDebe.toFixed(2)}`;
  if (totalHaberEl) totalHaberEl.textContent = `$${totalHaber.toFixed(2)}`;

  if (estadoCuadreEl) {
    if (cuadra) {
      estadoCuadreEl.textContent = "Cuadrado (OK)";
      estadoCuadreEl.className = "text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30";
    } else {
      estadoCuadreEl.textContent = "Sin cuadrar";
      estadoCuadreEl.className = "text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30";
    }
  }
}

window.eliminarLinea = function (index) {
  lineasBorrador.splice(index, 1);
  renderBorradorAsiento();
};

document.getElementById("btn-agregar-linea")?.addEventListener("click", () => {
  const selectCuenta = document.getElementById("linea-cuenta");
  const debe = parseFloat(document.getElementById("linea-debe").value) || 0;
  const haber = parseFloat(document.getElementById("linea-haber").value) || 0;

  if (debe <= 0 && haber <= 0) {
    alert("Ingresa un monto mayor a 0 en Debe o en Haber.");
    return;
  }
  if (debe > 0 && haber > 0) {
    alert("En una misma línea pon monto solo en Debe o solo en Haber.");
    return;
  }

  lineasBorrador.push({
    cuenta_id: selectCuenta.value,
    textoCuenta: selectCuenta.options[selectCuenta.selectedIndex].text,
    debe: Number(debe.toFixed(2)),
    haber: Number(haber.toFixed(2))
  });

  document.getElementById("linea-debe").value = "0.00";
  document.getElementById("linea-haber").value = "0.00";
  renderBorradorAsiento();
});

document.getElementById("form-asiento")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const totalDebe = lineasBorrador.reduce((acc, l) => acc + l.debe, 0);
  const totalHaber = lineasBorrador.reduce((acc, l) => acc + l.haber, 0);

  if (lineasBorrador.length < 2 || Math.abs(totalDebe - totalHaber) >= 0.005 || totalDebe <= 0) {
    alert("El asiento debe tener al menos 2 líneas y el total del Debe debe ser igual al Haber.");
    return;
  }

  const { data: empresa, error: errEmpresa } = await supabase
    .from("empresas")
    .select("id")
    .limit(1)
    .single();

  if (errEmpresa || !empresa) {
    alert("No se encontró una empresa registrada.");
    return;
  }

  const { data: asientoCreado, error: errAsiento } = await supabase
    .from("asientos")
    .insert([
      {
        empresa_id: empresa.id,
        fecha: document.getElementById("asiento-fecha").value,
        glosa: document.getElementById("asiento-glosa").value.trim()
      }
    ])
    .select("id")
    .single();

  if (errAsiento || !asientoCreado) {
    alert("Error al crear asiento: " + (errAsiento?.message || ""));
    return;
  }

  const detalles = lineasBorrador.map((l) => ({
    asiento_id: asientoCreado.id,
    cuenta_id: l.cuenta_id,
    debe: l.debe,
    haber: l.haber
  }));

  const { error: errDetalle } = await supabase.from("detalle_asientos").insert(detalles);

  if (errDetalle) {
    alert("Error al guardar detalles: " + errDetalle.message);
    return;
  }

  lineasBorrador = [];
  document.getElementById("asiento-glosa").value = "";
  renderBorradorAsiento();
  await cargarBalanceComprobacion();
  alert("Asiento guardado y saldos actualizados.");
});

async function cargarBalanceComprobacion() {
  const tbody = document.getElementById("tabla-balance");
  if (!tbody) return;

  const { data: cuentas } = await supabase
    .from("plan_cuentas")
    .select("id, codigo, nombre, tipo, naturaleza")
    .order("codigo", { ascending: true });

  const { data: movimientos } = await supabase
    .from("detalle_asientos")
    .select("cuenta_id, debe, haber");

  if (!cuentas) return;

  const acumulados = {};
  (movimientos || []).forEach((m) => {
    if (!acumulados[m.cuenta_id]) {
      acumulados[m.cuenta_id] = { debe: 0, haber: 0 };
    }
    acumulados[m.cuenta_id].debe += Number(m.debe) || 0;
    acumulados[m.cuenta_id].haber += Number(m.haber) || 0;
  });

  tbody.innerHTML = cuentas
    .map((c) => {
      const sumDebe = acumulados[c.id]?.debe || 0;
      const sumHaber = acumulados[c.id]?.haber || 0;
      const esDeudora = ["ACTIVO", "COSTO", "GASTO"].includes((c.tipo || "").toUpperCase()) ||
        (c.naturaleza || "").toUpperCase().includes("DEUDOR");

      const saldo = esDeudora ? sumDebe - sumHaber : sumHaber - sumDebe;

      return `
      <tr>
        <td class="py-2 pr-4 font-mono text-xs">${c.codigo}</td>
        <td class="py-2 pr-4">${c.nombre}</td>
        <td class="py-2 px-3 text-right text-emerald-400">$${sumDebe.toFixed(2)}</td>
        <td class="py-2 px-3 text-right text-sky-400">$${sumHaber.toFixed(2)}</td>
        <td class="py-2 pl-3 text-right font-semibold">$${saldo.toFixed(2)}</td>
      </tr>`;
    })
    .join("");
  async function cargarAsientosGuardados() {
  const tbody = document.getElementById("tabla-asientos-guardados");
  if (!tbody) return;

  const { data: asientos, error } = await supabase
    .from("asientos")
    .select("id, fecha, glosa, detalle_asientos(debe)")
    .order("creado_en", { ascending: false });

  if (error || !asientos || asientos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-3 text-slate-500">No hay asientos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = asientos
    .map((a) => {
      const total = (a.detalle_asientos || []).reduce((s, d) => s + (Number(d.debe) || 0), 0);
      return `
      <tr>
        <td class="py-2 pr-3 font-mono text-xs">${a.fecha}</td>
        <td class="py-2 pr-3">${a.glosa}</td>
        <td class="py-2 px-3 text-right text-emerald-400">$${total.toFixed(2)}</td>
        <td class="py-2 pl-3 text-right">
          <button type="button" onclick="deshacerAsiento('${a.id}')" class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded">
            Deshacer
          </button>
        </td>
      </tr>`;
    })
    .join("");
}

window.deshacerAsiento = async function (asientoId) {
  if (!confirm("¿Deshacer este asiento contable? Se actualizarán los saldos.")) return;

  const { error } = await supabase.from("asientos").delete().eq("id", asientoId);
  if (error) {
    alert("Error al deshacer: " + error.message);
    return;
  }

  await cargarAsientosGuardados();
  await cargarBalanceComprobacion();
};

const formAsientoActual = document.getElementById("form-asiento");
if (formAsientoActual) {
  formAsientoActual.addEventListener("submit", () => {
    setTimeout(cargarAsientosGuardados, 400);
  });
}

cargarAsientosGuardados();
}

cargarCuentasParaAsiento();
renderBorradorAsiento();
cargarBalanceComprobacion();
