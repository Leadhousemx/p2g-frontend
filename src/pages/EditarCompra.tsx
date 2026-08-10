import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label } from "@/components/ui";
import DynamicLineItemsEditor from "../components/common/DynamicLineItemsEditor";
import type { DynamicLineItemField, DynamicLineItemRecord } from "../components/common/DynamicLineItemsEditor";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Save, XCircle, AlertCircle, Loader, Plus } from "lucide-react";
import { getCompra, updateCompra, Compra } from "../services/comprasService";
import { getCotizacionEventOptionLabel, listCotizacionesContratadas, type Cotizacion } from "../services/cotizacionesService";
import { useProveedores } from "../hooks/useProveedores";
import ProductoSearchDropdown from "../components/compras/ProductoSearchDropdown";
import { preventEnterFormSubmit } from "../utils/formGuards";
import { extractValidationErrors, getErrorMessage } from "../utils/validationErrorUtils";
import { logger } from "../lib/logger";
import {
  calculateCompraItemSubtotal,
} from "../utils/compraItemUtils";

const COMPRA_DECIMAL_SOFT_PATTERN = /^\d*(?:\.\d*)?$/;
const COMPRA_MAX_DECIMALS = 4;

function normalizeCompraDecimalInput(value: unknown): string {
  return String(value ?? "").replace(/,/g, ".").trim();
}

function hasUpToFourDecimals(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const fixed = value.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
  const decimals = fixed.split(".")[1] || "";
  return decimals.length <= COMPRA_MAX_DECIMALS;
}

function isCompraDecimalInputValid(value: string): boolean {
  const normalized = normalizeCompraDecimalInput(value);
  if (!COMPRA_DECIMAL_SOFT_PATTERN.test(normalized)) {
    return false;
  }

  const decimals = normalized.split(".")[1] || "";
  return decimals.length <= COMPRA_MAX_DECIMALS;
}

