import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { LoginBackground } from '../../components/LoginBackground';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';

export default function BackOfficeLoginPage() {
  const { login, loading, error, isAuthenticated } = useBackofficeAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/admin', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    login(email, password);
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 w-full px-4 flex items-center justify-center py-8">
        <div className="relative w-full max-w-sm">

          {/* Outer ambient glow */}
          <div
            className="pointer-events-none absolute -inset-20 rounded-3xl"
            style={{ background: 'rgba(48,18,165,0.07)', filter: 'blur(96px)' }}
          />
          {/* Inner ambient glow */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-3xl"
            style={{ background: 'rgba(62,30,190,0.13)', filter: 'blur(60px)' }}
          />

          {/* Glass card */}
          <div
            className={`relative z-10 rounded-3xl border border-white/[0.20] backdrop-blur-2xl p-8 sm:p-10 transition-all duration-500 ease-out transform ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.034) 100%)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.14) inset, ' +
                '0 48px 96px rgba(0,0,0,0.65), ' +
                '0 0 72px rgba(55,25,175,0.14)',
            }}
          >
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
                <ShieldCheck size={11} />
                BackOffice
              </span>
            </div>

            <h1 className="text-center text-3xl font-extrabold text-white mb-1 tracking-tight">
              Brentrix Admin
            </h1>
            <p className="text-center text-sm text-white/50 mb-8">
              Acceso exclusivo para administradores
            </p>

            {error && (
              <div className="mb-5 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-3 text-sm text-red-200 font-medium text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  placeholder="Correo del administrador"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 pl-11 pr-4 border border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40 transition-all duration-200 focus:outline-none font-medium text-sm"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 pl-11 pr-4 border border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40 transition-all duration-200 focus:outline-none font-medium text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-11 mt-4 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-sky-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Autenticando...
                  </span>
                ) : (
                  'Ingresar al BackOffice'
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-white/25 mt-8">
              Brentrix BackOffice · Fase 1 — Solo lectura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
