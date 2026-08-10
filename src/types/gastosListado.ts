export type GastoListadoTipoRegistro = "compra" | "operativo" | "fijo";

export type GastoListadoEstadoPago = "Pagado" | "Pendiente" | "No aplica";

export interface GastoListadoItem {
  id: string;
  origenId: string;
  tipoRegistro: GastoListadoTipoRegistro;
  subtipoRegistro?: string;
  proveedorId?: string;
  folio: string;
  fecha: string;
  total: number;
  metodoPago?: string;
  estadoPago: GastoListadoEstadoPago;
  descripcionPrincipal: string;
  proveedorNombre?: string;
  documentoTipo?: string;
  documentoFolio?: string;
  eventoNombre?: string;
  sourceEndpoint?: string;
  raw?: unknown;
}
