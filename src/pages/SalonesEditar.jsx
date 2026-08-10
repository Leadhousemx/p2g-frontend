import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader, Save, XCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import ContentShell from "../components/common/ContentShell";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import { logger } from "../lib/logger";
import { getSalon, updateSalon } from "../services/salonesService";

export default function SalonesEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [activo, setActivo] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadSalon = async () => {
      try {
        setLoading(true);
        setSubmitError("");

        if (!id) {
          setNotFound(true);
          return;
        }

        const data = await getSalon(id);
        if (!data) {
          setNotFound(true);
          return;
        }

        setNombre(data.nombre || "");
        setTelefono(data.telefono || "");
        setActivo(typeof data.activo === "boolean" ? data.activo : true);
      } catch (err) {
        logger.error("Error loading salon:", err);
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          setSubmitError("Error al cargar el salón. Intenta de nuevo.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadSalon();
  }, [id]);

  const validate = () => {
    const nextErrors = {};
    if (!nombre.trim()) nextErrors.nombre = "El nombre del salón es obligatorio.";
    if (telefono && !/^[\d\s+\-()]{7,}$/.test(telefono)) {
      nextErrors.telefono = "Teléfono inválido.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !validate()) return;

    setSaving(true);
    setSubmitError("");

    try {
      const updatedSalon = await updateSalon(id, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        activo,
      });
      const updatedSalonSnapshot = {
        _id:
          updatedSalon?._id
          || updatedSalon?.id
          || updatedSalon?.data?._id
          || updatedSalon?.data?.id
          || updatedSalon?.negocio?._id
          || updatedSalon?.negocio?.id
          || id,
        nombre:
          updatedSalon?.nombre
          || updatedSalon?.data?.nombre
          || updatedSalon?.negocio?.nombre
          || nombre.trim(),
        telefono:
          updatedSalon?.telefono
          || updatedSalon?.data?.telefono
          || updatedSalon?.negocio?.telefono
          || telefono.trim(),
        activo:
          typeof updatedSalon?.activo === "boolean"
            ? updatedSalon.activo
            : typeof updatedSalon?.data?.activo === "boolean"
              ? updatedSalon.data.activo
              : typeof updatedSalon?.negocio?.activo === "boolean"
                ? updatedSalon.negocio.activo
                : activo,
      };
      navigate("/salones", {
        state: {
          salonesRefresh: {
            refreshKey: Date.now(),
            salonId: updatedSalonSnapshot._id,
            salonName: updatedSalonSnapshot.nombre,
            salon: updatedSalonSnapshot,
            focusInSearch: true,
          },
        },
      });
    } catch (err) {
      logger.error("Error updating salon:", err);
      setSubmitError(err?.response?.data?.message || "Error al actualizar el salón. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
        <FormPageShell
          title="Editar salón"
          description="Actualiza los datos mínimos activos del salón manteniendo intacta la lógica actual de edición."
          className="max-w-5xl"
        >
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col items-center gap-3">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Cargando salón...</p>
            </div>
          </div>
        </FormPageShell>
      </ContentShell>
    );
  }

  if (notFound) {
    return (
      <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
        <FormPageShell
          title="Editar salón"
          description="Actualiza los datos mínimos activos del salón manteniendo intacta la lógica actual de edición."
          className="max-w-5xl"
        >
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="font-semibold text-red-900">Salón no encontrado</h2>
                <p className="mt-1 text-sm text-red-700">El registro solicitado no existe o ya no está disponible.</p>
              </div>
            </div>
            <div className="mt-4">
              <Button type="button" onClick={() => navigate("/salones")}>Volver a Salones</Button>
            </div>
          </div>
        </FormPageShell>
      </ContentShell>
    );
  }

  return (
    <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
      <FormPageShell
        title="Editar salón"
        description="Adapta la edición al patrón responsive compartido sin modificar el flujo funcional mínimo ya rescatado."
        className="max-w-5xl space-y-5 lg:space-y-6"
        actions={
          <Button type="button" variant="outline" onClick={() => navigate("/salones")} disabled={saving} className="w-full sm:w-auto">
            <XCircle className="mr-2 h-4 w-4" />
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
            description="Edita nombre, teléfono y estado manteniendo las validaciones y el guardado actuales."
          >
            <FieldGrid>
              <div>
                <Label htmlFor="nombre">Nombre del salón</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  aria-invalid={!!errors.nombre}
                />
                {errors.nombre ? <p className="mt-1 text-sm text-red-600">{errors.nombre}</p> : null}
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  aria-invalid={!!errors.telefono}
                />
                {errors.telefono ? <p className="mt-1 text-sm text-red-600">{errors.telefono}</p> : null}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="activo" className="block">Estado</Label>
                <label htmlFor="activo" className="mt-2 flex min-h-10 items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#111827]">
                  <input
                    id="activo"
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 accent-blue-600"
                  />
                  Salón activo
                </label>
              </div>
            </FieldGrid>

            <FormActionsBar>
              <Button type="button" variant="outline" onClick={() => navigate("/salones")} disabled={saving} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </FormActionsBar>
          </FormSection>
        </form>
      </FormPageShell>
    </ContentShell>
  );
}