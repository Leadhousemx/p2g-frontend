// src/pages/SalonesNuevo.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentShell from "../components/common/ContentShell";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import { logger } from "../lib/logger";
import { createSalon } from "../services/salonesService";
import { Button, Input, Textarea, Label } from "@/components/ui";

const PALETA = [
  { key: "azul", hex: "#2563eb" },
  { key: "indigo", hex: "#4f46e5" },
  { key: "verde", hex: "#16a34a" },
  { key: "amarillo", hex: "#f59e0b" },
  { key: "rojo", hex: "#dc2626" },
  { key: "gris", hex: "#6b7280" },
];

export default function SalonesNuevo() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [color, setColor] = useState(PALETA[0].hex);
  const [contratos, setContratos] = useState([
    { id: crypto.randomUUID(), nombre: "Contrato salón", machote: "" },
  ]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const addContrato = () => {
    setContratos((prev) => [...prev, { id: crypto.randomUUID(), nombre: "", machote: "" }]);
  };
  const updateContrato = (id, patch) => {
    setContratos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeContrato = (id) => {
    setContratos((prev) => prev.filter((c) => c.id !== id));
  };

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "El nombre del salón es obligatorio.";
    if (telefono && !/^[\d\s+\-()]{7,}$/.test(telefono)) e.telefono = "Teléfono inválido.";
    if (!color) e.color = "Selecciona un color.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitError("");

    try {
      const createdSalon = await createSalon({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      });
      const createdSalonSnapshot = {
        _id:
          createdSalon?._id
          || createdSalon?.id
          || createdSalon?.data?._id
          || createdSalon?.data?.id
          || createdSalon?.negocio?._id
          || createdSalon?.negocio?.id
          || `salon-preview-${Date.now()}`,
        nombre:
          createdSalon?.nombre
          || createdSalon?.data?.nombre
          || createdSalon?.negocio?.nombre
          || nombre.trim(),
        telefono:
          createdSalon?.telefono
          || createdSalon?.data?.telefono
          || createdSalon?.negocio?.telefono
          || telefono.trim(),
        activo:
          typeof createdSalon?.activo === "boolean"
            ? createdSalon.activo
            : typeof createdSalon?.data?.activo === "boolean"
              ? createdSalon.data.activo
              : typeof createdSalon?.negocio?.activo === "boolean"
                ? createdSalon.negocio.activo
                : true,
      };
      navigate("/salones", {
        state: {
          salonesRefresh: {
            refreshKey: Date.now(),
            salonId: createdSalonSnapshot._id,
            salonName: createdSalonSnapshot.nombre,
            salon: createdSalonSnapshot,
            focusInSearch: true,
          },
        },
      });
    } catch (err) {
      logger.error("Error creating salon:", err);
      setSubmitError(err?.response?.data?.message || "Error al crear el salón. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
      <FormPageShell
        title="Nuevo salón"
        description="Da de alta un salón conservando intacto el flujo actual de creación, validación y regreso al listado."
        className="max-w-5xl space-y-5 lg:space-y-6"
        actions={
          <Button type="button" variant="outline" onClick={() => navigate("/salones")} disabled={saving} className="w-full sm:w-auto">
            Cancelar
          </Button>
        }
      >
        {submitError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
          <FormSection
            title="Datos del salón"
            description="Captura los datos base del salón manteniendo intacta la validación local actual."
          >
            <FieldGrid>
              <div>
                <Label htmlFor="nombre">Nombre del salón</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Salón Las Palmas"
                  aria-invalid={!!errors.nombre}
                />
                {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 999-123-4567"
                  aria-invalid={!!errors.telefono}
                />
                {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
              </div>

              <div className="md:col-span-2">
                <Label>Color de identificación</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PALETA.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      title={c.key}
                      onClick={() => setColor(c.hex)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        color === c.hex ? "border-black ring-2 ring-black/20" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      aria-pressed={color === c.hex}
                    />
                  ))}
                </div>
                {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Este color se usará para mostrar en el calendario las fechas agendadas de este negocio.
                </p>
              </div>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Contratos de servicio"
            description="Mantén el bloque actual de contratos y machotes sin alterar todavía su comportamiento funcional."
          >
            <div className="mb-4 flex justify-start sm:justify-end">
              <Button type="button" variant="outline" onClick={addContrato} className="w-full sm:w-auto">
                Agregar contrato
              </Button>
            </div>

            <div className="space-y-4">
              {contratos.map((c, idx) => (
                <div key={c.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-sm">Contrato #{idx + 1}</Label>
                    <Button type="button" variant="ghost" onClick={() => removeContrato(c.id)} className="w-full sm:w-auto">
                      Eliminar
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor={`contrato-nombre-${c.id}`}>Nombre del contrato</Label>
                    <Input
                      id={`contrato-nombre-${c.id}`}
                      placeholder="Ej. Contrato todo incluido"
                      value={c.nombre}
                      onChange={(e) => updateContrato(c.id, { nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`contrato-machote-${c.id}`}>Machote (plantilla)</Label>
                    <Textarea
                      id={`contrato-machote-${c.id}`}
                      placeholder="Pega aquí el machote del contrato…"
                      value={c.machote}
                      onChange={(e) => updateContrato(c.id, { machote: e.target.value })}
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              ))}

              {contratos.length === 0 && (
                <p className="text-sm text-gray-500">No hay contratos. Usa “Agregar contrato”.</p>
              )}
            </div>

            <FormActionsBar>
              <Button type="button" variant="outline" onClick={() => navigate("/salones")} disabled={saving} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </FormActionsBar>
          </FormSection>
        </form>
      </FormPageShell>
    </ContentShell>
  );
}
