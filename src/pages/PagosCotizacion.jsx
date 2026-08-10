// LEGACY FILE: current routed quotation payments page resolves to src/pages/PagosCotizacion.tsx.
// Keep out of new implementations unless the route import is changed intentionally.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, AlertCircle, Trash2, Eye, DollarSign, FileText } from "lucide-react";
import { Card, CardHeader, CardContent, Input, Label, Button, Textarea } from "@/components/ui";
import { getCotizacionById } from "../services/cotizacionesService";
import { createPago, listPagos, deletePago } from "../services/pagosService";
import { getConfig } from "../services/configService";
import { generatePagoReciboPDF } from "../utils/generatePagoReciboPDF";
import { normalizeQuotationStatus } from "../constants/quotationStatus";
import { formatDateOnly, toLocalDateOnly } from "../utils/dateOnly";

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round((toSafeNumber(value) + Number.EPSILON) * 100) / 100;
}

function calculateTotal(cotizacion) {
  if (!cotizacion) return 0;
  return roundMoney(cotizacion?.total ?? cotizacion?.monto ?? 0);
}

function calculateSaldo(cotizacion, total, anticipo) {
  const persistedSaldo = Number(cotizacion?.saldo);
  if (Number.isFinite(persistedSaldo) && persistedSaldo >= 0) {
    return roundMoney(persistedSaldo);
  }

  return roundMoney(Math.max(0, toSafeNumber(total) - toSafeNumber(anticipo)));
}

