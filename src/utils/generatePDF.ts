// PDF generator for Cotización - Manual paginated HTML
// Arquitectura y reglas según especificación del usuario

import { getConfig } from "../services/configService";
import { getEmpresa } from "../services/empresaService";

export async function generateCotizacionPDF(
  cotizacion: any,
  empresa: any
) {
  // Utilidades
  const esc = (v: any) => {
    if (typeof v !== 'string' && typeof v !== 'number') return '-';
    return String(v)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };
  const formatCurrency = (v: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);
  const formatDate = (v: any, withTime = false) => {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '-';
    return withTime ? d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatDateLong = (v: any) => {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const addDaysToDate = (v: any, daysToAdd: number) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + Math.max(0, Math.floor(Number(daysToAdd) || 0)));
    return d;
  };

  const getConceptoBadge = (item: any) => {
    const tipoRaw = String(item?.tipo || "").trim();
    const catalogoRaw = String(item?.catalogoTipo || item?.catalogo || "").trim();
    const tipo = tipoRaw.toLowerCase();
    const catalogo = catalogoRaw.toLowerCase();

    const CATALOGO_LABELS: Record<string, string> = {
      platillos: "Catering",
      bebidas: "Bebidas",
      personal: "Personal",
      mobiliario: "Mobiliario",
      audio: "Audio",
      otros: "Otros",
    };

    if (catalogo && CATALOGO_LABELS[catalogo]) {
      return CATALOGO_LABELS[catalogo];
    }

    if (tipo.includes("platillo")) return "Catering";
    if (tipo.includes("bebida")) return "Bebidas";
    if (tipo.includes("personal")) return "Personal";
    if (tipo.includes("mobiliario")) return "Mobiliario";
    if (tipo.includes("audio")) return "Audio";

    if (!tipoRaw || tipo === "-" || tipo === "null" || tipo === "undefined") {
      return "";
    }

    if (tipo === "extra") {
      return "";
    }

    return tipoRaw;
  };

  const normalizeEmpresa = (src: any) => {
    if (!src || typeof src !== "object") return {};
    return {
      nombreComercial: src.nombreComercial || src.nombre || src.nombreEmpresa || "",
      razonSocial: src.razonSocial || src.razon_social || src.nombreComercial || src.nombre || "",
      rfc: src.rfc || "",
      direccion: src.direccion || src.domicilio || "",
      telefono: src.telefono || src.telefonoEmpresa || src.phone || "",
      email: src.email || src.correo || src.correoEmpresa || "",
      sitioWeb: src.sitioWeb || src.website || src.web || "",
      logoUrl: src.logoUrl || src.logo || src.logoEmpresa || "",
    };
  };

  let empresaLocal: any = null;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('cfg_empresa') : null;
    empresaLocal = raw ? JSON.parse(raw) : null;
  } catch {
    empresaLocal = null;
  }

  let empresaConfigBackend: any = null;
  try {
    empresaConfigBackend = await getConfig();
  } catch {
    empresaConfigBackend = null;
  }

  let empresaBaseBackend: any = null;
  try {
    empresaBaseBackend = await getEmpresa();
  } catch {
    empresaBaseBackend = null;
  }

  const empresaData = {
    ...normalizeEmpresa(empresaBaseBackend),
    ...normalizeEmpresa(empresaConfigBackend),
    ...normalizeEmpresa(empresaLocal),
    ...normalizeEmpresa(cotizacion?.empresa),
    ...normalizeEmpresa(empresa),
  };

  // Datos seguros del cliente
  let clienteNombre = '-';
  let clienteTelefono = '-';
  let clienteEmail = '-';
  if (cotizacion?.cliente && typeof cotizacion.cliente === 'object') {
    clienteNombre = typeof cotizacion.cliente.nombre === 'string' ? cotizacion.cliente.nombre : '-';
    clienteTelefono = typeof cotizacion.cliente.telefono === 'string' ? cotizacion.cliente.telefono : '-';
    clienteEmail = typeof cotizacion.cliente.email === 'string' ? cotizacion.cliente.email : '-';
  } else {
    clienteNombre = typeof cotizacion?.clienteNombre === 'string' ? cotizacion.clienteNombre : '-';
    clienteTelefono = typeof cotizacion?.clienteTelefono === 'string' ? cotizacion.clienteTelefono : '-';
    clienteEmail = typeof cotizacion?.clienteEmail === 'string' ? cotizacion.clienteEmail : '-';
  }
  clienteNombre = esc(clienteNombre);
  clienteTelefono = esc(clienteTelefono);
  clienteEmail = esc(clienteEmail);

  // Configuración de paginado
  const items = Array.isArray(cotizacion?.items) ? cotizacion.items : [];
  const totalItems = items.length;
  const pages = [];
  let idx = 0;
  while (idx < totalItems) {
    const maxItems = 20;
    pages.push(items.slice(idx, idx + maxItems));
    idx += maxItems;
  }

  // Compactación: solo para la primera hoja si hay 1-10 items
  let tableClass = '';
  if (totalItems <= 10) {
    if (totalItems >= 8) tableClass = 'table--compact-1';
    if (totalItems >= 10) tableClass = 'table--compact-2';
  }

  const parsedDurationDays = Number(cotizacion?.eventDurationDays);
  const eventDurationDays = Number.isFinite(parsedDurationDays) && parsedDurationDays > 0
    ? Math.floor(parsedDurationDays)
    : 1;

  const breakdown = cotizacion?.breakdown && typeof cotizacion.breakdown === 'object'
    ? cotizacion.breakdown
    : null;
  const parsedBackendDays = Number(breakdown?.numberOfDays ?? breakdown?.eventDays ?? cotizacion?.eventDurationDays);
  const backendDurationDays = Number.isFinite(parsedBackendDays) && parsedBackendDays > 0
    ? Math.floor(parsedBackendDays)
    : 1;
  const toNumberOrNull = (v: any) => {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const subtotalOneTime = toNumberOrNull(breakdown?.subtotalOneTime);
  const subtotalPerDayBase = toNumberOrNull(breakdown?.subtotalPerDayBase);
  const subtotalOneDayFromParts =
    subtotalOneTime !== null || subtotalPerDayBase !== null
      ? (subtotalOneTime ?? 0) + (subtotalPerDayBase ?? 0)
      : null;

  const backendSubtotalOneDay = toNumberOrNull(
    breakdown?.subtotalOneDay
    ?? cotizacion?.subtotalOneDay
    ?? subtotalOneDayFromParts
  );
  const backendSubtotalByDays = toNumberOrNull(
    breakdown?.subtotalByDays
    ?? breakdown?.subtotalFinal
    ?? cotizacion?.subtotalByDays
    ?? cotizacion?.subtotalFinal
    ?? cotizacion?.subtotal
  );
  const backendTaxAmount = toNumberOrNull(breakdown?.ivaMonto ?? cotizacion?.ivaMonto) ?? 0;
  const backendTotalAmount = toNumberOrNull(breakdown?.total ?? cotizacion?.total) ?? 0;

  const pdfTotals = {
    subtotalLabel: "Subtotal",
    subtotalValue: backendDurationDays > 1
      ? (backendSubtotalOneDay ?? 0)
      : (backendSubtotalOneDay ?? backendSubtotalByDays ?? 0),
    subtotalByDaysLabel: `Subtotal x ${backendDurationDays} días de evento`,
    subtotalByDaysValue: backendSubtotalByDays ?? 0,
    taxValue: backendTaxAmount,
    totalValue: backendTotalAmount,
  };
  const eventDaysForDisplay = backendDurationDays > 0 ? backendDurationDays : eventDurationDays;
  const eventStartDate = cotizacion?.eventStartDate || cotizacion?.fechaEvento;
  const computedEventEndDate = addDaysToDate(eventStartDate, eventDaysForDisplay - 1);
  const eventEndDate = cotizacion?.eventEndDate || computedEventEndDate;
  const eventDateDisplay = eventDaysForDisplay > 1
    ? `del ${formatDateLong(eventStartDate)} al ${formatDateLong(eventEndDate)}`
    : formatDate(cotizacion?.fechaEvento || eventStartDate);

  const condicionesItems = [
    "<strong>Vigencia:</strong> La presente cotización es válida por <strong>5 (cinco) días naturales</strong> a partir de su fecha de emisión y está sujeta a disponibilidad de equipo y servicios al momento de confirmar.",
    "<strong>Reserva del servicio:</strong> Para apartar fecha y confirmar el servicio, se requiere un <strong>anticipo del 30%</strong> del total.",
    "<strong>Liquidación:</strong> El saldo restante deberá liquidarse al <strong>100%</strong> con al menos <strong>10 (diez) días naturales</strong> previos a la fecha del evento.",
    "<strong>Aplicación de pagos:</strong> En pagos realizados mediante transferencia electrónica, depósito bancario o cheque, el pago se considerará aplicado únicamente cuando se encuentre <strong>en firme</strong> y esté disponible en nuestra cuenta bancaria.",
    "<strong>Cambios en la cotización:</strong> Cualquier ajuste de cantidades, horarios, sede o requerimientos podrá modificar el importe final y deberá confirmarse por escrito.",
    "<strong>Cancelaciones/Reprogramaciones:</strong> En caso de cancelación o reprogramación, aplicarán las políticas vigentes de la empresa, las cuales serán informadas al momento de la confirmación del servicio.",
  ];

  if (eventDurationDays > 1) {
    condicionesItems.push("<strong>Servicio por varios días:</strong> Servicios contratados por más de un día consecutivo estarán sujetos a disponibilidad de equipo y podrán generar cargos adicionales por resguardo, mantenimiento o personal, según aplique.");
  }

  // HTML de condiciones, firma y footer
  const condicionesHtml = `<div class="condiciones" style="break-inside:avoid;page-break-inside:avoid;white-space:normal;word-break:normal;overflow-wrap:anywhere;"><div class="condiciones-title">Condiciones comerciales y forma de reserva</div><ul>${condicionesItems.map(txt => `<li style='break-inside:avoid;'>${txt}</li>`).join('')}</ul></div>`;
  const firmaHtml = `<div class="firma-area" style="break-inside:avoid;page-break-inside:avoid;"><div style="font-size:9px;font-weight:700;letter-spacing:.05em;">ACEPTACIÓN DE LA COTIZACIÓN</div><div style="margin-top:2px;">Firma: _______________________</div><div>Nombre: _______________________</div><div>Fecha: ____/____/______</div></div>`;

  // Renderizar cada página
  let htmlPages = '';
  pages.forEach((pageItems, i) => {
    const isFirst = i === 0;
    const isLast = i === pages.length - 1;
    htmlPages += `<section class="sheet${isFirst ? ' first-sheet' : ''}">
      ${isFirst ? `
      <div class="header">
        <div class="header-left">
          ${empresaData?.logoUrl ? `<img class="logo" src="${esc(empresaData.logoUrl)}" alt="Logo" />` : ""}
          <div class="company-name">${esc(empresaData?.nombreComercial || empresaData?.razonSocial || "Empresa")}</div>
          <div class="company-info">${esc(empresaData?.razonSocial || empresaData?.nombreComercial || "-")}</div>
          ${empresaData?.rfc ? `<div class="company-info">RFC: ${esc(empresaData.rfc)}</div>` : ""}
          ${empresaData?.direccion ? `<div class="company-info">${esc(empresaData.direccion)}</div>` : ""}
          <div class="company-info">Tel: ${esc(empresaData?.telefono || "-")} · Email: ${esc(empresaData?.email || "-")}</div>
          ${empresaData?.sitioWeb ? `<div class="company-info">Web: ${esc(empresaData.sitioWeb)}</div>` : ""}
        </div>
        <div class="header-right">
          <div class="doc-title">COTIZACIÓN</div>
          <div class="kv"><div class="k">Folio</div><div class="v">${esc(cotizacion?.folio || "")}</div></div>
          <div class="kv"><div class="k">Fecha de emisión</div><div class="v">${formatDate(new Date(), true)}</div></div>
          <div class="kv"><div class="k">Vigencia</div><div class="v"><span class="badge" style="background:#e0f2fe;color:#075985;border-color:#7dd3fc">5 días</span></div></div>
          <div class="kv"><div class="k">Estatus</div><div class="v"><span class="badge" style="background:#d1fae5;color:#065f46;border-color:#6ee7b7">Contratado</span></div></div>
        </div>
      </div>
      <div class="row-cards">
        <div class="card" style="min-width:260px;max-width:340px;">
          <div class="card-title">DATOS DEL EVENTO</div>
          <div class="event-grid">
            <div class="field"><div class="field-label">EVENTO</div><div class="field-value">${esc(cotizacion?.nombreEvento || cotizacion?.evento || "-")}</div></div>
            <div class="field"><div class="field-label">HORARIO</div><div class="field-value">${esc(cotizacion?.horaInicio || "-") + ' - ' + esc(cotizacion?.horaFin || "-")}</div></div>
            <div class="field"><div class="field-label">TIPO DE EVENTO</div><div class="field-value">${esc(cotizacion?.tipoEvento || "-")}</div></div>
            <div class="field"><div class="field-label">INVITADOS</div><div class="field-value">${esc(
            cotizacion?.invitados ?? (typeof cotizacion?.invitadosAdultos === 'number' && typeof cotizacion?.invitadosNinos === 'number' ? cotizacion.invitadosAdultos + cotizacion.invitadosNinos : '-')
          )}</div></div>
            <div class="field"><div class="field-label">FECHA</div><div class="field-value">${eventDateDisplay}</div></div>
            <div class="field"><div class="field-label">LUGAR / DIRECCIÓN</div><div class="field-value">${esc(cotizacion?.direccion || cotizacion?.lugarEvento || "-")}</div></div>
          </div>
        </div>
        <div class="card" style="min-width:260px;max-width:340px;">
          <div class="card-title">DATOS DEL CLIENTE</div>
          <div class="field"><div class="field-label">CLIENTE</div><div class="field-value">${clienteNombre}</div></div>
          <div class="field"><div class="field-label">TELÉFONO</div><div class="field-value">${clienteTelefono}</div></div>
          <div class="field"><div class="field-label">EMAIL</div><div class="field-value">${clienteEmail}</div></div>
        </div>
      </div>
      ` : ''}
      <table class="items-table ${tableClass}">
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="money">Precio unit.</th>
            <th class="center">Cantidad</th>
            <th class="money">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems.map((item: any) => {
            const badge = getConceptoBadge(item);
            return `<tr style="break-inside:avoid;page-break-inside:avoid;">
            <td>${badge ? `<span class="chip">${esc(badge)}</span> ` : ""}<span class="item-nombre">${esc(item?.nombre || "-")}</span></td>
            <td class="money">${formatCurrency(item?.precio)}</td>
            <td class="center">${esc(item?.cantidad)}</td>
            <td class="money">${formatCurrency((item?.precio || 0) * (item?.cantidad || 0))}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${isLast ? `<div class="totales"><div class="resumen-row"><span>${pdfTotals.subtotalLabel}</span><strong>${formatCurrency(pdfTotals.subtotalValue)}</strong></div>${backendDurationDays > 1 ? `<div class="resumen-row"><span>${pdfTotals.subtotalByDaysLabel}</span><strong>${formatCurrency(pdfTotals.subtotalByDaysValue)}</strong></div>` : ''}<div class="resumen-row"><span>IVA (16%)</span><strong>${formatCurrency(pdfTotals.taxValue)}</strong></div><div class="resumen-total"><div class="label">TOTAL</div><div class="value">${formatCurrency(pdfTotals.totalValue)}</div></div></div>` : ''}
      <div class="bottom-stack ${isLast ? 'bottom-stack--last' : ''}">
        ${isLast ? `${condicionesHtml}${firmaHtml}` : ''}
      </div>
    </section>`;
  });

  // --- CORRECCIONES DE LAYOUT Y DATOS SEGÚN REFERENCIA ---
  // 1. Espaciado y estructura de header
  // Ajuste de márgenes, paddings y alineación para header y cards
  // 2. Logo y datos empresa: fallback seguro y visibilidad
  // 3. Font sizes y pesos para exactitud visual
  // 4. Cards: estructura y separación
  // 5. Firma y condiciones: espacio reservado, no se parte
  // 6. Footer: alineación y contenido

  // CSS base y compactación
  const css = `<style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Inter, Arial, sans-serif; color: #111827; margin: 0; background: #fff; font-size: 10px; }
    .sheet { width: 100%; min-height: calc(297mm - 36mm); display: flex; flex-direction: column; justify-content: flex-start; box-sizing: border-box; padding: 0; page-break-after: always; }
    section.sheet:last-of-type { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; gap: 32px; align-items: flex-start; margin-bottom: 10px; }
    .header-left { flex: 1; padding-top: 6px; }
    .header-right { width: 260px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #f8fafc; }
    .logo { display: block; max-height: 72px; max-width: 220px; object-fit: contain; margin: 0 0 10px 0; }
    .company-name { font-size: 19px; font-weight: 700; margin: 0 0 2px 0; color: #111827; }
    .company-info { font-size: 9px; color: #64748b; margin: 1px 0; }
    .doc-title { font-size: 19px; font-weight: 800; color: #2563eb; margin: 0 0 7px 0; }
    .kv { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; font-size: 10px; }
    .kv .k { color: #64748b; }
    .kv .v { font-weight: 600; color: #111827; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: 0.02em; border: 1px solid; }
    .row-cards { display: flex; gap: 10px; margin-top: 6px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; background: #fafbfc; padding: 8px 10px; flex: 1; }
    .card-title { margin: 0 0 7px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #334155; }
    .field { margin: 4px 0; }
    .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin-bottom: 1px; }
    .field-value { font-size: 10px; font-weight: 600; color: #111827; }
    .event-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    th { background: #f1f5f9; color: #475569; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; padding: 6px 9px; border-bottom: 1px solid #e5e7eb; font-weight: 700; }
    td { padding: 7px 9px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
    td.money, th.money { text-align: right; }
    td.center, th.center { text-align: center; }
    .chip { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: 700; letter-spacing: 0.02em; border: 1px solid; }
    .item-nombre { max-width: 200px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
    .totales { margin-top: 7px; margin-left: auto; width: 300px; border: 1px solid #dbe3ef; border-radius: 12px; padding: 8px; background: #f8fafc; }
    .resumen-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; }
    .resumen-row strong { font-size: 11px; font-weight: 600; }
    .resumen-total { margin-top: 7px; border-top: 2px solid #2563eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: baseline; }
    .resumen-total .label { font-weight: 700; color: #111827; font-size: 12px; }
    .resumen-total .value { font-size: 20px; font-weight: 800; color: #2563eb; }
    .condiciones { margin-top: 7px; margin-bottom: 4mm; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 10px; background: #fafbfc; word-break:normal; overflow-wrap:anywhere; break-inside:avoid; page-break-inside:avoid; }
    .condiciones-title { margin: 0 0 7px 0; font-size: 11px; font-weight: 700; color: #111827; }
    .condiciones ul { margin: 0; padding-left: 14px; list-style: disc; }
    .condiciones li { margin: 3px 0; font-size: 9px; color: #475569; line-height: 1.4; white-space:normal; word-break:normal; overflow-wrap:anywhere; break-inside:avoid; }
    .firma-area { margin-top: 8px; font-size: 10px; color: #475569; break-inside:avoid; page-break-inside:avoid; border-top: 1px solid #e5e7eb; padding-top: 6px; }
    .bottom-stack { width: 100%; }
    .bottom-stack--last { margin-top: auto; }
    .bottom-stack--last .condiciones,
    .bottom-stack--last .firma-area { break-inside: avoid; page-break-inside: avoid; }
    .first-sheet { }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .sheet { page-break-after: always; }
      .page-break { display: block; page-break-after: always; }
    }
    /* Compactación */
    .table--compact-1 td { font-size: 9px !important; padding: 5px 7px !important; }
    .table--compact-2 td { font-size: 8px !important; padding: 4px 5px !important; }
    .table--compact-1 .item-nombre { max-width: 160px; }
    .table--compact-2 .item-nombre { max-width: 120px; }
  </style>`;

  // Renderizar HTML completo
  const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8" /><title>Cotización ${esc(cotizacion?.folio || "")} - ${Date.now()}</title>${css}</head><body>${htmlPages}</body></html>`;

  // Abrir ventana de impresión y renderizar
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) throw new Error('El navegador bloqueó la ventana de impresión.');
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    if (printWindow.document.fonts && printWindow.document.fonts.ready) {
      printWindow.document.fonts.ready.then(() => {
        setTimeout(() => printWindow.print(), 200);
      });
    } else {
      setTimeout(() => printWindow.print(), 200);
    }
  };
  printWindow.onafterprint = () => {
    try { printWindow.close(); } catch {}
  };
}
