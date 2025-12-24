import { useEffect, useState } from "react";

export type Compra = {
  id: string;
  fecha: string; // ISO yyyy-mm-dd
  documentoTipo: "Factura" | "Recibo";
  documentoFolio?: string;
  proveedorId: string;
  proveedorNombre: string;
  formaPago: "Contado" | "Crédito";
  metodoPago: "Transferencia" | "Efectivo" | "Tarjeta" | "Cheque" | "Otro";
};

type Params = {
  desde: string;
  hasta: string;
  proveedorId?: string;
  page: number;
  pageSize: number;
};

const MOCK_PROVEEDORES = [
  { id: "prov-1", nombre: "Proveedor Uno" },
  { id: "prov-2", nombre: "Proveedor Dos" },
  { id: "prov-3", nombre: "Proveedor Tres" },
];

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function mockCompras(desde: string, hasta: string): Compra[] {
  const start = new Date(desde);
  const end = new Date(hasta);
  const compras: Compra[] = [];
  for (let i = 0; i < 30; i++) {
    const fecha = randomDate(start, end).toISOString().slice(0, 10);
    const proveedor = MOCK_PROVEEDORES[Math.floor(Math.random() * MOCK_PROVEEDORES.length)];
    const tipo = Math.random() > 0.5 ? "Factura" : "Recibo";
    compras.push({
      id: `compra-${i}`,
      fecha,
      documentoTipo: tipo,
      documentoFolio: tipo === "Factura" ? `F-${1000 + i}` : `R-${1000 + i}`,
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      formaPago: Math.random() > 0.5 ? "Contado" : "Crédito",
      metodoPago: ["Transferencia", "Efectivo", "Tarjeta", "Cheque", "Otro"][Math.floor(Math.random() * 5)] as Compra["metodoPago"],
    });
  }
  return compras;
}

export function useCompras(params: Params) {
  const [data, setData] = useState<Compra[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simula fetch
    setTimeout(() => {
      let compras = mockCompras(params.desde, params.hasta);
      if (params.proveedorId) {
        compras = compras.filter(c => c.proveedorId === params.proveedorId);
      }
      setTotal(compras.length);
      const start = (params.page - 1) * params.pageSize;
      setData(compras.slice(start, start + params.pageSize));
      setLoading(false);
    }, 500);
  }, [params.desde, params.hasta, params.proveedorId, params.page, params.pageSize]);

  return { data, total, loading };
}
