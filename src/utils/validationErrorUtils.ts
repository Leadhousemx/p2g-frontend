/**
 * Utility functions to extract validation errors from API responses
 * Soporta múltiples formatos de error desde el backend
 */

export interface ValidationErrorField {
  field: string;
  label: string;
  message?: string;
}

/**
 * Campo a traducción de etiqueta (agregar según sea necesario)
 */
const FIELD_LABEL_MAP: Record<string, string> = {
  // Clientes
  nombre: 'Nombre del cliente',
  apellidos: 'Apellidos',
  email: 'Email',
  telefono: 'Teléfono',
  cp: 'Código Postal',
  medio: 'Medio de contacto',
  medioOtros: 'Especifique el medio',
  fechaNacimiento: 'Fecha de nacimiento',
  calificacion: 'Calificación',

  // Proveedores
  razonSocial: 'Razón Social',
  rfc: 'RFC',
  vendedor: 'Vendedor',
  vendedorEmail: 'Email del vendedor',
  vendedorTelefono: 'Teléfono del vendedor',
  banco: 'Banco',
  cuenta: 'Cuenta Bancaria',
  clabe: 'CLABE',

  // Productos
  nombreProducto: 'Nombre del producto',
  sku: 'SKU',
  descripcion: 'Descripción',
  costo: 'Costo',
  precioVenta: 'Precio de venta',
  cantidad: 'Cantidad',
  categoriaProducto: 'Categoría',
  unidad: 'Unidad',

  // Paquetes
  nombrePaquete: 'Nombre del paquete',
  paqueteName: 'Nombre del paquete',
  precioPaquete: 'Precio',
  duracion: 'Duración',
  descripcionPaquete: 'Descripción',

  // Cotizaciones
  clienteId: 'Cliente',
  saloneId: 'Salón',
  fechaCotizacion: 'Fecha de cotización',
  fechaEvento: 'Fecha del evento',
  eventoNombre: 'Nombre del evento',
  iva: 'IVA',
  detalles: 'Detalles del evento',
  items: 'Productos/Servicios',

  // Pagos
  montoPago: 'Monto',
  metodoPago: 'Método de pago',
  fechaPago: 'Fecha de pago',
  referencia: 'Referencia de pago',
  cotizacionId: 'Cotización',

  // Gastos
  concepto: 'Concepto',
  montoGasto: 'Monto',
  fechaGasto: 'Fecha del gasto',
  categoriaGasto: 'Categoría',
  proveedor: 'Proveedor',

  // Compras
  numeroCompra: 'Número de compra',
  fecha: 'Fecha',
  proveedorId: 'Proveedor',
  documentoTipo: 'Tipo de documento',
  documentoFolio: 'Número de documento',
  formaPago: 'Forma de pago',
  anticipo: 'Anticipo',
  tipoCompra: 'Tipo de compra',
  tipoGasto: 'Tipo de gasto',
  eventoId: 'Evento',
  totalCompra: 'Total',

  // Gastos operativos / gastos fijos
  nombreServicio: 'Servicio operativo',
  servicioId: 'Servicio operativo',
  nombreGastoFijo: 'Gasto fijo',
  gastoFijoId: 'Gasto fijo',
  precioUnitario: 'Precio unitario',
  compraItems: 'Artículos',
  operacionItems: 'Servicios',
  gastoFijoItems: 'Gastos fijos',

  // Salones
  nombreSalon: 'Nombre del salón',
  ubicacion: 'Ubicación',
  capacidad: 'Capacidad',
  precioSalon: 'Precio',

  // Fallback genérico para campos comunes sin sufijo
  monto: 'Monto',
  categoria: 'Categoría',
  precio: 'Precio',
};

/**
 * Obtiene la etiqueta legible de un campo
 */
export function getFieldLabel(field: string): string {
  return FIELD_LABEL_MAP[field] || field;
}

/**
 * Extrae errores de validación del error del backend
 * Soporta múltiples formatos
 */
export function extractValidationErrors(error: any): ValidationErrorField[] {
  if (!error) return [];

  const errorData = error?.response?.data || {};
  const fields: ValidationErrorField[] = [];

  // Formato 0: { field: "fieldName", message: "msg" }
  if (typeof errorData.field === 'string' && errorData.field.trim()) {
    fields.push({
      field: errorData.field,
      label: getFieldLabel(errorData.field),
      message:
        typeof errorData.message === 'string'
          ? errorData.message
          : typeof errorData.msg === 'string'
            ? errorData.msg
            : undefined,
    });
  }

  // Formato 1: { fields: { fieldName: "message", ... } }
  if (errorData.fields && typeof errorData.fields === 'object') {
    Object.entries(errorData.fields).forEach(([field, message]) => {
      fields.push({
        field,
        label: getFieldLabel(field),
        message: typeof message === 'string' ? message : undefined,
      });
    });
  }

  // Formato 2: { errors: [ { field: "fieldName", message: "msg" }, ... ] }
  if (Array.isArray(errorData.errors)) {
    errorData.errors.forEach((err: any) => {
      if (err.field) {
        fields.push({
          field: err.field,
          label: getFieldLabel(err.field),
          message: err.message,
        });
      }
    });
  }

  // Formato 3: { validation: { fieldName: ["error1", "error2"], ... } }
  if (errorData.validation && typeof errorData.validation === 'object') {
    Object.entries(errorData.validation).forEach(([field, messages]) => {
      const messageStr = Array.isArray(messages)
        ? messages[0]
        : typeof messages === 'string'
        ? messages
        : undefined;

      fields.push({
        field,
        label: getFieldLabel(field),
        message: messageStr,
      });
    });
  }

  const seen = new Set<string>();
  return fields.filter((entry) => {
    const key = `${entry.field}::${entry.message || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Determina si un error es un error de validación
 */
export function isValidationError(error: any): boolean {
  if (!error?.response?.data) return false;

  const errorData = error.response.data;
  return (
    Boolean(errorData.field) ||
    Boolean(errorData.fields) ||
    Boolean(errorData.errors) ||
    Boolean(errorData.validation) ||
    error?.response?.status === 400
  );
}

/**
 * Obtiene el mensaje de error principal
 */
export function getErrorMessage(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.message ||
    'Ocurrió un error'
  );
}
