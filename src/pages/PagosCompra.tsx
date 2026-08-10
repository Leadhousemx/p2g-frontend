import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, AlertCircle, Trash2 } from "lucide-react";
import { Input, Label, Button } from "@/components/ui";
import { getCompra } from "../services/comprasService";
import { createPagoCompra, deletePagoCompra, listPagosCompra } from "../services/pagosComprasService";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import ResponsiveFinancialSummary from "../components/common/ResponsiveFinancialSummary";
import ResponsiveTransactionHistory, {
  type TransactionHistoryColumn,
  type TransactionHistoryItem,
} from "../components/common/ResponsiveTransactionHistory";
import { formatDateOnly, toLocalDateOnly } from "../utils/dateOnly";

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: unknown): number {
  return Math.round((toSafeNumber(value) + Number.EPSILON) * 100) / 100;
}

function getCompraTotal(compra: any): number {
  return roundMoney(compra?.total ?? compra?.monto ?? 0);
}

function getCompraPagado(compra: any): number {
  if (compra?.totalPagado !== undefined && compra?.totalPagado !== null) {
    return roundMoney(compra.totalPagado);
  }
  return roundMoney(compra?.anticipo ?? 0);
}

function getCompraSaldo(compra: any, total: number, pagado: number): number {
  if (compra?.saldoPendiente !== undefined && compra?.saldoPendiente !== null) {
    return roundMoney(compra.saldoPendiente);
  }
  return roundMoney(Math.max(0, total - pagado));
}

