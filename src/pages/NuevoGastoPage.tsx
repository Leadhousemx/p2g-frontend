import DashboardLayout from "../layouts/DashboardLayout";
import NuevoGastoForm from "../components/gastos/NuevoGastoForm";
// ...otros imports...

export default function NuevoGastoPage() {
  return ( 
    <> 
      <div className="flex items-center justify-between mb-6"> 
        <h1 className="text-2xl font-bold text-[#2563eb]">Nuevo Gasto</h1> 
      </div> 
      <NuevoGastoForm /> 
    </> 
  ); 
}
