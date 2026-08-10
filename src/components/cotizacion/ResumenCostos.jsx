import { Button, Input } from "@/components/ui";
import { useFormContext } from "react-hook-form";

const mxn = (value) => Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number.isFinite(value) ? value : 0);

const alertToneClasses = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

function SummaryDisplayRow({ label, value, emphasis = false, tone = "default" }) {
  const valueToneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "success"
        ? "text-green-700"
        : "text-[#111827]";

  return (
    <div className="flex items-start justify-between gap-5">
      <p className="min-w-0 text-sm text-[#64748B]">{label}</p>
      <p className={`shrink-0 text-right ${emphasis ? "text-sm font-semibold" : "text-sm font-medium"} ${valueToneClass}`}>
        {value}
      </p>
    </div>
  );
}

function SummaryFieldRow({ label, children, stackOnDesktop = false }) {
  return (
    <div className={`grid gap-3 ${stackOnDesktop ? "" : "xl:grid-cols-[9.5rem_minmax(0,1fr)] xl:items-start"}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#334155]">{label}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function ResumenCostos({
  breakdown,
  eventDurationDays,
  formState,
  saving,
  setValue,
  canContratar,
  onSaveDraft,
  onContratarClick,
  onPdfClick,
  showActions = true,
}) {
  const { register, watch } = useFormContext();

  const ivaRaw = watch("ivaPorcentaje");
  const descuentoTipoRaw = watch("descuentoTipo");
  const descuentoRaw = watch("descuento");
  const anticipoRaw = watch("anticipo");
  const descuentoTipo = descuentoTipoRaw === "porcentaje" ? "porcentaje" : "monto";

  const handleNormalize = (name) => {
    const current = Number(watch(name));
    let normalized = Number.isFinite(current) ? Math.max(0, current) : 0;

    if (name === "descuento" && descuentoTipo === "porcentaje") {
      normalized = Math.min(100, normalized);
    }

    setValue(name, normalized, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const safeDays = Number.isFinite(Number(eventDurationDays)) ? Math.max(1, Math.trunc(Number(eventDurationDays))) : 1;
  const backend = breakdown || {};
  const hasBreakdown = Boolean(breakdown && typeof breakdown === "object");

  const subtotalOneTime = Number(backend?.subtotalOneTime ?? 0) || 0;
  const subtotalPerDayBase = Number(backend?.subtotalPerDayBase ?? 0) || 0;
  const subtotalPerDayExtended = Number(backend?.subtotalPerDayExtended ?? 0) || 0;
  const subtotalFinal = Number(backend?.subtotalFinal ?? backend?.subtotalByDays ?? backend?.subtotalOneDay ?? 0) || 0;
  const descuentoTotal = Number(backend?.descuentoTotal ?? 0) || 0;
  const ivaMonto = Number(backend?.ivaMonto ?? 0) || 0;
  const total = Number(backend?.total ?? 0) || 0;
  const saldoPendiente = Math.max(0, total - (Number.isFinite(Number(anticipoRaw)) ? Number(anticipoRaw) : 0));

  const showDaysBreakdown = safeDays >= 2;
  const formErrors = formState?.errors && Object.keys(formState.errors).length > 0
    ? Object.values(formState.errors)
        .map((err) => err?.message)
        .filter((message) => typeof message === "string" && message.trim())
    : [];

  const alerts = [
    ...(formErrors.length > 0
      ? formErrors.map((message, index) => ({
          key: `form-error-${index}`,
          message,
          tone: "danger",
        }))
      : []),
    ...(!hasBreakdown
      ? [
          {
            key: "no-breakdown",
            message: "Totales y desglose definitivos se calculan en backend al guardar.",
            tone: "info",
          },
        ]
      : []),
    ...(ivaRaw === "" || descuentoRaw === ""
      ? [
          {
            key: "normalize-hint",
            message: "Valores vacíos se normalizan automáticamente a 0.",
            tone: "warning",
          },
        ]
      : []),
  ];

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:p-7">
      <div className="space-y-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#111827]">Resumen de costos</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total</p>
          <p className="mt-3 break-words text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
            {hasBreakdown ? mxn(total) : "-"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Configuración de impuestos</p>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#334155]">Modo IVA</p>
                  <p className="text-xs text-[#64748B]">Define si los precios capturados ya incluyen el impuesto.</p>
                </div>
                <label className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-[#111827]">
                  <input
                    id="incluyeIva"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                    {...register("incluyeIva")}
                  />
                  <span className="min-w-0 leading-5">Precios incluyen IVA</span>
                </label>
              </div>

              <SummaryFieldRow label="IVA %" stackOnDesktop>
                <div className="space-y-2">
                  <div className="grid gap-3 sm:grid-cols-[minmax(8rem,9rem)_minmax(0,1fr)] sm:items-stretch">
                    <Input
                      id="ivaPorcentaje"
                      type="number"
                      min={0}
                      max={100}
                      className="h-11 min-w-0 rounded-xl border-slate-200 bg-white"
                      {...register("ivaPorcentaje", { valueAsNumber: true })}
                      onBlur={() => handleNormalize("ivaPorcentaje")}
                    />
                    <div className="flex min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <span className="pr-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Monto calculado</span>
                      <span className="shrink-0 text-right text-sm font-semibold text-[#111827]">
                        {hasBreakdown ? mxn(ivaMonto) : "—"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748B]">Porcentaje editable aplicado al total actual.</p>
                </div>
              </SummaryFieldRow>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Ajustes</p>

              <SummaryFieldRow label="Descuento" stackOnDesktop>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(9.5rem,10.5rem)]">
                    <select
                      id="descuentoTipo"
                      className="h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#111827]"
                      {...register("descuentoTipo")}
                    >
                      <option value="monto">Monto ($)</option>
                      <option value="porcentaje">Porcentaje (%)</option>
                    </select>
                    <Input
                      id="descuento"
                      type="number"
                      min={0}
                      max={descuentoTipo === "porcentaje" ? 100 : undefined}
                      className="h-11 min-w-0 rounded-xl border-slate-200 bg-white"
                      {...register("descuento", { valueAsNumber: true })}
                      onBlur={() => handleNormalize("descuento")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50/80 px-4 py-3">
                    <span className="min-w-0 text-xs font-medium uppercase tracking-wide text-[#64748B]">Descuento aplicado</span>
                    <span className="shrink-0 text-right text-sm font-medium text-[#475569]">
                      {hasBreakdown && descuentoTotal > 0 ? `-${mxn(descuentoTotal)}` : "—"}
                    </span>
                  </div>
                </div>
              </SummaryFieldRow>

            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Cobros y desglose</p>

              <SummaryFieldRow label="Anticipo" stackOnDesktop>
                <div className="w-full sm:max-w-[14rem]">
                  <Input
                    id="anticipo"
                    type="number"
                    min={0}
                    className="h-11 min-w-0 rounded-xl border-slate-200 bg-white"
                    {...register("anticipo", { valueAsNumber: true })}
                    onBlur={() => handleNormalize("anticipo")}
                  />
                </div>
              </SummaryFieldRow>

              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Desglose</p>

                {showDaysBreakdown ? (
                  <>
                    <SummaryDisplayRow label="Subtotal (cargos únicos)" value={hasBreakdown ? mxn(subtotalOneTime) : "—"} />
                    <SummaryDisplayRow label="Subtotal por día (base)" value={hasBreakdown ? mxn(subtotalPerDayBase) : "—"} />
                    <SummaryDisplayRow label="Número de días" value={safeDays} />
                    <SummaryDisplayRow label={`Subtotal por ${safeDays} días`} value={hasBreakdown ? mxn(subtotalPerDayExtended) : "—"} emphasis />
                    <SummaryDisplayRow label="Subtotal final" value={hasBreakdown ? mxn(subtotalFinal) : "—"} emphasis />
                  </>
                ) : (
                  <SummaryDisplayRow label="Subtotal" value={hasBreakdown ? mxn(subtotalFinal) : "—"} emphasis />
                )}

                <div className="border-t border-slate-200 pt-3">
                  <SummaryDisplayRow label="Saldo pendiente" value={hasBreakdown ? mxn(saldoPendiente) : "—"} emphasis />
                </div>
              </div>
            </div>
          </div>
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.key}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${alertToneClasses[alert.tone || "info"]}`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        ) : null}

        {showActions ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onSaveDraft}
              disabled={saving}
              className="w-full rounded-xl border-slate-200 text-[#111827] hover:bg-slate-50"
            >
              Guardar cotización
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onContratarClick}
              disabled={saving || !canContratar}
              className="w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            >
              Contratar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onPdfClick}
              className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              PDF
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
