import DashboardLayout from "../layouts/DashboardLayout";
import NuevoPaqueteForm from "../components/paquetes/NuevoPaqueteForm";

export default function NuevoPaquetePage() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2563eb]">Nuevo Paquete</h1>
      </div>
      <NuevoPaqueteForm />
    </>
  );
}
