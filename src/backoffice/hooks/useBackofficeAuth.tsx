import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearBackofficeSession,
  getBackofficeOwner,
  getBackofficeToken,
  setBackofficeOwner,
  setBackofficeToken,
  type BackofficeOwner,
} from '../services/backofficeAuth';
import { loginOwner } from '../services/backofficeApi';

interface BackofficeAuthState {
  token: string | null;
  owner: BackofficeOwner | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
}

interface BackofficeAuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

type BackofficeAuthContext = BackofficeAuthState & BackofficeAuthActions;

const Ctx = createContext<BackofficeAuthContext | null>(null);

export function BackofficeAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [state, setState] = useState<BackofficeAuthState>(() => {
    const token = getBackofficeToken();
    const owner = getBackofficeOwner();
    return {
      token,
      owner,
      isAuthenticated: Boolean(token),
      loading: false,
      error: '',
    };
  });

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { accessToken, owner } = await loginOwner(email, password);
      setBackofficeToken(accessToken);
      setBackofficeOwner(owner);
      setState({ token: accessToken, owner, isAuthenticated: true, loading: false, error: '' });
      navigate('/admin', { replace: true });
    } catch (err: any) {
      // Prefer the user-friendly message from the API response body
      const apiMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        '';
      const msg = apiMsg || err?.message || 'No se pudo iniciar sesión';
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [navigate]);

  const logout = useCallback(() => {
    clearBackofficeSession();
    setState({ token: null, owner: null, isAuthenticated: false, loading: false, error: '' });
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  return (
    <Ctx.Provider value={{ ...state, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBackofficeAuth(): BackofficeAuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBackofficeAuth must be used inside BackofficeAuthProvider');
  return ctx;
}