function toDateFormatted(d) {
  if (!d) return "-";
  try {
    return formatDateOnly(d, "es-MX", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function getPagoSortDate(pago) {
  const value = pago?.fecha || pago?.createdAt;
  const dt = value ? new Date(value) : null;
  return dt && !Number.isNaN(dt.getTime()) ? dt : new Date(0);
}

function getPagoKey(pago) {
  return pago?._id || `${pago?.fecha || "-"}-${pago?.monto || 0}`;
}

export default function PagosCotizacionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cotizacion, setCotizacion] = useState(null);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toLocalDateOnly(new Date()));
  const [formaDePago, setFormaDePago] = useState("transferencia");
  const [cuenta, setCuenta] = useState("");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [pagos, setPagos] = useState([]);
  const [pagosLoading, setPagosLoading] = useState(false);
  const [montoError, setMontoError] = useState("");
  const [empresaConfig, setEmpresaConfig] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getCotizacionById(id)
      .then((data) => {
        if (!active) return;
        setCotizacion(data);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err?.response?.data?.msg || err?.message || "No se pudo cargar la cotización";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };

    setPagosLoading(true);
    listPagos({ cotizacionId: id })
      .then((data) => {
        if (!active) return;
        const list = data?.data || data?.pagos || data || [];
        setPagos(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setPagos([]);
      })
      .finally(() => {
        if (active) setPagosLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    getConfig()
      .then((cfg) => {
        if (!active) return;
        setEmpresaConfig(cfg || null);
      })
      .catch(() => {
        if (!active) return;
        setEmpresaConfig(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(() => calculateTotal(cotizacion), [cotizacion]);
  const anticipo = toSafeNumber(cotizacion?.anticipo);
  const saldo = useMemo(() => calculateSaldo(cotizacion, total, anticipo), [cotizacion, total, anticipo]);
  const totalPagado = pagos.reduce((sum, p) => sum + Number(p?.monto || 0), 0);
  const pagosOrdenadosAsc = useMemo(() => {
    return [...pagos].sort((a, b) => getPagoSortDate(a).getTime() - getPagoSortDate(b).getTime());
  }, [pagos]);

  const handleMontoChange = (e) => {
    const val = e.target.value;
    setMonto(val);
    setMontoError("");

    const abono = Number(val);
    if (abono > saldo && abono > 0) {
      setMontoError(`El monto excede el saldo disponible ($${saldo.toFixed(2)})`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const abono = Number(monto);
    if (!Number.isFinite(abono) || abono <= 0) {
      setMontoError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (abono > saldo) {
      setMontoError(`El monto excede el saldo disponible ($${saldo.toFixed(2)})`);
      return;
    }

    const estadoActual = normalizeQuotationStatus(cotizacion?.estado);
    if (estadoActual !== "Contratado") {
      alert("Solo se pueden registrar pagos en cotizaciones contratadas.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cotizacionId: id,
        fecha: fecha || toLocalDateOnly(new Date()),
        monto: abono,
        formaDePago,
        cuenta: cuenta || undefined,
        referencia: referencia || undefined,
        notas: notas || undefined,
      };

      const result = await createPago(payload);
      const updated = result?.cotizacion || result?.cotizacionActualizada || result?.data?.cotizacion;
      if (updated) {
        setCotizacion(updated);
      } else {
        const refreshed = await getCotizacionById(id);
        setCotizacion(refreshed);
      }

      const list = await listPagos({ cotizacionId: id });
      const next = list?.data || list?.pagos || list || [];
      setPagos(Array.isArray(next) ? next : []);
      setMonto("");
      setCuenta("");
      setReferencia("");
      setNotas("");
      setMontoError("");
      alert("Pago registrado correctamente.");
    } catch (err) {
      const msg = err?.response?.data?.details || err?.response?.data?.msg || err?.response?.data?.error || err?.message || "No se pudo registrar el pago";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePago = async (pagoId) => {
    if (!pagoId) return;
    if (!window.confirm("¿Deseas eliminar este pago?")) return;

    try {
      await deletePago(pagoId);
      const refreshed = await getCotizacionById(id);
      setCotizacion(refreshed);

      const list = await listPagos({ cotizacionId: id });
      const next = list?.data || list?.pagos || list || [];
      setPagos(Array.isArray(next) ? next : []);
    } catch (err) {
      const msg = err?.response?.data?.msg || err?.message || "No se pudo eliminar el pago";
      alert(msg);
    }
  };

  const buildNoRecibo = (pago) => {
    if (pago?.folio) return String(pago.folio);
    const dt = getPagoSortDate(pago);
    const yyyymm = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const idx = Math.max(0, pagosOrdenadosAsc.findIndex((p) => getPagoKey(p) === getPagoKey(pago)));
    const consecutivo = String(idx + 1).padStart(4, "0");
    return `REC-${yyyymm}-${consecutivo}`;
  };

  const getPagosAcumuladosHasta = (pago) => {
    let sum = 0;
    for (const p of pagosOrdenadosAsc) {
      sum += Number(p?.monto || 0);
      if (getPagoKey(p) === getPagoKey(pago)) break;
    }
    return Math.max(0, sum);
  };

  const handleGenerateRecibo = async (pago) => {
    if (!cotizacion || !pago) return;

    try {
      const pagosAcumulados = getPagosAcumuladosHasta(pago);
      const saldoPendiente = Math.max(0, Number(total || 0) - pagosAcumulados);
      const noRecibo = buildNoRecibo(pago);
      const lugarEvento =
        cotizacion?.salon?.nombre ||
        cotizacion?.salonNombre ||
        cotizacion?.lugarEvento ||
        cotizacion?.direccionEvento ||
        cotizacion?.ubicacion ||
        "-";

      await generatePagoReciboPDF({
        noRecibo,
        fechaEmision: new Date(),
        empresa: {
          nombreComercial: empresaConfig?.nombreComercial,
          razonSocial: empresaConfig?.razonSocial,
          rfc: empresaConfig?.rfc,
          direccion: empresaConfig?.direccion,
          telefono: empresaConfig?.telefono,
          email: empresaConfig?.email,
          logoUrl: empresaConfig?.logoUrl || empresaConfig?.logo || cotizacion?.empresa?.logoUrl,
        },
        cotizacion: {
          folio: cotizacion?.folio,
          nombreEvento: cotizacion?.nombreEvento,
          fechaEvento: cotizacion?.fechaEvento,
          lugarEvento,
          cliente: {
            nombre: cotizacion?.cliente?.nombre,
            telefono: cotizacion?.cliente?.telefono,
            email: cotizacion?.cliente?.email,
          },
        },
        pago: {
          fecha: pago?.fecha,
          monto: Number(pago?.monto || 0),
          formaDePago: pago?.formaDePago,
          referencia: pago?.referencia,
          cuenta: pago?.cuenta,
          notas: pago?.notas,
        },
        totalServicio: Number(total || 0),
        pagosAcumulados,
        saldoPendiente,
        firmas: {
          clienteNombre: cotizacion?.cliente?.nombre,
          fechaPago: pago?.fecha,
          empresaNombre: empresaConfig?.nombreComercial || empresaConfig?.razonSocial,
          usuarioAplicoNombre: pago?.createdBy?.nombre || pago?.createdBy?.email,
        },
        verificationUrl: `${window.location.origin}/cotizaciones/${id}/ver`,
      });
    } catch (err) {
      const msg = err?.message || "No se pudo generar el recibo";
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] p-6">
        <div className="text-center text-[#64748B]">Cargando cotización...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <button onClick={() => navigate("/cotizaciones")} className="hover:text-[#111827] transition">Cotizaciones</button>
              <ChevronRight size={16} />
              <span className="text-[#111827] font-medium">Pagos</span>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#111827]">Pagos</h1>
              <p className="text-sm text-[#64748B] mt-1">
                Folio: <span className="font-mono font-semibold text-[#111827]">{cotizacion?.folio || "-"}</span> • Cliente: <span className="font-semibold text-[#111827]">{cotizacion?.cliente?.nombre || "-"}</span>
              </p>
            </div>

            <button
              onClick={() => navigate(`/cotizaciones/${id}/ver`)}
              className="px-4 py-2 text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg hover:bg-[#2563EB]/5 transition"
            >
              <Eye size={16} className="inline mr-1" /> Ver cotización
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {cotizacion && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda */}
            <div className="lg:col-span-2 space-y-6">
              {/* Registrar abono */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-6">Registrar abono</h2>

                {normalizeQuotationStatus(cotizacion?.estado) !== "Contratado" && (
                  <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">Esta cotización no está en estado Contratado. No se pueden registrar pagos. Estado actual: {normalizeQuotationStatus(cotizacion?.estado) || "Cotizado"}.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Row 1: Fecha + Forma de pago */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold uppercase text-[#64748B]">Fecha del pago</Label>
                      <Input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase text-[#64748B]">Forma de pago</Label>
                      <select
                        className="w-full mt-1.5 h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white text-[#111827] hover:border-slate-300 focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                        value={formaDePago}
                        onChange={(e) => setFormaDePago(e.target.value)}
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="cheque">Cheque</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Monto (IMPORTANTE) */}
                  <div>
                    <Label className="text-xs font-semibold uppercase text-[#64748B]">Monto del abono</Label>
                    <div className="mt-1.5">
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-xl font-semibold text-[#2563EB]">$</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={monto}
                          onChange={handleMontoChange}
                          placeholder="0.00"
                          className="pl-8 text-lg font-semibold"
                        />
                      </div>
                      {montoError && <p className="text-xs text-red-600 mt-2">{montoError}</p>}
                    </div>
                  </div>

                  {/* Row 3: Cuenta + Referencia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold uppercase text-[#64748B]">Cuenta destino</Label>
                      <Input
                        value={cuenta}
                        onChange={(e) => setCuenta(e.target.value)}
                        placeholder="Ej. xxx-7890 (opcional)"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase text-[#64748B]">Referencia</Label>
                      <Input
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Ref / Comprobante (opcional)"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Row 4: Notas */}
                  <div>
                    <Label className="text-xs font-semibold uppercase text-[#64748B]">Notas</Label>
                    <Textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Agrega notas adicionales (opcional)"
                      maxLength={500}
                      className="mt-1.5 text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Botón */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={saving || normalizeQuotationStatus(cotizacion?.estado) !== "Contratado" || !monto}
                      className="px-6 py-2.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition disabled:opacity-50"
                    >
                      {saving ? "Registrando..." : "Registrar pago"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Historial de pagos */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-6">Historial de pagos</h2>

                {pagosLoading && <p className="text-sm text-[#64748B]">Cargando pagos...</p>}

                {!pagosLoading && pagos.length === 0 && (
                  <div className="text-center py-12">
                    <DollarSign size={32} className="mx-auto text-[#D1D5DB] mb-3" />
                    <p className="text-[#64748B] text-sm">Aún no hay pagos registrados</p>
                    <p className="text-[#64748B] text-xs mt-1">Registra el primer abono desde el formulario superior</p>
                  </div>
                )}

                {!pagosLoading && pagos.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">Método</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748B]">Monto</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#64748B] w-28">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagos.map((pago) => (
                          <tr key={pago?._id || `${pago?.fecha}-${pago?.monto}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-sm text-[#111827]">
                              {toDateFormatted(pago?.fecha)}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#111827] capitalize">
                              {pago?.formaDePago || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#64748B]">
                              {pago?.referencia || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#111827] text-right">
                              ${Number(pago?.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateRecibo(pago)}
                                  className="p-1.5 hover:bg-blue-50 rounded transition text-[#2563EB]"
                                  title="Ver recibo"
                                >
                                  <FileText size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePago(pago?._id)}
                                  className="p-1.5 hover:bg-red-50 rounded transition text-red-600"
                                  title="Eliminar pago"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha - Sidebar sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Card: Resumen */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-[#111827] mb-6">Resumen</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[#64748B] uppercase font-semibold mb-1">Cliente</p>
                      <p className="text-sm font-medium text-[#111827]">{cotizacion?.cliente?.nombre || "-"}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-xs text-[#64748B] uppercase font-semibold mb-1">Total</p>
                      <p className="text-lg font-bold text-[#111827]">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase font-semibold mb-1">Anticipo recibido</p>
                      <p className={`text-sm font-semibold ${anticipo > 0 ? "text-green-600" : "text-[#64748B]"}`}>
                        ${anticipo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] uppercase font-semibold mb-1">Total pagado</p>
                      <p className="text-sm font-semibold text-[#111827]">
                        ${totalPagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-xs text-[#64748B] uppercase font-semibold mb-1">Saldo pendiente</p>
                      <p className={`text-2xl font-bold ${saldo > 0 ? "text-[#111827]" : "text-green-600"}`}>
                        ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card: Acciones rápidas */}
                {saldo === 0 && (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
                    <p className="text-sm font-semibold text-emerald-800 mb-4">✓ Cotización pagada</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ultimoPago = [...pagos].sort((a, b) => getPagoSortDate(b).getTime() - getPagoSortDate(a).getTime())[0];
                          if (!ultimoPago) {
                            alert("No hay pagos para generar recibo.");
                            return;
                          }
                          handleGenerateRecibo(ultimoPago);
                        }}
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition"
                      >
                        Ver recibo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
