type NullableString = string | null | undefined;
import { formatDateOnly } from "./dateOnly";

export interface EmpresaReciboInfo {
  nombreComercial?: string;
  razonSocial?: string;
  rfc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
}

export interface PagoReciboData {
  noRecibo: string;
  fechaEmision?: string | Date;
  verificationUrl?: string;
  empresa: EmpresaReciboInfo;
  cotizacion: {
    folio?: string;
    nombreEvento?: string;
    fechaEvento?: string | Date;
    lugarEvento?: string;
    negocioNombre?: string;
    cliente?: {
      nombre?: string;
      telefono?: string;
      email?: string;
    };
  };
  pago: {
    identificador?: string;
    fecha?: string | Date;
    monto: number;
    formaDePago?: string;
    referencia?: string;
    cuenta?: string;
    notas?: string;
  };
  totalServicio: number;
  saldoAnterior: number;
  saldoPendiente: number;
  firmas?: {
    clienteNombre?: string;
    fechaPago?: string | Date;
    empresaNombre?: string;
    usuarioAplicoNombre?: string;
  };
}

const esc = (value: NullableString) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatDate = (value?: string | Date, withTime = false) => {
  if (!value) return "-";

  if (withTime) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return formatDateOnly(value, "es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const prettyPaymentMethod = (method?: string) => {
  if (!method) return "-";
  const clean = method.trim();
  if (!clean) return "-";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

const truncateNotes = (notes?: string) => {
  if (!notes) return "";
  const maxChars = 540;
  if (notes.length <= maxChars) return notes;
  return `${notes.slice(0, maxChars)}…`;
};

export const generatePagoReciboPDF = async (data: PagoReciboData): Promise<void> => {
  const hasSaldo = Number(data.saldoPendiente || 0) > 0;
  const notas = truncateNotes(data.pago?.notas);
  const nombreEmpresa = data.empresa?.nombreComercial || data.empresa?.razonSocial || "Empresa";
  const razonSocial = data.empresa?.razonSocial || data.empresa?.nombreComercial || "-";
  const telefonoEmpresa = data.empresa?.telefono || "-";
  const emailEmpresa = data.empresa?.email || "-";
  const fechaEmision = formatDate(data.fechaEmision || new Date(), true);
  const firmaCliente = data.firmas?.clienteNombre || data.cotizacion?.cliente?.nombre || "-";
  const firmaFecha = formatDate(data.firmas?.fechaPago || data.pago?.fecha);
  const firmaEmpresa = data.firmas?.empresaNombre || nombreEmpresa;
  const firmaUsuario = data.firmas?.usuarioAplicoNombre || "-";

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Recibo ${esc(data.noRecibo)}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            color: #111827;
            margin: 0;
            background: #ffffff;
            font-size: 12px;
          }
          .page { width: 100%; }
          .row { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
          .header-left { flex: 1; padding-top: 10px; }
          .header-right { width: 290px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
          .logo {
            display: block;
            max-height: 72px;
            max-width: 220px;
            object-fit: contain;
            margin: 0 0 12px 0;
          }
          .company-name { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; }
          .company-legal { font-size: 13px; font-weight: 600; margin: 0 0 4px 0; }
          .muted { color: #64748b; }
          .tiny { font-size: 10px; color: #64748b; }
          .receipt-title { font-size: 21px; font-weight: 800; color: #2563eb; margin: 0 0 10px 0; }
          .kv { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
          .kv .k { color: #64748b; }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.02em;
            border: 1px solid;
          }
          .badge-blue { background: #dbeafe; border-color: #93c5fd; color: #1e40af; }
          .reference-band {
            margin-top: 14px;
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            background: #f8fafc;
            padding: 12px;
          }
          .ref-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
          .section-title {
            margin: 0 0 8px 0;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: #334155;
          }
          .line { margin: 3px 0; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .05em;
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          td {
            padding: 9px 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
            vertical-align: top;
          }
          td.money, th.money { text-align: right; white-space: nowrap; }
          .notes {
            margin-top: 8px;
            font-size: 11px;
            color: #334155;
            line-height: 1.4;
          }
          .finance {
            margin-top: 14px;
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            padding: 12px;
          }
          .finance-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 14px;
          }
          .finance-row strong { font-size: 15px; }
          .saldo {
            margin-top: 8px;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .saldo .label { font-weight: 700; color: #334155; }
          .saldo .value { font-size: 24px; font-weight: 800; color: #111827; }
          .status {
            margin-top: 10px;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 11px;
          }
          .status.warn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
          .status.ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
          .legal {
            margin-top: 14px;
            font-size: 10px;
            color: #64748b;
            line-height: 1.4;
            border-top: 1px dashed #d1d5db;
            padding-top: 10px;
          }
          .signatures { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          .sig-line { margin-top: 24px; border-top: 1px solid #9ca3af; padding-top: 4px; font-size: 10px; color: #475569; }
          .footer {
            margin-top: 14px;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="row">
            <div class="header-left">
              ${data.empresa?.logoUrl ? `<img class="logo" src="${esc(data.empresa.logoUrl)}" alt="Logo" />` : ""}
              <p class="company-name">${esc(nombreEmpresa)}</p>
              <p class="company-legal">${esc(razonSocial)}</p>
              ${data.empresa?.rfc ? `<div class="line tiny">RFC: ${esc(data.empresa.rfc)}</div>` : ""}
              ${data.empresa?.direccion ? `<div class="line tiny">${esc(data.empresa.direccion)}</div>` : ""}
              <div class="line tiny">Tel: ${esc(telefonoEmpresa)} · Email: ${esc(emailEmpresa)}</div>
            </div>
            <div class="header-right">
              <p class="receipt-title">RECIBO DE PAGO</p>
              <div class="kv"><span class="k">No. Recibo</span><strong>${esc(data.noRecibo)}</strong></div>
              <div class="kv"><span class="k">Pago</span><strong>${esc(data.pago.identificador || "-")}</strong></div>
              <div class="kv"><span class="k">Fecha de emisión</span><strong>${esc(fechaEmision)}</strong></div>
              <div class="kv"><span class="k">Método de pago</span><strong>${esc(prettyPaymentMethod(data.pago.formaDePago))}</strong></div>
              <div class="kv"><span class="k">Estatus</span><span class="badge badge-blue">Aplicado</span></div>
              <div class="tiny" style="margin-top:8px;">Este recibo confirma la aplicación del pago a la cotización indicada.</div>
            </div>
          </div>

          <div class="reference-band">
            <div class="ref-cols">
              <div>
                <p class="section-title">Servicio / Cotización</p>
                <div class="line"><strong>Folio cotización:</strong> ${esc(data.cotizacion.folio || "-")}</div>
                <div class="line"><strong>Nombre del evento:</strong> ${esc(data.cotizacion.nombreEvento || "-")}</div>
                <div class="line"><strong>Fecha del evento:</strong> ${esc(formatDate(data.cotizacion.fechaEvento))}</div>
                ${data.cotizacion.negocioNombre ? `<div class="line"><strong>Negocio / salón:</strong> ${esc(data.cotizacion.negocioNombre)}</div>` : ""}
                <div class="line"><strong>Lugar:</strong> ${esc(data.cotizacion.lugarEvento || "-")}</div>
              </div>
              <div>
                <p class="section-title">Cliente</p>
                <div class="line"><strong>Cliente:</strong> ${esc(data.cotizacion.cliente?.nombre || "-")}</div>
                ${data.cotizacion.cliente?.telefono ? `<div class="line"><strong>Teléfono:</strong> ${esc(data.cotizacion.cliente.telefono)}</div>` : ""}
                ${data.cotizacion.cliente?.email ? `<div class="line"><strong>Email:</strong> ${esc(data.cotizacion.cliente.email)}</div>` : ""}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th class="money">Monto pagado</th>
                <th>Fecha del pago</th>
                <th>Referencia</th>
                <th>Cuenta destino</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Abono a cotización ${esc(data.cotizacion.folio || "-")}</td>
                <td class="money">${esc(formatCurrency(data.pago.monto || 0))}</td>
                <td>${esc(formatDate(data.pago.fecha))}</td>
                <td>${esc(data.pago.referencia || "-")}</td>
                <td>${esc(data.pago.cuenta || "-")}</td>
              </tr>
            </tbody>
          </table>

          ${notas ? `<div class="notes"><strong>Notas:</strong> ${esc(notas)}</div>` : ""}

          <div class="finance">
            <div class="finance-row"><span>Total del servicio:</span><strong>${esc(formatCurrency(data.totalServicio))}</strong></div>
            <div class="finance-row"><span>Saldo anterior:</span><strong>${esc(formatCurrency(data.saldoAnterior))}</strong></div>
            <div class="finance-row"><span>Monto pagado:</span><strong>${esc(formatCurrency(data.pago.monto || 0))}</strong></div>
            <div class="saldo">
              <span class="label">Saldo pendiente:</span>
              <span class="value">${esc(formatCurrency(data.saldoPendiente))}</span>
            </div>
            ${hasSaldo
              ? `<div class="status warn"><strong>🟡 PAGO PARCIAL / SALDO PENDIENTE</strong><br/>El saldo pendiente deberá cubrirse antes del evento o según condiciones acordadas.</div>`
              : `<div class="status ok"><strong>✅ CUENTA LIQUIDADA</strong><br/>Este servicio se encuentra completamente pagado.</div>`}
          </div>

          <div class="legal">
            Los pagos aplican únicamente a la cotización indicada.<br/>
            Conserve este comprobante para aclaraciones.<br/>
            En caso de reprogramación/cancelación aplican las políticas del servicio.
          </div>

          <div class="signatures">
            <div>
              <div class="sig-line">Recibí (Cliente): ${esc(firmaCliente)} &nbsp;&nbsp; Fecha: ${esc(firmaFecha)}</div>
            </div>
            <div>
              <div class="sig-line">Entregó (Empresa): ${esc(firmaEmpresa)} &nbsp;&nbsp; Nombre: ${esc(firmaUsuario)}</div>
            </div>
          </div>

          <div class="footer">
            <span>${esc(nombreEmpresa)} · Tel: ${esc(telefonoEmpresa)} · ${esc(emailEmpresa)}</span>
            <span>Documento generado por P2G${data.verificationUrl ? ` · ${esc(data.verificationUrl)}` : ""}</span>
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) {
    throw new Error("El navegador bloqueó la ventana de impresión para generar el recibo.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};
