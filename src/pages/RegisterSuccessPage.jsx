import { useNavigate } from "react-router-dom";
import { LoginBackground } from "../components/LoginBackground";
import logo from "../assets/logo brentrix sin fondo.png";

export default function RegisterSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 w-full px-4 flex items-center justify-center py-8">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-fuchsia-500/25 via-violet-500/25 to-sky-500/25 blur-2xl opacity-60" />

          <div className="relative z-10 rounded-3xl border border-white/20 bg-white/8 backdrop-blur-xl shadow-2xl p-8 sm:p-10 text-center">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Logo Brentrix" className="h-20 w-20 object-contain" />
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              ✅ Empresa y usuario creados correctamente
            </h1>
            <p className="text-sm text-white/70 mb-8">
              Ahora puedes comenzar a usar el sistema.
            </p>

            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full h-11 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 transition-all duration-200"
            >
              Entrar al sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
