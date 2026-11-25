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