function parseCompraDecimalInput(value: unknown): number | undefined {
  const normalized = normalizeCompraDecimalInput(value);
  if (!normalized || normalized === ".") {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeCompraDecimalOnBlur(value: string): string {
  const normalized = normalizeCompraDecimalInput(value);

  if (normalized === ".") {
    return "";
  }

  if (normalized.endsWith(".")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function formatCompraDecimalInput(value: unknown): string {
  const parsed = parseCompraDecimalInput(value);
  if (parsed === undefined) {
    return "";
  }

  return parsed.toFixed(COMPRA_MAX_DECIMALS).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function normalizeEditCompraBackendField(field: string): "descuento" | "anticipo" | "items" | undefined {
  const normalized = String(field || "").trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === "descuento") {
    return "descuento";
  }

  if (normalized === "anticipo") {
    return "anticipo";
  }

  if (normalized === "items") {
    return "items";
  }

  if (normalized === "total" || normalized === "totalcompra" || normalized === "subtotalproductos") {
    return "descuento";
  }

  return undefined;
}

function getCantidadValidationMessage(value: string): string {
  const normalized = normalizeCompraDecimalInput(value);

  if (normalized.startsWith("-")) {
    return "La cantidad no puede ser negativa.";
  }

  if (!COMPRA_DECIMAL_SOFT_PATTERN.test(normalized)) {
    return "Ingresa una cantidad valida.";
  }

  return "La cantidad admite hasta 4 decimales.";
}

function getPrecioUnitarioValidationMessage(value: string): string {
  const normalized = normalizeCompraDecimalInput(value);

  if (normalized.startsWith("-")) {
    return "El precio unitario no puede ser negativo.";
  }

  if (!COMPRA_DECIMAL_SOFT_PATTERN.test(normalized)) {
    return "Ingresa un precio unitario valido.";
  }

  return "El precio unitario admite hasta 4 decimales.";
}

function getEventoNombre(cotizaciones: Cotizacion[], eventoId?: string, fallbackNombre?: string): string {
  const selected = cotizaciones.find((cotizacion) => cotizacion._id === eventoId);
  return selected?.nombreEvento || fallbackNombre || "";
}

interface EditarCompraLineEditorItem extends DynamicLineItemRecord {
  productoNombre: string;
  productoId?: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  raw: {
    fieldId: string;
    index: number;
    isLastItem: boolean;
  };
}

  const CompraItemSchema = z.object({
    productoNombre: z.string().min(1, "Nombre del producto requerido"),
    productoId: z.string().optional(),
    precioUnitario: z
      .number({ invalid_type_error: "Precio requerido" })
      .min(0, "Precio debe ser >= 0")
      .refine(hasUpToFourDecimals, "El precio unitario admite hasta 4 decimales."),
    cantidad: z
      .number({ invalid_type_error: "Cantidad requerida" })
      .positive("Cantidad debe ser mayor a 0")
      .refine(hasUpToFourDecimals, "La cantidad admite hasta 4 decimales."),
    subtotal: z.number(),
  });

  const EditarCompraSchema = z.object({
    fecha: z.string().min(1, "Fecha requerida"),
    documentoTipo: z.enum(["Factura", "Recibo", "Nota", "Remisión", "Orden de Compra", "Otro"]),
    documentoFolio: z.string().min(1, "Número de documento requerido"),
    proveedorId: z.string().min(1, "Proveedor requerido"),
    formaPago: z.enum(["Contado", "Crédito", "Anticipo"]),
    anticipo: z.number().min(0, "El anticipo no puede ser negativo").optional().default(0),
    descuento: z.number().min(0, "El descuento no puede ser negativo").optional().default(0),
    metodoPago: z.enum(["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"]),
    items: z.array(CompraItemSchema).min(1, "Agrega al menos un artículo"),
    tipoCompra: z.enum(["general", "evento"]).optional(),
    eventoId: z.string().optional(),
    eventoNombre: z.string().optional(),
  });

  export default function EditarCompra() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { proveedores } = useProveedores({ loadAll: true });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [compra, setCompra] = useState<Compra | null>(null);
    const [cantidadInputs, setCantidadInputs] = useState<Record<string, string>>({});
    const [precioUnitarioInputs, setPrecioUnitarioInputs] = useState<Record<string, string>>({});
    const [cotizacionesContratadas, setCotizacionesContratadas] = useState<Cotizacion[]>([]);
    const [cotizacionesLoading, setCotizacionesLoading] = useState(false);

    const form = useForm<any>({
      resolver: zodResolver(EditarCompraSchema),
      mode: "onTouched",
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "items",
    });
    const errors: any = form.formState.errors;
    const itemsWatch = useWatch({ control: form.control, name: "items" }) || [];

    useEffect(() => {
      const loadCompra = async () => {
        try {
          setLoading(true);
          setError("");

          if (!id) {
            setNotFound(true);
            return;
          }

          const data = await getCompra(id);
          if (!data) {
            setNotFound(true);
            return;
          }

          setCompra(data);
          form.reset({
            fecha: data.fecha ? String(data.fecha).split("T")[0] : "",
            documentoTipo: data.documentoTipo,
            documentoFolio: data.documentoFolio,
            proveedorId: data.proveedorId,
            formaPago: data.formaPago,
            anticipo: Number(data.anticipo || 0),
            descuento: Number(data.descuento || 0),
            metodoPago: data.metodoPago,
            items: (data.items || []).map((item) => ({
              productoNombre: item.productoNombre || "",
              productoId: item.productoId || "",
              precioUnitario: Number(item.precioUnitario || 0),
              cantidad: Number(item.cantidad || 0),
              subtotal: Number(item.subtotal || 0),
            })),
            tipoCompra: data.tipoCompra || "general",
            eventoId: data.eventoId || "",
            eventoNombre: data.eventoNombre || "",
          });
        } catch (err: any) {
          logger.error("Error loading compra:", err);
          if (err?.response?.status === 404) {
            setNotFound(true);
          } else {
            setError("Error al cargar el gasto. Intenta de nuevo.");
          }
        } finally {
          setLoading(false);
        }
      };

      loadCompra();
    }, [id, form]);

    useEffect(() => {
      const loadCotizacionesContratadas = async () => {
        try {
          setCotizacionesLoading(true);
          const data = await listCotizacionesContratadas({ includeClosed: true });
          const eventoActualId = String(compra?.eventoId || "").trim();
          const nextCotizaciones = data.filter(
            (cotizacion) => cotizacion?.eventoCerrado !== true || cotizacion._id === eventoActualId
          );
          setCotizacionesContratadas(nextCotizaciones);
        } catch (err) {
          logger.error("Error loading contracted quotations:", err);
        } finally {
          setCotizacionesLoading(false);
        }
      };

      loadCotizacionesContratadas();
    }, [compra?.eventoId]);

    useEffect(() => {
      const updatedItems = itemsWatch.map((item: any) => ({
        ...item,
        subtotal: calculateCompraItemSubtotal(item?.precioUnitario, item?.cantidad),
      }));

      if (JSON.stringify(itemsWatch) !== JSON.stringify(updatedItems)) {
        form.setValue("items", updatedItems);
      }
    }, [itemsWatch, form]);

    useEffect(() => {
      setCantidadInputs((previous) => {
        const next: Record<string, string> = {};

        fields.forEach((field, index) => {
          next[field.id] = previous[field.id] ?? formatCompraDecimalInput(form.getValues(`items.${index}.cantidad`));
        });

        return next;
      });
    }, [fields, form]);

    useEffect(() => {
      setPrecioUnitarioInputs((previous) => {
        const next: Record<string, string> = {};

        fields.forEach((field, index) => {
          next[field.id] = previous[field.id] ?? formatCompraDecimalInput(form.getValues(`items.${index}.precioUnitario`));
        });

        return next;
      });
    }, [fields, form]);

    const totalCalculado = fields.reduce((sum, _, index) => {
      const subtotal = Number(form.watch(`items.${index}.subtotal`) || 0);
      return sum + subtotal;
    }, 0);
    const descuentoCalculado = Number(form.watch("descuento") || 0);
    const descuentoAplicado = Number.isFinite(descuentoCalculado) && descuentoCalculado > 0 ? descuentoCalculado : 0;
    const totalConDescuento = Math.max(0, totalCalculado - Math.min(totalCalculado, descuentoAplicado));

    const appendEmptyItem = () => {
      append({ productoNombre: "", productoId: "", precioUnitario: 0, cantidad: 1, subtotal: 0 });
    };

    const handleCantidadChange = (index: number, fieldId: string, rawValue: string) => {
      const fieldName = `items.${index}.cantidad` as const;
      const subtotalFieldName = `items.${index}.subtotal` as const;
      const normalized = normalizeCompraDecimalInput(rawValue);

      setCantidadInputs((previous) => ({
        ...previous,
        [fieldId]: normalized,
      }));

      if (!normalized || normalized === ".") {
        form.clearErrors(fieldName);
        form.setValue(fieldName, undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, 0, {
          shouldDirty: true,
        });
        return;
      }

      const cantidad = parseCompraDecimalInput(normalized);
      const precio = Number(form.getValues(`items.${index}.precioUnitario`) || 0);

      if (!isCompraDecimalInputValid(normalized)) {
        form.setError(fieldName, {
          type: "manual",
          message: getCantidadValidationMessage(normalized),
        });
        form.setValue(fieldName, cantidad, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
          shouldDirty: true,
        });
        return;
      }

      if (cantidad === undefined) {
        form.setValue(fieldName, undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, 0, {
          shouldDirty: true,
        });
        return;
      }

      form.clearErrors(fieldName);
      form.setValue(fieldName, cantidad, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
        shouldDirty: true,
      });
    };

    const handleCantidadBlur = (index: number, fieldId: string) => {
      const fieldName = `items.${index}.cantidad` as const;
      const subtotalFieldName = `items.${index}.subtotal` as const;
      const normalized = sanitizeCompraDecimalOnBlur(cantidadInputs[fieldId] || "");

      setCantidadInputs((previous) => ({
        ...previous,
        [fieldId]: normalized,
      }));

      const cantidad = parseCompraDecimalInput(normalized);
      const precio = Number(form.getValues(`items.${index}.precioUnitario`) || 0);

      form.clearErrors(fieldName);

      if (cantidad === undefined) {
        form.setValue(fieldName, undefined, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, 0, {
          shouldDirty: true,
        });
        form.trigger(fieldName);
        return;
      }

      if (!isCompraDecimalInputValid(normalized)) {
        form.setError(fieldName, {
          type: "manual",
          message: getCantidadValidationMessage(normalized),
        });
        form.setValue(fieldName, cantidad, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
          shouldDirty: true,
        });
        return;
      }

      form.setValue(fieldName, cantidad, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
        shouldDirty: true,
      });
      setCantidadInputs((previous) => ({
        ...previous,
        [fieldId]: formatCompraDecimalInput(cantidad),
      }));
    };

    const handlePrecioUnitarioChange = (index: number, fieldId: string, rawValue: string) => {
      const fieldName = `items.${index}.precioUnitario` as const;
      const subtotalFieldName = `items.${index}.subtotal` as const;
      const normalized = normalizeCompraDecimalInput(rawValue);

      setPrecioUnitarioInputs((previous) => ({
        ...previous,
        [fieldId]: normalized,
      }));

      if (!normalized || normalized === ".") {
        form.clearErrors(fieldName);
        form.setValue(fieldName, undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, 0, {
          shouldDirty: true,
        });
        return;
      }

      const precio = parseCompraDecimalInput(normalized);
      const cantidad = Number(form.getValues(`items.${index}.cantidad`) || 0);

      if (!isCompraDecimalInputValid(normalized)) {
        form.setError(fieldName, {
          type: "manual",
          message: getPrecioUnitarioValidationMessage(normalized),
        });
        form.setValue(fieldName, precio, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
          shouldDirty: true,
        });
        return;
      }

      if (precio === undefined) {
        form.setValue(fieldName, undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, 0, {
          shouldDirty: true,
        });
        return;
      }

      form.clearErrors(fieldName);
      form.setValue(fieldName, precio, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
        shouldDirty: true,
      });
    };

    const handlePrecioUnitarioBlur = (index: number, fieldId: string) => {
      const fieldName = `items.${index}.precioUnitario` as const;
      const subtotalFieldName = `items.${index}.subtotal` as const;
      const normalized = sanitizeCompraDecimalOnBlur(precioUnitarioInputs[fieldId] || "");

      setPrecioUnitarioInputs((previous) => ({
        ...previous,
        [fieldId]: normalized,
      }));

      const precio = parseCompraDecimalInput(normalized);
      const cantidad = Number(form.getValues(`items.${index}.cantidad`) || 0);

      form.clearErrors(fieldName);

      if (precio === undefined) {
        form.setValue(fieldName, undefined, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, 0, {
          shouldDirty: true,
        });
        form.trigger(fieldName);
        return;
      }

      if (!isCompraDecimalInputValid(normalized)) {
        form.setError(fieldName, {
          type: "manual",
          message: getPrecioUnitarioValidationMessage(normalized),
        });
        form.setValue(fieldName, precio, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
        form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
          shouldDirty: true,
        });
        return;
      }

      form.setValue(fieldName, precio, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      form.setValue(subtotalFieldName, calculateCompraItemSubtotal(precio, cantidad), {
        shouldDirty: true,
      });
      setPrecioUnitarioInputs((previous) => ({
        ...previous,
        [fieldId]: formatCompraDecimalInput(precio),
      }));
    };

    const editorItems: EditarCompraLineEditorItem[] = fields.map((field, index) => {
      const item = itemsWatch[index] || form.getValues(`items.${index}`) || {};
      const productName = String(item?.productoNombre || "").trim();

      return {
        ...item,
        id: field.id,
        title: productName || `Artículo ${index + 1}`,
        subtitle: productName ? "Artículo del gasto" : "Pendiente por capturar",
        raw: {
          fieldId: field.id,
          index,
          isLastItem: index === fields.length - 1,
        },
      };
    });

    const itemFields: Array<DynamicLineItemField<EditarCompraLineEditorItem>> = [
      {
        key: "productoNombre",
        label: "Nombre",
        type: "custom",
        desktopWidth: "minmax(0, 2.4fr)",
        mobilePriority: 0,
        mobileGridSpan: 2,
        renderField: ({ index }) => (
          <ProductoSearchDropdown
            value={form.watch(`items.${index}.productoNombre`) || ""}
            onChange={(value) => form.setValue(`items.${index}.productoNombre`, value)}
            onSelectProducto={(producto) => {
              if (producto) {
                form.setValue(`items.${index}.productoId`, producto._id);
                form.setValue(`items.${index}.precioUnitario`, producto.precioUnitario);
                setPrecioUnitarioInputs((previous) => ({
                  ...previous,
                  [fields[index].id]: formatCompraDecimalInput(producto.precioUnitario),
                }));
                form.setValue(
                  `items.${index}.subtotal`,
                  calculateCompraItemSubtotal(producto.precioUnitario, form.getValues(`items.${index}.cantidad`))
                );
              } else {
                form.setValue(`items.${index}.productoId`, "");
                form.setValue(`items.${index}.precioUnitario`, undefined);
                setPrecioUnitarioInputs((previous) => ({
                  ...previous,
                  [fields[index].id]: "",
                }));
                form.setValue(`items.${index}.subtotal`, 0);
              }
            }}
            placeholder="Ej: Harina de trigo"
          />
        ),
        getError: (_item, index) => errors.items?.[index]?.productoNombre?.message as string | undefined,
      },
      {
        key: "cantidad",
        label: "Cantidad",
        type: "number",
        desktopWidth: "120px",
        desktopAlign: "center",
        desktopHeaderAlign: "center",
        mobilePriority: 1,
        renderField: ({ item, index }) => (
          <Input
            id={`items.${index}.cantidad`}
            type="text"
            inputMode="decimal"
            value={cantidadInputs[item.raw.fieldId] ?? formatCompraDecimalInput(form.getValues(`items.${index}.cantidad`))}
            onChange={(event) => handleCantidadChange(index, item.raw.fieldId, event.target.value)}
            onBlur={() => handleCantidadBlur(index, item.raw.fieldId)}
            placeholder="0"
          />
        ),
        getError: (_item, index) => errors.items?.[index]?.cantidad?.message as string | undefined,
      },
      {
        key: "precioUnitario",
        label: "Precio unitario",
        type: "currency",
        desktopWidth: "140px",
        desktopAlign: "right",
        desktopHeaderAlign: "right",
        mobilePriority: 2,
        renderField: ({ item, index }) => (
          <Input
            id={`items.${index}.precioUnitario`}
            type="text"
            inputMode="decimal"
            value={precioUnitarioInputs[item.raw.fieldId] ?? formatCompraDecimalInput(form.getValues(`items.${index}.precioUnitario`))}
            onChange={(event) => handlePrecioUnitarioChange(index, item.raw.fieldId, event.target.value)}
            onBlur={() => handlePrecioUnitarioBlur(index, item.raw.fieldId)}
            placeholder="0"
          />
        ),
        getError: (_item, index) => errors.items?.[index]?.precioUnitario?.message as string | undefined,
      },
      {
        key: "subtotal",
        label: "Subtotal",
        type: "readonly",
        desktopWidth: "140px",
        desktopAlign: "right",
        desktopHeaderAlign: "right",
        mobilePriority: 3,
        renderValue: ({ index }) => (
          <Input
            value={Number(form.watch(`items.${index}.subtotal`) || 0).toFixed(2)}
            readOnly
            className="bg-gray-100 cursor-not-allowed text-right"
          />
        ),
      },
    ];

    const itemsErrorMessage = typeof errors.items?.message === "string" ? (errors.items.message as string) : undefined;

    const onSubmit = async (data: any) => {
      setSaving(true);
      setError("");

      try {
        if (!id) {
          setError("No se encontró el identificador del gasto.");
          return;
        }

        if (data.formaPago === "Anticipo") {
          const anticipo = Number(data.anticipo || 0);
          if (anticipo <= 0) {
            setError("Cuando la forma de pago es Anticipo, debes capturar un monto mayor a 0.");
            return;
          }
          if (anticipo > totalConDescuento) {
            setError("El anticipo no puede ser mayor al total del gasto.");
            return;
          }
        }

        const descuento = Number(data.descuento || 0);
        if (!Number.isFinite(descuento) || descuento < 0) {
          setError("El descuento debe ser un monto mayor o igual a 0.");
          return;
        }
        if (descuento > totalCalculado) {
          setError("El descuento no puede ser mayor al subtotal de productos.");
          return;
        }

        if (data.tipoCompra === "evento" && !data.eventoId) {
          setError("Debes seleccionar un evento contratado.");
          return;
        }

      // Enviar solo los campos editables (folio se excluye automáticamente)
      const payload = {
        fecha: data.fecha,
        documentoTipo: data.documentoTipo,
        documentoFolio: data.documentoFolio,
        proveedorId: data.proveedorId,
        formaPago: data.formaPago,
        anticipo: data.anticipo || 0,
        descuento,
        total: totalConDescuento,
        metodoPago: data.metodoPago,
        items: data.items.map((item: any) => ({
          productoNombre: item.productoNombre,
          precioUnitario: item.precioUnitario,
          cantidad: item.cantidad,
          subtotal: item.subtotal,
          ...(item.productoId && { productoId: item.productoId }),
        })),
        tipoCompra: data.tipoCompra,
        ...(data.tipoCompra === "evento"
          ? {
              eventoId: data.eventoId,
              eventoNombre: getEventoNombre(cotizacionesContratadas, data.eventoId, data.eventoNombre),
            }
          : {
              eventoId: undefined,
              eventoNombre: undefined,
            }),
      };

          await updateCompra(id, payload);
      navigate("/compras");
    } catch (err: any) {
      logger.error("Error updating compra:", err);
      const validationFields = extractValidationErrors(err);
      validationFields.forEach((field) => {
        const target = normalizeEditCompraBackendField(field.field);
        if (!target) {
          return;
        }

        form.setError(target, {
          type: "server",
          message: field.message || `Revisa el campo ${field.label.toLowerCase()}.`,
        });
      });

      const backendMessage = getErrorMessage(err);
      const normalizedMessage = /descuento/i.test(backendMessage) && /subtotal|total/i.test(backendMessage)
        ? "El descuento no puede ser mayor al subtotal de productos."
        : backendMessage;

      setError(normalizedMessage || "Error al actualizar el gasto. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando gasto...</p>
        </div>
      </div>
    );
  }

  const subtotalBackend = Number(compra?.subtotalProductos ?? compra?.monto ?? 0);
  const totalBackend = Number(compra?.totalCompra ?? compra?.total ?? 0);
  const descuentoBackend = Number(compra?.descuento || 0);
  const formaPagoSeleccionada = form.watch("formaPago");
  const eventoIdSeleccionado = form.watch("eventoId") || "";
  const eventoNombreActual = form.watch("eventoNombre") || compra?.eventoNombre || "";
  const eventoActualNoListable =
    Boolean(eventoIdSeleccionado) &&
    !cotizacionesContratadas.some((cotizacion) => cotizacion._id === eventoIdSeleccionado);
  const eventoActualCerrado = cotizacionesContratadas.find((cotizacion) => cotizacion._id === eventoIdSeleccionado)?.eventoCerrado === true;

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link to="/compras">
          <Button variant="outline">← Volver a Gastos</Button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center gap-3">
          <AlertCircle className="w-12 h-12 text-red-600" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-900">Gasto no encontrado</h2>
            <p className="text-red-700 text-sm mt-1">
              El gasto con el ID {id} no existe o fue eliminado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!compra) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar gasto</h1>
          <p className="text-gray-500 text-sm mt-1">Folio: <span className="font-mono font-semibold">{compra.folio}</span></p>
        </div>
        <Link to="/compras">
          <Button variant="outline">
            <XCircle className="w-4 h-4" />
            Cancelar
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error al actualizar</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={preventEnterFormSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-6"
      >
        {/* Información de solo lectura */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Información del gasto</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600">Folio</p>
              <p className="font-mono font-semibold text-gray-900">{compra.folio}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Fecha de creación</p>
              <p className="text-sm text-gray-900">{new Date(compra.createdAt).toLocaleDateString("es-MX")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Subtotal</p>
              <p className="text-sm font-semibold text-gray-900">${subtotalBackend.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-sm font-semibold text-blue-600">${totalBackend.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Campos editables */}
        <div className="space-y-6">
          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              {...form.register("fecha")}
            />
            {errors.fecha && (
              <p className="text-sm text-red-600">{errors.fecha?.message as string}</p>
            )}
          </div>

          {/* Documento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentoTipo">Tipo de Documento *</Label>
              <Select
                value={form.watch("documentoTipo")}
                onValueChange={(value: string) => form.setValue("documentoTipo", value as any)}
              >
                <SelectTrigger id="documentoTipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Factura">Factura</SelectItem>
                  <SelectItem value="Recibo">Recibo</SelectItem>
                  <SelectItem value="Nota">Nota</SelectItem>
                  <SelectItem value="Remisión">Remisión</SelectItem>
                  <SelectItem value="Orden de Compra">Orden de Compra</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentoFolio">Número de Documento *</Label>
              <Input
                id="documentoFolio"
                {...form.register("documentoFolio")}
              />
              {errors.documentoFolio && (
                <p className="text-sm text-red-600">{errors.documentoFolio?.message as string}</p>
              )}
            </div>
          </div>

          {/* Proveedor */}
          <div className="space-y-2">
            <Label htmlFor="proveedorId">Proveedor *</Label>
            <Select
              value={form.watch("proveedorId")}
              onValueChange={(value: string) => form.setValue("proveedorId", value)}
            >
              <SelectTrigger id="proveedorId">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.nombreComercial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.proveedorId && (
              <p className="text-sm text-red-600">{errors.proveedorId?.message as string}</p>
            )}
          </div>

          {/* Formas y Métodos de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formaPago">Forma de Pago *</Label>
              <Select
                value={form.watch("formaPago")}
                onValueChange={(value: string) => form.setValue("formaPago", value as any)}
                disabled={compra?.formaPago === "Contado"}
              >
                <SelectTrigger id="formaPago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contado">Contado</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Anticipo">Anticipo</SelectItem>
                </SelectContent>
              </Select>
              {compra?.formaPago === "Contado" && (
                <p className="text-xs text-[#64748B]">Los gastos de contado no permiten cambiar la forma de pago.</p>
              )}
            </div>

            {formaPagoSeleccionada === "Anticipo" && (
              <div className="space-y-2">
                <Label htmlFor="anticipo">Monto de anticipo *</Label>
                <Input
                  id="anticipo"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("anticipo", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.anticipo && (
                  <p className="text-sm text-red-600">{errors.anticipo?.message as string}</p>
                )}
                {Number(form.watch("anticipo") || 0) > totalConDescuento && (
                  <p className="text-sm text-red-600">El anticipo no puede ser mayor al total del gasto.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de Pago *</Label>
              <Select
                value={form.watch("metodoPago")}
                onValueChange={(value: string) => form.setValue("metodoPago", value as any)}
              >
                <SelectTrigger id="metodoPago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo de Compra */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoCompra">Tipo de gasto</Label>
              <Select
                value={form.watch("tipoCompra") || "general"}
                onValueChange={(value: string) => form.setValue("tipoCompra", value as any)}
              >
                <SelectTrigger id="tipoCompra">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.watch("tipoCompra") === "evento" && (
              <div className="space-y-2">
                <Label htmlFor="eventoId">Evento contratado</Label>
                <Select
                  value={eventoIdSeleccionado}
                  onValueChange={(value: string) => {
                    form.setValue("eventoId", value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                    form.setValue(
                      "eventoNombre",
                      getEventoNombre(cotizacionesContratadas, value, compra?.eventoNombre),
                      { shouldDirty: true, shouldTouch: true }
                    );
                  }}
                  disabled={cotizacionesLoading}
                >
                  <SelectTrigger id="eventoId">
                    <SelectValue placeholder={cotizacionesLoading ? "Cargando eventos..." : "Selecciona un evento contratado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventoActualNoListable ? (
                      <SelectItem value={eventoIdSeleccionado}>
                        {eventoNombreActual || "Evento actual"}
                      </SelectItem>
                    ) : null}
                    {cotizacionesContratadas.map((cotizacion) => (
                      <SelectItem key={cotizacion._id} value={cotizacion._id}>
                        {getCotizacionEventOptionLabel(cotizacion)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.eventoId && (
                  <p className="text-sm text-red-600">{errors.eventoId?.message as string}</p>
                )}
                {eventoActualCerrado ? (
                  <p className="text-sm text-amber-700">Este gasto pertenece a un evento cerrado. Puedes conservar la relación histórica, pero no asignarlo a otro evento cerrado.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4 border-t pt-6">
          <DynamicLineItemsEditor
            items={editorItems}
            getItemKey={(item) => item.id}
            fields={itemFields}
            title="Artículos"
            description="Edita los artículos en una sola fila por producto y agrega nuevos cuando haga falta."
            emptyState={{
              title: "No hay artículos",
              description: "Agrega al menos un artículo para continuar.",
              actionLabel: "Agregar artículo",
            }}
            addAction={{
              label: (
                <>
                  <Plus className="w-4 h-4" />
                  Agregar artículo
                </>
              ),
            }}
            onAddItem={appendEmptyItem}
            onRemoveItem={remove}
            errorMessage={itemsErrorMessage}
            actionsColumnLabel="Acciones"
            renderItemActions={(item) =>
              item.raw.isLastItem ? (
                <Button type="button" variant="outline" size="sm" onClick={appendEmptyItem}>
                  <Plus className="w-4 h-4" />
                  Agregar otro
                </Button>
              ) : null
            }
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">Subtotal productos</span>
                <span className="font-semibold text-slate-900">${totalCalculado.toFixed(2)}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                <Label htmlFor="descuento" className="font-medium text-slate-700">Descuento</Label>
                <div>
                  <Input
                    id="descuento"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    {...form.register("descuento", {
                      valueAsNumber: true,
                      setValueAs: (value) => {
                        if (value === "" || value === null || value === undefined) {
                          return 0;
                        }
                        const parsed = Number(value);
                        return Number.isFinite(parsed) ? parsed : Number.NaN;
                      },
                    })}
                    placeholder="0.00"
                    className="text-right"
                  />
                  {errors.descuento ? (
                    <p className="mt-1 text-sm text-red-600">{errors.descuento?.message as string}</p>
                  ) : descuentoAplicado > totalCalculado ? (
                    <p className="mt-1 text-sm text-red-600">El descuento no puede ser mayor al subtotal de productos.</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                <span className="font-semibold text-slate-900">Total compra</span>
                <span className="font-bold text-slate-900">${totalConDescuento.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        {fields.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-right">
              <p className="text-gray-600">Total estimado:</p>
              <p className="text-3xl font-bold text-blue-900">
                ${totalConDescuento.toFixed(2)}
              </p>
              <p className="text-xs text-blue-700 mt-1">Total calculado con los artículos actuales menos descuento.</p>
              {(Math.abs(totalBackend - totalConDescuento) > 0.0001 || Math.abs(descuentoBackend - descuentoAplicado) > 0.0001) && (
                <p className="text-xs text-slate-500 mt-1">Total guardado previamente: ${totalBackend.toFixed(2)}</p>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Link to="/compras">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar gasto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
