import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";

export default function Salones() {
  const navigate = useNavigate();
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#2563eb]">Salones</h1>
        <Button onClick={() => navigate("/salones/nuevo")}>Nuevo salón</Button>
      </div>
      {/* aquí tu tabla/listado */}
    </>
  );
}
