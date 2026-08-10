import { LogOut, ShieldOff, Info } from 'lucide-react';
import type { CommercialStatusResponse } from '../services/commercialApi';

interface CommercialBlockedPageProps {
  status: CommercialStatusResponse;
  onLogout: () => void;
}

export default function CommercialBlockedPage({ status, onLogout }: CommercialBlockedPageProps) {
  const isSuspended = status.effectiveStatus === 'commercial_suspended';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6F9] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-100 bg-red-50">
          <ShieldOff size={28} className="text-red-500" />
        </div>

        <h1 className="mb-2 text-xl font-bold text-gray-900">
          {isSuspended ? 'Cuenta suspendida' : 'Plan comercial vencido'}
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-gray-600">
          {status.message ||
            (isSuspended
              ? 'Tu cuenta ha sido suspendida. Contacta a soporte para más información.'
              : 'Tu plan comercial ha vencido. Contacta al equipo de Brentrix para renovarlo.')}
        </p>

        <div className="mb-6 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-left">
          <Info size={15} className="mt-0.5 shrink-0 text-sky-500" />
          <p className="text-xs leading-relaxed text-sky-700">
            Tus datos están seguros y no han sido eliminados. Para reactivar el acceso, contacta al equipo de Brentrix.
          </p>
        </div>

        <p className="mb-6 text-xs text-gray-400">
          Soporte:{' '}
          <a href="mailto:soporte@brentrix.com" className="font-medium text-gray-600 hover:text-gray-800">
            soporte@brentrix.com
          </a>
        </p>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-400">Brentrix · Sistema de gestión de eventos</p>
    </div>
  );
}
