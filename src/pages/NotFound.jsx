// src/pages/NotFound.jsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24">
      <h1 className="text-4xl font-bold mb-4">404 - Página no encontrada</h1>
      <p className="mb-6 text-gray-500">La ruta que buscas no existe.</p>
      <Link to="/dashboard" className="text-blue-600 hover:underline font-semibold">Ir al dashboard</Link>
    </div>
  );
}
