import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BackOfficeAccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <div className="text-red-400 mb-4">
        <ShieldOff size={48} strokeWidth={1.5} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        No tienes permisos para acceder a esta área. Si crees que es un error, cierra sesión y vuelve a ingresar.
      </p>
      <Link
        to="/admin/login"
        className="rounded-lg bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-sky-400 hover:to-violet-500 transition-all"
      >
        Ir al login
      </Link>
    </div>
  );
}
