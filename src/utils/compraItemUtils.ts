const COMPRA_QUANTITY_PATTERN = /^\d*(?:\.\d{0,3})?$/;
const COMPRA_QUANTITY_SOFT_PATTERN = /^\d*(?:\.\d*)?$/;

export function normalizeCompraQuantityInput(value: unknown): string {
  return String(value ?? "").replace(/,/g, ".").trim();
}

export function isCompraQuantityInputValid(value: string): boolean {
  return COMPRA_QUANTITY_PATTERN.test(normalizeCompraQuantityInput(value));
}

export function getCompraQuantityValidationMessage(value: string): string {
  const normalized = normalizeCompraQuantityInput(value);

  if (normalized.startsWith("-")) {
    return "La cantidad no puede ser negativa.";
  }

  if (!COMPRA_QUANTITY_SOFT_PATTERN.test(normalized)) {
    return "Ingresa una cantidad valida.";
  }

  return "La cantidad admite hasta 3 decimales.";
}

export function parseCompraQuantityInput(value: unknown): number | undefined {
  const normalized = normalizeCompraQuantityInput(value);
  if (!normalized || normalized === ".") {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function sanitizeCompraQuantityOnBlur(value: string): string {
  const normalized = normalizeCompraQuantityInput(value);

  if (normalized === ".") {
    return "";
  }

  if (normalized.endsWith(".")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function formatCompraQuantityInput(value: unknown): string {
  const parsed = parseCompraQuantityInput(value);
  if (parsed === undefined) {
    return "";
  }

  return parsed.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function hasUpToThreeDecimals(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const fixed = value.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
  const decimals = fixed.split(".")[1] || "";
  return decimals.length <= 3;
}

export function calculateCompraItemSubtotal(precioUnitario: unknown, cantidad: unknown): number {
  const precio = Number(precioUnitario);
  const qty = Number(cantidad);

  return (Number.isFinite(precio) ? precio : 0) * (Number.isFinite(qty) ? qty : 0);
}