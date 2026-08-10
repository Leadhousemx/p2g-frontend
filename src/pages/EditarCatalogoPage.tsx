import { useParams, useNavigate } from "react-router-dom";
import { isValidTipo } from "../services/catalogoService";
import EditarCatalogoForm from "../components/catalogo/EditarCatalogoForm";
import { Button } from "@/components/ui";
import { AlertCircle } from "lucide-react";

const TIPO_NAMES: Record<string, string> = {
  platillos: "Catering",
  bebidas: "Bebidas",
  personal: "Personal",
  mobiliario: "Mobiliario",
  audio: "Audio",
  otros: "Otros",
  tipoeventos: "Tipos de Evento",
};

export default function EditarCatalogoPage() {
  const { tipo: tipoParam } = useParams<{ tipo: string }>();
  const navigate = useNavigate();

  if (!tipoParam || !isValidTipo(tipoParam)) {
    return (
      <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={24} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Tipo de catálogo inválido</h3>
              <p className="mt-1 text-sm text-red-700">El tipo especificado no existe.</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => navigate("/catalogos")} className="w-full">Volver a Catálogos</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <EditarCatalogoForm />
    </div>
  );
}
