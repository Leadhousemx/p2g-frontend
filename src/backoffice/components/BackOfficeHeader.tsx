import { LogOut, User } from 'lucide-react';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';

export default function BackOfficeHeader() {
  const { owner, logout } = useBackofficeAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div />

      <div className="flex items-center gap-4">
        {owner && (
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-white">
              <User size={14} />
            </span>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{owner.nombre}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{owner.email}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
