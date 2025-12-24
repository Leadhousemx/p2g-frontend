import DashboardLayout from "../layouts/DashboardLayout";
import NuevoClienteForm from "../components/clientes/NuevoClienteForm";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { Save, XCircle } from "lucide-react";

export default function NuevoClientePage() {
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild aria-label="Cancelar">
              <Link to="/clientes">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Link>
            </Button>
            <Button variant="success" type="submit" form="nuevo-cliente-form" aria-label="Guardar">
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>
        <NuevoClienteForm />
      </>
    );
}
