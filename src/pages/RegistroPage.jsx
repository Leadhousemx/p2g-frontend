// src/pages/RegistroPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import logo from "../assets/logo.png";
import fondoLogin from "../assets/fondologin.png";

export default function RegistroPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    confirmarPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones en el front
    if (
      !form.nombre ||
      !form.email ||
      !form.telefono ||
      !form.password ||
      !form.confirmarPassword
    ) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    if (form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      // Enviar datos al backend
      await api.post("/auth/register", {
        name: form.nombre,         // El backend acepta name o nombre
        email: form.email,
        telefono: form.telefono,   // ← Corregido: antes estaba "phone"
        password: form.password,
      });

      setSuccess("Registro exitoso. Redirigiendo al login...");
      setTimeout(() => {
        navigate("/login"); // Redirige al login después de 1.5 seg
      }, 1500);
    } catch (err) {
      console.error("Error en registro:", err.response?.data || err.message);
      setError(err.response?.data?.msg || "Error en el registro");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center text-white relative bg-cover bg-center"
      style={{ backgroundImage: `url(${fondoLogin})` }}
    >
      <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center">
        <img src={logo} alt="Logo" className="w-20 h-20 mb-4" />
        <h2 className="text-3xl font-bold text-center mb-6">Crear cuenta</h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.nombre}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.email}
            onChange={handleChange}
          />
          <input
            type="tel"
            name="telefono"
            placeholder="Número de WhatsApp"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.telefono}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.password}
            onChange={handleChange}
          />
          <input
            type="password"
            name="confirmarPassword"
            placeholder="Confirmar contraseña"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.confirmarPassword}
            onChange={handleChange}
          />

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm text-center">{success}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Registrarse
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