function toDateFormatted(d?: string): string {
  if (!d) return "-";
  return formatDateOnly(d, "es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(value: number): string {
  return Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPaymentMethod(value?: string): string {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase();

  const labels: Record<string, string> = {
    transferencia: "Transferencia",
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    cheque: "Cheque",
    deposito: "Depósito",
    otro: "Otro",
  };

  return labels[normalized] || value.charAt(0).toUpperCase() + value.slice(1);
}

function getCreatedByMeta(pago: any) {
  const nombre = pago?.createdBy?.nombre || pago?.usuario?.nombre || pago?.creadoPor?.nombre;
  const email = pago?.createdBy?.email || pago?.usuario?.email || pago?.creadoPor?.email;

  if (!nombre && !email) {
    return [];
  }

  return [
    ...(nombre ? [{ label: "Creado por", value: nombre }] : []),
    ...(email ? [{ label: "Email", value: email }] : []),
  ];
}

export default function PagosCompraPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [compra, setCompra] = useState<any>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [pagosLoading, setPagosLoading] = useState(false);
  const [pagoToDelete, setPagoToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toLocalDateOnly(new Date()));
  const [formaDePago, setFormaDePago] = useState("transferencia");
  const [cuenta, setCuenta] = useState("");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [montoError, setMontoError] = useState("");

  const getPagoOrigen = (pago: any): "sistema" | "manual" => {
    const origen = String(pago?.origen || "").toLowerCase();
    return origen === "sistema" ? "sistema" : "manual";
  };

  const refreshCompra = async () => {
    if (!id) return;
    const data = await getCompra(id);
    setCompra(data);
  };

  const refreshPagos = async () => {
    if (!id) return;
    setPagosLoading(true);
    try {
      const data = await listPagosCompra({ compraId: id });
      const list = data?.pagos || (data as any)?.data || data || [];
      setPagos(Array.isArray(list) ? list : []);
    } finally {
      setPagosLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([getCompra(String(id)), listPagosCompra({ compraId: String(id) })])
      .then(([compraData, pagosData]) => {
        if (!active) return;
        setCompra(compraData);
        const list = pagosData?.pagos || (pagosData as any)?.data || pagosData || [];
        setPagos(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "No se pudo cargar el gasto";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const total = useMemo(() => getCompraTotal(compra), [compra]);
  const pagadoPersistido = useMemo(() => getCompraPagado(compra), [compra]);
  const saldo = useMemo(() => getCompraSaldo(compra, total, pagadoPersistido), [compra, total, pagadoPersistido]);

  const totalPagadoHistorial = useMemo(
    () => roundMoney(pagos.reduce((sum, p) => sum + toSafeNumber(p?.monto), 0)),
    [pagos]
  );

  const totalPagado = Math.max(pagadoPersistido, totalPagadoHistorial);
  const estadoPago = saldo <= 0 ? "Pagado" : "Pendiente";

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMonto(value);
    setMontoError("");

    const abono = Number(value);
    if (abono > saldo && abono > 0) {
      setMontoError(`El monto excede el saldo disponible ($${saldo.toFixed(2)})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || saving) return;

    const abono = Number(monto);
    if (!Number.isFinite(abono) || abono <= 0) {
      setMontoError("Ingresa un monto válido mayor a 0");
      return;
    }
    if (abono > saldo) {
      setMontoError(`El monto excede el saldo disponible ($${saldo.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      await createPagoCompra({
        compraId: id,
        fecha: fecha || toLocalDateOnly(new Date()),
        monto: abono,
        formaDePago: formaDePago as any,
        cuenta: cuenta || undefined,
        referencia: referencia || undefined,
        notas: notas || undefined,
      });

      await Promise.all([refreshCompra(), refreshPagos()]);

      setMonto("");
      setCuenta("");
      setReferencia("");
      setNotas("");
      setMontoError("");
      alert("Pago registrado correctamente.");
    } catch (err: any) {
      const msg = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "No se pudo registrar el pago";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePago = async () => {
    if (!id || !pagoToDelete?._id) return;

    try {
      setDeleteLoading(true);
      await deletePagoCompra(pagoToDelete._id);
      await Promise.all([refreshCompra(), refreshPagos()]);
      setPagoToDelete(null);
    } catch (err: any) {
      const msg = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "No se pudo eliminar el pago";
      alert(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const paymentItems: TransactionHistoryItem[] = useMemo(
    () =>
      pagos.map((pago) => ({
        id: String(pago?._id),
        date: pago?.fecha,
        concept: getPagoOrigen(pago) === "sistema" ? "Pago automático" : "Pago manual",
        amount: toSafeNumber(pago?.monto),
        paymentMethod: formatPaymentMethod(pago?.formaDePago),
        reference: pago?.referencia,
        origin: getPagoOrigen(pago) === "sistema" ? "Sistema" : "Manual",
        notes: pago?.notas,
        meta: [
          ...(pago?.cuenta ? [{ label: "Cuenta", value: pago.cuenta }] : []),
          ...getCreatedByMeta(pago),
        ],
        status: {
          label: getPagoOrigen(pago) === "sistema" ? "Sistema" : "Manual",
          tone: getPagoOrigen(pago) === "sistema" ? "neutral" : "info",
        },
      })),
    [pagos]
  );

  const paymentColumns: TransactionHistoryColumn[] = [
    { key: "date", header: "Fecha" },
    { key: "paymentMethod", header: "Método" },
    { key: "status", header: "Origen", align: "center" },
    { key: "reference", header: "Referencia" },
    { key: "notes", header: "Notas" },
    { key: "amount", header: "Monto", align: "right" },
    { key: "actions", header: "Acciones", align: "center" },
  ];

  if (loading) {
    return <div className="min-h-screen bg-[#F4F6F9] p-6 text-center text-[#64748B]">Cargando gasto...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-[#F4F6F9] p-6 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[#64748B] mb-4">
            <button onClick={() => navigate("/compras")} className="hover:text-[#111827] transition">Gastos</button>
            <ChevronRight size={16} />
            <span className="text-[#111827] font-medium">Pagos</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#111827]">Pagos del gasto</h1>
              <p className="text-sm text-[#64748B] mt-1">
                Folio: <span className="font-mono font-semibold text-[#111827]">{compra?.folio || "-"}</span> •
                Proveedor: <span className="font-semibold text-[#111827]"> {compra?.proveedorNombre || "-"}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">Registrar abono</h2>

              {saldo <= 0 && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <AlertCircle size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-800">Este gasto ya está pagado en su totalidad.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase text-[#64748B]">Fecha del pago</Label>
                    <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1.5" />
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

                <div>
                  <Label className="text-xs font-semibold uppercase text-[#64748B]">Monto del abono</Label>
                  <div className="relative mt-1.5">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase text-[#64748B]">Cuenta destino</Label>
                    <Input value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="mt-1.5" maxLength={120} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase text-[#64748B]">Referencia</Label>
                    <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="mt-1.5" maxLength={120} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase text-[#64748B]">Notas</Label>
                  <textarea
                    value={notas}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotas(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-[#111827] hover:border-slate-300 focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    rows={2}
                    maxLength={500}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving || saldo <= 0 || !monto} className="px-6 py-2.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition disabled:opacity-50">
                    {saving ? "Registrando..." : "Registrar pago"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">Historial de pagos</h2>

              <ResponsiveTransactionHistory
                items={paymentItems}
                loading={pagosLoading}
                emptyMessage="Aún no hay pagos registrados"
                variant="compact"
                showHeader={false}
                columns={paymentColumns}
                renderDesktopCell={(item, column) => {
                  if (column.key === "notes") {
                    return item.notes ? <span className="block max-w-xs truncate text-[#64748B]">{item.notes}</span> : "-";
                  }

                  return null;
                }}
                renderMobileTitle={(item) => item.concept || "Pago"}
                renderMobileMeta={(item) => (
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Origen</dt>
                      <dd className="text-right text-[#111827]">{item.origin || "-"}</dd>
                    </div>
                    {item.reference ? (
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</dt>
                        <dd className="text-right text-[#111827] break-words">{item.reference}</dd>
                      </div>
                    ) : null}
                    {item.notes ? (
                      <div className="space-y-1">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Notas</dt>
                        <dd className="rounded-2xl bg-slate-50 px-3 py-2 text-[#111827]">{item.notes}</dd>
                      </div>
                    ) : null}
                    {item.meta?.map((entry) => (
                      <div key={entry.label} className="flex items-start justify-between gap-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{entry.label}</dt>
                        <dd className="text-right text-[#111827]">{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                renderActions={(item) => {
                  const pago = pagos.find((entry) => String(entry?._id) === item.id);
                  const isSistema = pago ? getPagoOrigen(pago) === "sistema" : false;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSistema && pago) {
                          setPagoToDelete(pago);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 rounded transition text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isSistema ? "Los pagos automáticos del sistema no se eliminan desde aquí" : "Eliminar pago"}
                      disabled={isSistema}
                    >
                      <Trash2 size={14} />
                    </button>
                  );
                }}
                formatAmount={(amount) => formatCurrency(amount)}
                formatDate={(date) => toDateFormatted(typeof date === "string" ? date : toLocalDateOnly(date))}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <ResponsiveFinancialSummary
                title="Resumen"
                description="Contexto financiero actual del gasto antes de registrar nuevos abonos."
                primaryLabel="Saldo pendiente"
                primaryValue={formatCurrency(saldo)}
                status={{
                  label: estadoPago,
                  tone: estadoPago === "Pagado" ? "success" : "warning",
                }}
                variant="sidebar"
                density="compact"
                kpis={[
                  {
                    key: "total",
                    label: "Total del gasto",
                    value: formatCurrency(total),
                    importance: "secondary",
                    tone: "info",
                  },
                  {
                    key: "paid",
                    label: "Total pagado",
                    value: formatCurrency(totalPagado),
                    importance: "secondary",
                    tone: "success",
                  },
                ]}
                lines={[
                  {
                    key: "status-line",
                    label: "Estado actual",
                    value: estadoPago,
                    importance: "secondary",
                    tone: estadoPago === "Pagado" ? "success" : "warning",
                  },
                ]}
                alerts={
                  saldo <= 0
                    ? [
                        {
                          key: "paid-alert",
                          tone: "success",
                          title: "Pago completo",
                          message: "Este gasto ya está cubierto en su totalidad.",
                        },
                      ]
                    : [
                        {
                          key: "pending-alert",
                          tone: "info",
                          title: "Saldo pendiente",
                          message: `Aún faltan ${formatCurrency(saldo)} por cubrir.`,
                        },
                      ]
                }
              />
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(pagoToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPagoToDelete(null);
          }
        }}
        title="Eliminar pago"
        message={
          pagoToDelete
            ? `¿Deseas eliminar el pago por ${formatCurrency(toSafeNumber(pagoToDelete?.monto))}?`
            : "¿Deseas eliminar este pago?"
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeletePago}
        loading={deleteLoading}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
