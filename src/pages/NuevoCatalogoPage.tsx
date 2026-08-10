import { useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { isValidTipo } from "../services/catalogoService";
import NuevoCatalogoForm from "../components/catalogo/NuevoCatalogoForm";

const TIPO_NAMES: Record<string, string> = {
  platillos: "Catering",
  bebidas: "Bebidas",
  personal: "Personal",
  mobiliario: "Mobiliario",
  audio: "Audio",
  otros: "Otros",
  tipoeventos: "Tipos de Evento",
};

export default function NuevoCatalogoPage() {
  const { tipo: tipoParam } = useParams<{ tipo: string }>();

  if (!tipoParam || !isValidTipo(tipoParam)) {
    return (
      <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
          <div className="text-center">
            <p className="mb-4 font-semibold text-red-600">Tipo de catálogo inválido</p>
            <Button asChild variant="outline">
              <a href="/catalogos">Volver a Catálogos</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <NuevoCatalogoForm tipo={tipoParam} />
    </div>
  );
}
