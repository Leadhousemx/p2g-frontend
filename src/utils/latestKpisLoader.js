// Carga de los KPIs mensuales del dashboard con garantía "gana la última petición".
// Sin React: el hook useMonthlyKpis lo conecta al componente y así la lógica se puede probar sola.
//
// Garantías:
//  - cada load() cancela (AbortController) la petición anterior;
//  - una respuesta cuyo número de secuencia ya no es el último se descarta aunque llegue después;
//  - una respuesta cuyo `periodo` no coincide con el pedido se descarta (nunca se pintan cifras de
//    otro mes con la etiqueta del mes seleccionado).

export const KPI_KEYS = [
  "eventosContratadosMes",
  "eventosCerradosMes",
  "ingresos",
  "eventosConfirmadosMes",
  "cotizacionesMes",
];

export const normalizeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const currentPeriod = (now = new Date()) => ({ mes: now.getMonth() + 1, año: now.getFullYear() });

export const samePeriod = (a, b) => Boolean(a && b) && a.mes === b.mes && a.año === b.año;

export class KpisPeriodMismatchError extends Error {
  constructor(expected, received) {
    super("La respuesta de KPIs no corresponde al periodo solicitado");
    this.name = "KpisPeriodMismatchError";
    this.expected = expected;
    this.received = received;
  }
}

const isAbort = (err) => err?.name === "AbortError" || err?.name === "CanceledError" || err?.code === "ERR_CANCELED";

export const normalizeKpis = (data, periodo) => {
  const resolved = data?.kpis || data?.data || data?.result || data || {};
  if (!samePeriod(resolved.periodo, periodo)) {
    throw new KpisPeriodMismatchError(periodo, resolved.periodo ?? null);
  }
  const out = {};
  for (const key of KPI_KEYS) out[key] = normalizeNumber(resolved[key]);
  return out;
};

/**
 * fetchKpis(periodo, signal) -> Promise<respuesta del endpoint>
 * onState(estado): { status: "loading" | "ready" | "error", periodo, kpis, comparacion, error }
 */
export function createLatestKpisLoader({ fetchKpis, onState, now = () => new Date() }) {
  let seq = 0;
  let controller = null;

  const load = async (periodo) => {
    const mine = ++seq;
    if (controller) controller.abort();
    controller = new AbortController();
    const { signal } = controller;
    const actual = currentPeriod(now());
    const esActual = samePeriod(periodo, actual);

    onState({ status: "loading", periodo, kpis: null, comparacion: null, error: null });
    try {
      const [sel, cur] = await Promise.all([
        fetchKpis(periodo, signal),
        esActual ? Promise.resolve(null) : fetchKpis(actual, signal),
      ]);
      if (mine !== seq) return false;
      onState({
        status: "ready",
        periodo,
        kpis: normalizeKpis(sel, periodo),
        comparacion: cur === null ? null : { periodo: actual, kpis: normalizeKpis(cur, actual) },
        error: null,
      });
      return true;
    } catch (error) {
      if (mine !== seq || isAbort(error)) return false;
      onState({ status: "error", periodo, kpis: null, comparacion: null, error });
      return false;
    }
  };

  const dispose = () => {
    seq += 1;
    if (controller) controller.abort();
    controller = null;
  };

  return { load, dispose };
}
