import { useFormContext, useWatch } from "react-hook-form";
import DynamicLineItemsEditor from "../common/DynamicLineItemsEditor";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  QUOTE_LINE_ITEM_ACTIONS_WIDTH,
  QUOTE_LINE_ITEM_DESKTOP_WIDTHS,
  QUOTE_LINE_ITEM_STEPPER_CLASS,
  QUOTE_LINE_ITEM_STEPPER_INPUT_CLASS,
  QUOTE_LINE_ITEM_SUMMARY_WIDTH,
} from "./quoteLineItemLayout";

export default function ItemsTable({ fields = [], remove }) {
  const { control, setValue, getValues, formState, register } = useFormContext();
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedDurationDays = useWatch({ control, name: "eventDurationDays" });
  const prevCountRef = useRef(fields.length);
  const timeoutRefs = useRef([]);
  const [highlightedRows, setHighlightedRows] = useState({});

  useEffect(() => {
    const previousCount = prevCountRef.current;
    const currentCount = fields.length;

    if (currentCount > previousCount) {
      const newRows = Array.from({ length: currentCount - previousCount }, (_, index) => previousCount + index)
        .map((rowIndex) => fields[rowIndex]?.id)
        .filter(Boolean);

      if (newRows.length > 0) {
        setHighlightedRows((prev) => {
          const next = { ...prev };
          newRows.forEach((rowId) => {
            next[rowId] = true;
          });
          return next;
        });

        newRows.forEach((rowId) => {
          const timeoutId = setTimeout(() => {
            setHighlightedRows((prev) => {
              if (!prev[rowId]) return prev;
              const next = { ...prev };
              delete next[rowId];
              return next;
            });
          }, 3000);
          timeoutRefs.current.push(timeoutId);
        });
      }
    }

    prevCountRef.current = currentCount;
  }, [fields]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current = [];
    };
  }, []);

  const updateCantidad = (index, delta) => {
    const current = Number(getValues(`items.${index}.cantidad`) || 1);
    const next = Math.max(1, current + delta);
    setValue(`items.${index}.cantidad`, next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const durationDays = Number.isFinite(Number(watchedDurationDays)) ? Math.max(1, Math.trunc(Number(watchedDurationDays))) : 1;
  const showDurationToggle = durationDays > 1;
  const itemsErrorMessage = typeof formState?.errors?.items?.message === "string" ? formState.errors.items.message : undefined;

  const getTipoLabel = (currentItem) => {
    const tipo = currentItem?.catalogoTipo || currentItem?.tipo?.toLowerCase();
    if (tipo) {
      const def = {
        platillos: "Catering",
        bebidas: "Bebidas",
        personal: "Personal",
        mobiliario: "Mobiliario",
        audio: "Audio",
        otros: "Otros",
      };
      return def[tipo] || currentItem?.tipo;
    }
    return currentItem?.tipo || "-";
  };

  const editorItems = fields.map((field, index) => {
    const currentItem = watchedItems[index] || field;
    const precio = Number(currentItem?.precio || 0);
    const cantidad = Number(currentItem?.cantidad || 1);
    const applyDurationMultiplier = currentItem?.applyDurationMultiplier !== false;
    const lineDaysApplied = applyDurationMultiplier && durationDays > 1 ? durationDays : 1;
    const total = precio * cantidad * lineDaysApplied;
    const isHighlighted = Boolean(highlightedRows[field.id]);

    return {
      id: field.id,
      title: currentItem?.nombre || `Concepto ${index + 1}`,
      subtitle: getTipoLabel(currentItem),
      meta: isHighlighted
        ? [
            {
              key: "nuevo",
              label: "Estado",
              value: "Nuevo",
            },
          ]
        : undefined,
      summary: {
        label: "Total",
        value: Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total),
        helperText: lineDaysApplied > 1 ? `x ${lineDaysApplied} días` : "Cargo único",
      },
      raw: {
        currentItem,
        isHighlighted,
      },
    };
  });

  const itemFields = [
    {
      key: "concepto",
      label: "Concepto",
      type: "readonly",
      hideOnMobile: true,
      desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.concepto,
      renderValue: ({ item }) => (
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-[#2563eb]">{getTipoLabel(item.raw?.currentItem)}</p>
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[#111827]">{item.raw?.currentItem?.nombre || "-"}</p>
            {item.raw?.isHighlighted ? (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                Nuevo
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "precio",
      label: "Precio",
      type: "currency",
      desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.precio,
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 1,
      renderField: ({ index }) => (
        <input
          type="number"
          min={0}
          step="0.01"
          className="w-full rounded border border-slate-200 px-3 py-2 text-right text-sm"
          inputMode="decimal"
          {...register(`items.${index}.precio`, {
            valueAsNumber: true,
            onBlur: (e) => {
              const val = Math.max(0, Number(e.target.value) || 0);
              setValue(`items.${index}.precio`, val, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            },
          })}
        />
      ),
    },
    {
      key: "cantidad",
      label: "Cantidad",
      type: "number",
      desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.cantidad,
      desktopAlign: "center",
      desktopHeaderAlign: "center",
      mobilePriority: 2,
      renderField: ({ index }) => {
        return (
          <div className={QUOTE_LINE_ITEM_STEPPER_CLASS}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-slate-100"
              onClick={() => updateCantidad(index, -1)}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min={1}
              className={QUOTE_LINE_ITEM_STEPPER_INPUT_CLASS}
              inputMode="numeric"
              {...register(`items.${index}.cantidad`, {
                valueAsNumber: true,
                onBlur: (e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  setValue(`items.${index}.cantidad`, val, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                },
              })}
            />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-slate-100"
              onClick={() => updateCantidad(index, 1)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
    ...(showDurationToggle
      ? [
          {
            key: "duracion",
            label: "Aplicar duración",
            type: "custom",
              desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.duracion,
            desktopAlign: "center",
            desktopHeaderAlign: "center",
            mobilePriority: 3,
            mobileGridSpan: 2,
            renderField: ({ item, index }) => {
              const applyDurationMultiplier = item.raw?.currentItem?.applyDurationMultiplier !== false;

              return (
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      applyDurationMultiplier ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:bg-slate-100"
                    }`}
                    onClick={() => setValue(`items.${index}.applyDurationMultiplier`, true, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                  >
                    Por día
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      !applyDurationMultiplier ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:bg-slate-100"
                    }`}
                    onClick={() => setValue(`items.${index}.applyDurationMultiplier`, false, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                  >
                    Única vez
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <DynamicLineItemsEditor
      items={editorItems}
      getItemKey={(item, index) => item.id || `item-${index}`}
      fields={itemFields}
      showHeader={false}
      summaryColumnLabel="Total"
      actionsColumnLabel="Acción"
      summaryColumnWidth={QUOTE_LINE_ITEM_SUMMARY_WIDTH}
      actionsColumnWidth={QUOTE_LINE_ITEM_ACTIONS_WIDTH}
      emptyState={{
        title: "No hay conceptos",
        description: "Agrega conceptos desde los catálogos.",
      }}
      errorMessage={itemsErrorMessage}
      mobileBreakpoint="lg"
      className="border-0 bg-transparent p-0 shadow-none"
      actions={[
        {
          key: "remove",
          label: "Eliminar",
          tone: "danger",
          onClick: (_, index) => remove?.(index),
        },
      ]}
    />
  );
}
