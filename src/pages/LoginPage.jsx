// src/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { api, getApiBaseUrl } from "../lib/api";
import logo from "../assets/logo.png";
import fondoLogin from "../assets/fondologin.png";


export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setStatus, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);


  // Log baseURL info in dev
  if (import.meta.env.DEV) {
     
    console.info("[Login] VITE_API_URL RAW:", import.meta.env.VITE_API_URL);
     
    console.info("[Login] API baseURL:", getApiBaseUrl());
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = {};
    setServerError("");
    if (!email) {
      validationErrors.email = "El correo electrónico es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      validationErrors.email = "Formato de correo inválido";
    }
    if (!password) {
      validationErrors.password = "La contraseña es obligatoria";
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { accessToken, user } = res.data;
      if (!accessToken) {
        throw new Error("❌ El backend no devolvió token");
      }
      localStorage.setItem("auth.token", accessToken);
      setStatus && setStatus("authenticated");
      setUser && setUser(user || null);
      // Redirección inteligente
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect");
      navigate(redirect || "/dashboard", { replace: true });
    } catch (err) {
      if (!err.response) {
        setServerError("Servidor no disponible. Verifica la URL/API.");
         
        console.warn("[Login] API login failed:", err?.message || err);
      } else {
        setServerError(err.response?.data?.msg || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center text-white relative bg-cover bg-center"
      style={{ backgroundImage: `url(${fondoLogin})` }}
    >

      <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center">
        <img src={logo} alt="Logo" className="w-20 h-20 mb-4" />
        <h2 className="text-3xl font-bold text-center mb-6">Iniciar sesión</h2>

        {serverError && (
          <p className="text-red-500 text-sm mb-3 text-center">{serverError}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-3 rounded-xl border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 rounded-xl border ${
                errors.password ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center mt-4">
          ¿No tienes una cuenta?{" "}
          <Link to="/register" className="text-blue-600 hover:underline" type="button">
            Crea una ahora
          </Link>
        </p>
      </div>
    </div>
  );
}
