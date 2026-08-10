import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui";
import EditarProveedorForm from "../components/proveedores/EditarProveedorForm";

export default function EditarProveedorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">ID de proveedor no válido</p>
        <Link to="/proveedores">
          <Button variant="outline" className="mt-4">
            Volver a Proveedores
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <EditarProveedorForm
        id={id}
        onSuccess={() => navigate("/proveedores")}
        onCancel={() => navigate("/proveedores")}
      />
    </div>
  );
}
